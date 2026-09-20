"""
Gemini integration. Called only from Flask — the API key never reaches the
browser. The model is given the user's real workout history (already
computed stats, not raw invented context) and is explicitly instructed to
analyze only what it's given, never invent numbers.
"""

import json
import logging

import requests

logger = logging.getLogger("repforge.ai")


GEMINI_ENDPOINT_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

class GeminiError(Exception):
    def __init__(self, message: str, code: str = "ai_error"):
        super().__init__(message)
        self.code = code

def chat_with_coach(workout_context: dict, chat_history: list, new_message: str, api_key: str, model: str, timeout_seconds: int) -> str:
    """Follow-up chat endpoint. Returns plain text."""
    if not api_key:
        raise GeminiError("Gemini is not configured on the server.", "ai_not_configured")

    url = GEMINI_ENDPOINT_TEMPLATE.format(model=model)
    
    # Base instructions + history
    contents = [
        {
            "role": "user",
            "parts": [
                {
                    "text": "Here is the user's real workout data. Base your answers on this:\n\n"
                    + json.dumps(workout_context, default=str)
                }
            ]
        },
        {
            "role": "model",
            "parts": [{"text": "Understood. I have reviewed the user's training history and am ready to answer their questions as their strength coach."}]
        }
    ]
    
    # Append prior chat history (must map 'user' and 'model' roles correctly)
    for msg in chat_history:
        contents.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [{"text": msg["text"]}]
        })
        
    # Append the new message
    contents.append({
        "role": "user",
        "parts": [{"text": new_message}]
    })

    # Determine token limit dynamically
    msg_lower = new_message.lower()
    needs_detail = any(k in msg_lower for k in ["explain", "detail", "science", "deep", "full", "breakdown"])
    tokens = 3000 if needs_detail else 400

    payload = {
        "systemInstruction": {
            "parts": [{"text": 
                "You are the RepForge AI Strength Engine — an advanced biomechanical intelligence. "
                "Provide tactical, concise, and actionable workout insights tailored directly to the user's real logged data (volume trends, progressive overload targets, and recovery cues). "
                "Keep responses compact, direct, and minimal (bullet points with concrete numbers and weight targets). "
                "Avoid unnecessary fluff, corporate filler, or long introductory paragraphs. "
                "Highlight key metrics, exercise names, and weight values clearly."
            }]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.5,
            "maxOutputTokens": tokens,
        },
    }

    try:
        resp = requests.post(url, params={"key": api_key}, json=payload, timeout=timeout_seconds)
    except requests.Timeout as exc:
        raise GeminiError("The coach is taking too long to respond. Please try again.", "ai_timeout") from exc
    except requests.RequestException as exc:
        logger.error("Gemini chat request failed: %s", exc)
        raise GeminiError("Could not reach the AI service. Please try again.", "ai_unreachable") from exc

    if resp.status_code == 429:
        raise GeminiError("The AI service is rate-limited right now. Please try again shortly.", "ai_rate_limited")
    if resp.status_code >= 500:
        raise GeminiError("The AI service is temporarily unavailable.", "ai_upstream_error")
    if resp.status_code != 200:
        logger.error("Gemini chat returned %s: %s", resp.status_code, resp.text)
        raise GeminiError(f"The AI service could not process this request. Detail: {resp.text}", "ai_bad_request")

    try:
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text
    except (KeyError, IndexError) as exc:
        logger.error("Malformed Gemini chat response: %s", exc)
        raise GeminiError("Received an unexpected response from the AI service.", "ai_malformed_response") from exc
