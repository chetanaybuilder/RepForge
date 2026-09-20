"""
OAuth `state` parameter handling.

The state value is generated server-side, stored with a short expiry, and
must be echoed back exactly by Google on the callback. This stops an
attacker from tricking a victim's browser into completing an OAuth flow
initiated by the attacker (login CSRF).
"""

import datetime
import secrets

from database.db import fetch_one, execute

STATE_BYTES = 24
STATE_LIFETIME_SECONDS = 600  # 10 minutes is plenty for a user to complete Google's consent screen


def create_state() -> str:
    state = secrets.token_urlsafe(STATE_BYTES)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=STATE_LIFETIME_SECONDS)
    execute("INSERT INTO oauth_states (state, expires_at) VALUES (%s, %s)", (state, expires_at))
    return state


def consume_state(state: str) -> bool:
    """Validates the state exists, hasn't expired, and can only ever be
    used once (deleted immediately on first use, whether valid or not)."""
    if not state:
        return False
    row = fetch_one("SELECT state, expires_at FROM oauth_states WHERE state = %s", (state,))
    execute("DELETE FROM oauth_states WHERE state = %s", (state,))
    if not row:
        return False
    return row["expires_at"] > datetime.datetime.now(datetime.timezone.utc)


def purge_expired_states():
    execute("DELETE FROM oauth_states WHERE expires_at <= now()")
