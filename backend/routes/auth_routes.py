"""
RepForge Authentication Routes.

Purpose:
    Handles Google OAuth 2.0 / OpenID Connect login flows, session creation,
    session invalidation (logout), and authenticated session verification.

Security & Architectural Defenses:
    - OIDC Nonce and State Validation: Prevents login CSRF, token replay,
      and token injection.
    - Session Fixation Prevention: Pre-existing session cookies are destroyed
      prior to instantiating newly authenticated credentials.
    - CSRF Protection: Logout and all mutating actions require valid constant-time
      CSRF token verification matching server-side session state.
    - Zero Credential Leakage: Session tokens are stored in HttpOnly, SameSite cookies.
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Blueprint, current_app, g, jsonify, redirect, request, url_for
from werkzeug.wrappers import Response

from auth.decorators import csrf_protect, get_current_session, login_required
from auth.google_oauth import OAuthError, build_authorization_url, get_identity_from_google
from auth.oauth_state import consume_oauth_state, create_oauth_state
from auth.session_store import create_session, delete_session
from database.queries_users import find_or_create_user_from_google, get_user_by_id
from extensions import limiter
from utils.errors import ApiError

logger = logging.getLogger("repforge.auth")

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _set_session_cookie(response: Response, session_id: str, max_age: int) -> None:
    """
    Sets secure HttpOnly session cookie on the outgoing HTTP response.

    Args:
        response: Target Werkzeug/Flask HTTP response.
        session_id: Cryptographically secure random session identifier.
        max_age: Cookie expiration horizon in seconds.
    """
    cfg = current_app.config
    response.set_cookie(
        cfg["SESSION_COOKIE_NAME"],
        session_id,
        max_age=max_age,
        httponly=True,
        secure=cfg["SESSION_COOKIE_SECURE"],
        samesite=cfg["SESSION_COOKIE_SAMESITE"],
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    """
    Clears the active session cookie from the browser.

    Args:
        response: Target Werkzeug/Flask HTTP response.
    """
    cfg = current_app.config
    response.set_cookie(
        cfg["SESSION_COOKIE_NAME"],
        "",
        expires=0,
        httponly=True,
        secure=cfg["SESSION_COOKIE_SECURE"],
        samesite=cfg["SESSION_COOKIE_SAMESITE"],
        path="/",
    )


def get_current_user_payload() -> tuple[dict[str, Any], int]:
    """
    Canonical helper for resolving the authenticated user profile and active CSRF token.

    Shared between `/auth/me` and `/api/me` to eliminate duplicated logic.

    Returns:
        tuple[dict[str, Any], int]: (Response JSON payload, HTTP status code).
    """
    _, session_row = get_current_session()
    if not session_row:
        return {"authenticated": False, "user": None}, 200

    user = get_user_by_id(session_row["user_id"])
    if not user:
        return {"authenticated": False, "user": None}, 200

    return {
        "authenticated": True,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "avatar_url": user["avatar_url"],
        },
        "csrf_token": session_row["csrf_token"],
    }, 200


@auth_bp.route("/google")
@limiter.limit(lambda: current_app.config["RATELIMIT_AUTH"])
def google_login():
    """
    Initiates Google OAuth 2.0 / OIDC authorization flow.

    Generates a cryptographically random (state, nonce) pair, stores them in PostgreSQL
    with an expiration horizon, and redirects the user agent to Google's consent screen.

    Returns:
        Response: HTTP 302 redirect to Google OAuth authorization endpoint.

    Raises:
        ApiError: If Google OAuth credentials are not configured on the server.
    """
    cfg = current_app.config
    if not cfg["GOOGLE_CLIENT_ID"]:
        raise ApiError("Google sign-in is not configured on the server.", 503, "oauth_not_configured")

    state, nonce = create_oauth_state()
    auth_url = build_authorization_url(
        client_id=cfg["GOOGLE_CLIENT_ID"],
        redirect_uri=url_for("auth.google_callback", _external=True),
        state=state,
        discovery_url=cfg["GOOGLE_DISCOVERY_URL"],
        nonce=nonce,
    )
    return redirect(auth_url)


@auth_bp.route("/google/callback")
@limiter.limit(lambda: current_app.config["RATELIMIT_AUTH"])
def google_callback():
    """
    Handles authorization callback from Google.

    Atomically consumes the state parameter to verify single-use semantics, exchanges
    the authorization code for tokens, cryptographically verifies the identity token
    (including the OIDC nonce), rotates any pre-existing session to prevent fixation,
    and establishes a new authenticated session cookie.

    Returns:
        Response: HTTP 302 redirect to /dashboard or error landing page.
    """
    cfg = current_app.config
    error = request.args.get("error")
    if error:
        logger.warning("OAuth provider reported access error: %s", error)
        return redirect("/login?error=access_denied")

    state = request.args.get("state", "")
    code = request.args.get("code", "")

    # Atomically consume the state and retrieve the paired nonce
    state_record = consume_oauth_state(state)
    if not state_record:
        logger.warning("OAuth callback rejected: state parameter is invalid, expired, or already consumed.")
        return redirect("/login?error=invalid_state")

    if not code:
        logger.warning("OAuth callback rejected: missing authorization code.")
        return redirect("/login?error=missing_code")

    expected_nonce = state_record.get("nonce")

    try:
        identity = get_identity_from_google(
            code=code,
            client_id=cfg["GOOGLE_CLIENT_ID"],
            client_secret=cfg["GOOGLE_CLIENT_SECRET"],
            redirect_uri=url_for("auth.google_callback", _external=True),
            discovery_url=cfg["GOOGLE_DISCOVERY_URL"],
            expected_nonce=expected_nonce,
        )
    except OAuthError as exc:
        logger.warning("OAuth identity verification failed: %s", exc)
        return redirect("/login?error=auth_failed")

    # Invalidate any pre-existing unauthenticated or previous session to prevent fixation
    existing_session_id, _ = get_current_session()
    if existing_session_id:
        delete_session(existing_session_id)

    # Establish or fetch internal user
    user = find_or_create_user_from_google(
        google_id=identity["google_id"],
        email=identity["email"],
        name=identity["name"],
        avatar_url=identity["avatar_url"],
    )

    session_row = create_session(
        user_id=user["id"],
        lifetime_seconds=cfg["PERMANENT_SESSION_LIFETIME_SECONDS"],
        user_agent=request.headers.get("User-Agent", ""),
        ip_address=request.remote_addr or "",
    )

    response = redirect("/dashboard")
    _set_session_cookie(response, session_row["id"], cfg["PERMANENT_SESSION_LIFETIME_SECONDS"])
    return response


@auth_bp.route("/logout", methods=["POST"])
@login_required
@csrf_protect
def logout():
    """
    Terminates the active authenticated session.

    Enforces login and CSRF verification to protect against Logout CSRF.
    Deletes the session record server-side and clears the browser cookie.

    Returns:
        Response: JSON confirmation with cleared session cookie.
    """
    delete_session(g.session_id)
    response = jsonify({"message": "Logged out."})
    _clear_session_cookie(response)
    return response


@auth_bp.route("/me", methods=["GET"])
def me():
    """
    Returns the current session's user identity and CSRF token.

    Unauthenticated requests safely return `{ "authenticated": false, "user": null }`.

    Returns:
        Response: JSON session status payload.
    """
    payload, status = get_current_user_payload()
    return jsonify(payload), status
