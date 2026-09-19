import re

from flask import Blueprint, jsonify, g, current_app, request

from backend.auth.decorators import login_required, csrf_protect
from backend.database import queries_workouts as wq
from backend.services import stats_service
from backend.ai.gemini_service import chat_with_coach, GeminiError
from backend.extensions import limiter
from backend.utils.errors import ApiError

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

# --- Input sanitization -----------------------------------------------
# Strip anything that might be used for prompt injection or stored XSS.
# We allow normal punctuation and unicode letters/numbers but remove
# HTML tags and obvious prompt-injection framing.
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_PROMPT_INJECTION_MARKERS = re.compile(
    r"(ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions|"
    r"system\s*:\s*|"
    r"\[INST\]|\[/INST\]|"
    r"<\|(?:im_start|im_end|system)\|>)",
    re.IGNORECASE,
)

def _sanitize_user_text(text: str, max_len: int = 2000) -> str:
    """Sanitize user-supplied text before it reaches Gemini or is stored."""
    if not isinstance(text, str):
        return ""
    text = _HTML_TAG_RE.sub("", text)
    text = _PROMPT_INJECTION_MARKERS.sub("[filtered]", text)
    return text.strip()[:max_len]


@ai_bp.route("/status", methods=["GET"])
@login_required
def status():
    configured = bool(current_app.config.get("GEMINI_API_KEY"))
    return jsonify({"configured": configured, "model": current_app.config.get("GEMINI_MODEL")})


@ai_bp.route("/chat", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(lambda: current_app.config["RATELIMIT_AI"])
def chat():
    data = request.get_json() or {}
    raw_message = data.get("message")
    history = data.get("history", [])

    if not raw_message:
        raise ApiError("Message is required", 400, "bad_request")

    # Sanitize the user message and all history entries
    message = _sanitize_user_text(raw_message, max_len=4000)
    sanitized_history = []
    for msg in history:
        sanitized_history.append({
            "role": msg.get("role", "user"),
            "text": _sanitize_user_text(msg.get("text", ""), max_len=4000),
        })

    all_workouts = wq.get_all_for_stats(g.user_id)
    dashboard_stats = stats_service.compute_dashboard_stats(all_workouts)
    prs = stats_service.compute_prs(all_workouts)
    context = stats_service.build_ai_context(all_workouts, prs, dashboard_stats)

    # Initial load trigger handling
    if raw_message == "_INIT_CHECKIN_":
        message = "Give me my initial check-in: a proactive deep analysis of my FULL training history. Summarize my training frequency, volume trends, and Push/Pull/Legs balance. Call out my good points and critical points, and give progressive overload suggestions per exercise where you have enough data. Write this conversationally, like a coach texting me, not bullet-point headers like a corporate report."

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
def day_insights(day_id):
    """AI analysis for a single workout day."""
    day_workouts = wq.get_day_for_stats(g.user_id, day_id)
    if not day_workouts:
        raise ApiError("No workout data found for this day.", 404, "not_found")

    # Build a focused context for this specific day
    day_summary = []
    for w in day_workouts:
        day_summary.append({
            "exercise": w["exercise_name"],
            "type": w["workout_type"],
            "set": w["set_number"],
            "reps": w["reps"],
            "weight": float(w["weight"]),
            "notes": w.get("notes", ""),
        })

    prompt = (
        f"Analyze this single training session in detail. Date: {day_workouts[0]['date']}. "
        "Give a deep review of the session, call out good points and critical points, "
        "and suggest improvements. Be conversational like a coach."
    )

    import json
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

    # Parse the response into structured insights
    insights = {
        "deep_review": reply,
        "good_points": [],
        "critical_points": [],
    }

    return jsonify({"insights": insights})
