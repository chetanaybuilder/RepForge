"""
Unit and Integration Tests for RepForge Exercise Library.

Tests:
    - Exercise catalog searching, taxonomy filtering, and pagination.
    - Exercise details retrieval and 404 handling.
    - User favorites toggle (authentication and CSRF enforcement).
    - Image route path traversal defenses and security bounds.
"""

from __future__ import annotations

from unittest.mock import patch


def test_list_exercises_endpoint(client):
    """Verifies public catalog search and pagination response structure."""
    mock_result = {
        "items": [
            {
                "id": "Barbell_Bench_Press",
                "name": "Barbell Bench Press",
                "equipment": "barbell",
                "primary_muscles": ["chest"],
                "secondary_muscles": ["triceps", "shoulders"],
                "instructions": ["Lie on bench", "Press barbell"],
                "is_favorite": False,
            }
        ],
        "total": 1,
        "limit": 30,
        "offset": 0,
    }

    with patch("database.queries_exercises.list_exercises", return_value=mock_result):
        resp = client.get("/api/exercises?search=bench&muscle=chest")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Barbell Bench Press"


def test_get_exercise_filters_endpoint(client):
    """Verifies taxonomy options for equipment, categories, and muscles."""
    mock_filters = {
        "equipment": ["barbell", "dumbbell"],
        "categories": ["strength", "olympic weightlifting"],
        "muscles": ["chest", "biceps", "quads"],
    }

    with patch("database.queries_exercises.get_exercise_filter_options", return_value=mock_filters):
        resp = client.get("/api/exercises/filters")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "barbell" in data["equipment"]
        assert "chest" in data["muscles"]


def test_get_exercise_detail_success(client):
    """Verifies detailed exercise metadata retrieval."""
    mock_exercise = {
        "id": "Barbell_Squat",
        "name": "Barbell Squat",
        "category": "strength",
        "primary_muscles": ["quads"],
        "instructions": ["Unrack bar", "Squat to parallel"],
    }

    with patch("database.queries_exercises.get_exercise_by_id", return_value=mock_exercise):
        resp = client.get("/api/exercises/Barbell_Squat")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["exercise"]["name"] == "Barbell Squat"


def test_get_exercise_detail_not_found(client):
    """Verifies 404 response on non-existent exercise query."""
    with patch("database.queries_exercises.get_exercise_by_id", return_value=None):
        resp = client.get("/api/exercises/Non_Existent_Movement")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["error"]["code"] == "not_found"


def test_toggle_favorite_requires_auth(client):
    """Ensures unauthenticated users cannot toggle favorites."""
    resp = client.post("/api/exercises/Barbell_Bench_Press/favorite")
    assert resp.status_code == 401


def test_toggle_favorite_success(auth_client, auth_session):
    """Ensures authenticated user with CSRF token can toggle favorites."""
    mock_exercise = {"id": "Barbell_Bench_Press", "name": "Barbell Bench Press"}
    mock_toggle = {"exercise_id": "Barbell_Bench_Press", "is_favorite": True}

    with (
        patch("database.queries_exercises.get_exercise_by_id", return_value=mock_exercise),
        patch("database.queries_exercises.toggle_favorite", return_value=mock_toggle),
    ):
        resp = auth_client.post(
            "/api/exercises/Barbell_Bench_Press/favorite",
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_favorite"] is True


def test_image_path_traversal_defense(client):
    """Verifies strict path traversal defense rejects malicious URI strings."""
    resp = client.get("/api/exercises/images/..%2f..%2fetc/passwd.jpg")
    assert resp.status_code in (400, 404)

    resp2 = client.get("/api/exercises/images/subdir/../../secret.jpg")
    assert resp2.status_code in (400, 404)
