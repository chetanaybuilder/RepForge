"""
RepForge Miscellaneous & Operational Routes.

Purpose:
    Exposes platform health checks and operational telemetry endpoints.
    Provides backward-compatible session identity resolution for frontend clients.
"""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify
from werkzeug.wrappers import Response

from database.db import health_check
from routes.auth_routes import get_current_user_payload

logger = logging.getLogger("repforge.routes.misc")

misc_bp = Blueprint("misc", __name__)


@misc_bp.route("/health", methods=["GET"])
@misc_bp.route("/api/health", methods=["GET"])
def health() -> tuple[Response, int]:
    """
    Performs comprehensive liveness and database readiness probe.

    Returns:
        tuple[Response, int]: JSON status payload and HTTP status (200 OK or 503 Service Unavailable).
    """
    db_ok = health_check()
    status_str = "ok" if db_ok else "degraded"
    status_code = 200 if db_ok else 503
    return jsonify({"status": status_str, "database": db_ok}), status_code


@misc_bp.route("/api/me", methods=["GET"])
def api_me() -> tuple[Response, int]:
    """
    Backward-compatible user profile endpoint mirroring /auth/me.

    Delegates to canonical get_current_user_payload() to eliminate duplicated logic.

    Returns:
        tuple[Response, int]: User authentication and profile state tuple.
    """
    payload, status = get_current_user_payload()
    return jsonify(payload), status
