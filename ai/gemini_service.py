"""
RepForge AI Strength Engine Integration (Google Gemini).

Purpose:
    Executes server-to-server inference calls to Google Gemini models.
    Provides automated biomechanical coaching and tactical workout telemetry analysis.

Security & Architectural Defenses:
    - Zero Credential Disclosure: Gemini API keys are never exposed to the frontend;
      all inference requests are proxied securely server-side.
    - Header-Based Authentication: Keys are transmitted exclusively via the `x-goog-api-key`
      HTTP header, eliminating URL query parameter leakage in proxies and access logs.
    - Upstream Error Sanitization: Raw third-party error bodies are logged server-side and
      never returned verbatim to clients.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests

logger = logging.getLogger("repforge.ai")

GEMINI_ENDPOINT_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiError(Exception):
    """
    Application exception for AI service communication and processing failures.

    Attributes:
        message: Human-readable error message.
        code: Machine-readable error code.
    """

    def __init__(self, message: str, code: str = "ai_error"):
        super().__init__(message)
        self.code = code


def chat_with_coach(
    workout_context: dict[str, Any],
    chat_history: list[dict[str, Any]],
    new_message: str,
    api_key: str,
    model: str,
    timeout_seconds: int = 20,
) -> str:
    """
    Executes inference against Google Gemini with grounded workout context and chat history.

    Args:
        workout_context: Structured dictionary of verified user telemetry (PRs, volume, stats).
        chat_history: Prior sanitized dialogue messages with 'role' ('user'|'model') and 'text'.
        new_message: Inbound user prompt or check-in trigger.
        api_key: Secret Google Gemini API key.
        model: Gemini model identifier (e.g. 'gemini-2.5-flash').
        timeout_seconds: Upstream HTTP timeout in seconds.

    Returns:
        str: Generated plain text response from the coach.

    Raises:
        GeminiError: If the service is unconfigured, unreachable, rate-limited,
                     or returns an error response.
    """
    if not api_key:
        raise GeminiError("AI coaching is not configured on the server.", "ai_not_configured")

    url = GEMINI_ENDPOINT_TEMPLATE.format(model=model)

    contents: list[dict[str, Any]] = [
        {
            "role": "user",
            "parts": [
                {
                    "text": (
                        "Here is the user's real workout data. Base your answers on this:\n\n"
                        + json.dumps(workout_context, default=str)
                    )
                }
            ],
        },
        {
            "role": "model",
            "parts": [
                {
                    "text": (
                        "Understood. I have reviewed the user's training history and am "
                        "ready to provide tactical coaching based on their real data."
                    )
                }
            ],
        },
    ]

    for msg in chat_history:
        contents.append(
            {
                "role": "user" if msg.get("role") == "user" else "model",
                "parts": [{"text": str(msg.get("text", ""))[:4000]}],
            }
        )

    contents.append(
        {
            "role": "user",
            "parts": [{"text": new_message}],
        }
    )

    tokens = 1000 if new_message.startswith("Provide a tactical") else 600
    payload = {
        "systemInstruction": {
            "parts": [
                {
                    "text": (
                        "You are the RepForge AI Strength Engine — an advanced biomechanical intelligence. "
                        "Provide tactical, concise, and actionable workout insights tailored directly to the "
                        "user's real logged data (volume trends, progressive overload targets, and recovery cues). "
                        "Keep responses compact, direct, and minimal (bullet points with concrete numbers and weight targets). "
                        "Avoid unnecessary fluff, corporate filler, or long introductory paragraphs. "
                        "Highlight key metrics, exercise names, and weight values clearly."
                    )
                }
            ]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.5,
            "maxOutputTokens": tokens,
        },
    }

    # Pass API key via x-goog-api-key header to eliminate exposure in proxy query string logs
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout_seconds)
    except requests.Timeout as exc:
        raise GeminiError(
            "The AI coach took too long to respond. Please try again shortly.",
            "ai_timeout",
        ) from exc
    except requests.RequestException as exc:
        logger.error("Gemini network request failed: %s", exc)
        raise GeminiError(
            "Could not connect to the AI service. Please try again.",
            "ai_unreachable",
        ) from exc

    if resp.status_code == 429:
        raise GeminiError(
            "The AI service is rate-limited right now. Please slow down and try again.",
            "ai_rate_limited",
        )
    if resp.status_code >= 500:
        logger.error("Gemini upstream 5xx status=%d: %s", resp.status_code, resp.text)
        raise GeminiError(
            "The AI service is temporarily unavailable. Please try again later.",
            "ai_upstream_error",
        )
    if resp.status_code != 200:
        # Sanitize message: do not leak upstream Google Cloud JSON payloads to end users
        logger.error("Gemini rejected request status=%d: %s", resp.status_code, resp.text)
        raise GeminiError(
            "The AI service could not process this request. Please rephrase or try again.",
            "ai_bad_request",
        )

    try:
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Malformed Gemini response payload: %s", exc)
        raise GeminiError(
            "Received an unexpected response format from the AI service.",
            "ai_malformed_response",
        ) from exc
