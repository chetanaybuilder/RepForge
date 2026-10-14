"""
RepForge Pure Analytics & Progression Computation Service.

Purpose:
    Executes algorithmic derivations over immutable workout records.
    Computes consistency streaks, training volume, personal records (PRs),
    muscle group balance, and estimated 1-rep maximums (1RM).

Architecture:
    Pure functional calculations. All operations are stateless and operate exclusively
    on pre-fetched, tenant-isolated data rows passed by the calling routes.
"""

from __future__ import annotations

from collections import defaultdict
import datetime
from typing import Any


def _to_date(value: Any) -> datetime.date:
    """
    Normalizes diverse date representations into a standard datetime.date object.

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


def compute_streak(workouts: list[dict[str, Any]]) -> dict[str, int]:
    """
    Calculates consecutive training day consistency streaks.

    Args:
        workouts: Flattened workout set records.

    Returns:
        dict[str, int]: {"current_streak": int, "longest_streak": int}.
    """
    if not workouts:
        return {"current_streak": 0, "longest_streak": 0}

    unique_days = sorted({_to_date(w["date"]) for w in workouts})

    longest = 1
    run = 1
    for i in range(1, len(unique_days)):
        if (unique_days[i] - unique_days[i - 1]).days == 1:
            run += 1
        else:
            longest = max(longest, run)
            run = 1
    longest = max(longest, run)

    today = datetime.date.today()
    current = 0
    cursor = today
    day_set = set(unique_days)
    # If today has not been logged yet, allow streak continuation from yesterday
    if cursor not in day_set:
        cursor -= datetime.timedelta(days=1)
    while cursor in day_set:
        current += 1
        cursor -= datetime.timedelta(days=1)

    return {"current_streak": current, "longest_streak": longest}


def compute_total_volume(workouts: list[dict[str, Any]]) -> float:
    """
    Calculates gross tonnage (weight * reps) lifted across all recorded sets.

    Args:
        workouts: Flattened workout set records.

    Returns:
        float: Cumulative volume in kilograms.
    """
    return round(
        sum(float(w["weight"]) * int(w.get("sets", 1)) * int(w["reps"]) for w in workouts),
        2,
    )


def compute_unique_exercises(workouts: list[dict[str, Any]]) -> int:
    """
    Counts distinct exercise names performed.

    Args:
        workouts: Flattened workout set records.

    Returns:
        int: Unique exercise count.
    """
    return len({w["exercise_name"] for w in workouts})


def compute_training_days(workouts: list[dict[str, Any]]) -> int:
    """
    Counts total distinct calendar days trained.

    Args:
        workouts: Flattened workout set records.

    Returns:
        int: Number of unique training days.
    """
    return len({_to_date(w["date"]) for w in workouts})


def compute_prs(workouts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Identifies the maximum weight set for each exercise.

    Args:
        workouts: Flattened workout set records.

    Returns:
        list[dict[str, Any]]: Sorted personal record sets per exercise.
    """
    best: dict[str, dict[str, Any]] = {}
    for w in workouts:
        name = w["exercise_name"]
        weight = float(w["weight"])
        date = _to_date(w["date"])
        date_str = date.isoformat()
        if (
            name not in best
            or weight > best[name]["weight"]
            or (weight == best[name]["weight"] and date_str > best[name]["date"])
        ):
            best[name] = {
                "exercise_name": name,
                "weight": weight,
                "reps": w["reps"],
                "sets": w.get("sets", 1),
                "date": date.isoformat(),
            }
    return sorted(best.values(), key=lambda r: r["date"], reverse=True)


def compute_recent_prs(workouts: list[dict[str, Any]], within_days: int = 30) -> list[dict[str, Any]]:
    """
    Filters personal records established within a recent trailing time window.

    Args:
        workouts: Flattened workout set records.
        within_days: Horizon window in days.

    Returns:
        list[dict[str, Any]]: Recent personal records.
    """
    prs = compute_prs(workouts)
    cutoff = datetime.date.today() - datetime.timedelta(days=within_days)
    return [pr for pr in prs if datetime.date.fromisoformat(pr["date"]) >= cutoff]


