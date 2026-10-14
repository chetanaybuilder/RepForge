"""
RepForge Schema-Based Input Validation & Sanitization Layer.

Purpose:
    Enforces strict structural and boundary validation on all inbound JSON payloads
    and query parameters.

Guarantees:
    - Bounded Resource Consumption (Anti-DoS): Imposes hard upper bounds on collections
      (e.g., maximum 30 exercises per day, maximum 50 sets per exercise).
    - Bounded Numeric Telemetry: Restricts physical values (reps 1-200, weight 0-1000kg)
      preventing numeric overflow crashes in PostgreSQL.
    - Strict Sanitization: Strips dangerous HTML markup and normalizes string inputs.
"""

from __future__ import annotations

import datetime
import re
from typing import Any

from utils.errors import ApiError

MAX_TEXT_LEN = 500
MAX_NOTES_LEN = 2000
MAX_EXERCISES_PER_DAY = 30
MAX_SETS_PER_EXERCISE = 50
MAX_WEIGHT_KG = 1000
MAX_REPS = 200

ALLOWED_WORKOUT_TYPES = {
    "push",
    "pull",
    "legs",
    "upper",
    "lower",
    "full_body",
    "cardio",
    "core",
    "mobility",
    "other",
}
ALLOWED_SORTS = {"date_desc", "date_asc", "weight_desc", "weight_asc", "exercise_asc"}

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _require(condition: bool, message: str, code: str = "validation_error") -> None:
    """Helper raising ApiError with 400 Bad Request when validation condition fails."""
    if not condition:
        raise ApiError(message, 400, code)


def _clean_str(value: Any, field_name: str, max_len: int, required: bool = True) -> str | None:
    """
    Sanitizes string fields: strips HTML tags, trims whitespace, and enforces length bounds.

    Args:
        value: Input value to validate and sanitize.
        field_name: Field identifier for error reporting.
        max_len: Maximum permitted string length.
        required: Whether a non-empty string is required.

    Returns:
        str | None: Sanitized string or None if optional and empty.

    Raises:
        ApiError: If type or length constraints are violated.
    """
    if value is None:
        _require(not required, f"{field_name} is required.")
        return None

    _require(isinstance(value, str), f"{field_name} must be a string.")
    cleaned = _HTML_TAG_RE.sub("", value).strip()

    _require(not required or len(cleaned) > 0, f"{field_name} cannot be empty.")
    _require(
        len(cleaned) <= max_len,
        f"{field_name} must be {max_len} characters or fewer.",
    )
    return cleaned or None


def validate_workout_day_payload(data: Any) -> dict[str, Any]:
    """
    Validates and normalizes the full hierarchical workout day payload.

    Args:
        data: Inbound JSON payload from request body.

    Returns:
        dict[str, Any]: Normalized workout day dictionary.

    Raises:
        ApiError: If structure or field constraints are violated.
    """
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")

    cleaned: dict[str, Any] = {}
    cleaned["day"] = _clean_str(data.get("day"), "day", 50, required=False)

    date_str = data.get("date")
    _require(isinstance(date_str, str) and date_str, "date is required (YYYY-MM-DD).")
    try:
        parsed_date = datetime.date.fromisoformat(date_str)
    except ValueError as exc:
        raise ApiError("date must be a valid date in YYYY-MM-DD format.", 400, "validation_error") from exc

    _require(
        parsed_date <= datetime.date.today() + datetime.timedelta(days=1),
        "date cannot be in the future.",
    )
    cleaned["date"] = parsed_date.isoformat()

    exercises_in = data.get("exercises")
    _require(
        isinstance(exercises_in, list) and 1 <= len(exercises_in) <= MAX_EXERCISES_PER_DAY,
        f"exercises must be a list containing between 1 and {MAX_EXERCISES_PER_DAY} exercises.",
    )

    cleaned_exercises = []
    for ex in exercises_in:
        if not isinstance(ex, dict):
            raise ApiError("Each exercise must be an object.", 400, "validation_error")

        c_ex: dict[str, Any] = {}
        c_ex["exercise_name"] = _clean_str(ex.get("exercise_name"), "exercise_name", MAX_TEXT_LEN)

        workout_type = _clean_str(ex.get("workout_type"), "workout_type", 50)
        _require(
            workout_type is not None and workout_type.lower() in ALLOWED_WORKOUT_TYPES,
            f"workout_type must be one of: {', '.join(sorted(ALLOWED_WORKOUT_TYPES))}.",
        )
        c_ex["workout_type"] = workout_type.lower() if workout_type else "other"
        c_ex["notes"] = _clean_str(ex.get("notes"), "notes", MAX_NOTES_LEN, required=False)

        sets_in = ex.get("sets")
        _require(
            isinstance(sets_in, list) and 1 <= len(sets_in) <= MAX_SETS_PER_EXERCISE,
            f"Sets for exercise '{c_ex['exercise_name']}' must contain between 1 and {MAX_SETS_PER_EXERCISE} sets.",
        )

        c_sets = []
        for s_idx, s in enumerate(sets_in):
            if not isinstance(s, dict):
                raise ApiError("Each set must be an object.", 400, "validation_error")

            c_set: dict[str, Any] = {}
            reps = s.get("reps")
            _require(
                isinstance(reps, int) and not isinstance(reps, bool) and 1 <= reps <= MAX_REPS,
                f"reps must be a whole number between 1 and {MAX_REPS}.",
            )
            c_set["reps"] = reps
            c_set["set_number"] = s.get("set_number", s_idx + 1)

            raw_weight = s.get("weight") if s.get("weight") is not None else s.get("weight_kg")
            if raw_weight is None:
                weight_val = 0.0
            else:
                _require(
                    isinstance(raw_weight, (int, float))
                    and not isinstance(raw_weight, bool)
                    and 0.0 <= float(raw_weight) <= MAX_WEIGHT_KG,
                    f"weight must be a number between 0 and {MAX_WEIGHT_KG} kg.",
                )
                weight_val = float(raw_weight)

            c_set["weight"] = round(weight_val, 2)
            c_set["weight_kg"] = round(weight_val, 2)
            c_set["completed"] = bool(s.get("completed", True))
            c_sets.append(c_set)

        c_ex["sets"] = c_sets
        cleaned_exercises.append(c_ex)

    cleaned["exercises"] = cleaned_exercises
    return cleaned


