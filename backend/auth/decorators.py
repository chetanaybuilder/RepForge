"""
Authentication/authorization decorators.

`g.user` and `g.user_id` are the ONLY source of truth for "who is making
this request" anywhere in the app. Routes must never read a user id out of
the request body, query string, or headers and use it for authorization —
see backend/database/queries_workouts.py for why that matters (IDOR).
"""

import functools

from flask import request, g, current_app

from backend.auth.session_store import get_session
from backend.database.queries_users import get_user_by_id
from backend.utils.errors import ApiError

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
    Double-submit-style CSRF check for state-changing requests: the CSRF
    token issued at login must be echoed back in the X-CSRF-Token header.
    A cross-site form post or fetch from another origin cannot read that
    token (it's not in a cookie the browser auto-attaches, and CORS blocks
    reading the /auth/me response cross-origin), so it can't forge this
    header. Must be applied AFTER login_required so g.session exists.
    """

    @functools.wraps(view_func)
    def wrapped(*args, **kwargs):
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            header_token = request.headers.get("X-CSRF-Token", "")
            session_token = getattr(g, "session", {}).get("csrf_token") if hasattr(g, "session") else None
            if not header_token or not session_token or header_token != session_token:
                raise ApiError("Invalid or missing CSRF token.", 403, "csrf_failed")
        return view_func(*args, **kwargs)

    return wrapped
