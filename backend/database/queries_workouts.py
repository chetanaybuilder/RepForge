"""
RepForge Workout Domain Queries.

Purpose:
    Executes PostgreSQL persistence and analytics queries for the nested workout hierarchy
    (Workout Days -> Exercises -> Sets).

Security Invariants:
    - Tenant Isolation / Anti-IDOR: Every query without exception filters by `user_id = %s`
      derived exclusively from the authenticated session context (`g.user_id`).
    - Parameterization: All user-supplied arguments are bound via query placeholders (`%s`),
      guaranteeing protection against SQL injection.
    - Atomicity & Performance: Multi-entity writes are wrapped in single atomic transactions
      with batch insertions (`psycopg2.extras.execute_values`) to eliminate N+1 roundtrips.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from psycopg2.extras import RealDictCursor, execute_values

from database.db import fetch_all, fetch_one, get_connection


def _extract_weight(s: dict[str, Any]) -> float:
    """
    Safely extracts and bounds set weight from input dictionaries.

    Guarantees that null/missing values do not violate database NOT NULL constraints.

    Args:
        s: Raw set dictionary containing 'weight' or 'weight_kg'.

    Returns:
        float: Non-negative weight in kilograms.
    """
    raw = s.get("weight") if s.get("weight") is not None else s.get("weight_kg")
    if raw is None:
        return 0.0
    try:
        val = float(raw)
        return max(0.0, round(val, 2))
    except (ValueError, TypeError):
        return 0.0


def create_workout_day(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """
    Creates a full nested Day -> Exercises -> Sets hierarchy in a single atomic transaction.

    Utilizes PostgreSQL bulk inserts to eliminate N+1 execution overhead.

    Args:
        user_id: Authenticated user internal UUID string.
        data: Validated workout day payload containing 'date', optional 'day',
              and nested 'exercises' list.

    Returns:
        dict[str, Any]: Fully assembled workout day structure with generated IDs.
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Determine sequential day sequence for this user
            cur.execute(
                "SELECT COALESCE(MAX(day_number), 0) AS max_day FROM workout_days WHERE user_id = %s",
                (user_id,),
            )
            next_day_num = cur.fetchone()["max_day"] + 1

            # 1. Insert Workout Day
            cur.execute(
                """
                INSERT INTO workout_days (user_id, date, day_label, day_number)
                VALUES (%s, %s, %s, %s)
                RETURNING id, date, day_label, day_number, created_at, updated_at
                """,
                (user_id, data["date"], data.get("day"), next_day_num),
            )
            day_row = cur.fetchone()
            day_id = day_row["id"]

            exercises_in = data.get("exercises", [])
            if not exercises_in:
                return {
                    "id": day_id,
                    "user_id": user_id,
                    "date": day_row["date"].isoformat()
                    if hasattr(day_row["date"], "isoformat")
                    else str(day_row["date"]),
                    "day": day_row["day_label"],
                    "day_number": day_row["day_number"],
                    "exercises": [],
                }

            # 2. Bulk-insert exercises
            exercise_values = [
                (day_id, ex["exercise_name"], ex["workout_type"], ex.get("notes"), idx)
                for idx, ex in enumerate(exercises_in)
            ]
            exercise_rows = execute_values(
                cur,
                """
                INSERT INTO workout_exercises (workout_day_id, exercise_name, workout_type, notes, order_index)
                VALUES %s
                RETURNING id, exercise_name, workout_type, notes, order_index
                """,
                exercise_values,
                fetch=True,
            )

            # 3. Build set values mapped to returned exercise IDs
            set_values = []
            for ex_idx, ex_row in enumerate(exercise_rows):
                for s_idx, s in enumerate(exercises_in[ex_idx].get("sets", [])):
                    set_values.append(
                        (
                            ex_row["id"],
                            s.get("set_number", s_idx + 1),
                            s["reps"],
                            _extract_weight(s),
                            bool(s.get("completed", True)),
                        )
                    )

            # 4. Bulk-insert sets
            if set_values:
                set_rows = execute_values(
                    cur,
                    """
                    INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight_kg, completed)
                    VALUES %s
                    RETURNING id, workout_exercise_id, set_number, reps, weight_kg, completed
                    """,
                    set_values,
                    fetch=True,
                )
            else:
                set_rows = []

            # 5. Assemble nested response object
            sets_by_ex = defaultdict(list)
            for s in set_rows:
                weight_val = float(s["weight_kg"])
                sets_by_ex[s["workout_exercise_id"]].append(
                    {
                        "id": s["id"],
                        "set_number": s["set_number"],
                        "reps": s["reps"],
                        "weight_kg": weight_val,
                        "weight": weight_val,
                        "completed": s["completed"],
                    }
                )

            exercises_out = []
            for ex_row in exercise_rows:
                exercises_out.append(
                    {
                        "id": ex_row["id"],
                        "exercise_name": ex_row["exercise_name"],
                        "workout_type": ex_row["workout_type"],
                        "notes": ex_row["notes"],
                        "order_index": ex_row["order_index"],
                        "sets": sets_by_ex[ex_row["id"]],
                    }
                )

            return {
                "id": day_id,
                "user_id": user_id,
                "date": day_row["date"].isoformat() if hasattr(day_row["date"], "isoformat") else str(day_row["date"]),
                "day": day_row["day_label"],
                "day_number": day_row["day_number"],
                "exercises": exercises_out,
            }


