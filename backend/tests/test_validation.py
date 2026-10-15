"""
RepForge Schema Validation & Routing Isolation Tests.

Covers:
    - Pure unit validation tests for payload normalization and boundary enforcement.
    - XSS tag stripping and whitespace sanitization.
    - Rejection of future dates.
    - Catch-all SPA route isolation (verifying /api/* and /auth/* return JSON 404, not HTML).
"""

from __future__ import annotations

import datetime

import pytest

from utils.errors import ApiError
from utils.validation import (
    validate_workout_day_payload,
)


def test_validation_strips_html_tags():
    """Verifies that HTML tags are removed from text inputs to prevent stored XSS."""
    payload = {
        "date": "2026-10-14",
        "day": "<script>alert('xss')</script>Leg Day",
        "exercises": [
            {
                "exercise_name": "<b>Deadlift</b>",
                "workout_type": "pull",
                "notes": "<iframe src='evil.com'></iframe>Great set",
                "sets": [{"reps": 5, "weight": 180}],
            }
        ],
    }
    cleaned = validate_workout_day_payload(payload)
    assert cleaned["day"] == "alert('xss')Leg Day"
    assert cleaned["exercises"][0]["exercise_name"] == "Deadlift"
    assert cleaned["exercises"][0]["notes"] == "Great set"


def test_validation_rejects_future_dates():
    """Workout dates far in the future must be rejected."""
    far_future = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
    payload = {
        "date": far_future,
        "exercises": [
            {
                "exercise_name": "Bench Press",
                "workout_type": "push",
                "sets": [{"reps": 10, "weight": 100}],
            }
        ],
    }
    with pytest.raises(ApiError, match="date cannot be in the future"):
        validate_workout_day_payload(payload)


def test_validation_rejects_excessive_reps():
    """Reps exceeding MAX_REPS (200) are rejected."""
    payload = {
        "date": "2026-10-14",
        "exercises": [
            {
                "exercise_name": "Calf Raises",
                "workout_type": "legs",
                "sets": [{"reps": 9999, "weight": 20}],
            }
        ],
    }
    with pytest.raises(ApiError, match="reps must be a whole number between 1 and 200"):
        validate_workout_day_payload(payload)


def test_validation_rejects_excessive_weight():
    """Weights exceeding MAX_WEIGHT_KG (1000kg) are rejected."""
    payload = {
        "date": "2026-10-14",
        "exercises": [
            {
                "exercise_name": "Leg Press",
                "workout_type": "legs",
                "sets": [{"reps": 10, "weight": 5000}],
            }
        ],
    }
    with pytest.raises(ApiError, match="weight must be a number between 0 and 1000 kg"):
        validate_workout_day_payload(payload)


def test_spa_catch_all_route_returns_json_404_for_api_and_auth(client):
    """
    CRITICAL AUDIT FIX: Nonexistent /api/* or /auth/* routes must return a JSON 404,
    not 200 OK with index.html.
    """
    resp_api = client.get("/api/this-endpoint-does-not-exist")
    assert resp_api.status_code == 404
    assert resp_api.is_json
    assert resp_api.get_json()["error"]["code"] == "not_found"

    resp_auth = client.get("/auth/nonexistent-oauth-route")
    assert resp_auth.status_code == 404
    assert resp_auth.is_json
    assert resp_auth.get_json()["error"]["code"] == "not_found"
