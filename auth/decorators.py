"""
Authentication/authorization decorators.

`g.user` and `g.user_id` are the ONLY source of truth for "who is making
this request" anywhere in the app. Routes must never read a user id out of
the request body, query string, or headers and use it for authorization —
see backend/database/queries_workouts.py for why that matters (IDOR).
"""

import functools
import hmac

from flask import request, g, current_app

from auth.session_store import get_session
from database.queries_users import get_user_by_id
from utils.errors import ApiError

SESSION_COOKIE_NAME_DEFAULT = "repforge_session"


def _get_session_cookie_name() -> str:
    return current_app.config.get("SESSION_COOKIE_NAME", SESSION_COOKIE_NAME_DEFAULT)


def get_current_session():
    cookie_name = _get_session_cookie_name()
    session_id = request.cookies.get(cookie_name)
    if not session_id:
        return None, None
    session_row = get_session(session_id)
    return session_id, session_row


def login_required(view_func):
    @functools.wraps(view_func)
    def wrapped(*args, **kwargs):
        session_id, session_row = get_current_session()
        if not session_row:
            raise ApiError("Authentication required.", 401, "unauthorized")

        user = get_user_by_id(session_row["user_id"])
        if not user:
            # User row vanished (shouldn't normally happen) — treat as logged out.
            raise ApiError("Authentication required.", 401, "unauthorized")

        g.session_id = session_id
        g.session = session_row
        g.user = user
        g.user_id = user["id"]
        return view_func(*args, **kwargs)

    return wrapped


def csrf_protect(view_func):
    """
    Cryptographic constant-time CSRF validation for mutating endpoints:
    The client must echo the session's CSRF token in the X-CSRF-Token header.
    Prevents cross-site request forgery and timing side-channel attacks.
    Must be applied AFTER login_required so g.session is populated.
    """

    @functools.wraps(view_func)
    def wrapped(*args, **kwargs):
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            header_token = request.headers.get("X-CSRF-Token", "")
            session_token = getattr(g, "session", {}).get("csrf_token") if hasattr(g, "session") else None

            if not header_token or not session_token:
                raise ApiError("Missing required CSRF token.", 403, "csrf_missing")

            # Cryptographic constant-time comparison to prevent timing attacks
            if not hmac.compare_digest(str(header_token), str(session_token)):
                raise ApiError("Invalid or expired CSRF token.", 403, "csrf_failed")

        return view_func(*args, **kwargs)

    return wrapped
