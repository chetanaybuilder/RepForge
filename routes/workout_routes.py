"""
RepForge Workout Routes.

Purpose:
    Exposes endpoints for creating, retrieving, updating, and deleting workout sessions,
    as well as aggregating training metrics, progressive overload personal records,
    and historical volume trends.

Security:
    - Tenant Isolation: Scoped strictly to `g.user_id` on every endpoint.
    - CSRF Protection: Applied to all mutating requests (POST, PUT, DELETE).
    - Schema Validation: Inbound payloads validated against strict physical bounds.
"""

from __future__ import annotations

import logging

from flask import Blueprint, g, jsonify, request
from werkzeug.wrappers import Response

from auth.decorators import csrf_protect, login_required
from database import queries_workouts as wq
from services import stats_service
from utils.errors import ApiError
from utils.validation import (
    validate_exercise_payload,
    validate_list_params,
    validate_workout_day_payload,
)

logger = logging.getLogger("repforge.routes.workouts")

workout_bp = Blueprint("workouts", __name__, url_prefix="/api/workouts")


@workout_bp.route("", methods=["GET"])
@login_required
def list_workouts() -> Response:
    """
    Returns a paginated list of workout days with nested exercises and sets.

    Returns:
        Response: JSON array of days and count.
    """
    params = validate_list_params(request.args)
    days = wq.list_workout_days(g.user_id, **params)
    return jsonify({"workouts": days, "count": len(days)})


@workout_bp.route("", methods=["POST"])
@login_required
@csrf_protect
def create_workout_day() -> tuple[Response, int]:
    """
    Creates a new workout day with nested exercises and sets.

    Returns:
        tuple[Response, int]: JSON response containing created workout day and 201 status.

    Raises:
        ApiError: If payload fails schema validation.
    """
    payload = validate_workout_day_payload(request.get_json(silent=True) or {})
    day = wq.create_workout_day(g.user_id, payload)
    return jsonify({"workout": day}), 201


@workout_bp.route("/exercises/<exercise_id>", methods=["PUT"])
@login_required
@csrf_protect
def update_exercise(exercise_id: str) -> Response:
    """
    Updates an exercise and its sets for the authenticated user.

    Args:
        exercise_id: UUID of exercise to update.

    Returns:
        Response: JSON response containing updated exercise structure.

    Raises:
        ApiError: 404 Not Found if exercise doesn't exist or is not owned by user.
    """
    payload = validate_exercise_payload(request.get_json(silent=True) or {})
    row = wq.update_exercise(g.user_id, exercise_id, payload)
    if not row:
        raise ApiError("Exercise not found.", 404, "not_found")
    return jsonify({"exercise": row})


@workout_bp.route("/exercises/<exercise_id>", methods=["DELETE"])
@login_required
@csrf_protect
def delete_exercise(exercise_id: str) -> Response:
    """
    Deletes an exercise. Automatically removes parent day if no exercises remain.

    Args:
        exercise_id: UUID of exercise to delete.

    Returns:
        Response: JSON confirmation message.

    Raises:
        ApiError: 404 Not Found if exercise doesn't exist or is not owned by user.
    """
    deleted = wq.delete_exercise(g.user_id, exercise_id)
    if not deleted:
        raise ApiError("Exercise not found.", 404, "not_found")
    return jsonify({"message": "Exercise deleted."})


@workout_bp.route("/stats", methods=["GET"])
@login_required
def stats() -> Response:
    """
    Aggregates dashboard high-level metrics, recent workout sessions, and recent PRs.

    Returns:
        Response: JSON payload with stats, recent_workouts, and recent_prs.
    """
    all_workouts = wq.get_all_for_stats(g.user_id)
    dashboard = stats_service.compute_dashboard_stats(all_workouts)
    recent_days = wq.list_workout_days(g.user_id, limit=5)
    recent_prs = stats_service.compute_recent_prs(all_workouts, within_days=30)

    return jsonify(
        {
            "stats": dashboard,
            "recent_workouts": recent_days,
            "recent_prs": recent_prs,
        }
    )


@workout_bp.route("/recent", methods=["GET"])
@login_required
def recent() -> Response:
    """
    Returns recent workout days with bounded limit.

    Returns:
        Response: JSON array of recent workout days.
    """
    raw_limit = request.args.get("limit", 10)
    try:
        limit = max(1, min(int(raw_limit), 50))
    except (ValueError, TypeError):
        limit = 10

    days = wq.list_workout_days(g.user_id, limit=limit)
    return jsonify({"workouts": days})


@workout_bp.route("/exercises", methods=["GET"])
@login_required
def exercises() -> Response:
    """
    Returns unique exercise names logged by the user for autocomplete.

    Returns:
        Response: JSON array of exercise names.
    """
    return jsonify({"exercises": wq.get_distinct_exercises(g.user_id)})


@workout_bp.route("/progress", methods=["GET"])
@login_required
def progress() -> Response:
    """
    Returns aggregated progression telemetry across volume trends, split frequency,
    and consistency streaks.

    Returns:
        Response: JSON payload with progression datasets.
    """
    all_workouts = wq.get_all_for_stats(g.user_id)
    result = {
        "volume_trend": stats_service.compute_volume_trend(all_workouts, weeks=12),
        "frequency_by_type": stats_service.compute_frequency_by_type(all_workouts),
        "training_days": stats_service.compute_training_days(all_workouts),
        "streak": stats_service.compute_streak(all_workouts),
    }
    return jsonify(result)


@workout_bp.route("/prs", methods=["GET"])
@login_required
def prs() -> Response:
    """
    Returns all personal records (maximum weight sets) grouped by exercise.

    Returns:
        Response: JSON array of personal records.
    """
    all_workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"prs": stats_service.compute_prs(all_workouts)})


@workout_bp.route("/analytics", methods=["GET"])
@login_required
def analytics() -> Response:
    """
    Returns comprehensive analytics package (muscle balance, progressive overload, volume).

    Returns:
        Response: JSON analytics payload.
    """
    all_workouts = wq.get_all_for_stats(g.user_id)
    return jsonify(stats_service.compute_analytics(all_workouts))
