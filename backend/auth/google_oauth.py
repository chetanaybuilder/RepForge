"""
Google OAuth handled entirely server-side.

The frontend never sees the client secret and never hands us an email or
user id directly — it only ever redirects the browser to /auth/google and
later lands back on the app once Flask has already validated everything.

Flow implemented here:
  1. build_authorization_url() — Flask generates a random `state`, stores
     it, and redirects the browser to Google's consent screen.
  2. On callback, exchange_code_for_tokens() swaps the one-time `code` for
     tokens directly server-to-server (requires the client secret).
  3. verify_id_token() cryptographically verifies Google's signed ID token
     against Google's published public keys (JWKS) — this is what proves
     the identity actually came from Google, rather than trusting whatever
     the browser redirected back with.
"""

import time
import logging

import requests
import jwt
from jwt import PyJWKClient

logger = logging.getLogger("repforge.oauth")

_discovery_cache = {"doc": None, "fetched_at": 0}
_DISCOVERY_TTL_SECONDS = 3600

GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
SCOPES = "openid email profile"


class OAuthError(Exception):
    pass


def _get_discovery_document(discovery_url: str) -> dict:
    now = time.time()
    if _discovery_cache["doc"] and now - _discovery_cache["fetched_at"] < _DISCOVERY_TTL_SECONDS:
        return _discovery_cache["doc"]
    resp = requests.get(discovery_url, timeout=10)
    resp.raise_for_status()
    doc = resp.json()
    _discovery_cache["doc"] = doc
    _discovery_cache["fetched_at"] = now
    return doc


def build_authorization_url(client_id: str, redirect_uri: str, state: str, discovery_url: str) -> str:
    doc = _get_discovery_document(discovery_url)
    auth_endpoint = doc["authorization_endpoint"]
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    query = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return f"{auth_endpoint}?{query}"


def exchange_code_for_tokens(code: str, client_id: str, client_secret: str, redirect_uri: str, discovery_url: str) -> dict:
    doc = _get_discovery_document(discovery_url)
    token_endpoint = doc["token_endpoint"]
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
    if resp.status_code != 200:
        logger.warning("Google token exchange failed: %s %s", resp.status_code, resp.text[:300])
        raise OAuthError("Failed to exchange authorization code with Google.")
    return resp.json()


def verify_id_token(id_token: str, client_id: str, discovery_url: str) -> dict:
    """
    Cryptographically verifies the ID token's signature against Google's
    published JWKS, and checks audience/issuer/expiry. Returns the decoded
    claims (sub, email, email_verified, name, picture, ...) only if valid.
    """
    doc = _get_discovery_document(discovery_url)
    jwks_uri = doc["jwks_uri"]

    try:
        jwk_client = PyJWKClient(jwks_uri)
        signing_key = jwk_client.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as exc:
        logger.warning("Google ID token verification failed: %s", exc)
        raise OAuthError("Could not verify Google identity token.") from exc

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise OAuthError("Unexpected token issuer.")

    if not claims.get("email_verified", False):
        raise OAuthError("Google account email is not verified.")

    return claims


def get_identity_from_google(code: str, client_id: str, client_secret: str, redirect_uri: str, discovery_url: str) -> dict:
    """High-level helper used by the callback route: exchanges the code and
    returns a small, trusted identity dict — this is the only thing the
    rest of the app should treat as "who is this person"."""
    tokens = exchange_code_for_tokens(code, client_id, client_secret, redirect_uri, discovery_url)
    id_token = tokens.get("id_token")
    if not id_token:
        raise OAuthError("Google did not return an identity token.")

    claims = verify_id_token(id_token, client_id, discovery_url)

    return {
        "google_id": claims["sub"],
        "email": claims.get("email", ""),
        "name": claims.get("name") or claims.get("email", "").split("@")[0],
        "avatar_url": claims.get("picture", ""),
    }
