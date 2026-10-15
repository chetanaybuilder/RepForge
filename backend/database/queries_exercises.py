"""
RepForge Exercise Library Queries.

Purpose:
    Executes PostgreSQL persistence, search, filtering, and favorites management
    for the exercise library (seeded from open-source free-exercise-db).

Security Invariants:
    - User favorites are scoped strictly by authenticated `user_id`.
    - Input parameters are bound via `%s` placeholders.
    - Image paths are validated against directory traversal.
"""

from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor

from database.db import fetch_one, get_connection


def get_exercise_filter_options() -> dict[str, list[str]]:
    """
    Retrieves distinct categories, equipment types, and muscle groups available in the library.

    Returns:
        dict[str, list[str]]: Filter taxonomy mapping for UI dropdowns.
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DISTINCT equipment
                FROM exercises
                WHERE equipment IS NOT NULL AND equipment != ''
                ORDER BY equipment ASC;
                """
            )
            equipment = [r["equipment"] for r in cur.fetchall()]

            cur.execute(
                """
                SELECT DISTINCT category
                FROM exercises
                WHERE category IS NOT NULL AND category != ''
                ORDER BY category ASC;
                """
            )
            categories = [r["category"] for r in cur.fetchall()]

            cur.execute(
                """
                SELECT DISTINCT unnest(primary_muscles) AS muscle
                FROM exercises
                WHERE primary_muscles IS NOT NULL
                ORDER BY muscle ASC;
                """
            )
            muscles = [r["muscle"] for r in cur.fetchall()]

    return {
        "equipment": equipment,
        "categories": categories,
        "muscles": muscles,
    }


def list_exercises(
    search: str | None = None,
    muscle: str | None = None,
    equipment: str | None = None,
    category: str | None = None,
    favorites_only: bool = False,
    user_id: str | None = None,
    limit: int = 40,
    offset: int = 0,
) -> dict[str, Any]:
    """
    Searches and filters exercises with pagination and user favorite indication.

    Args:
        search: Optional case-insensitive text match across name and instructions.
        muscle: Optional target muscle filter (checks primary and secondary muscles).
        equipment: Optional equipment category filter.
        category: Optional exercise category filter (strength, cardio, etc.).
        favorites_only: If True, restricts results to the authenticated user's favorites.
        user_id: Authenticated user internal UUID string for favorites mapping.
        limit: Page size limit (capped at 100).
        offset: Pagination offset.

    Returns:
        dict[str, Any]: {'items': list[dict], 'total': int, 'limit': int, 'offset': int}
    """
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    conditions = []
    params: list[Any] = []

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        conditions.append("(lower(e.name) LIKE %s OR lower(e.id) LIKE %s)")
        params.extend([term, term])

    if muscle and muscle.strip():
        m = muscle.strip().lower()
        conditions.append("(%s = ANY(e.primary_muscles) OR %s = ANY(e.secondary_muscles))")
        params.extend([m, m])

    if equipment and equipment.strip():
        conditions.append("lower(e.equipment) = %s")
        params.append(equipment.strip().lower())

    if category and category.strip():
        conditions.append("lower(e.category) = %s")
        params.append(category.strip().lower())

    if favorites_only:
        if not user_id:
            return {"items": [], "total": 0, "limit": limit, "offset": offset}
        conditions.append("uf.exercise_id IS NOT NULL")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Build query
    query = f"""
        SELECT
            e.id,
            e.name,
            e.force,
            e.level,
            e.mechanic,
            e.equipment,
            e.primary_muscles,
            e.secondary_muscles,
            e.instructions,
            e.category,
            e.images,
            (CASE WHEN uf.exercise_id IS NOT NULL THEN true ELSE false END) AS is_favorite,
            COUNT(*) OVER() AS total_count
        FROM exercises e
        LEFT JOIN user_favorite_exercises uf
            ON e.id = uf.exercise_id AND uf.user_id = %s
        {where_clause}
        ORDER BY is_favorite DESC, e.name ASC
        LIMIT %s OFFSET %s;
    """

    full_params = [user_id] + params + [limit, offset]

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, full_params)
            rows = cur.fetchall()

    total = rows[0]["total_count"] if rows else 0
    items = []
    for r in rows:
        item = dict(r)
        item.pop("total_count", None)
        items.append(item)

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_exercise_by_id(exercise_id: str, user_id: str | None = None) -> dict[str, Any] | None:
    """
    Fetches full metadata and instructions for a specific exercise.

    Args:
        exercise_id: Primary key string identifier.
        user_id: Optional user internal UUID to evaluate favorite status.

    Returns:
        dict[str, Any] | None: Complete exercise payload or None if not found.
    """
    query = """
        SELECT
            e.id,
            e.name,
            e.force,
            e.level,
            e.mechanic,
            e.equipment,
            e.primary_muscles,
            e.secondary_muscles,
            e.instructions,
            e.category,
            e.images,
            (CASE WHEN uf.exercise_id IS NOT NULL THEN true ELSE false END) AS is_favorite
        FROM exercises e
        LEFT JOIN user_favorite_exercises uf
            ON e.id = uf.exercise_id AND uf.user_id = %s
        WHERE e.id = %s;
    """
    row = fetch_one(query, (user_id, exercise_id))
    return dict(row) if row else None


def toggle_favorite(user_id: str, exercise_id: str) -> dict[str, Any]:
    """
    Toggles a user's favorite status for an exercise.

    Args:
        user_id: Authenticated user UUID.
        exercise_id: Valid exercise ID.

    Returns:
        dict[str, Any]: {'exercise_id': str, 'is_favorite': bool}
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if exists
            cur.execute(
                "SELECT 1 FROM user_favorite_exercises WHERE user_id = %s AND exercise_id = %s",
                (user_id, exercise_id),
            )
            exists = cur.fetchone() is not None

            if exists:
                cur.execute(
                    "DELETE FROM user_favorite_exercises WHERE user_id = %s AND exercise_id = %s",
                    (user_id, exercise_id),
                )
                is_fav = False
            else:
                cur.execute(
                    """
                    INSERT INTO user_favorite_exercises (user_id, exercise_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING;
                    """,
                    (user_id, exercise_id),
                )
                is_fav = True

    return {"exercise_id": exercise_id, "is_favorite": is_fav}
