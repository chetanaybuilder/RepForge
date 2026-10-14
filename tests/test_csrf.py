"""
RepForge Cross-Site Request Forgery (CSRF) Protection Tests.

Covers:
    - Missing X-CSRF-Token header rejection (403 Forbidden).
    - Invalid or mismatched X-CSRF-Token header rejection (403 Forbidden).
    - Valid constant-time token verification on mutating endpoints (POST, PUT, DELETE).
    - Logout CSRF protection (POST /auth/logout requires valid token).
"""

from __future__ import annotations

from unittest.mock import patch


def test_mutating_request_without_csrf_token_rejected(auth_client):
    """Mutating POST endpoint rejects requests missing X-CSRF-Token with 403."""
    resp = auth_client.post(
        "/api/workouts",
        json={"date": "2026-10-14", "exercises": []},
    )
    assert resp.status_code == 403
    data = resp.get_json()
    assert data["error"]["code"] == "csrf_missing"


def test_mutating_request_with_invalid_csrf_token_rejected(auth_client):
    """Mutating POST endpoint rejects requests with invalid X-CSRF-Token with 403."""
    resp = auth_client.post(
        "/api/workouts",
        json={"date": "2026-10-14", "exercises": []},
        headers={"X-CSRF-Token": "tampered_attacker_token"},
    )
    assert resp.status_code == 403
    data = resp.get_json()
    assert data["error"]["code"] == "csrf_failed"


def test_mutating_request_with_valid_csrf_token_accepted(auth_client, auth_session):
    """Mutating request with matching CSRF token passes the CSRF barrier."""
    valid_payload = {
        "date": "2026-10-14",
        "day": "Leg Day",
        "exercises": [
            {
                "exercise_name": "Back Squat",
                "workout_type": "legs",
                "sets": [{"reps": 5, "weight": 140.0}],
            }
        ],
    }

    mock_created_day = {
        "id": "mock_day_id_123",
        "user_id": auth_session["user_id"],
        "date": "2026-10-14",
        "day": "Leg Day",
        "exercises": [],
    }

    with patch("database.queries_workouts.create_workout_day", return_value=mock_created_day):
        resp = auth_client.post(
            "/api/workouts",
            json=valid_payload,
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 201


def test_logout_csrf_protection(auth_client, auth_session):
    """Verifies that POST /auth/logout enforces CSRF protection to prevent Logout CSRF."""
    # Attempt logout without CSRF token
    resp_missing = auth_client.post("/auth/logout")
    assert resp_missing.status_code == 403
    assert resp_missing.get_json()["error"]["code"] == "csrf_missing"

    # Attempt logout with valid CSRF token
    with patch("routes.auth_routes.delete_session") as mock_delete:
        resp_valid = auth_client.post(
            "/auth/logout",
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp_valid.status_code == 200
        mock_delete.assert_called_once_with(auth_session["id"])
        # Cookie is cleared
        cookie_header = resp_valid.headers.get("Set-Cookie", "")
        assert "repforge_session=;" in cookie_header or "Max-Age=0" in cookie_header
