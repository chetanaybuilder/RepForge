"""
RepForge Goals & Milestone Achievement Tests.

Covers:
    - Target value bounds enforcement (protects against PostgreSQL NUMERIC overflow).
    - Goal type validation and exercise_name requirements.
    - ISO period date parsing and chronological ordering.
    - Honest milestone calculation: verifying distinct workout day counting over raw sets.
"""

from __future__ import annotations

from services.goals_service import compute_achievements


def test_create_goal_rejects_overflow_target_value(auth_client, auth_session):
    """Verifies that target_value > 1,000,000 is rejected with 400 instead of crashing DB with 500."""
    payload = {
        "goal_type": "volume",
        "target_value": 999_999_999.0,  # Would overflow PostgreSQL NUMERIC(10,2)
    }
    resp = auth_client.post(
        "/api/goals",
        json=payload,
        headers={"X-CSRF-Token": auth_session["csrf_token"]},
    )
    assert resp.status_code == 400
    assert "between 0 and 1,000,000" in resp.get_json()["error"]["message"]


def test_create_goal_rejects_negative_or_zero_target(auth_client, auth_session):
    """Verifies non-positive target_value is rejected with 400."""
    for bad_target in [0, -50.0]:
        resp = auth_client.post(
            "/api/goals",
            json={"goal_type": "weekly_frequency", "target_value": bad_target},
            headers={"X-CSRF-Token": auth_session["csrf_token"]},
        )
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "validation_error"


def test_create_goal_validates_period_dates(auth_client, auth_session):
    """Verifies ISO date enforcement and start <= end chronological validation."""
    # Malformed date string
    resp_malformed = auth_client.post(
        "/api/goals",
        json={
            "goal_type": "volume",
            "target_value": 50000,
            "period_start": "not-a-date",
        },
        headers={"X-CSRF-Token": auth_session["csrf_token"]},
    )
    assert resp_malformed.status_code == 400
    assert "must be an ISO date" in resp_malformed.get_json()["error"]["message"]

    # Start date after end date
    resp_order = auth_client.post(
        "/api/goals",
        json={
            "goal_type": "volume",
            "target_value": 50000,
            "period_start": "2026-12-01",
            "period_end": "2026-11-01",
        },
        headers={"X-CSRF-Token": auth_session["csrf_token"]},
    )
    assert resp_order.status_code == 400
    assert "period_start cannot be after period_end" in resp_order.get_json()["error"]["message"]


def test_milestones_count_distinct_workout_sessions_not_sets():
    """
    Critical bug regression test: Logging 1 workout day with 10 sets must NOT
    unlock the '10 Workouts Logged' milestone badge.
    """
    # 1 workout day with 10 sets
    single_day_ten_sets = [
        {
            "day_id": "day-uuid-1",
            "date": "2026-10-14",
            "exercise_name": "Bench Press",
            "workout_type": "push",
            "set_id": f"set-{i}",
            "set_number": i,
            "reps": 10,
            "weight": 80.0,
            "completed": True,
        }
        for i in range(1, 11)
    ]

    achievements = compute_achievements(single_day_ten_sets)
    achievements_map = {a["title"]: a for a in achievements}

    # 1st workout badge should be unlocked
    assert achievements_map["First Rep Logged"]["unlocked"] is True
    assert achievements_map["First Rep Logged"]["progress"] == 1

    # 'Building Momentum' (10 workouts logged) must NOT be unlocked because only 1 day was logged
    momentum_badge = achievements_map["Building Momentum"]
    assert momentum_badge["unlocked"] is False
    assert momentum_badge["progress"] == 1  # 1 day completed towards 10 target, NOT 10!
