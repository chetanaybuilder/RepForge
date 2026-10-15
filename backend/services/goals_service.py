"""
RepForge Goals & Achievements Service.

Purpose:
    Computes transparent goal progress metrics and derives milestone achievement badges
    directly from verified user training logs.

Design Principles:
    - Transparent Metrics: Progress is an honest mathematical ratio of real telemetry
      against user-defined targets, avoiding synthetic or gamified obfuscation.
    - Honest Milestone Counting: Workout milestones count distinct training sessions
      (days), not individual sets.
"""

from __future__ import annotations

import datetime
from typing import Any

from services.stats_service import compute_prs, compute_streak, compute_total_volume


def _to_date(value: Any) -> datetime.date:
    """
    Normalizes a date, datetime, or ISO date string into a datetime.date object.

    Args:
        value: Date instance, datetime instance, or ISO 8601 string.

    Returns:
        datetime.date: Python date object.
    """
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, datetime.datetime):
        return value.date()
    return datetime.date.fromisoformat(str(value)[:10])


def compute_goal_progress(goal: dict[str, Any], workouts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Calculates completion percentage and current value for an active user goal.

    Supported goal types:
        - `weekly_frequency`: Number of distinct workout days completed in the current ISO week.
        - `exercise_pr`: Highest weight lifted (kg) for a designated exercise name.
        - `volume`: Total training volume (kg) accumulated on or after `period_start`.

    Args:
        goal: Goal record containing `goal_type`, `target_value`, and optional parameters.
        workouts: Flattened set-level training records for the user.

    Returns:
        dict[str, Any]: Progress object containing `current_value`, `target_value`,
                        `progress_pct`, `is_complete`, and `unit`.
    """
    goal_type = goal["goal_type"]
    target = float(goal["target_value"])

    if goal_type == "weekly_frequency":
        today = datetime.date.today()
        week_start = today - datetime.timedelta(days=today.weekday())
        sessions_this_week = len({_to_date(w["date"]) for w in workouts if _to_date(w["date"]) >= week_start})
        current = float(sessions_this_week)
        unit = "sessions this week"

    elif goal_type == "exercise_pr":
        prs = {pr["exercise_name"]: pr["weight"] for pr in compute_prs(workouts)}
        current = float(prs.get(goal.get("exercise_name"), 0.0))
        unit = f"kg on {goal.get('exercise_name', 'exercise')}"

    elif goal_type == "volume":
        period_start = goal.get("period_start")
        relevant = workouts
        if period_start:
            start_date = _to_date(period_start)
            relevant = [w for w in workouts if _to_date(w["date"]) >= start_date]
        current = float(compute_total_volume(relevant))
        unit = "kg total volume"

    else:
        current = 0.0
        unit = ""

    progress_pct = min(round((current / target) * 100, 1), 999.9) if target > 0 else 0.0
    return {
        "current_value": current,
        "target_value": target,
        "progress_pct": progress_pct,
        "is_complete": current >= target,
        "unit": unit,
    }


def compute_achievements(workouts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Derives milestone achievement badges directly from verified workout history.

    Milestones count distinct workout sessions/days rather than individual set rows.

    Args:
        workouts: Flattened set-level training records for the user.

    Returns:
        list[dict[str, Any]]: Badges with title, description, unlocked status,
                              progress, and target threshold.
    """
    achievements = []
    # Count unique workout sessions (distinct days), not raw set rows
    unique_workouts = len({w.get("day_id") or w.get("workout_day_id") or w["date"] for w in workouts})
    streak = compute_streak(workouts)
    prs = compute_prs(workouts)

    session_milestones = [
        (1, "First Rep Logged", "Logged your first workout."),
        (10, "Building Momentum", "Logged 10 workouts."),
        (50, "Half Century", "Logged 50 workouts."),
        (100, "Iron Century", "Logged 100 workouts."),
    ]
    for threshold, title, description in session_milestones:
        achievements.append(
            {
                "title": title,
                "description": description,
                "unlocked": unique_workouts >= threshold,
                "progress": min(unique_workouts, threshold),
                "target": threshold,
            }
        )

    streak_milestones = [
        (3, "3-Day Streak"),
        (7, "One Week Strong"),
        (30, "30-Day Discipline"),
    ]
    for threshold, title in streak_milestones:
        longest = streak.get("longest_streak", 0)
        achievements.append(
            {
                "title": title,
                "description": f"Train {threshold} days in a row.",
                "unlocked": longest >= threshold,
                "progress": min(longest, threshold),
                "target": threshold,
            }
        )

    achievements.append(
        {
            "title": "First PR",
            "description": "Set your first personal record.",
            "unlocked": len(prs) >= 1,
            "progress": min(len(prs), 1),
            "target": 1,
        }
    )

    return achievements
