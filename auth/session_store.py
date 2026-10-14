"""
RepForge Server-Side Session Store.

Purpose:
    Manages stateful authentication sessions backed by PostgreSQL. The browser
    cookie holds exclusively an opaque, cryptographically random session token.
    All session state (user binding, expiration, CSRF token, user agent, IP)
    is maintained server-side.

Security & Architectural Defenses:
    - Opaque Token Design: Compromise of cookie values after server-side deletion
      or expiration provides zero attacker utility.
    - Immediate Invalidation: Logout deletes the server record immediately.
    - Session Fixation Resistance: Session rotation destroys previous tokens.
    - Throttled Telemetry Updates: `last_seen_at` updates are rate-limited to 5-minute
      intervals to prevent database write amplification and WAL bloat on read queries.
"""

from __future__ import annotations

import datetime
import logging
import secrets
from typing import Any

from database.db import execute, execute_returning, fetch_one

logger = logging.getLogger("repforge.auth.session_store")

SESSION_ID_BYTES = 32
CSRF_TOKEN_BYTES = 32
LAST_SEEN_UPDATE_INTERVAL_SECONDS = 300  # 5 minutes


def _new_token(nbytes: int) -> str:
    """Generates a cryptographically secure URL-safe random string."""
    return secrets.token_urlsafe(nbytes)


def create_session(
    user_id: str,
    lifetime_seconds: int,
    user_agent: str = "",
    ip_address: str = "",
) -> dict[str, Any]:
    """
    Creates a new authenticated session record in PostgreSQL.

    Args:
        user_id: Internal UUID string for the authenticated user.
        lifetime_seconds: Maximum session validity window from creation.
        user_agent: Client user-agent string (truncated to 300 chars).
        ip_address: Client IP address (truncated to 64 chars).

    Returns:
        dict[str, Any]: Newly created session record containing `id`, `user_id`,
                        `csrf_token`, and `expires_at`.
    """
    session_id = _new_token(SESSION_ID_BYTES)
    csrf_token = _new_token(CSRF_TOKEN_BYTES)
    expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(seconds=lifetime_seconds)

    row = execute_returning(
        """
        INSERT INTO sessions (id, user_id, csrf_token, user_agent, ip_address, expires_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, user_id, csrf_token, expires_at
        """,
        (session_id, user_id, csrf_token, user_agent[:300], ip_address[:64], expires_at),
    )
    return row


def get_session(session_id: str) -> dict[str, Any] | None:
    """
    Retrieves and validates an active session by token identifier.

    Deletes expired sessions immediately upon detection. Updates `last_seen_at`
    only if at least 5 minutes have elapsed since the prior update to prevent
    database write amplification on high-frequency read requests.

    Args:
        session_id: Raw session token received from the browser cookie.

    Returns:
        dict[str, Any] | None: Validated session dictionary or None if invalid/expired.
    """
    if not session_id or not isinstance(session_id, str):
        return None

    row = fetch_one(
        "SELECT id, user_id, csrf_token, expires_at, last_seen_at FROM sessions WHERE id = %s",
        (session_id,),
    )
    if not row:
        return None

    now = datetime.datetime.now(datetime.UTC)
    if row["expires_at"] <= now:
        delete_session(session_id)
        return None

    # Sliding last-seen timestamp throttled to avoid WAL bloat on read queries
    last_seen = row.get("last_seen_at")
    should_update_seen = False
    if last_seen is None:
        should_update_seen = True
    else:
        # Normalize timezone if row returned a naive datetime
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=datetime.UTC)
        if (now - last_seen).total_seconds() > LAST_SEEN_UPDATE_INTERVAL_SECONDS:
            should_update_seen = True

    if should_update_seen:
        execute("UPDATE sessions SET last_seen_at = now() WHERE id = %s", (session_id,))

    return row


def rotate_session(old_session_id: str, lifetime_seconds: int) -> dict[str, Any] | None:
    """
    Issues a brand-new session id and CSRF token for the same user while invalidating the old token.

    Employed on privilege-relevant operations and re-authentication to prevent session fixation.

    Args:
        old_session_id: Existing session identifier to invalidate.
        lifetime_seconds: Session duration in seconds for the newly issued token.

    Returns:
        dict[str, Any] | None: Newly issued session dictionary, or None if the old session was absent.
    """
    existing = fetch_one("SELECT user_id FROM sessions WHERE id = %s", (old_session_id,))
    delete_session(old_session_id)
    if not existing:
        return None
    return create_session(existing["user_id"], lifetime_seconds)


def delete_session(session_id: str) -> None:
    """
    Deletes a session record from the database by ID.

    Args:
        session_id: Token identifier of the session to terminate.
    """
    if session_id:
        execute("DELETE FROM sessions WHERE id = %s", (session_id,))


def delete_all_sessions_for_user(user_id: str) -> None:
    """
    Invalidates all active sessions for a designated user (e.g., password reset / revocation).

    Args:
        user_id: Internal UUID string for the target user.
    """
    if user_id:
        execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))


def purge_expired_sessions() -> int:
    """
    Deletes all expired session records from the database.

    Returns:
        int: Number of deleted expired session records.
    """
    return execute("DELETE FROM sessions WHERE expires_at <= now()")
