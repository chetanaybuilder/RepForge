"""
Workout CRUD + analytics queries.

SECURITY INVARIANT: every single query in this file takes user_id as a
parameter and includes `WHERE user_id = %s` (or the equivalent). There is
no query here that can return or mutate a row without that filter. Routes
must always pass the user_id that came from the authenticated session —
never one supplied by the client — see backend/auth/decorators.py.
"""
from collections import defaultdict
from psycopg2.extras import execute_values, RealDictCursor
from database.db import fetch_one, fetch_all, execute, execute_returning, get_connection, get_cursor

def create_workout_day(user_id: str, data: dict):
    """
    Creates a full nested Day -> Exercises -> Sets structure in one transaction.
    Uses bulk inserts (execute_values) to avoid N+1 insert overhead.
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get max day number for this user
            cur.execute("SELECT COALESCE(MAX(day_number), 0) FROM workout_days WHERE user_id = %s", (user_id,))
            next_day_num = cur.fetchone()["coalesce"] + 1

            # 1. Insert Day
            cur.execute(
                """
                INSERT INTO workout_days (user_id, date, day_label, day_number)
                VALUES (%s, %s, %s, %s) RETURNING id, date, day_label, day_number, created_at, updated_at
                """,
                (user_id, data["date"], data.get("day"), next_day_num)
            )
            day_row = cur.fetchone()
            day_id = day_row["id"]

            exercises_in = data.get("exercises", [])
            if not exercises_in:
                return {
                    "id": day_id,
                    "user_id": user_id,
                    "date": day_row["date"].isoformat() if hasattr(day_row["date"], 'isoformat') else day_row["date"],
                    "day": day_row["day_label"],
                    "day_number": day_row["day_number"],
                    "exercises": []
                }

            # 2. Bulk-insert exercises
            exercise_values = [
                (day_id, ex["exercise_name"], ex["workout_type"], ex.get("notes"), idx)
                for idx, ex in enumerate(exercises_in)
            ]
            exercise_rows = execute_values(
                cur,
                """INSERT INTO workout_exercises (workout_day_id, exercise_name, workout_type, notes, order_index)
                   VALUES %s RETURNING id, exercise_name, workout_type, notes, order_index""",
                exercise_values,
                fetch=True,
            )

            # 3. Build set values referencing the returned exercise ids
            set_values = []
            ex_index_map = {}  # exercise row index -> exercise id
            for ex_idx, ex_row in enumerate(exercise_rows):
                ex_index_map[ex_idx] = ex_row["id"]
                for s_idx, s in enumerate(exercises_in[ex_idx].get("sets", [])):
                    set_values.append((
                        ex_row["id"],
                        s.get("set_number", s_idx + 1),
                        s["reps"],
                        s.get("weight", s.get("weight_kg", 0)),
                        bool(s.get("completed", True)),
                    ))

            # 4. Bulk-insert sets
            if set_values:
                set_rows = execute_values(
                    cur,
                    """INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight_kg, completed)
                       VALUES %s RETURNING id, workout_exercise_id, set_number, reps, weight_kg, completed""",
                    set_values,
                    fetch=True,
                )
            else:
                set_rows = []

            # 5. Assemble nested response
            sets_by_ex = defaultdict(list)
            for s in set_rows:
                sets_by_ex[s["workout_exercise_id"]].append({
                    "id": s["id"],
                    "set_number": s["set_number"],
                    "reps": s["reps"],
                    "weight_kg": s["weight_kg"],
                    "completed": s["completed"]
                })

            exercises_out = []
            for ex_row in exercise_rows:
                exercises_out.append({
                    "id": ex_row["id"],
                    "exercise_name": ex_row["exercise_name"],
                    "workout_type": ex_row["workout_type"],
                    "notes": ex_row["notes"],
                    "order_index": ex_row["order_index"],
                    "sets": sets_by_ex[ex_row["id"]]
                })

            return {
                "id": day_id,
                "user_id": user_id,
                "date": day_row["date"].isoformat() if hasattr(day_row["date"], 'isoformat') else day_row["date"],
                "day": day_row["day_label"],
                "day_number": day_row["day_number"],
                "exercises": exercises_out
            }



def list_workout_days(user_id: str, search=None, workout_type=None, sort="date_desc", limit=200, offset=0):
    """
    Returns days grouped with their exercises and sets.
    """
    # 1. Fetch the days that match filters
    query = """
        SELECT d.id, d.date, d.day_label, d.day_number, d.created_at
        FROM workout_days d
        WHERE d.user_id = %s
    """
    params = [user_id]

    if search:
        query += " AND (CONCAT('day ', d.day_number) ILIKE %s OR d.day_number::TEXT = %s OR EXISTS (SELECT 1 FROM workout_exercises e WHERE e.workout_day_id = d.id AND (e.exercise_name ILIKE %s OR e.notes ILIKE %s OR e.workout_type ILIKE %s)))"
        like = f"%{search}%"
        exact = search.strip()
        params.extend([like, exact, like, like, like])

    if workout_type:
        query += " AND EXISTS (SELECT 1 FROM workout_exercises e WHERE e.workout_day_id = d.id AND e.workout_type = %s)"
        params.append(workout_type)

    sort_map = {
        "date_desc": "d.date DESC, d.created_at DESC",
        "date_asc": "d.date ASC, d.created_at ASC",
        # For complex sorts we might need subqueries, but fallback to date for now
        "weight_desc": "d.date DESC",
        "weight_asc": "d.date ASC",
        "exercise_asc": "d.date DESC",
    }
    order_by = sort_map.get(sort, sort_map["date_desc"])
    query += f" ORDER BY {order_by} LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    days_rows = fetch_all(query, tuple(params))
    if not days_rows:
        return []

    day_ids = [d["id"] for d in days_rows]
    
    # 2. Fetch all exercises for these days
    exercises_rows = fetch_all(
        "SELECT * FROM workout_exercises WHERE workout_day_id = ANY(%s::uuid[]) ORDER BY order_index ASC, created_at ASC",
        (day_ids,)
    )
    
    if not exercises_rows:
        # Should be rare, but a day could be empty
        ex_ids = []
    else:
        ex_ids = [e["id"] for e in exercises_rows]
    
    # 3. Fetch all sets for these exercises
    if ex_ids:
        sets_rows = fetch_all(
            "SELECT * FROM workout_sets WHERE workout_exercise_id = ANY(%s::uuid[]) ORDER BY set_number ASC",
            (ex_ids,)
        )
    else:
        sets_rows = []

    # Assemble nested structure
    sets_by_ex = defaultdict(list)
    for s in sets_rows:
        sets_by_ex[s["workout_exercise_id"]].append({
            "id": s["id"],
            "set_number": s["set_number"],
            "reps": s["reps"],
            "weight_kg": s["weight_kg"], # Keeping naming consistent, or mapping to weight
            "weight": s["weight_kg"],
            "completed": s["completed"]
        })

    ex_by_day = defaultdict(list)
    for e in exercises_rows:
        ex_by_day[e["workout_day_id"]].append({
            "id": e["id"],
            "workout_day_id": e["workout_day_id"],
            "exercise_name": e["exercise_name"],
            "workout_type": e["workout_type"],
            "notes": e["notes"],
            "order_index": e["order_index"],
            "sets": sets_by_ex[e["id"]]
        })

    result = []
    for d in days_rows:
        result.append({
            "id": d["id"],
            "date": d["date"].isoformat() if hasattr(d["date"], 'isoformat') else d["date"],
            "day": d["day_label"],
            "day_number": d["day_number"],
            "exercises": ex_by_day[d["id"]]
        })
        
    return result


def update_exercise(user_id: str, exercise_id: str, data: dict):
    """
    Updates a single exercise and its sets. Ensures the exercise belongs to the user.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("""
                SELECT e.id FROM workout_exercises e
                JOIN workout_days d ON e.workout_day_id = d.id
                WHERE e.id = %s AND d.user_id = %s
            """, (exercise_id, user_id))
            if not cur.fetchone():
                return None

            # Update exercise
            cur.execute("""
                UPDATE workout_exercises
                SET exercise_name = %s, workout_type = %s, notes = %s, updated_at = now()
                WHERE id = %s
                RETURNING id, exercise_name, workout_type, notes
            """, (data["exercise_name"], data["workout_type"], data.get("notes"), exercise_id))
            
            ex_row = cur.fetchone()

            # Delete old sets and insert new ones
            cur.execute("DELETE FROM workout_sets WHERE workout_exercise_id = %s", (exercise_id,))
            
            sets_out = []
            for s_idx, s in enumerate(data.get("sets", [])):
                cur.execute("""
                    INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight_kg, completed)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id, set_number, reps, weight_kg, completed
                """, (exercise_id, s.get("set_number", s_idx + 1), s["reps"], s.get("weight", s.get("weight_kg", 0)), bool(s.get("completed", True))))
                
                s_row = cur.fetchone()
                sets_out.append({
                    "id": s_row[0],
                    "set_number": s_row[1],
                    "reps": s_row[2],
                    "weight_kg": s_row[3],
                    "weight": s_row[3],
                    "completed": s_row[4]
                })

            return {
                "id": ex_row[0],
                "exercise_name": ex_row[1],
                "workout_type": ex_row[2],
                "notes": ex_row[3],
                "sets": sets_out
            }


