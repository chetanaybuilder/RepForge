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

logger = logging.getLogger("repforge.db")

_pool = None


def init_pool(database_url: str, minconn: int = 1, maxconn: int = 10):
    global _pool
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    _pool = psycopg2.pool.ThreadedConnectionPool(minconn, maxconn, dsn=database_url)
    logger.info("Database connection pool initialized")
    return _pool


def close_pool():
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_connection():
    if _pool is None:
        raise RuntimeError("Database pool has not been initialized")
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


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
