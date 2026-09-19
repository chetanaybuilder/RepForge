"""Queries for the goals table — always scoped to user_id."""

from backend.database.db import fetch_all, fetch_one, execute, execute_returning

GOAL_COLUMNS = (
    "id, user_id, goal_type, exercise_name, target_value, "
    "period_start, period_end, is_active, created_at, updated_at"
)


def list_goals(user_id: str, active_only: bool = True):
    query = f"SELECT {GOAL_COLUMNS} FROM goals WHERE user_id = %s"
    params = [user_id]
    if active_only:
        query += " AND is_active = true"
    query += " ORDER BY created_at DESC"
    return fetch_all(query, tuple(params))


def get_goal(user_id: str, goal_id: str):
    return fetch_one(
        f"SELECT {GOAL_COLUMNS} FROM goals WHERE id = %s AND user_id = %s",
        (goal_id, user_id),
    )


def create_goal(user_id: str, data: dict):
    return execute_returning(
        f"""
        INSERT INTO goals (user_id, goal_type, exercise_name, target_value, period_start, period_end)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING {GOAL_COLUMNS}
        """,
        (
            user_id,
            data["goal_type"],
            data.get("exercise_name"),
            data["target_value"],
            data.get("period_start"),
            data.get("period_end"),
        ),
    )


def deactivate_goal(user_id: str, goal_id: str) -> int:
    return execute(
        "UPDATE goals SET is_active = false WHERE id = %s AND user_id = %s",
        (goal_id, user_id),
    )


def delete_goal(user_id: str, goal_id: str) -> int:
    return execute("DELETE FROM goals WHERE id = %s AND user_id = %s", (goal_id, user_id))
