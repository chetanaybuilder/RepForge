"""
Central configuration for the RepForge Flask backend.

All secrets are read from environment variables only. Nothing in this file
is ever sent to the frontend. See .env.example at the project root for the
full list of variables this application expects.
"""

import os
import secrets
from pathlib import Path
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
    SESSION_SECRET = os.environ.get("SESSION_SECRET") or secrets.token_hex(32)
    SESSION_COOKIE_NAME = "repforge_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = IS_PRODUCTION
    SESSION_COOKIE_SAMESITE = os.environ.get(
        "SESSION_COOKIE_SAMESITE", "None" if IS_PRODUCTION else "Lax"
    )
    PERMANENT_SESSION_LIFETIME_SECONDS = int(
        os.environ.get("SESSION_LIFETIME_SECONDS", 60 * 60 * 24 * 7)  # 7 days
    )

    # --- Database (Supabase Postgres — connection only, NOT Supabase Auth) ---
    DATABASE_URL = os.environ.get("DATABASE_URL", "")

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.environ.get(
        "GOOGLE_REDIRECT_URI", "http://localhost:5000/auth/google/callback" if not IS_PRODUCTION else ""
    )
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

    # --- Gemini AI ---
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_TIMEOUT_SECONDS", 20))

    # --- URLs / CORS ---
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173" if not IS_PRODUCTION else "")
    BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000" if not IS_PRODUCTION else "")
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", FRONTEND_URL).split(",")
        if origin.strip()
    ]

    # --- Rate limiting ---
    RATELIMIT_DEFAULT = os.environ.get("RATELIMIT_DEFAULT", "200 per hour")
    RATELIMIT_AI = os.environ.get("RATELIMIT_AI", "10 per hour")
    RATELIMIT_AUTH = os.environ.get("RATELIMIT_AUTH", "20 per hour")
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")

    # --- Request limits ---
    MAX_CONTENT_LENGTH = 256 * 1024  # 256 KB is plenty for JSON workout payloads

    @classmethod
    def validate(cls):
        """Fail loudly and early if required production secrets are missing."""
        missing = []
        if cls.IS_PRODUCTION:
            for name in (
                "DATABASE_URL",
                "GOOGLE_CLIENT_ID",
                "GOOGLE_CLIENT_SECRET",
                "SESSION_SECRET",
            ):
                if not getattr(cls, name):
                    missing.append(name)
        if missing:
            raise RuntimeError(
                "Missing required environment variables for production: "
                + ", ".join(missing)
            )
