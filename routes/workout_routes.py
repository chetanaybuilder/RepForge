from flask import Blueprint, request, jsonify, g

from auth.decorators import login_required, csrf_protect
from database import queries_workouts as wq
from utils.validation import validate_workout_day_payload, validate_exercise_payload, validate_list_params
from utils.errors import ApiError
from services import stats_service

workout_bp = Blueprint("workouts", __name__, url_prefix="/api/workouts")

# Note: serialization for nested Day/Exercises/Sets is mostly done directly in queries_workouts.py 
# but for recent_workouts in /stats we need to serialize the flattened result
def _serialize_flat(row: dict) -> dict:
    return {
        "id": row["exercise_id"],
        "user_id": row.get("user_id", ""), 
        "day": row["day"],
        "date": str(row["date"]),
        "workout_type": row["workout_type"],
        "exercise_name": row["exercise_name"],
        "sets": 1, # legacy support for stats UI that expects these
        "reps": row["reps"],
        "weight": float(row["weight"]),
        "notes": row["notes"],
        "created_at": None,
    }


@workout_bp.route("", methods=["GET"])
@login_required
def list_workouts():
    params = validate_list_params(request.args)
    # This now returns a list of Day objects with nested exercises and sets
    days = wq.list_workout_days(g.user_id, **params)
    return jsonify({"workouts": days, "count": len(days)})


@workout_bp.route("", methods=["POST"])
@login_required
@csrf_protect
def create_workout_day():
    payload = validate_workout_day_payload(request.get_json(silent=True) or {})
    day = wq.create_workout_day(g.user_id, payload)
    return jsonify({"workout": day}), 201


@workout_bp.route("/exercises/<exercise_id>", methods=["PUT"])
@login_required
@csrf_protect
def update_exercise(exercise_id):
    payload = validate_exercise_payload(request.get_json(silent=True) or {})
    row = wq.update_exercise(g.user_id, exercise_id, payload)
    if not row:
        raise ApiError("Exercise not found.", 404, "not_found")
    return jsonify({"exercise": row})


@workout_bp.route("/exercises/<exercise_id>", methods=["DELETE"])
@login_required
@csrf_protect
def delete_exercise(exercise_id):
    deleted = wq.delete_exercise(g.user_id, exercise_id)
    if not deleted:
        raise ApiError("Exercise not found.", 404, "not_found")
    return jsonify({"message": "Exercise deleted."})


@workout_bp.route("/stats", methods=["GET"])
@login_required
def stats():
    all_workouts = wq.get_all_for_stats(g.user_id)
    dashboard = stats_service.compute_dashboard_stats(all_workouts)
    
    # recent_workouts UI expects a flat list of items, we'll return the last 5 days
    recent_days = wq.list_workout_days(g.user_id, limit=5)
    
    recent_prs = stats_service.compute_recent_prs(all_workouts, within_days=30)
    return jsonify({
        "stats": dashboard,
        "recent_workouts": recent_days,
        "recent_prs": recent_prs,
    })


@workout_bp.route("/recent", methods=["GET"])
@login_required
def recent():
    limit = min(int(request.args.get("limit", 10)), 50)
    days = wq.list_workout_days(g.user_id, limit=limit)
    return jsonify({"workouts": days})


@workout_bp.route("/exercises", methods=["GET"])
@login_required
def exercises():
    return jsonify({"exercises": wq.get_distinct_exercises(g.user_id)})


@workout_bp.route("/progress", methods=["GET"])
@login_required
def progress():
    all_workouts = wq.get_all_for_stats(g.user_id)
    exercise_name = request.args.get("exercise")

    result = {
        "volume_trend": stats_service.compute_volume_trend(all_workouts, weeks=12),
        "frequency_by_type": stats_service.compute_frequency_by_type(all_workouts),
        "training_days": stats_service.compute_training_days(all_workouts),
        "streak": stats_service.compute_streak(all_workouts),
    }
    if exercise_name:
        result["exercise_progression"] = stats_service.compute_exercise_progression(all_workouts, exercise_name)
    return jsonify(result)


@workout_bp.route("/prs", methods=["GET"])
@login_required
def prs():
    all_workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({"personal_records": stats_service.compute_prs(all_workouts)})


@workout_bp.route("/analytics", methods=["GET"])
@login_required
def analytics():
    all_workouts = wq.get_all_for_stats(g.user_id)
    return jsonify({
        "dashboard_stats": stats_service.compute_dashboard_stats(all_workouts),
        "volume_trend": stats_service.compute_volume_trend(all_workouts, weeks=26),
        "frequency_by_type": stats_service.compute_frequency_by_type(all_workouts),
        "plateaus": stats_service.detect_plateaus(all_workouts),
        "personal_records": stats_service.compute_prs(all_workouts),
    })
