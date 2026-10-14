"""
RepForge Insecure Direct Object Reference (IDOR) & Tenant Isolation Tests.

Covers:
    - Cross-user exercise update rejection.
    - Cross-user exercise deletion rejection.
    - Cross-user goal deletion rejection.
    - Cross-user AI workout day insights rejection.
    - Complete exclusion of client-provided user IDs.
"""

from __future__ import annotations

from unittest.mock import patch


def test_user_cannot_update_other_users_exercise(auth_client, auth_session):
    """Verifies that updating an exercise belonging to another user returns 404 Not Found."""
    foreign_exercise_id = "99999999-9999-9999-9999-999999999999"
    update_payload = {
        "exercise_name": "Incline Dumbbell Press",
        "workout_type": "push",
        "sets": [{"reps": 8, "weight": 36.0}],
    }

    # update_exercise returns None when the user_id does not match the exercise owner
    with patch("database.queries_workouts.update_exercise", return_value=None) as mock_update:
        resp = auth_client.put(
            f"/api/workouts/exercises/{foreign_exercise_id}",
            json=update_payload,
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "not_found"

        # Crucial: verify that the service was called with the authenticated user's ID
        assert mock_update.call_count == 1
        call_args = mock_update.call_args[0]
        assert call_args[0] == auth_session["user_id"]
        assert call_args[1] == foreign_exercise_id
        assert call_args[2]["exercise_name"] == "Incline Dumbbell Press"


def test_user_cannot_delete_other_users_exercise(auth_client, auth_session):
    """Verifies that deleting an exercise belonging to another user returns 404 Not Found."""
    foreign_exercise_id = "88888888-8888-8888-8888-888888888888"

    # delete_exercise returns 0 when the user_id does not own the exercise
    with patch("database.queries_workouts.delete_exercise", return_value=0) as mock_delete:
        resp = auth_client.delete(
            f"/api/workouts/exercises/{foreign_exercise_id}",
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "not_found"
        mock_delete.assert_called_once_with(auth_session["user_id"], foreign_exercise_id)


def test_user_cannot_delete_other_users_goal(auth_client, auth_session):
    """Verifies that deleting a goal belonging to another user returns 404 Not Found."""
    foreign_goal_id = "77777777-7777-7777-7777-777777777777"

    # delete_goal returns 0 when user_id does not own the goal
    with patch("database.queries_goals.delete_goal", return_value=0) as mock_delete_goal:
        resp = auth_client.delete(
            f"/api/goals/{foreign_goal_id}",
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "not_found"
        mock_delete_goal.assert_called_once_with(auth_session["user_id"], foreign_goal_id)


def test_user_cannot_request_ai_insights_for_other_users_day(auth_client, auth_session):
    """Verifies that requesting AI analysis for a workout day owned by another user returns 404."""
    foreign_day_id = "66666666-6666-6666-6666-666666666666"

    # get_day_for_stats returns empty list when day does not belong to user
    with patch("database.queries_workouts.get_day_for_stats", return_value=[]):
        resp = auth_client.post(
            f"/api/ai/insights/{foreign_day_id}",
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "not_found"
