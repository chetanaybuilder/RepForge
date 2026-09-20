"""
Goals & achievements logic. Kept deliberately simple and transparent:
progress is always a plain ratio of real logged data against a target the
user set, never an opaque score.
"""

import datetime
from services.stats_service import compute_prs, compute_streak, compute_total_volume


def _to_date(value):
    if isinstance(value, datetime.date):
        return value
    return datetime.date.fromisoformat(str(value))


def compute_goal_progress(goal: dict, workouts: list) -> dict:
    goal_type = goal["goal_type"]
    target = float(goal["target_value"])

    if goal_type == "weekly_frequency":
        today = datetime.date.today()
        week_start = today - datetime.timedelta(days=today.weekday())
        sessions_this_week = len({
            _to_date(w["date"]) for w in workouts if _to_date(w["date"]) >= week_start
        })
        current = sessions_this_week
        unit = "sessions this week"

    elif goal_type == "exercise_pr":
        prs = {pr["exercise_name"]: pr["weight"] for pr in compute_prs(workouts)}
        current = prs.get(goal.get("exercise_name"), 0)
        unit = f"kg on {goal.get('exercise_name', 'exercise')}"

    elif goal_type == "volume":
        period_start = goal.get("period_start")
        relevant = workouts
        if period_start:
            start_date = _to_date(period_start)
            relevant = [w for w in workouts if _to_date(w["date"]) >= start_date]
        current = compute_total_volume(relevant)
        unit = "kg total volume"

    else:
        current = 0
        unit = ""

    progress_pct = min(round((current / target) * 100, 1), 999.9) if target > 0 else 0
    return {
        "current_value": current,
        "target_value": target,
        "progress_pct": progress_pct,
        "is_complete": current >= target,
        "unit": unit,
    }


def compute_achievements(workouts: list) -> list:
    """A small, honest set of milestone badges derived only from real data —
    no arbitrary point system."""
    achievements = []
    total = len(workouts)
    streak = compute_streak(workouts)
    prs = compute_prs(workouts)

    milestones = [
        (1, "First Rep Logged", "Logged your first workout."),
        (10, "Building Momentum", "Logged 10 workouts."),
        (50, "Half Century", "Logged 50 workouts."),
        (100, "Iron Century", "Logged 100 workouts."),
    ]
    for threshold, title, description in milestones:
        achievements.append({
            "title": title,
            "description": description,
            "unlocked": total >= threshold,
            "progress": min(total, threshold),
            "target": threshold,
        })

    streak_milestones = [(3, "3-Day Streak"), (7, "One Week Strong"), (30, "30-Day Discipline")]
    for threshold, title in streak_milestones:
        achievements.append({
            "title": title,
            "description": f"Train {threshold} days in a row.",
            "unlocked": streak["longest_streak"] >= threshold,
            "progress": min(streak["longest_streak"], threshold),
            "target": threshold,
        })

    achievements.append({
        "title": "First PR",
        "description": "Set your first personal record.",
        "unlocked": len(prs) >= 1,
        "progress": min(len(prs), 1),
        "target": 1,
    })

    return achievements
