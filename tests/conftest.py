"""
RepForge Pytest Configuration & Test Fixtures.

Purpose:
    Provides hermetic, isolated test application instances, mock session state,
    and authenticated client fixtures for comprehensive security and routing tests.
"""

from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest

from app import create_app
from config import Config


class TestConfig(Config):
    ENV = "testing"
    IS_PRODUCTION = False
    DEBUG = False
    TESTING = True
    SESSION_SECRET = "test-secret-key-12345678901234567890"
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = "Lax"
    DATABASE_URL = ""  # Keep empty to prevent network connection attempts during unit tests
    RATELIMIT_STORAGE_URI = "memory://"
    GOOGLE_CLIENT_ID = "mock-google-client-id"
    GOOGLE_CLIENT_SECRET = "mock-google-client-secret"
    GROQ_API_KEY = "mock-groq-key"
    GROQ_MODEL = "llama-3.3-70b-versatile"


@pytest.fixture
def app():
    """Constructs a test Flask app configured with in-memory limits and test secrets."""
    with patch("app.init_pool"), patch("database.db.init_pool"):
        test_app = create_app(TestConfig)
        test_app.config["TESTING"] = True
        yield test_app


@pytest.fixture
def client(app):
    """Unauthenticated Flask test client."""
    return app.test_client()


@pytest.fixture
def mock_user_1():
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "athlete1@repforge.test",
        "name": "Athlete One",
        "avatar_url": "https://repforge.test/avatar1.png",
    }


@pytest.fixture
def mock_user_2():
    return {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "athlete2@repforge.test",
        "name": "Athlete Two",
        "avatar_url": "https://repforge.test/avatar2.png",
    }


@pytest.fixture
def auth_session(mock_user_1):
    return {
        "id": "mock_session_token_12345",
        "user_id": mock_user_1["id"],
        "csrf_token": "mock_csrf_token_secret_xyz",
        "expires_at": datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=7),
    }


@pytest.fixture
def auth_client(client, mock_user_1, auth_session):
    """
    Authenticated test client for mock_user_1.

    Pre-sets the session cookie and patches session lookup and user queries across all modules.
    """
    client.set_cookie("repforge_session", auth_session["id"])

    with (
        patch("auth.decorators.get_session", return_value=auth_session),
        patch("auth.session_store.get_session", return_value=auth_session),
        patch("auth.decorators.get_user_by_id", return_value=mock_user_1),
        patch("routes.auth_routes.get_user_by_id", return_value=mock_user_1),
        patch("database.queries_users.get_user_by_id", return_value=mock_user_1),
    ):
        yield client
