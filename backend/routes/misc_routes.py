from flask import Blueprint, jsonify

from backend.auth.decorators import get_current_session
from backend.database.db import health_check
from backend.database.queries_users import get_user_by_id

misc_bp = Blueprint("misc", __name__, url_prefix="/api")


@misc_bp.route("/health", methods=["GET"])
def health():
    db_ok = health_check()
    return jsonify({"status": "ok" if db_ok else "degraded", "database": db_ok}), (200 if db_ok else 503)


@misc_bp.route("/me", methods=["GET"])
def me():
    _, session_row = get_current_session()
    if not session_row:
        return jsonify({"authenticated": False, "user": None}), 200

    user = get_user_by_id(session_row["user_id"])
    if not user:
        return jsonify({"authenticated": False, "user": None}), 200

    return jsonify({
        "authenticated": True,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "avatar_url": user["avatar_url"],
        },
        "csrf_token": session_row["csrf_token"],
    })
