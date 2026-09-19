"""
Server-side sessions.

The browser cookie holds nothing but a long random opaque token. All real
session state — which user it belongs to, when it expires, the CSRF token
bound to it — lives in the `sessions` table. This means:

  * A copied cookie value is useless once the row is deleted or expired.
  * Logout is instant and total (row deleted server-side).
  * We can rotate the session id on privilege-relevant events without
    losing session data.
"""

import datetime
import secrets

from backend.database.db import fetch_one, execute, execute_returning

SESSION_ID_BYTES = 32
CSRF_TOKEN_BYTES = 32


def _new_token(nbytes: int) -> str:
    return secrets.token_urlsafe(nbytes)


def create_session(user_id: str, lifetime_seconds: int, user_agent: str = "", ip_address: str = "") -> dict:
    session_id = _new_token(SESSION_ID_BYTES)
    csrf_token = _new_token(CSRF_TOKEN_BYTES)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=lifetime_seconds)

    row = execute_returning(
        """
        INSERT INTO sessions (id, user_id, csrf_token, user_agent, ip_address, expires_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, user_id, csrf_token, expires_at
        """,
        (session_id, user_id, csrf_token, user_agent[:300], ip_address[:64], expires_at),
    )
    return row


def get_session(session_id: str):
    if not session_id:
        return None
    row = fetch_one(
        "SELECT id, user_id, csrf_token, expires_at FROM sessions WHERE id = %s",
        (session_id,),
    )
    if not row:
        return None
    if row["expires_at"] <= datetime.datetime.now(datetime.timezone.utc):
        delete_session(session_id)
        return None
    # Sliding last-seen timestamp (does not extend expiry — expiry is fixed
    # at creation so a stolen-but-idle session doesn't live forever).
    execute("UPDATE sessions SET last_seen_at = now() WHERE id = %s", (session_id,))
    return row


def rotate_session(old_session_id: str, lifetime_seconds: int) -> dict:
    """Issue a brand new session id/CSRF token for the same user, and
    invalidate the old one. Used on login to prevent session fixation."""
    existing = fetch_one("SELECT user_id FROM sessions WHERE id = %s", (old_session_id,))
    delete_session(old_session_id)
    if not existing:
        return None
    return create_session(existing["user_id"], lifetime_seconds)


def delete_session(session_id: str):
    if session_id:
        execute("DELETE FROM sessions WHERE id = %s", (session_id,))


def delete_all_sessions_for_user(user_id: str):
    execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))


def purge_expired_sessions():
    execute("DELETE FROM sessions WHERE expires_at <= now()")