def compute_dashboard_stats(workouts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Aggregates high-level metrics for the primary dashboard summary cards.

    Args:
        workouts: Flattened workout set records.

    Returns:
        dict[str, Any]: Dashboard summary object.
    """
    streak = compute_streak(workouts)
    return {
        "total_workouts": len({w.get("day_id", w.get("date")) for w in workouts}) if workouts else 0,
        "current_streak": streak["current_streak"],
        "longest_streak": streak["longest_streak"],
        "training_days": compute_training_days(workouts),
        "total_volume": compute_total_volume(workouts),
        "unique_exercises": compute_unique_exercises(workouts),
        "personal_records_count": len(compute_prs(workouts)),
    }


def compute_exercise_progression(workouts: list[dict[str, Any]], exercise_name: str) -> list[dict[str, Any]]:
    """
    Constructs chronological progression series with estimated 1RM calculations.

    Args:
        workouts: Flattened workout set records.
        exercise_name: Target exercise name.

    Returns:
        list[dict[str, Any]]: Chronological date, max weight, and est 1RM data points.
    """
    by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for w in workouts:
        if w["exercise_name"] == exercise_name:
            by_date[str(w["date"])].append(w)

    progression = []
    for d_str in sorted(by_date.keys()):
        day_sets = by_date[d_str]
        best_set = max(day_sets, key=lambda s: float(s["weight"]))
        w = float(best_set["weight"])
        r = int(best_set["reps"])
        # Epley Formula for Estimated 1RM
        est_1rm = round(w * (1 + r / 30.0), 1) if r > 1 else w
        progression.append(
            {
                "date": d_str,
                "weight": w,
                "reps": r,
                "estimated_1rm": est_1rm,
            }
        )
    return progression


def compute_volume_trend(workouts: list[dict[str, Any]], weeks: int = 12) -> list[dict[str, Any]]:
    """
    Aggregates weekly total volume over a rolling multi-week window.

    Args:
        workouts: Flattened workout set records.
        weeks: Number of trailing ISO weeks.

    Returns:
        list[dict[str, Any]]: Weekly volume totals.
    """
    today = datetime.date.today()
    start_date = today - datetime.timedelta(weeks=weeks)
    weekly_volume: dict[str, float] = defaultdict(float)

    for w in workouts:
        d = _to_date(w["date"])
        if d >= start_date:
            year, week_num, _ = d.isocalendar()
            key = f"{year}-W{week_num:02d}"
            vol = float(w["weight"]) * int(w.get("sets", 1)) * int(w["reps"])
            weekly_volume[key] += vol

    return [{"week": k, "volume": round(v, 2)} for k, v in sorted(weekly_volume.items())]


def compute_frequency_by_type(workouts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Calculates distribution of training sessions across split categories.

    Args:
        workouts: Flattened workout set records.

    Returns:
        list[dict[str, Any]]: Frequency counts per workout type.
    """
    counts: dict[str, set[Any]] = defaultdict(set)
    for w in workouts:
        counts[w["workout_type"]].add(w.get("day_id", w["date"]))
    return [{"workout_type": k, "count": len(v)} for k, v in sorted(counts.items(), key=lambda x: -len(x[1]))]


def detect_plateaus(workouts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Detects exercises with stagnant peak weights across at least 4 sessions.

    Args:
        workouts: Flattened workout set records.

    Returns:
        list[dict[str, Any]]: Identified plateauing exercises.
    """
    by_exercise: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for w in workouts:
        by_exercise[w["exercise_name"]].append(w)

    plateaus = []
    for name, sets in by_exercise.items():
        by_date: dict[str, float] = {}
        for s in sets:
            d = str(s["date"])
            w = float(s["weight"])
            by_date[d] = max(by_date.get(d, 0.0), w)

        sorted_days = sorted(by_date.items())
        if len(sorted_days) >= 4:
            last_4 = [w for _, w in sorted_days[-4:]]
            if max(last_4) - min(last_4) == 0 and last_4[0] > 0:
                plateaus.append(
                    {
                        "exercise_name": name,
                        "weight": last_4[0],
                        "sessions_at_weight": 4,
                    }
                )
    return plateaus


def compute_analytics(workouts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Assembles comprehensive analytics package across progression and distribution.

    Args:
        workouts: Flattened workout set records.

    Returns:
        dict[str, Any]: Complete analytics dataset.
    """
    return {
        "volume_trend": compute_volume_trend(workouts, 12),
        "frequency_by_type": compute_frequency_by_type(workouts),
        "plateaus": detect_plateaus(workouts),
        "prs": compute_prs(workouts),
        "streak": compute_streak(workouts),
    }


def build_ai_context(
    workouts: list[dict[str, Any]],
    prs: list[dict[str, Any]],
    dashboard_stats: dict[str, Any],
) -> dict[str, Any]:
    """
    Assembles real, verified telemetry payload supplied to Google Gemini for inference.

    Args:
        workouts: Flattened workout set records.
        prs: Personal records dataset.
        dashboard_stats: Aggregated metrics object.

    Returns:
        dict[str, Any]: Grounded context dictionary.
    """
    recent = sorted(workouts, key=lambda w: _to_date(w["date"]), reverse=True)[:40]
    return {
        "workout_count": len({w.get("day_id", w["date"]) for w in workouts}),
        "dashboard_stats": dashboard_stats,
        "personal_records": prs[:20],
        "volume_trend_last_12_weeks": compute_volume_trend(workouts, 12),
        "frequency_by_workout_type": compute_frequency_by_type(workouts),
        "plateaus_detected": detect_plateaus(workouts),
        "recent_workouts": [
            {
                "date": str(w["date"]),
                "workout_type": w["workout_type"],
                "exercise_name": w["exercise_name"],
                "sets": w.get("sets", 1),
                "reps": w["reps"],
                "weight": float(w["weight"]),
            }
            for w in recent
        ],
    }
