"""
RepForge OAuth State & Nonce Management Module.

Purpose:
    Provides cryptographically secure, atomic generation and consumption
    of OpenID Connect `state` and `nonce` parameters. Defends against:
      - Login CSRF: binds the authorization callback to the browser session.
      - Token Replay / ID Token Injection: binds the issued Google ID token
        to the user's specific cryptographic handshake via `nonce`.
      - TOCTOU Race Conditions: single-use tokens are consumed atomically
        via `DELETE ... RETURNING`.

Architecture:
    States are persisted in PostgreSQL with short TTL (10 minutes) and
    deleted immediately upon evaluation regardless of outcome.
"""

from __future__ import annotations

import datetime
import logging
import secrets

from database.db import execute, execute_returning

logger = logging.getLogger("repforge.auth.oauth_state")

STATE_BYTES = 24
NONCE_BYTES = 24
STATE_LIFETIME_SECONDS = 600  # 10 minutes


def create_oauth_state() -> tuple[str, str]:
    """
    Generates a cryptographically random OAuth state and OIDC nonce pair.

    Persists the pair in the database with an expiration timestamp.

    Returns:
        tuple[str, str]: (state, nonce) strings encoded in urlsafe base64.

    Raises:
        RuntimeError: If database execution fails.
    """
    state = secrets.token_urlsafe(STATE_BYTES)
    nonce = secrets.token_urlsafe(NONCE_BYTES)
    expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(seconds=STATE_LIFETIME_SECONDS)

    execute_returning(
        """
        INSERT INTO oauth_states (state, nonce, expires_at)
        VALUES (%s, %s, %s)
        RETURNING state
        """,
        (state, nonce, expires_at),
    )
    return state, nonce


def create_state() -> str:
    """
    Backward-compatible helper returning state string.

    Returns:
        str: The generated state token.
    """
    state, _ = create_oauth_state()
    return state


def consume_oauth_state(state: str) -> dict | None:
    """
    Atomically consumes and deletes an OAuth state from the database.

    Enforces single-use semantics by deleting the row immediately via
    `DELETE ... RETURNING` in a single query, preventing time-of-check to
    time-of-use (TOCTOU) race conditions from concurrent callback requests.

    Args:
        state: The raw state token received from the OAuth provider callback.

    Returns:
        dict | None: The deleted row dictionary containing `state`, `nonce`,
                     and `expires_at` if found and unexpired; None otherwise.
    """
    if not state or not isinstance(state, str):
        return None

    # Atomic single-statement consumption prevents concurrent double-spend
    row = execute_returning(
        """
        DELETE FROM oauth_states
        WHERE state = %s
        RETURNING state, nonce, expires_at
        """,
        (state,),
    )
    if not row:
        logger.warning("OAuth state verification failed: unknown or consumed state.")
        return None

    if row["expires_at"] <= datetime.datetime.now(datetime.UTC):
        logger.warning("OAuth state verification failed: expired state token.")
        return None

    return row


def consume_state(state: str) -> bool:
    """
    Validates that a state exists and has not expired (backward compatibility).

    Args:
        state: State parameter string to validate.

    Returns:
        bool: True if state was valid and unexpired; False otherwise.
    """
    return consume_oauth_state(state) is not None


def purge_expired_states() -> int:
    """
    Deletes all expired OAuth states from the database.

    Returns:
        int: Number of deleted expired state records.
    """
    return execute("DELETE FROM oauth_states WHERE expires_at <= now()")
