"""
Central configuration for the RepForge Flask backend.

All secrets are read from environment variables only. Nothing in this file
is ever sent to the frontend. See .env.example at the project root for the
full list of variables this application expects.
"""

import os
from pathlib import Path
import secrets

from dotenv import load_dotenv

_root_env = Path(__file__).resolve().parent / ".env"
if _root_env.exists():
    load_dotenv(_root_env)


def _get_bool(name: str, default: bool = False) -> bool:
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


class Config:
    # --- Core ---
    ENV = os.environ.get("FLASK_ENV", "production")
    IS_PRODUCTION = ENV == "production"
    DEBUG = not IS_PRODUCTION

    # --- Session / security ---
    # SESSION_SECRET is required in production. In development we generate a
    # throwaway one so the app can still boot, but it changes every restart
    # (all sessions are invalidated), which is intentional — it stops anyone
    # from accidentally relying on a weak default secret in real use.
    _raw_session_secret = os.environ.get("SESSION_SECRET")
    SESSION_SECRET = _raw_session_secret or secrets.token_hex(32)
    SESSION_COOKIE_NAME = "repforge_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = IS_PRODUCTION
    # SameSite=Lax prevents cross-site request leakage while maintaining normal top-level navigation.
    # SameSite=None is never safe when frontend and backend share origins or use direct APIs.
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    PERMANENT_SESSION_LIFETIME_SECONDS = int(
        os.environ.get("SESSION_LIFETIME_SECONDS", 60 * 60 * 24 * 7)  # 7 days
    )

    # --- Database (PostgreSQL — connection pool only) ---
    DATABASE_URL = os.environ.get("DATABASE_URL", "")
    DB_MIN_CONNECTIONS = int(os.environ.get("DB_MIN_CONNECTIONS", 4))
    DB_MAX_CONNECTIONS = int(os.environ.get("DB_MAX_CONNECTIONS", 50))

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:5000/auth/google/callback")
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

    # --- Groq Coach Engine ---
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_TIMEOUT_SECONDS = int(os.environ.get("GROQ_TIMEOUT_SECONDS", 25))

    # --- URLs / CORS ---
    # CORS is only needed if you run frontend/backend on separate domains.
    # By default, they share the same origin, so CORS is not needed.
    CORS_ORIGINS = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip()]

    # --- Rate limiting ---
    # Multi-worker Gunicorn requires a shared backend (Redis) so limits are not
    # bypassed by round-robining across worker OS processes.
    RATELIMIT_DEFAULT = os.environ.get("RATELIMIT_DEFAULT", "200 per hour")
    RATELIMIT_AI = os.environ.get("RATELIMIT_AI", "10 per hour")
    RATELIMIT_AUTH = os.environ.get("RATELIMIT_AUTH", "20 per hour")
    RATELIMIT_STORAGE_URI = os.environ.get(
        "RATELIMIT_STORAGE_URI",
        os.environ.get("REDIS_URL", "memory://"),
    )

    # --- Request limits ---
    MAX_CONTENT_LENGTH = 256 * 1024  # 256 KB is plenty for JSON workout payloads

    @classmethod
    def validate(cls):
        """
        Validates required environment variables on startup.

        Raises:
            RuntimeError: If any mandatory production secret or configuration is missing.
        """
        missing = []
        if cls.IS_PRODUCTION:
            for name in (
                "DATABASE_URL",
                "GOOGLE_CLIENT_ID",
                "GOOGLE_CLIENT_SECRET",
            ):
                if not getattr(cls, name):
                    missing.append(name)
            # Enforce that SESSION_SECRET was explicitly configured in the environment
            if not cls._raw_session_secret:
                missing.append("SESSION_SECRET")

        if missing:
            raise RuntimeError("Missing required environment variables for production: " + ", ".join(missing))
