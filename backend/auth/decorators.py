"""
RepForge Authentication & Authorization Decorators.

Purpose:
    Enforces authentication boundaries and cryptographic CSRF protection on API routes.
    Guarantees that `g.user` and `g.user_id` serve as the singular source of truth
    for tenant isolation, eliminating Insecure Direct Object Reference (IDOR) vulnerabilities.
"""

from __future__ import annotations

from collections.abc import Callable
import functools
import hmac
from typing import Any

from flask import current_app, g, request

from auth.session_store import get_session
from database.queries_users import get_user_by_id
from utils.errors import ApiError

SESSION_COOKIE_NAME_DEFAULT = "repforge_session"


def _get_session_cookie_name() -> str:
    """Retrieves the configured session cookie name from current app config."""
    return current_app.config.get("SESSION_COOKIE_NAME", SESSION_COOKIE_NAME_DEFAULT)


def get_current_session() -> tuple[str | None, dict[str, Any] | None]:
    """
    Extracts and resolves the active session from request cookies.

    Returns:
        tuple[str | None, dict[str, Any] | None]: (session_id, session_row) or (None, None).
    """
    cookie_name = _get_session_cookie_name()
    session_id = request.cookies.get(cookie_name)
    if not session_id:
        return None, None
    session_row = get_session(session_id)
    return session_id, session_row


def login_required(view_func: Callable) -> Callable:
    """
    Decorator requiring an active authenticated session for route execution.

    Extracts session from cookie, verifies that the referenced user exists in PostgreSQL,
    and populates `g.session_id`, `g.session`, `g.user`, and `g.user_id`.

    Args:
        view_func: Target Flask endpoint view function.

    Returns:
        Callable: Wrapped endpoint enforcing authentication.

    Raises:
        ApiError: 401 Unauthorized if session is missing, expired, or invalid.
    """

    @functools.wraps(view_func)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        session_id, session_row = get_current_session()
        if not session_row:
            raise ApiError("Authentication required.", 401, "unauthorized")

        user = get_user_by_id(session_row["user_id"])
        if not user:
            # User record was pruned or invalidated; force re-authentication
            raise ApiError("Authentication required.", 401, "unauthorized")

        g.session_id = session_id
        g.session = session_row
        g.user = user
        g.user_id = user["id"]
        return view_func(*args, **kwargs)

    return wrapped


def csrf_protect(view_func: Callable) -> Callable:
    """
    Decorator enforcing cryptographic double-submit constant-time CSRF protection.

    Validates that mutating requests (POST, PUT, PATCH, DELETE) include an `X-CSRF-Token`
    header that matches the session's server-stored `csrf_token` using constant-time
    comparison (`hmac.compare_digest`) to prevent timing side-channel attacks.

    Must be applied after `@login_required` so `g.session` is populated.

    Args:
        view_func: Target Flask endpoint view function.

    Returns:
        Callable: Wrapped endpoint enforcing CSRF validation.

    Raises:
        ApiError: 403 Forbidden if CSRF token is missing, invalid, or mismatched.
    """

    @functools.wraps(view_func)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            header_token = request.headers.get("X-CSRF-Token", "")
            session_token = getattr(g, "session", {}).get("csrf_token") if hasattr(g, "session") and g.session else None

            if not header_token or not session_token:
                raise ApiError("Missing required CSRF token.", 403, "csrf_missing")

            # Cryptographic constant-time comparison prevents timing side-channels
            if not hmac.compare_digest(str(header_token), str(session_token)):
                raise ApiError("Invalid or expired CSRF token.", 403, "csrf_failed")

        return view_func(*args, **kwargs)

    return wrapped
