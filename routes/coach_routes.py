"""
RepForge Coach Routes (Groq LLM Engine).

Purpose:
    Exposes conversational coaching, progressive overload targets,
    and single-session breakdown insights powered by the Groq API (llama-3.3-70b-versatile).

Security Invariants:
    - Zero Credential Disclosure: GROQ_API_KEY is retained exclusively server-side.
    - Tenant Isolation: Real training telemetry is loaded strictly for authenticated `g.user_id`.
    - Per-USER Rate Limiting: Rate limit keys use internal `user_id`, preventing IP collision.
    - Anti-Prompt Injection: User queries sanitized, length-capped, and delimited in XML.
    - CSRF Protection: Required on all mutating requests.
"""

from __future__ import annotations

import json
import logging

from flask import Blueprint, Response, current_app, g, jsonify, request
from werkzeug.wrappers import Response as WerkzeugResponse

from auth.decorators import csrf_protect, login_required
from database import queries_workouts as wq
from extensions import limiter
from services import groq_service, stats_service
from utils.errors import ApiError

logger = logging.getLogger("repforge.routes.coach")

coach_bp = Blueprint("coach", __name__, url_prefix="/api/coach")


def user_rate_limit_key() -> str:
    """Per-user rate limit identifier derived from authenticated session."""
    return str(getattr(g, "user_id", None) or "anonymous_session")


@coach_bp.route("/status", methods=["GET"])
@login_required
def status() -> WerkzeugResponse:
    """
    Returns Coach operational readiness and active Groq model.

    Returns:
        Response: JSON status payload.
    """
    configured = bool(current_app.config.get("GROQ_API_KEY"))
    return jsonify(
        {
            "configured": configured,
            "model": current_app.config.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        }
    )


@coach_bp.route("/chat", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(lambda: current_app.config["RATELIMIT_AI"], key_func=user_rate_limit_key)
def chat() -> WerkzeugResponse | Response:
    """
    Dispatches a dialogue turn to the Coach grounded in verified user telemetry.

    Supports Server-Sent Events (SSE) streaming if Accept header includes 'text/event-stream'.

    Returns:
        Response: Streaming SSE response or JSON reply.
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")

    raw_message = data.get("message")
    if not raw_message or not isinstance(raw_message, str) or not raw_message.strip():
        raise ApiError(
            "message is required and must be a non-empty string.", 400, "validation_error"
        )

    history_in = data.get("history", [])
    if not isinstance(history_in, list):
        raise ApiError("history must be an array of messages.", 400, "validation_error")

    # Bounded history window
    sanitized_history: list[dict[str, str]] = []
    for msg in history_in[-10:]:
        if isinstance(msg, dict):
            sanitized_history.append(
                {
                    "role": "user" if msg.get("role") == "user" else "assistant",
                    "text": groq_service.sanitize_input_text(msg.get("text", msg.get("content", ""))),
                }
            )

    clean_message = groq_service.sanitize_input_text(raw_message, max_len=1500)

    # Initial check-in trigger handling
    if raw_message == "_INIT_CHECKIN_":
        clean_message = (
            "Provide a tactical, high-impact performance check-in based on my logged telemetry. "
            "Keep it concise, actionable, and minimal:\n"
            "1. Volume Trend & Workload (status based on weekly load)\n"
            "2. Progressive Overload Target (specific next-session weight/rep targets for main lifts)\n"
            "3. Recovery & Split Cue (frequency & movement balance)\n"
            "Keep it direct, professional, and tactical without generic filler."
        )

    # Compile user training telemetry
    all_workouts = wq.get_all_for_stats(g.user_id)
    dashboard_stats = stats_service.compute_dashboard_stats(all_workouts)
    prs = stats_service.compute_prs(all_workouts)
    context = stats_service.build_ai_context(all_workouts, prs, dashboard_stats)

    api_key = current_app.config.get("GROQ_API_KEY", "")
    model = current_app.config.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    timeout = current_app.config.get("GROQ_TIMEOUT_SECONDS", 25)

    # Check if client requested streaming
    wants_streaming = "text/event-stream" in request.headers.get("Accept", "")

    if wants_streaming:

        def event_stream():
            for chunk in groq_service.stream_coach_dialogue(
                workout_context=context,
                chat_history=sanitized_history,
                new_message=clean_message,
                api_key=api_key,
                model=model,
                timeout_seconds=timeout,
            ):
                payload = json.dumps({"chunk": chunk})
                yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"

        return Response(
            event_stream(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    # Standard non-streaming JSON response
    reply = groq_service.chat_with_coach(
        workout_context=context,
        chat_history=sanitized_history,
        new_message=clean_message,
        api_key=api_key,
        model=model,
        timeout_seconds=timeout,
    )

    return jsonify({"reply": reply})


@coach_bp.route("/insights/<day_id>", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(lambda: current_app.config["RATELIMIT_AI"], key_func=user_rate_limit_key)
def day_insights(day_id: str) -> WerkzeugResponse:
    """
    Generates Coach tactical review for a single workout day.

    Args:
        day_id: UUID of the workout day.

    Returns:
        Response: JSON payload with deep review insights.
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
        "Give a deep tactical review of the session, call out effective mechanical overload points, "
        "and suggest specific next-session targets. Talk like a world-class strength coach."
    )

    context = {"session_exercises": day_summary}
    api_key = current_app.config.get("GROQ_API_KEY", "")
    model = current_app.config.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    timeout = current_app.config.get("GROQ_TIMEOUT_SECONDS", 25)

    reply = groq_service.chat_with_coach(
        workout_context=context,
        chat_history=[],
        new_message=prompt,
        api_key=api_key,
        model=model,
        timeout_seconds=timeout,
    )

    return jsonify({"insights": {"deep_review": reply, "good_points": [], "critical_points": []}})
