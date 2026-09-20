"""
Thin PostgreSQL access layer.

IMPORTANT: Supabase is used here strictly as a PostgreSQL database. We
connect with a normal libpq connection string (DATABASE_URL) and issue
parameterized SQL. Supabase's Auth product, client SDK sessions, and RLS
policies that depend on Supabase Auth's JWTs are NOT used — Flask owns
authentication entirely, and every query below explicitly filters by the
authenticated user's internal id.
"""

import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from psycopg2 import pool

import time
import os

logger = logging.getLogger("repforge.db")

_pool = None
_db_url = None
_min_conn = 4
_max_conn = 50


def init_pool(database_url: str = None, minconn: int = None, maxconn: int = None):
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


def close_pool():
    global _pool
    if _pool is not None:
        try:
            _pool.closeall()
        except Exception as exc:
            logger.warning("Error closing connection pool: %s", exc)
        _pool = None


def _is_connection_healthy(conn) -> bool:
    """Validate connection liveness before handing it to a transaction."""
    if conn is None or getattr(conn, "closed", 1) != 0:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        return True
    except Exception:
        return False


@contextmanager
def get_connection(max_retries: int = 4):
    """
    Check out a healthy, validated connection from the pool.
    If the pool is under high concurrent load (50-100 users), retries with
    exponential backoff rather than immediately dropping the request.
    Automatically prunes stale cloud sockets (e.g. Supabase/Neon timeouts).
    """
    global _pool
    if _pool is None:
        raise RuntimeError("Database pool has not been initialized")

    conn = None
    last_err = None

    for attempt in range(max_retries):
        try:
            conn = _pool.getconn()
            if _is_connection_healthy(conn):
                break
            else:
                # Connection dropped by cloud server — prune it cleanly
                logger.warning("Stale database connection detected. Pruning from pool.")
                try:
                    _pool.putconn(conn, close=True)
                except Exception:
                    pass
                conn = None
        except pool.PoolError as exc:
            last_err = exc
            logger.warning("Connection pool saturated (attempt %d/%d). Backing off...", attempt + 1, max_retries)
            time.sleep(0.06 * (2 ** attempt))
        except Exception as exc:
            last_err = exc
            logger.warning("Database checkout error: %s", exc)
            time.sleep(0.05)

    if conn is None:
        raise RuntimeError(f"Database connection pool unavailable after {max_retries} attempts: {last_err}")

    try:
        yield conn
        conn.commit()
    except Exception:
        if conn and not getattr(conn, "closed", 1):
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        if conn is not None and _pool is not None:
            try:
                # If connection was corrupted, close it instead of returning dirty socket
                if getattr(conn, "closed", 1) != 0:
                    _pool.putconn(conn, close=True)
                else:
                    _pool.putconn(conn)
            except Exception as exc:
                logger.error("Error returning connection to pool: %s", exc)


@contextmanager
def get_cursor(dict_cursor: bool = True):
    with get_connection() as conn:
        cursor_factory = psycopg2.extras.RealDictCursor if dict_cursor else None
        cur = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cur
        finally:
            cur.close()


def fetch_one(query: str, params: tuple = ()):
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone()


def fetch_all(query: str, params: tuple = ()):
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def execute(query: str, params: tuple = ()):
    """For INSERT/UPDATE/DELETE that don't need a returned row."""
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.rowcount


def execute_returning(query: str, params: tuple = ()):
    """For INSERT/UPDATE ... RETURNING ... that needs the affected row back."""
    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone()


def health_check() -> bool:
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Database health check failed: %s", exc)
        return False
