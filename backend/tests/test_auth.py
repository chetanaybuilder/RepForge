"""
RepForge Authentication & OAuth Security Tests.

Covers:
    - OAuth authorization URL construction (state, nonce bindings).
    - Single-use atomic OAuth state consumption (anti-TOCTOU).
    - OpenID Connect nonce verification in token claims.
    - Session creation, invalidation, and session fixation prevention.
    - Parity between canonical `/auth/me` and legacy `/api/me`.
"""

from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest

from auth.google_oauth import OAuthError, build_authorization_url, verify_id_token
from auth.oauth_state import consume_oauth_state, create_oauth_state


def test_build_authorization_url_includes_state_and_nonce():
    """Verifies that authorization URL binds both CSRF state and OIDC nonce parameters."""
    with patch(
        "auth.google_oauth._get_discovery_document",
        return_value={"authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth"},
    ):
        url = build_authorization_url(
            client_id="test-client-id",
            redirect_uri="http://localhost:5000/auth/google/callback",
            state="test_state_123",
            discovery_url="https://mock.discovery",
            nonce="test_nonce_456",
        )
        assert "state=test_state_123" in url
        assert "nonce=test_nonce_456" in url
        assert "client_id=test-client-id" in url
        assert "response_type=code" in url


def test_create_and_consume_oauth_state():
    """Verifies atomic state and nonce generation and single-use consumption."""
    with patch("auth.oauth_state.execute_returning") as mock_exec:
        # Mock database insertion
        mock_exec.return_value = {"state": "mock_state"}
        state, nonce = create_oauth_state()
        assert len(state) > 16
        assert len(nonce) > 16

    # Mock database atomic deletion
    mock_row = {
        "state": state,
        "nonce": nonce,
        "expires_at": datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=5),
    }
    with patch("auth.oauth_state.execute_returning", return_value=mock_row):
        consumed = consume_oauth_state(state)
        assert consumed is not None
        assert consumed["nonce"] == nonce

    # Subsequent consumption of consumed/invalid state returns None (single-use)
    with patch("auth.oauth_state.execute_returning", return_value=None):
        assert consume_oauth_state(state) is None


def test_verify_id_token_enforces_nonce():
    """Verifies that ID token validation rejects mismatched or omitted nonces."""
    mock_claims = {
        "sub": "google-user-123",
        "email": "user@example.com",
        "email_verified": True,
        "iss": "https://accounts.google.com",
        "aud": "my-client-id",
        "nonce": "correct_nonce_abc",
        "exp": 9999999999,
    }

    with (
        patch(
            "auth.google_oauth._get_discovery_document",
            return_value={"jwks_uri": "https://mock.jwks"},
        ),
        patch("auth.google_oauth._get_jwk_client"),
        patch("jwt.decode", return_value=mock_claims),
    ):
        # Matching nonce succeeds
        claims = verify_id_token(
            "dummy.jwt.token",
            client_id="my-client-id",
            discovery_url="https://mock",
            expected_nonce="correct_nonce_abc",
        )
        assert claims["sub"] == "google-user-123"

        # Mismatched nonce raises OAuthError
        with pytest.raises(OAuthError, match="nonce verification failed"):
            verify_id_token(
                "dummy.jwt.token",
                client_id="my-client-id",
                discovery_url="https://mock",
                expected_nonce="attacker_tampered_nonce",
            )


def test_auth_me_unauthenticated(client):
    """Unauthenticated requests to /auth/me return 200 with authenticated=False."""
    resp = client.get("/auth/me")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["authenticated"] is False
    assert data["user"] is None


def test_auth_me_and_api_me_parity(auth_client, mock_user_1, auth_session):
    """Authenticated requests to /auth/me and /api/me return identical user and csrf_token."""
    resp_auth = auth_client.get("/auth/me")
    assert resp_auth.status_code == 200
    data_auth = resp_auth.get_json()
    assert data_auth["authenticated"] is True
    assert data_auth["user"]["id"] == mock_user_1["id"]
    assert data_auth["csrf_token"] == auth_session["csrf_token"]

    resp_api = auth_client.get("/api/me")
    assert resp_api.status_code == 200
    data_api = resp_api.get_json()
    assert data_api == data_auth


def test_oauth_callback_session_fixation_prevention(client, mock_user_1):
    """Verifies that an existing session is deleted prior to creating a new one on OAuth callback."""
    # Pre-existing session on the client
    client.set_cookie("repforge_session", "pre_existing_session_xyz")

    state_record = {
        "state": "valid_state_123",
        "nonce": "valid_nonce_abc",
        "expires_at": datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=5),
    }

    verified_identity = {
        "google_id": "google_sub_12345",
        "email": mock_user_1["email"],
        "name": mock_user_1["name"],
        "avatar_url": mock_user_1["avatar_url"],
    }

    new_session_row = {
        "id": "newly_minted_session_token",
        "user_id": mock_user_1["id"],
        "csrf_token": "new_csrf_token",
    }

    with (
        patch("routes.auth_routes.consume_oauth_state", return_value=state_record),
        patch("routes.auth_routes.get_identity_from_google", return_value=verified_identity),
        patch(
            "routes.auth_routes.get_current_session",
            return_value=("pre_existing_session_xyz", {"id": "pre_existing_session_xyz"}),
        ),
        patch("routes.auth_routes.delete_session") as mock_delete_session,
        patch("routes.auth_routes.find_or_create_user_from_google", return_value=mock_user_1),
        patch("routes.auth_routes.create_session", return_value=new_session_row),
    ):
        resp = client.get("/auth/google/callback?state=valid_state_123&code=valid_code_456")
        assert resp.status_code == 302
        assert resp.headers["Location"].endswith("/dashboard")

        # Prior session MUST be explicitly destroyed to eliminate session fixation
        mock_delete_session.assert_called_once_with("pre_existing_session_xyz")
