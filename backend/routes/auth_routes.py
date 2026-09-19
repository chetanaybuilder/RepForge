import logging

from flask import Blueprint, request, redirect, jsonify, current_app, g

from backend.auth.google_oauth import build_authorization_url, get_identity_from_google, OAuthError
from backend.auth.oauth_state import create_state, consume_state
from backend.auth.session_store import create_session, delete_session
from backend.auth.decorators import login_required, get_current_session
from backend.database.queries_users import find_or_create_user_from_google
from backend.extensions import limiter
from backend.utils.errors import ApiError

logger = logging.getLogger("repforge.auth")

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _set_session_cookie(response, session_id: str, max_age: int):
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


def _clear_session_cookie(response):
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


@auth_bp.route("/google")
@limiter.limit(lambda: current_app.config["RATELIMIT_AUTH"])
def google_login():
    cfg = current_app.config
    if not cfg["GOOGLE_CLIENT_ID"]:
        raise ApiError("Google sign-in is not configured on the server.", 503, "oauth_not_configured")

    state = create_state()
    auth_url = build_authorization_url(
        client_id=cfg["GOOGLE_CLIENT_ID"],
        redirect_uri=cfg["GOOGLE_REDIRECT_URI"],
        state=state,
        discovery_url=cfg["GOOGLE_DISCOVERY_URL"],
    )
    return redirect(auth_url)


@auth_bp.route("/google/callback")
@limiter.limit(lambda: current_app.config["RATELIMIT_AUTH"])
def google_callback():
    cfg = current_app.config
    error = request.args.get("error")
    if error:
        return redirect(f"{cfg['FRONTEND_URL']}/login?error=access_denied")

    state = request.args.get("state", "")
    code = request.args.get("code", "")

    if not consume_state(state):
        logger.warning("OAuth callback with invalid/expired state")
        return redirect(f"{cfg['FRONTEND_URL']}/login?error=invalid_state")

    if not code:
        return redirect(f"{cfg['FRONTEND_URL']}/login?error=missing_code")

    try:
        identity = get_identity_from_google(
            code=code,
            client_id=cfg["GOOGLE_CLIENT_ID"],
            client_secret=cfg["GOOGLE_CLIENT_SECRET"],
            redirect_uri=cfg["GOOGLE_REDIRECT_URI"],
            discovery_url=cfg["GOOGLE_DISCOVERY_URL"],
        )
    except OAuthError as exc:
        logger.warning("OAuth identity verification failed: %s", exc)
        return redirect(f"{cfg['FRONTEND_URL']}/login?error=auth_failed")

    # This is the ONLY place a Google identity turns into an application
    # user — everywhere else in the app deals only with our internal UUID.
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

    response = redirect(f"{cfg['FRONTEND_URL']}/dashboard")
    _set_session_cookie(response, session_row["id"], cfg["PERMANENT_SESSION_LIFETIME_SECONDS"])
    return response


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    delete_session(g.session_id)
    response = jsonify({"message": "Logged out."})
    _clear_session_cookie(response)
    return response


@auth_bp.route("/me")
def me():
    session_id, session_row = get_current_session()
    if not session_row:
        return jsonify({"authenticated": False, "user": None}), 200

    from backend.database.queries_users import get_user_by_id
    user = get_user_by_id(session_row["user_id"])
    if not user:
        return jsonify({"authenticated": False, "user": None}), 200

    return jsonify({
        "authenticated": True,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "avatar_url": user["avatar_url"],
        },
        "csrf_token": session_row["csrf_token"],
    })