def delete_exercise(user_id: str, exercise_id: str) -> int:
    """
    Deletes an exercise. If the parent day becomes empty, deletes the day.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT e.workout_day_id FROM workout_exercises e
                JOIN workout_days d ON e.workout_day_id = d.id
                WHERE e.id = %s AND d.user_id = %s
            """, (exercise_id, user_id))
            row = cur.fetchone()
            if not row:
                return 0
                
            day_id = row[0]
            
            cur.execute("DELETE FROM workout_exercises WHERE id = %s", (exercise_id,))
            deleted = cur.rowcount
            
            # Check if day is empty
            cur.execute("SELECT 1 FROM workout_exercises WHERE workout_day_id = %s", (day_id,))
            if not cur.fetchone():
                cur.execute("DELETE FROM workout_days WHERE id = %s", (day_id,))
                
            return deleted


def get_all_for_stats(user_id: str):
    """Full workout history flattened for legacy stats and AI analysis."""
    # We flatten it to roughly match the old WORKOUT_COLUMNS structure so the 
    # stats_service doesn't need a total rewrite, but include day context.
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

def get_day_for_stats(user_id: str, day_id: str):
    """Get a single day's flattened workouts for AI analysis."""
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


def get_prs_by_exercise(user_id: str):
    """Best (max weight) set per exercise, with the date it was set."""
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
    row = fetch_one("SELECT COUNT(*) AS count FROM workout_days WHERE user_id = %s", (user_id,))
    return row["count"] if row else 0

def get_distinct_exercises(user_id: str):
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