def list_workout_days(
    user_id: str,
    search: str | None = None,
    workout_type: str | None = None,
    sort: str = "date_desc",
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    Returns paginated workout days grouped with their nested exercises and sets.

    Args:
        user_id: Authenticated user internal UUID.
        search: Optional case-insensitive search filter.
        workout_type: Optional exercise category filter (e.g. 'push', 'pull').
        sort: Sort ordering ('date_desc', 'date_asc', 'weight_desc', 'weight_asc', 'exercise_asc').
        limit: Maximum number of days returned (capped between 1 and 500).
        offset: Pagination offset.

    Returns:
        list[dict[str, Any]]: List of hierarchical workout day dicts.
    """
    query = """
        SELECT d.id, d.date, d.day_label, d.day_number, d.created_at
        FROM workout_days d
        WHERE d.user_id = %s
    """
    params: list[Any] = [user_id]

    if search:
        query += """
            AND (
                CONCAT('day ', d.day_number) ILIKE %s
                OR d.day_number::TEXT = %s
                OR EXISTS (
                    SELECT 1 FROM workout_exercises e
                    WHERE e.workout_day_id = d.id
                    AND (e.exercise_name ILIKE %s OR e.notes ILIKE %s OR e.workout_type ILIKE %s)
                )
            )
        """
        like = f"%{search}%"
        exact = search.strip()
        params.extend([like, exact, like, like, like])

    if workout_type:
        query += """
            AND EXISTS (
                SELECT 1 FROM workout_exercises e
                WHERE e.workout_day_id = d.id AND e.workout_type = %s
            )
        """
        params.append(workout_type)

    sort_map = {
        "date_desc": "d.date DESC, d.created_at DESC",
        "date_asc": "d.date ASC, d.created_at ASC",
        "weight_desc": (
            "(SELECT COALESCE(MAX(s.weight_kg), 0) FROM workout_exercises we "
            "JOIN workout_sets s ON s.workout_exercise_id = we.id "
            "WHERE we.workout_day_id = d.id) DESC, d.date DESC"
        ),
        "weight_asc": (
            "(SELECT COALESCE(MAX(s.weight_kg), 0) FROM workout_exercises we "
            "JOIN workout_sets s ON s.workout_exercise_id = we.id "
            "WHERE we.workout_day_id = d.id) ASC, d.date ASC"
        ),
        "exercise_asc": (
            "(SELECT MIN(we.exercise_name) FROM workout_exercises we WHERE we.workout_day_id = d.id) ASC, d.date DESC"
        ),
    }
    order_by = sort_map.get(sort, sort_map["date_desc"])
    query += f" ORDER BY {order_by} LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    days_rows = fetch_all(query, tuple(params))
    if not days_rows:
        return []

    day_ids = [d["id"] for d in days_rows]

    # Fetch all exercises belonging to these days
    exercises_rows = fetch_all(
        """
        SELECT * FROM workout_exercises
        WHERE workout_day_id = ANY(%s::uuid[])
        ORDER BY order_index ASC, created_at ASC
        """,
        (day_ids,),
    )
    if not exercises_rows:
        return [
            {
                "id": d["id"],
                "date": d["date"].isoformat() if hasattr(d["date"], "isoformat") else str(d["date"]),
                "day": d["day_label"],
                "day_number": d["day_number"],
                "exercises": [],
            }
            for d in days_rows
        ]

    exercise_ids = [e["id"] for e in exercises_rows]

    # Fetch all sets belonging to these exercises
    sets_rows = fetch_all(
        """
        SELECT * FROM workout_sets
        WHERE workout_exercise_id = ANY(%s::uuid[])
        ORDER BY set_number ASC
        """,
        (exercise_ids,),
    )

    sets_by_ex = defaultdict(list)
    for s in sets_rows:
        weight_val = float(s["weight_kg"])
        sets_by_ex[s["workout_exercise_id"]].append(
            {
                "id": s["id"],
                "set_number": s["set_number"],
                "reps": s["reps"],
                "weight_kg": weight_val,
                "weight": weight_val,
                "completed": s["completed"],
            }
        )

    ex_by_day = defaultdict(list)
    for e in exercises_rows:
        ex_by_day[e["workout_day_id"]].append(
            {
                "id": e["id"],
                "exercise_name": e["exercise_name"],
                "workout_type": e["workout_type"],
                "notes": e["notes"],
                "order_index": e["order_index"],
                "sets": sets_by_ex[e["id"]],
            }
        )

    result = []
    for d in days_rows:
        result.append(
            {
                "id": d["id"],
                "date": d["date"].isoformat() if hasattr(d["date"], "isoformat") else str(d["date"]),
                "day": d["day_label"],
                "day_number": d["day_number"],
                "exercises": ex_by_day[d["id"]],
            }
        )

    return result


def update_exercise(user_id: str, exercise_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """
    Updates an exercise and replaces its sets atomically with bulk insertion.

    Verifies tenant ownership through join to parent workout_days record.

    Args:
        user_id: Authenticated user internal UUID.
        exercise_id: UUID of the workout_exercises row.
        data: Validated exercise payload containing exercise_name, workout_type,
              notes, and sets array.

    Returns:
        dict[str, Any] | None: Updated exercise structure or None if not found/unauthorized.
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Verify tenant ownership
            cur.execute(
                """
                SELECT e.id FROM workout_exercises e
                JOIN workout_days d ON e.workout_day_id = d.id
                WHERE e.id = %s AND d.user_id = %s
                """,
                (exercise_id, user_id),
            )
            if not cur.fetchone():
                return None

            # 2. Update exercise parent fields
            cur.execute(
                """
                UPDATE workout_exercises
                SET exercise_name = %s, workout_type = %s, notes = %s, updated_at = now()
                WHERE id = %s
                RETURNING id, exercise_name, workout_type, notes
                """,
                (data["exercise_name"], data["workout_type"], data.get("notes"), exercise_id),
            )
            ex_row = cur.fetchone()

            # 3. Replace sets atomically using execute_values to avoid N+1 query overhead
            cur.execute("DELETE FROM workout_sets WHERE workout_exercise_id = %s", (exercise_id,))

            sets_in = data.get("sets", [])
            if sets_in:
                set_tuples = [
                    (
                        exercise_id,
                        s.get("set_number", s_idx + 1),
                        s["reps"],
                        _extract_weight(s),
                        bool(s.get("completed", True)),
                    )
                    for s_idx, s in enumerate(sets_in)
                ]
                set_rows = execute_values(
                    cur,
                    """
                    INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight_kg, completed)
                    VALUES %s
                    RETURNING id, set_number, reps, weight_kg, completed
                    """,
                    set_tuples,
                    fetch=True,
                )
                sets_out = [
                    {
                        "id": s["id"],
                        "set_number": s["set_number"],
                        "reps": s["reps"],
                        "weight_kg": float(s["weight_kg"]),
                        "weight": float(s["weight_kg"]),
                        "completed": s["completed"],
                    }
                    for s in set_rows
                ]
            else:
                sets_out = []

            return {
                "id": ex_row["id"],
                "exercise_name": ex_row["exercise_name"],
                "workout_type": ex_row["workout_type"],
                "notes": ex_row["notes"],
                "sets": sets_out,
            }


def delete_exercise(user_id: str, exercise_id: str) -> int:
    """
    Deletes an exercise record. If the parent workout day has no remaining exercises,
    automatically cascades deletion to the empty parent day.

    Args:
        user_id: Authenticated user internal UUID.
        exercise_id: UUID of the workout exercise to delete.

    Returns:
        int: Number of deleted exercises (1 if successful, 0 if not found/unauthorized).
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.workout_day_id FROM workout_exercises e
                JOIN workout_days d ON e.workout_day_id = d.id
                WHERE e.id = %s AND d.user_id = %s
                """,
                (exercise_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return 0

            day_id = row[0]
            cur.execute("DELETE FROM workout_exercises WHERE id = %s", (exercise_id,))
            deleted = cur.rowcount

            # Check if parent day has any remaining exercises; prune if now empty
            cur.execute("SELECT 1 FROM workout_exercises WHERE workout_day_id = %s", (day_id,))
            if not cur.fetchone():
                cur.execute("DELETE FROM workout_days WHERE id = %s", (day_id,))

            return deleted


def get_all_for_stats(user_id: str) -> list[dict[str, Any]]:
    """
    Returns full flattened workout history for metrics computation and AI context analysis.

    Args:
        user_id: Authenticated user internal UUID.

    Returns:
        list[dict[str, Any]]: Flattened set-level records ordered chronologically.
    """
    query = """
        SELECT
            d.id as day_id, d.date, d.day_label as day,
            e.id as exercise_id, e.exercise_name, e.workout_type, e.notes,
            s.id as set_id, s.set_number, s.reps, s.weight_kg as weight, s.completed
        FROM workout_days d
        JOIN workout_exercises e ON e.workout_day_id = d.id
        JOIN workout_sets s ON s.workout_exercise_id = e.id
        WHERE d.user_id = %s
        ORDER BY d.date ASC, e.order_index ASC, s.set_number ASC
    """
    return fetch_all(query, (user_id,))


def get_day_for_stats(user_id: str, day_id: str) -> list[dict[str, Any]]:
    """
    Retrieves a single day's flattened workout sets for AI session insights.

    Args:
        user_id: Authenticated user internal UUID.
        day_id: UUID of target workout day.

    Returns:
        list[dict[str, Any]]: Ordered exercise sets for the specified day.
    """
    query = """
        SELECT
            d.id as day_id, d.date, d.day_label as day,
            e.id as exercise_id, e.exercise_name, e.workout_type, e.notes,
            s.id as set_id, s.set_number, s.reps, s.weight_kg as weight, s.completed
        FROM workout_days d
        JOIN workout_exercises e ON e.workout_day_id = d.id
        JOIN workout_sets s ON s.workout_exercise_id = e.id
        WHERE d.user_id = %s AND d.id = %s
        ORDER BY e.order_index ASC, s.set_number ASC
    """
    return fetch_all(query, (user_id, day_id))


def get_prs_by_exercise(user_id: str) -> list[dict[str, Any]]:
    """
    Computes all-time personal record (maximum weight) sets per exercise.

    Args:
        user_id: Authenticated user internal UUID.

    Returns:
        list[dict[str, Any]]: Highest weight record per exercise with date achieved.
    """
    return fetch_all(
        """
        SELECT DISTINCT ON (e.exercise_name)
            e.exercise_name, s.weight_kg as weight, s.reps, s.set_number, d.date
        FROM workout_days d
        JOIN workout_exercises e ON e.workout_day_id = d.id
        JOIN workout_sets s ON s.workout_exercise_id = e.id
        WHERE d.user_id = %s
        ORDER BY e.exercise_name, s.weight_kg DESC, d.date DESC
        """,
        (user_id,),
    )


def count_workouts(user_id: str) -> int:
    """
    Returns the total count of workout days logged by the user.

    Args:
        user_id: Authenticated user internal UUID.

    Returns:
        int: Number of distinct workout days.
    """
    row = fetch_one("SELECT COUNT(*) AS count FROM workout_days WHERE user_id = %s", (user_id,))
    return row["count"] if row else 0


def get_distinct_exercises(user_id: str) -> list[str]:
    """
    Returns an alphabetically sorted list of unique exercise names logged by the user.

    Args:
        user_id: Authenticated user internal UUID.

    Returns:
        list[str]: Unique exercise names.
    """
    rows = fetch_all(
        """
        SELECT DISTINCT e.exercise_name
        FROM workout_exercises e
        JOIN workout_days d ON e.workout_day_id = d.id
        WHERE d.user_id = %s
        ORDER BY e.exercise_name
        """,
        (user_id,),
    )
    return [r["exercise_name"] for r in rows]
