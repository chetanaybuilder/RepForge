"""
RepForge AI Coaching & Session Insights Routes.

Purpose:
    Exposes conversational AI endpoints powered by Google Gemini. Provides tactical,
    hyper-grounded feedback derived directly from real workout volume, PRs, and logs.

Security:
    - Tenant Isolation: Context is constructed exclusively from `g.user_id` data.
    - Rate Limiting: Protected by dedicated strict AI rate limiters.
    - Sanitization: Inbound messages are sanitized against prompt injection and XSS markup.
    - CSRF Protection: Required on all mutating POST requests.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.wrappers import Response

from ai.gemini_service import GeminiError, chat_with_coach
from auth.decorators import csrf_protect, login_required
from database import queries_workouts as wq
from extensions import limiter
from services import stats_service
from utils.errors import ApiError

logger = logging.getLogger("repforge.routes.ai")

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_PROMPT_INJECTION_MARKERS = re.compile(
    r"(ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions|"
    r"system\s*:\s*|"
    r"\[INST\]|\[/INST\]|"
    r"<\|(?:im_start|im_end|system)\|>)",
    re.IGNORECASE,
)

MAX_MESSAGE_LENGTH = 4000
MAX_HISTORY_ITEMS = 50


def _sanitize_user_text(text: Any, max_len: int = 2000) -> str:
    """
    Sanitizes user-supplied text before dispatching to the AI engine.

    Strips HTML tags and neutralizes obvious prompt-injection boundary sequences.

    Args:
        text: Inbound string to sanitize.
        max_len: Maximum character bound.

    Returns:
        str: Sanitized plain text string.
    """
    if not isinstance(text, str):
        return ""
    text = _HTML_TAG_RE.sub("", text)
    text = _PROMPT_INJECTION_MARKERS.sub("[filtered]", text)
    return text.strip()[:max_len]


@ai_bp.route("/status", methods=["GET"])
@login_required
def status() -> Response:
    """
    Returns AI coach operational readiness and configured model.

    Returns:
        Response: JSON status payload.
    """
    configured = bool(current_app.config.get("GEMINI_API_KEY"))
    return jsonify(
        {
            "configured": configured,
            "model": current_app.config.get("GEMINI_MODEL"),
        }
    )


@ai_bp.route("/chat", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(lambda: current_app.config["RATELIMIT_AI"])
def chat() -> Response:
    """
    Dispatches a user dialogue turn to the AI coach grounded in user workout telemetry.

    Returns:
        Response: JSON payload with coach reply text.

    Raises:
        ApiError: If request body is malformed, message is missing, or AI inference fails.
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")

    raw_message = data.get("message")
    if not raw_message or not isinstance(raw_message, str) or not raw_message.strip():
        raise ApiError("message is required and must be a non-empty string.", 400, "validation_error")

    history_in = data.get("history", [])
    if not isinstance(history_in, list):
        raise ApiError("history must be an array of messages.", 400, "validation_error")

    # Bounded history window to protect token budget
    history_in = history_in[-MAX_HISTORY_ITEMS:]
    sanitized_history = []
    for msg in history_in:
        if isinstance(msg, dict):
            sanitized_history.append(
                {
                    "role": "user" if msg.get("role") == "user" else "model",
                    "text": _sanitize_user_text(msg.get("text", ""), max_len=MAX_MESSAGE_LENGTH),
                }
            )

    # Sanitize prompt
    message = _sanitize_user_text(raw_message, max_len=MAX_MESSAGE_LENGTH)

    all_workouts = wq.get_all_for_stats(g.user_id)
    dashboard_stats = stats_service.compute_dashboard_stats(all_workouts)
    prs = stats_service.compute_prs(all_workouts)
    context = stats_service.build_ai_context(all_workouts, prs, dashboard_stats)

    # Initial check-in trigger handling
    if raw_message == "_INIT_CHECKIN_":
        message = (
            "Provide a tactical, high-impact performance check-in based on my logged telemetry. "
            "Keep it concise, actionable, and minimal:\n"
            "1. Volume Trend & Workload (brief status based on weekly load)\n"
            "2. Progressive Overload Target (specific weight/rep target for key lifts)\n"
            "3. Recovery & Split Cue (frequency & balance observation)\n"
            "Keep it direct, professional, and tactical without filler."
        )

    try:
        reply = chat_with_coach(
            workout_context=context,
            chat_history=sanitized_history,
            new_message=message,
            api_key=current_app.config["GEMINI_API_KEY"],
            model=current_app.config["GEMINI_MODEL"],
            timeout_seconds=current_app.config["GEMINI_TIMEOUT_SECONDS"],
        )
    except GeminiError as exc:
        status_map = {
            "ai_not_configured": 503,
            "ai_timeout": 504,
            "ai_unreachable": 502,
            "ai_rate_limited": 429,
            "ai_upstream_error": 502,
            "ai_bad_request": 502,
            "ai_malformed_response": 502,
        }
        raise ApiError(str(exc), status_map.get(exc.code, 502), exc.code) from exc

    return jsonify({"reply": reply})


@ai_bp.route("/insights/<day_id>", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(lambda: current_app.config["RATELIMIT_AI"])
def day_insights(day_id: str) -> Response:
    """
    Generates AI analysis and tactical review for a single workout day.

    Args:
        day_id: UUID of the workout day to analyze.

    Returns:
        Response: JSON payload with deep review insights.

    Raises:
        ApiError: 404 Not Found if workout day doesn't exist or is not owned by user.
    """
    day_workouts = wq.get_day_for_stats(g.user_id, day_id)
    if not day_workouts:
        raise ApiError("No workout data found for this day.", 404, "not_found")

    day_summary = []
    for w in day_workouts:
        day_summary.append(
            {
                "exercise": w["exercise_name"],
                "type": w["workout_type"],
                "set": w["set_number"],
                "reps": w["reps"],
                "weight": float(w["weight"]),
                "notes": w.get("notes", ""),
            }
        )

    prompt = (
        f"Analyze this single training session in detail. Date: {day_workouts[0]['date']}. "
        "Give a deep review of the session, call out good points and critical points, "
        "and suggest improvements. Be conversational like a coach."
    )

    context = {"session_exercises": day_summary}

    try:
        reply = chat_with_coach(
            workout_context=context,
            chat_history=[],
            new_message=prompt,
            api_key=current_app.config["GEMINI_API_KEY"],
            model=current_app.config["GEMINI_MODEL"],
            timeout_seconds=current_app.config["GEMINI_TIMEOUT_SECONDS"],
        )
    except GeminiError as exc:
        status_map = {
            "ai_not_configured": 503,
            "ai_timeout": 504,
            "ai_unreachable": 502,
            "ai_rate_limited": 429,
            "ai_upstream_error": 502,
            "ai_bad_request": 502,
            "ai_malformed_response": 502,
        }
        raise ApiError(str(exc), status_map.get(exc.code, 502), exc.code) from exc

    return jsonify({"insights": {"deep_review": reply, "good_points": [], "critical_points": []}})
