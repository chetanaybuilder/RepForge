"""
RepForge Goal Tracking & Achievement Routes.

Purpose:
    Exposes endpoints for creating, retrieving, and deleting fitness goals
    (weekly workout frequency, exercise PR targets, total volume milestones),
    and retrieving earned milestone achievement badges.

Security:
    - Tenant Isolation: Scoped strictly to `g.user_id` on all operations.
    - CSRF Protection: Required on all mutating requests (POST, DELETE).
    - Validation: Enforces numerical bounds on targets and ISO validation on period dates.
"""

from __future__ import annotations

import datetime
import logging
from typing import Any

from flask import Blueprint, g, jsonify, request
from werkzeug.wrappers import Response

from auth.decorators import csrf_protect, login_required
from database import queries_goals as gq, queries_workouts as wq
from services import goals_service
from utils.errors import ApiError

logger = logging.getLogger("repforge.routes.goals")

goals_bp = Blueprint("goals", __name__, url_prefix="/api/goals")

ALLOWED_GOAL_TYPES = {"weekly_frequency", "exercise_pr", "volume"}
MAX_TARGET_VALUE = 1_000_000.0


def _serialize_goal(row: dict[str, Any], workouts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Transforms database goal row and calculates progress against real workout telemetry.

    Args:
        row: PostgreSQL goal row dictionary.
        workouts: User's flattened training set history.

    Returns:
        dict[str, Any]: Serialized goal structure with nested progress metrics.
    """
    progress = goals_service.compute_goal_progress(row, workouts)
    return {
        "id": row["id"],
        "goal_type": row["goal_type"],
        "exercise_name": row["exercise_name"],
        "target_value": float(row["target_value"]),
        "period_start": str(row["period_start"]) if row["period_start"] else None,
        "period_end": str(row["period_end"]) if row["period_end"] else None,
        "is_active": row["is_active"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "progress": progress,
    }


def _validate_goal_payload(data: Any) -> dict[str, Any]:
    """
    Validates goal creation payloads against numerical boundaries and date formats.

    Args:
        data: Inbound JSON payload from request body.

    Returns:
        dict[str, Any]: Normalized and validated goal creation dictionary.

    Raises:
        ApiError: If goal_type is invalid, target_value is out of bounds,
                  or period dates are malformed.
    """
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")

    goal_type = data.get("goal_type")
    if goal_type not in ALLOWED_GOAL_TYPES:
        raise ApiError(
            f"goal_type must be one of: {', '.join(sorted(ALLOWED_GOAL_TYPES))}.",
            400,
            "validation_error",
        )

    target_value = data.get("target_value")
    if (
        not isinstance(target_value, (int, float))
        or isinstance(target_value, bool)
        or target_value <= 0
        or target_value > MAX_TARGET_VALUE
    ):
        raise ApiError(
            f"target_value must be a positive number between 0 and {MAX_TARGET_VALUE:,.0f}.",
            400,
            "validation_error",
        )

    exercise_name = data.get("exercise_name")
    if goal_type == "exercise_pr" and not exercise_name:
        raise ApiError("exercise_name is required for exercise_pr goals.", 400, "validation_error")

    period_start = data.get("period_start")
    period_end = data.get("period_end")

    parsed_start: datetime.date | None = None
    parsed_end: datetime.date | None = None

    if period_start:
        try:
            parsed_start = datetime.date.fromisoformat(str(period_start))
        except ValueError as exc:
            raise ApiError("period_start must be an ISO date (YYYY-MM-DD).", 400, "validation_error") from exc

    if period_end:
        try:
            parsed_end = datetime.date.fromisoformat(str(period_end))
        except ValueError as exc:
            raise ApiError("period_end must be an ISO date (YYYY-MM-DD).", 400, "validation_error") from exc

    if parsed_start and parsed_end and parsed_start > parsed_end:
        raise ApiError("period_start cannot be after period_end.", 400, "validation_error")

    return {
        "goal_type": goal_type,
        "exercise_name": str(exercise_name)[:500] if exercise_name else None,
        "target_value": float(target_value),
        "period_start": parsed_start.isoformat() if parsed_start else None,
        "period_end": parsed_end.isoformat() if parsed_end else None,
    }


@goals_bp.route("", methods=["GET"])
@login_required
def list_goals() -> Response:
    """
    Returns all active goals for the user with calculated progress.

    Returns:
        Response: JSON array of goals.
    """
    goals = gq.list_goals(g.user_id)
    workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"goals": [_serialize_goal(row, workouts) for row in goals]})


@goals_bp.route("", methods=["POST"])
@login_required
@csrf_protect
def create_goal() -> tuple[Response, int]:
    """
    Creates a new goal record for the authenticated user.

    Returns:
        tuple[Response, int]: JSON response containing created goal and 201 status.

    Raises:
        ApiError: If payload fails validation.
    """
    payload = _validate_goal_payload(request.get_json(silent=True) or {})
    row = gq.create_goal(g.user_id, payload)
    workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"goal": _serialize_goal(row, workouts)}), 201


@goals_bp.route("/<goal_id>", methods=["DELETE"])
@login_required
@csrf_protect
def delete_goal(goal_id: str) -> Response:
    """
    Deletes an active goal by ID, enforcing tenant ownership.

    Args:
        goal_id: UUID of goal to delete.

    Returns:
        Response: JSON confirmation message.

    Raises:
        ApiError: 404 Not Found if goal is missing or not owned by user.
    """
    deleted = gq.delete_goal(g.user_id, goal_id)
    if not deleted:
        raise ApiError("Goal not found.", 404, "not_found")
    return jsonify({"message": "Goal deleted."})


@goals_bp.route("/achievements", methods=["GET"])
@login_required
def achievements() -> Response:
    """
    Returns earned and in-progress milestone badges calculated from real telemetry.

    Returns:
        Response: JSON array of achievements.
    """
    workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"achievements": goals_service.compute_achievements(workouts)})