def validate_exercise_payload(data: Any) -> dict[str, Any]:
    """
    Validates payload for updating an individual exercise and its sets.

    Args:
        data: Inbound JSON payload from request body.

    Returns:
        dict[str, Any]: Normalized exercise dictionary.

    Raises:
        ApiError: If payload fails boundary or type constraints.
    """
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")

    c_ex: dict[str, Any] = {}
    c_ex["exercise_name"] = _clean_str(data.get("exercise_name"), "exercise_name", MAX_TEXT_LEN)

    workout_type = _clean_str(data.get("workout_type"), "workout_type", 50)
    _require(
        workout_type is not None and workout_type.lower() in ALLOWED_WORKOUT_TYPES,
        f"workout_type must be one of: {', '.join(sorted(ALLOWED_WORKOUT_TYPES))}.",
    )
    c_ex["workout_type"] = workout_type.lower() if workout_type else "other"
    c_ex["notes"] = _clean_str(data.get("notes"), "notes", MAX_NOTES_LEN, required=False)

    sets_in = data.get("sets")
    _require(
        isinstance(sets_in, list) and 1 <= len(sets_in) <= MAX_SETS_PER_EXERCISE,
        f"sets must be a list containing between 1 and {MAX_SETS_PER_EXERCISE} sets.",
    )

    c_sets = []
    for s_idx, s in enumerate(sets_in):
        if not isinstance(s, dict):
            raise ApiError("Each set must be an object.", 400, "validation_error")

        c_set: dict[str, Any] = {}
        reps = s.get("reps")
        _require(
            isinstance(reps, int) and not isinstance(reps, bool) and 1 <= reps <= MAX_REPS,
            f"reps must be a whole number between 1 and {MAX_REPS}.",
        )
        c_set["reps"] = reps
        c_set["set_number"] = s.get("set_number", s_idx + 1)

        raw_weight = s.get("weight") if s.get("weight") is not None else s.get("weight_kg")
        if raw_weight is None:
            weight_val = 0.0
        else:
            _require(
                isinstance(raw_weight, (int, float))
                and not isinstance(raw_weight, bool)
                and 0.0 <= float(raw_weight) <= MAX_WEIGHT_KG,
                f"weight must be a number between 0 and {MAX_WEIGHT_KG} kg.",
            )
            weight_val = float(raw_weight)

        c_set["weight"] = round(weight_val, 2)
        c_set["weight_kg"] = round(weight_val, 2)
        c_set["completed"] = bool(s.get("completed", True))
        c_sets.append(c_set)

    c_ex["sets"] = c_sets
    return c_ex


def validate_list_params(args: Any) -> dict[str, Any]:
    """
    Validates and bounds query parameters for workout listing and pagination.

    Args:
        args: ImmutableMultiDict or dict representing URL query string.

    Returns:
        dict[str, Any]: Cleaned parameter dict: search, workout_type, sort, limit, offset.

    Raises:
        ApiError: If limit or offset cannot be parsed as integers, or sort is invalid.
    """
    search = args.get("search", "").strip()[:200] or None
    workout_type = args.get("workout_type", "").strip().lower() or None
    if workout_type and workout_type not in ALLOWED_WORKOUT_TYPES:
        raise ApiError("Invalid workout_type filter.", 400, "validation_error")

    sort = args.get("sort", "date_desc")
    if sort not in ALLOWED_SORTS:
        raise ApiError("Invalid sort option.", 400, "validation_error")

    try:
        raw_limit = int(args.get("limit", 200))
        limit = max(1, min(raw_limit, 500))
        raw_offset = int(args.get("offset", 0))
        offset = max(0, raw_offset)
    except (TypeError, ValueError) as exc:
        raise ApiError("limit and offset must be valid integers.", 400, "validation_error") from exc

    return {
        "search": search,
        "workout_type": workout_type,
        "sort": sort,
        "limit": limit,
        "offset": offset,
    }
