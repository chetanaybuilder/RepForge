from flask import Blueprint, request, jsonify, g

from backend.auth.decorators import login_required, csrf_protect
from backend.database import queries_goals as gq
from backend.database import queries_workouts as wq
from backend.services import goals_service
from backend.utils.errors import ApiError

goals_bp = Blueprint("goals", __name__, url_prefix="/api/goals")

ALLOWED_GOAL_TYPES = {"weekly_frequency", "exercise_pr", "volume"}


def _serialize_goal(row: dict, workouts: list) -> dict:
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


def _validate_goal_payload(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")

    goal_type = data.get("goal_type")
    if goal_type not in ALLOWED_GOAL_TYPES:
        raise ApiError(f"goal_type must be one of: {', '.join(sorted(ALLOWED_GOAL_TYPES))}.", 400, "validation_error")

    target_value = data.get("target_value")
    if not isinstance(target_value, (int, float)) or isinstance(target_value, bool) or target_value <= 0:
        raise ApiError("target_value must be a positive number.", 400, "validation_error")

    exercise_name = data.get("exercise_name")
    if goal_type == "exercise_pr" and not exercise_name:
        raise ApiError("exercise_name is required for exercise_pr goals.", 400, "validation_error")

    return {
        "goal_type": goal_type,
        "exercise_name": str(exercise_name)[:500] if exercise_name else None,
        "target_value": float(target_value),
        "period_start": data.get("period_start"),
        "period_end": data.get("period_end"),
    }


@goals_bp.route("", methods=["GET"])
@login_required
def list_goals():
    goals = gq.list_goals(g.user_id)
    workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"goals": [_serialize_goal(row, workouts) for row in goals]})


@goals_bp.route("", methods=["POST"])
@login_required
@csrf_protect
def create_goal():
    payload = _validate_goal_payload(request.get_json(silent=True) or {})
    row = gq.create_goal(g.user_id, payload)
    workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"goal": _serialize_goal(row, workouts)}), 201


@goals_bp.route("/<goal_id>", methods=["DELETE"])
@login_required
@csrf_protect
def delete_goal(goal_id):
    deleted = gq.delete_goal(g.user_id, goal_id)
    if not deleted:
        raise ApiError("Goal not found.", 404, "not_found")
    return jsonify({"message": "Goal deleted."})


@goals_bp.route("/achievements", methods=["GET"])
@login_required
def achievements():
    workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"achievements": goals_service.compute_achievements(workouts)})
