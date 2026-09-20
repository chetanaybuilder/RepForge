"""
Pure computation over a user's workout rows. No queries here — callers
pass in rows already fetched (and already scoped to the right user).
"""

import datetime
from collections import defaultdict


def _to_date(value):
    if isinstance(value, datetime.date):
        return value
    return datetime.date.fromisoformat(str(value))


def compute_streak(workouts: list) -> dict:
    """Current consecutive-day streak (today or yesterday counts as 'current')
    and the longest streak ever seen, based on distinct training days."""
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
    # allow "today hasn't happened yet" by starting from yesterday if today's not logged
    if cursor not in day_set:
        cursor -= datetime.timedelta(days=1)
    while cursor in day_set:
        current += 1
        cursor -= datetime.timedelta(days=1)

    return {"current_streak": current, "longest_streak": longest}


def compute_total_volume(workouts: list) -> float:
    return round(sum(float(w["weight"]) * int(w.get("sets", 1)) * int(w["reps"]) for w in workouts), 2)


def compute_unique_exercises(workouts: list) -> int:
    return len({w["exercise_name"] for w in workouts})


def compute_training_days(workouts: list) -> int:
    return len({_to_date(w["date"]) for w in workouts})


def compute_prs(workouts: list) -> list:
    """Best set (by weight, tie-broken by most recent) per exercise."""
    best = {}
    for w in workouts:
        name = w["exercise_name"]
        weight = float(w["weight"])
        date = _to_date(w["date"])
        date_str = date.isoformat()
        if name not in best or weight > best[name]["weight"] or (
            weight == best[name]["weight"] and date_str > best[name]["date"]
        ):
            best[name] = {
                "exercise_name": name,
                "weight": weight,
                "reps": w["reps"],
                "sets": w.get("sets", 1),
                "date": date.isoformat(),
            }
    return sorted(best.values(), key=lambda r: r["date"], reverse=True)


def compute_recent_prs(workouts: list, within_days: int = 30) -> list:
    prs = compute_prs(workouts)
    cutoff = datetime.date.today() - datetime.timedelta(days=within_days)
    return [pr for pr in prs if datetime.date.fromisoformat(pr["date"]) >= cutoff]


def compute_dashboard_stats(workouts: list) -> dict:
    streak = compute_streak(workouts)
    return {
        "total_workouts": len(set(w.get("day_id", w.get("date")) for w in workouts)) if workouts else 0, # count distinct days
        "current_streak": streak["current_streak"],
        "longest_streak": streak["longest_streak"],
        "training_days": compute_training_days(workouts),
        "total_volume": compute_total_volume(workouts),
        "unique_exercises": compute_unique_exercises(workouts),
        "personal_records_count": len(compute_prs(workouts)),
    }


def compute_exercise_progression(workouts: list, exercise_name: str) -> list:
    """Chronological (date, max weight that day, est. 1RM) series for one exercise."""
    by_date = defaultdict(list)
    for w in workouts:
        if w["exercise_name"] == exercise_name:
            by_date[_to_date(w["date"])].append(w)

    series = []
    for date in sorted(by_date.keys()):
        sets_that_day = by_date[date]
        top = max(sets_that_day, key=lambda w: float(w["weight"]))
        weight = float(top["weight"])
        reps = int(top["reps"])
        # Epley formula estimate, only shown as a rough indicator.
        est_1rm = round(weight * (1 + reps / 30.0), 1) if weight > 0 else 0
        series.append({
            "date": date.isoformat(),
            "max_weight": weight,
            "reps": reps,
            "estimated_1rm": est_1rm,
        })
    return series


def compute_volume_trend(workouts: list, weeks: int = 12) -> list:
    """Total volume per ISO week for the last N weeks that have data."""
    by_week = defaultdict(float)
    for w in workouts:
        date = _to_date(w["date"])
        year, week, _ = date.isocalendar()
        key = f"{year}-W{week:02d}"
        by_week[key] += float(w["weight"]) * int(w.get("sets", 1)) * int(w["reps"])

    ordered_keys = sorted(by_week.keys())[-weeks:]
    return [{"week": k, "volume": round(by_week[k], 2)} for k in ordered_keys]


def compute_frequency_by_type(workouts: list) -> list:
    counts = defaultdict(set)
    for w in workouts:
        counts[w["workout_type"]].add(w.get("day_id", w["date"]))
    return [{"workout_type": k, "count": len(v)} for k, v in sorted(counts.items(), key=lambda x: -len(x[1]))]


def detect_plateaus(workouts: list, min_sessions: int = 4, window: int = 5) -> list:
    """Flags exercises whose top weight hasn't improved over their last
    `window` sessions (only considered once there's enough history to say
    anything meaningful)."""
    by_exercise_day = defaultdict(list)
    for w in workouts:
        by_exercise_day[(w["exercise_name"], w["date"])].append(w)

    by_exercise_max = defaultdict(list)
    for (name, date), sets in by_exercise_day.items():
        by_exercise_max[name].append({
            "date": _to_date(date),
            "weight": max(float(s["weight"]) for s in sets)
        })

    plateaus = []
    for name, rows in by_exercise_max.items():
        rows_sorted = sorted(rows, key=lambda r: r["date"])
        if len(rows_sorted) < min_sessions:
            continue
        recent = rows_sorted[-window:]
        weights = [float(r["weight"]) for r in recent]
        if len(recent) >= min_sessions and max(weights) <= weights[0]:
            plateaus.append({
                "exercise_name": name,
                "sessions_considered": len(recent),
                "weight": weights[0],
            })
    return plateaus


def build_ai_context(workouts: list, prs: list, dashboard_stats: dict) -> dict:
    """Assembles the exact, real data payload sent to Gemini. Nothing here
    is invented — it's a restatement of numbers already computed above."""
    recent = sorted(workouts, key=lambda w: _to_date(w["date"]), reverse=True)[:40]
    return {
        "workout_count": len(set(w.get("day_id", w["date"]) for w in workouts)),
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
