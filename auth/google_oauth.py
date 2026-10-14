"""
RepForge Server-Side Google OAuth 2.0 & OIDC Module.

Purpose:
    Executes a secure OpenID Connect authorization code grant flow with Google.
    Guarantees that Google client secrets never reach the browser and identities
    are authenticated cryptographically using published Google JWKS certificates.

Responsibilities:
    - Discovery Document & JWKS resolution with TTL memory caching.
    - OIDC Authorization URL construction with state and nonce bindings.
    - Server-to-server authorization code exchange for tokens.
    - Cryptographic RS256 signature verification and audience/nonce claim validation.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import jwt
from jwt import PyJWKClient
import requests

logger = logging.getLogger("repforge.auth.google_oauth")

_discovery_cache: dict[str, Any] = {"doc": None, "fetched_at": 0}
_DISCOVERY_TTL_SECONDS = 3600  # 1 hour discovery cache

_jwks_clients: dict[str, PyJWKClient] = {}

GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
SCOPES = "openid email profile"


class OAuthError(Exception):
    """Raised when an OAuth authorization handshake or signature verification fails."""


def _get_discovery_document(discovery_url: str) -> dict[str, Any]:
    """
    Fetches Google's OpenID Connect configuration discovery document with TTL caching.

    Args:
        discovery_url: Google OIDC discovery endpoint URL.

    Returns:
        dict[str, Any]: Parsed JSON discovery document.

    Raises:
        OAuthError: If the remote discovery document cannot be fetched.
    """
    now = time.time()
    if _discovery_cache["doc"] and (now - _discovery_cache["fetched_at"] < _DISCOVERY_TTL_SECONDS):
        return _discovery_cache["doc"]

    try:
        resp = requests.get(discovery_url, timeout=10)
        resp.raise_for_status()
        doc = resp.json()
    except Exception as exc:
        logger.error("Failed to fetch Google OIDC discovery document: %s", exc)
        raise OAuthError("Failed to reach Google authentication service.") from exc

    _discovery_cache["doc"] = doc
    _discovery_cache["fetched_at"] = now
    return doc


def _get_jwk_client(jwks_uri: str) -> PyJWKClient:
    """
    Retrieves or initializes a cached PyJWKClient for remote JWKS certificate keys.

    Args:
        jwks_uri: URI for Google's published JSON Web Key Set.

    Returns:
        PyJWKClient: Reusable key client with internal key caching enabled.
    """
    if jwks_uri not in _jwks_clients:
        _jwks_clients[jwks_uri] = PyJWKClient(jwks_uri, cache_keys=True, max_cached_keys=16)
    return _jwks_clients[jwks_uri]


def build_authorization_url(
    client_id: str,
    redirect_uri: str,
    state: str,
    discovery_url: str,
    nonce: str | None = None,
) -> str:
    """
    Constructs Google's consent screen redirect URL with security parameters.

    Args:
        client_id: Registered Google Cloud OAuth client ID.
        redirect_uri: Registered callback URL on the server.
        state: Cryptographic anti-CSRF state token.
        discovery_url: Google OIDC discovery endpoint URL.
        nonce: Cryptographic OpenID Connect nonce to prevent token replay.

    Returns:
        str: Fully formatted URL directing the browser to Google authentication.
    """
    doc = _get_discovery_document(discovery_url)
    auth_endpoint = doc["authorization_endpoint"]
    params: dict[str, str] = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    if nonce:
        params["nonce"] = nonce

    query = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return f"{auth_endpoint}?{query}"


def exchange_code_for_tokens(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    discovery_url: str,
) -> dict[str, Any]:
    """
    Exchanges a single-use authorization code for token artifacts directly with Google.

    Args:
        code: One-time authorization code returned in callback query parameters.
        client_id: Registered Google Cloud OAuth client ID.
        client_secret: Confidential Google Cloud OAuth client secret.
        redirect_uri: Registered callback URL that matches the authorization request.
        discovery_url: Google OIDC discovery endpoint URL.

    Returns:
        dict[str, Any]: Parsed token response payload containing `id_token`.

    Raises:
        OAuthError: If token exchange returns a non-200 status or network failure.
    """
    doc = _get_discovery_document(discovery_url)
    token_endpoint = doc["token_endpoint"]

    try:
        resp = requests.post(
            token_endpoint,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
    except Exception as exc:
        logger.error("Network failure during Google code exchange: %s", exc)
        raise OAuthError("Network error contacting Google token endpoint.") from exc

    if resp.status_code != 200:
        logger.warning("Google token exchange rejected: status=%s", resp.status_code)
        raise OAuthError("Failed to exchange authorization code with Google.")

    return resp.json()


def verify_id_token(
    id_token: str,
    client_id: str,
    discovery_url: str,
    expected_nonce: str | None = None,
) -> dict[str, Any]:
    """
    Cryptographically verifies Google's signed RS256 identity token against published JWKS.

    Validates cryptographic signature, audience (`aud`), issuer (`iss`), expiry (`exp`),
    email verification status, and OpenID Connect `nonce`.

    Args:
        id_token: Raw JWT string from Google's token endpoint.
        client_id: Expected audience string matching this application's client ID.
        discovery_url: Google OIDC discovery endpoint URL.
        expected_nonce: Nonce sent in the original authorization URL for replay prevention.

    Returns:
        dict[str, Any]: Verified claims dictionary (sub, email, email_verified, name, picture).

    Raises:
        OAuthError: If signature is invalid, claims are missing, issuer is unexpected,
                    or nonce fails validation.
    """
    doc = _get_discovery_document(discovery_url)
    jwks_uri = doc["jwks_uri"]

    try:
        jwk_client = _get_jwk_client(jwks_uri)
        signing_key = jwk_client.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as exc:
        logger.warning("Google ID token cryptographic validation failed: %s", exc)
        raise OAuthError("Could not verify Google identity token signature.") from exc

    if claims.get("iss") not in GOOGLE_ISSUERS:
        logger.warning("Unexpected token issuer: %s", claims.get("iss"))
        raise OAuthError("Unexpected token issuer.")

    if not claims.get("email_verified", False):
        raise OAuthError("Google account email is not verified.")

    # Validate OIDC nonce claim if present
    if expected_nonce:
        token_nonce = claims.get("nonce")
        if token_nonce != expected_nonce:
            logger.warning("OIDC token nonce mismatch: expected=%s, got=%s", expected_nonce, token_nonce)
            raise OAuthError("Google identity token nonce verification failed.")

    return claims


def get_identity_from_google(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    discovery_url: str,
    expected_nonce: str | None = None,
) -> dict[str, str]:
    """
    Coordinates code exchange and cryptographic verification to yield a verified identity.

    Args:
        code: Authorization code from Google.
        client_id: Google OAuth client ID.
        client_secret: Google OAuth client secret.
        redirect_uri: OAuth redirect URI.
        discovery_url: Google discovery URL.
        expected_nonce: Expected OIDC nonce.

    Returns:
        dict[str, str]: Clean, verified identity dict:
            {"google_id": ..., "email": ..., "name": ..., "avatar_url": ...}.

    Raises:
        OAuthError: If token exchange or identity verification fails.
    """
    tokens = exchange_code_for_tokens(code, client_id, client_secret, redirect_uri, discovery_url)
    id_token = tokens.get("id_token")
    if not id_token:
        raise OAuthError("Google did not return an identity token.")

    claims = verify_id_token(id_token, client_id, discovery_url, expected_nonce=expected_nonce)

    return {
        "google_id": claims["sub"],
        "email": claims.get("email", ""),
        "name": claims.get("name") or claims.get("email", "").split("@")[0],
        "avatar_url": claims.get("picture", ""),
    }
