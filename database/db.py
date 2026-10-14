"""
RepForge Database Access Layer.

Purpose:
    Provides robust, pooled PostgreSQL database connectivity using psycopg2.
    Ensures parameterized SQL execution, connection liveness verification,
    exponential backoff under pool saturation, and strict isolation of tainted sockets.

Architecture:
    - ThreadedConnectionPool: Reusable connection pool scoped across thread workers.
    - Transaction Isolation: Automatically commits clean transactions and rolls back
      on unhandled exceptions. Tainted or aborted sockets are closed and pruned rather
      than recycled.
    - Graceful Shutdown: Hooks process exit to cleanly close all active pool sockets.
"""

from __future__ import annotations

import atexit
from collections.abc import Generator
from contextlib import contextmanager
import logging
import os
import time
from typing import Any

import psycopg2
from psycopg2 import pool
import psycopg2.extensions
import psycopg2.extras

logger = logging.getLogger("repforge.db")

_pool: pool.ThreadedConnectionPool | None = None
_db_url: str | None = None
_min_conn = 4
_max_conn = 50


def init_pool(
    database_url: str | None = None,
    minconn: int | None = None,
    maxconn: int | None = None,
) -> pool.ThreadedConnectionPool:
    """
    Initializes the application-wide PostgreSQL connection pool.

    Args:
        database_url: Libpq connection string. If omitted, uses previously configured URL.
        minconn: Minimum connections kept warm in pool (defaults to DB_MIN_CONNECTIONS or 4).
        maxconn: Maximum pool concurrency cap (defaults to DB_MAX_CONNECTIONS or 50).

    Returns:
        pool.ThreadedConnectionPool: Configured psycopg2 pool instance.

    Raises:
        RuntimeError: If DATABASE_URL is unspecified.
    """
    global _pool, _db_url, _min_conn, _max_conn
    if database_url:
        _db_url = database_url
    if not _db_url:
        raise RuntimeError("DATABASE_URL is not set")

    _min_conn = minconn if minconn is not None else int(os.environ.get("DB_MIN_CONNECTIONS", 4))
    _max_conn = maxconn if maxconn is not None else int(os.environ.get("DB_MAX_CONNECTIONS", 50))

    if _pool is not None:
        try:
            _pool.closeall()
        except Exception:
            pass

    _pool = psycopg2.pool.ThreadedConnectionPool(_min_conn, _max_conn, dsn=_db_url)
    logger.info("Database connection pool initialized (min=%d, max=%d)", _min_conn, _max_conn)
    return _pool


def close_pool() -> None:
    """
    Closes all active and idle database connections in the connection pool.

    Invoked on process teardown or Gunicorn worker exit to prevent connection socket leaks.
    """
    global _pool
    if _pool is not None:
        try:
            _pool.closeall()
            logger.info("Database connection pool closed successfully.")
        except Exception as exc:
            logger.warning("Error closing connection pool: %s", exc)
        _pool = None


# Register atexit handler so process shutdown releases PostgreSQL sockets cleanly
atexit.register(close_pool)


def _is_connection_healthy(conn: psycopg2.extensions.connection) -> bool:
    """
    Validates connection liveness before dispatching it to a transaction.

    Args:
        conn: Psycopg2 connection instance.

    Returns:
        bool: True if connection is responsive and transaction state is idle; False otherwise.
    """
    if conn is None or getattr(conn, "closed", 1) != 0:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        return True
    except Exception:
        return False


@contextmanager
def get_connection(max_retries: int = 4) -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Context manager checking out a validated, healthy connection from the pool.

    Retries with exponential backoff on pool saturation. Automatically prunes stale
    cloud sockets. Discards corrupted or aborted connections on exit rather than
    re-injecting them into the pool.

    Args:
        max_retries: Maximum checkout attempts on pool contention.

    Yields:
        psycopg2.extensions.connection: Validated database connection.

    Raises:
        RuntimeError: If pool is uninitialized or unavailable after max retries.
    """
    global _pool
    if _pool is None:
        raise RuntimeError("Database pool has not been initialized")

    conn: psycopg2.extensions.connection | None = None
    last_err: Exception | None = None

    for attempt in range(max_retries):
        try:
            conn = _pool.getconn()
            if _is_connection_healthy(conn):
                break
            else:
                logger.warning("Stale database connection detected. Pruning from pool.")
                try:
                    _pool.putconn(conn, close=True)
                except Exception:
                    pass
                conn = None
        except pool.PoolError as exc:
            last_err = exc
            logger.warning(
                "Connection pool saturated (attempt %d/%d). Backing off...",
                attempt + 1,
                max_retries,
            )
            time.sleep(0.06 * (2**attempt))
        except Exception as exc:
            last_err = exc
            logger.warning("Database checkout error: %s", exc)
            time.sleep(0.05)

    if conn is None:
        raise RuntimeError(f"Database connection pool unavailable after {max_retries} attempts: {last_err}")

    rollback_failed = False
    try:
        yield conn
        conn.commit()
    except Exception:
        if conn and getattr(conn, "closed", 1) == 0:
            try:
                conn.rollback()
            except Exception as rb_exc:
                logger.warning("Database rollback failed: %s", rb_exc)
                rollback_failed = True
        raise
    finally:
        if conn is not None and _pool is not None:
            try:
                # If connection was closed, rollback failed, or transaction entered error state,
                # discard the socket entirely to prevent dirty socket reuse.
                is_corrupted = (
                    getattr(conn, "closed", 1) != 0
                    or rollback_failed
                    or getattr(conn, "status", None) == psycopg2.extensions.TRANSACTION_STATUS_ERROR
                )
                if is_corrupted:
                    _pool.putconn(conn, close=True)
                else:
                    _pool.putconn(conn)
            except Exception as exc:
                logger.error("Error returning connection to pool: %s", exc)


@contextmanager
def get_cursor(dict_cursor: bool = True) -> Generator[psycopg2.extensions.cursor, None, None]:
    """
    Context manager yielding a cursor within a managed connection context.

    Args:
        dict_cursor: If True, uses RealDictCursor for row-as-dict mappings.

    Yields:
        psycopg2.extensions.cursor: Active database cursor.
    """
    with get_connection() as conn:
        cursor_factory = psycopg2.extras.RealDictCursor if dict_cursor else None
        cur = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cur
        finally:
            cur.close()


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    """
    Executes a query returning at most one row.

    Args:
        query: SQL query string with parameter placeholders (`%s`).
        params: Tuple of bind variables.

    Returns:
        dict[str, Any] | None: Single record dictionary or None if empty.
    """
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    """
    Executes a query returning all matching rows.

    Args:
        query: SQL query string with parameter placeholders (`%s`).
        params: Tuple of bind variables.

    Returns:
        list[dict[str, Any]]: List of record dictionaries.
    """
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def execute(query: str, params: tuple[Any, ...] = ()) -> int:
    """
    Executes an INSERT, UPDATE, or DELETE query and returns the affected row count.

    Args:
        query: SQL query string with parameter placeholders (`%s`).
        params: Tuple of bind variables.

    Returns:
        int: Number of affected rows.
    """
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.rowcount


def execute_returning(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    """
    Executes a query with RETURNING clause and returns the single affected record.

    Args:
        query: SQL query string ending in `RETURNING ...`.
        params: Tuple of bind variables.

    Returns:
        dict[str, Any] | None: Returned row dictionary or None.
    """
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone()


def health_check() -> bool:
    """
    Executes a lightweight query to verify active database connectivity.

    Returns:
        bool: True if query executes successfully; False otherwise.
    """
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Database health check failed: %s", exc)
        return False
