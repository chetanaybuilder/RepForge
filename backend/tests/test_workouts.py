"""
RepForge Workout Routes & Validation Tests.

Covers:
    - Workout day creation and strict schema bounds (anti-DoS limits on exercises and sets).
    - Handling of null weights and boundary reps/weights.
    - Safe query pagination and limit bounding.
    - Exercise update and deletion workflows.
"""

from __future__ import annotations

from unittest.mock import patch


def test_create_workout_day_success(auth_client, auth_session):
    """Happy path: creating a valid workout session day."""
    payload = {
        "date": "2026-10-14",
        "day": "Push Heavy",
        "exercises": [
            {
                "exercise_name": "Overhead Press",
                "workout_type": "push",
                "notes": "Felt explosive",
                "sets": [
                    {"reps": 5, "weight": 70.0, "completed": True},
                    {"reps": 5, "weight": 70.0, "completed": True},
                ],
            }
        ],
    }

    mock_response = {
        "id": "day-uuid-1",
        "user_id": auth_session["user_id"],
        "date": "2026-10-14",
        "day": "Push Heavy",
        "exercises": payload["exercises"],
    }

    with patch("database.queries_workouts.create_workout_day", return_value=mock_response):
        resp = auth_client.post(
            "/api/workouts",
            json=payload,
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["workout"]["id"] == "day-uuid-1"


def test_update_workout_day_success(auth_client, auth_session):
    """Replaces a full owned session while retaining its day identity."""
    payload = {
        "date": "2026-10-15",
        "day": "Upper Strength",
        "exercises": [
            {
                "exercise_name": "Bench Press",
                "workout_type": "push",
                "notes": "Paused reps",
                "sets": [{"reps": 5, "weight": 80, "completed": True}],
            }
        ],
    }
    updated = {"id": "day-uuid-1", **payload, "day_number": 2}

    with patch("database.queries_workouts.update_workout_day", return_value=updated) as mock_update:
        resp = auth_client.put(
            "/api/workouts/day-uuid-1",
            json=payload,
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )

    assert resp.status_code == 200
    assert resp.get_json()["workout"]["id"] == "day-uuid-1"
    called_user_id, called_day_id, called_payload = mock_update.call_args.args
    assert called_user_id == auth_session["user_id"]
    assert called_day_id == "day-uuid-1"
    assert called_payload["date"] == payload["date"]
    assert called_payload["day"] == payload["day"]
    assert called_payload["exercises"][0]["sets"][0] == {
        "reps": 5,
        "set_number": 1,
        "weight": 80.0,
        "weight_kg": 80.0,
        "completed": True,
    }


def test_update_workout_day_not_found(auth_client, auth_session):
    with patch("database.queries_workouts.update_workout_day", return_value=None):
        resp = auth_client.put(
            "/api/workouts/missing-day",
            json={
                "date": "2026-10-15",
                "day": None,
                "exercises": [
                    {
                        "exercise_name": "Bench Press",
                        "workout_type": "push",
                        "sets": [{"reps": 5, "weight": 80}],
                    }
                ],
            },
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
    assert resp.status_code == 404


def test_create_workout_rejects_empty_or_excessive_exercises(auth_client, auth_session):
    """Anti-DoS: reject empty exercises array or more than 30 exercises."""
    # 0 exercises
    resp_empty = auth_client.post(
        "/api/workouts",
        json={"date": "2026-10-14", "exercises": []},
        headers={"X-CSRF-Token": auth_session["csrf_token"]},
    )
    assert resp_empty.status_code == 400
    assert resp_empty.get_json()["error"]["code"] == "validation_error"

    # 31 exercises (exceeds MAX_EXERCISES_PER_DAY = 30)
    huge_exercises = [
        {"exercise_name": f"Ex {i}", "workout_type": "push", "sets": [{"reps": 10, "weight": 50}]} for i in range(31)
    ]
    resp_huge = auth_client.post(
        "/api/workouts",
        json={"date": "2026-10-14", "exercises": huge_exercises},
        headers={"X-CSRF-Token": auth_session["csrf_token"]},
    )
    assert resp_huge.status_code == 400
    assert "between 1 and 30 exercises" in resp_huge.get_json()["error"]["message"]


def test_create_workout_rejects_excessive_sets(auth_client, auth_session):
    """Anti-DoS: reject more than 50 sets per exercise."""
    huge_sets = [{"reps": 5, "weight": 50} for _ in range(51)]
    payload = {
        "date": "2026-10-14",
        "exercises": [{"exercise_name": "Curl", "workout_type": "pull", "sets": huge_sets}],
    }
    resp = auth_client.post(
        "/api/workouts",
        json=payload,
        headers={"X-CSRF-Token": auth_session["csrf_token"]},
    )
    assert resp.status_code == 400
    assert "between 1 and 50 sets" in resp.get_json()["error"]["message"]


def test_create_workout_handles_null_weight_safely(auth_client, auth_session):
    """Null weights in client JSON payload are normalized safely to 0.0 without crash."""
    payload = {
        "date": "2026-10-14",
        "exercises": [
            {
                "exercise_name": "Bodyweight Pullups",
                "workout_type": "pull",
                "sets": [{"reps": 12, "weight": None}],
            }
        ],
    }

    with patch("database.queries_workouts.create_workout_day") as mock_create:
        mock_create.return_value = {"id": "day-1", "exercises": []}
        resp = auth_client.post(
            "/api/workouts",
            json=payload,
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 201
        called_payload = mock_create.call_args[0][1]
        assert called_payload["exercises"][0]["sets"][0]["weight"] == 0.0


def test_list_workouts_bounds_limit_parameter(auth_client):
    """Verifies limit parameter is bounded (max 500, min 1) without SQL syntax crash."""
    with patch("database.queries_workouts.list_workout_days", return_value=[]) as mock_list:
        # Negative limit bounds to 1
        resp = auth_client.get("/api/workouts?limit=-10")
        assert resp.status_code == 200
        assert mock_list.call_args[1]["limit"] == 1

        # Massive limit bounds to 500
        resp = auth_client.get("/api/workouts?limit=99999")
        assert resp.status_code == 200
        assert mock_list.call_args[1]["limit"] == 500


def test_recent_workouts_handles_non_integer_limit(auth_client):
    """Verifies /api/workouts/recent gracefully falls back to default on invalid limit."""
    with patch("database.queries_workouts.list_workout_days", return_value=[]) as mock_list:
        resp = auth_client.get("/api/workouts/recent?limit=invalid_string")
        assert resp.status_code == 200
        assert mock_list.call_args[1]["limit"] == 10
