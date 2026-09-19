"""
Input validation for API payloads. Deliberately strict: reject anything
that doesn't match the expected shape rather than trying to coerce it,
since silent coercion is how bad data (and injection attempts) sneak
through.
"""

import re
import datetime
from backend.utils.errors import ApiError

MAX_TEXT_LEN = 500
MAX_NOTES_LEN = 2000
ALLOWED_WORKOUT_TYPES = {
    "push", "pull", "legs", "upper", "lower", "full_body",
    "cardio", "core", "mobility", "other",
}
ALLOWED_SORTS = {"date_desc", "date_asc", "weight_desc", "weight_asc", "exercise_asc"}

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _require(condition: bool, message: str):
    if not condition:
        raise ApiError(message, 400, "validation_error")


def _clean_str(value, field_name: str, max_len: int, required: bool = True):
    if value is None:
        _require(not required, f"{field_name} is required.")
        return None
    _require(isinstance(value, str), f"{field_name} must be a string.")
    value = _HTML_TAG_RE.sub("", value)  # strip HTML tags
    value = value.strip()
    _require(not required or len(value) > 0, f"{field_name} cannot be empty.")
    _require(len(value) <= max_len, f"{field_name} must be {max_len} characters or fewer.")
    return value or None


def validate_workout_day_payload(data: dict) -> dict:
    """
    Validates and normalizes a workout day create payload.
    """
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")

    cleaned = {}

    cleaned["day"] = _clean_str(data.get("day"), "day", 50, required=False)

    date_str = data.get("date")
    _require(isinstance(date_str, str) and date_str, "date is required (YYYY-MM-DD).")
    try:
        parsed_date = datetime.date.fromisoformat(date_str)
    except ValueError as exc:
        raise ApiError("date must be a valid date in YYYY-MM-DD format.", 400, "validation_error") from exc
    _require(parsed_date <= datetime.date.today() + datetime.timedelta(days=1),
              "date cannot be far in the future.")
    cleaned["date"] = parsed_date.isoformat()

    exercises_in = data.get("exercises")
    _require(isinstance(exercises_in, list) and len(exercises_in) > 0, "At least one exercise is required.")
    
    cleaned_exercises = []
    for i, ex in enumerate(exercises_in):
        if not isinstance(ex, dict):
            raise ApiError("Each exercise must be an object.", 400, "validation_error")
            
        c_ex = {}
        c_ex["exercise_name"] = _clean_str(ex.get("exercise_name"), "exercise_name", MAX_TEXT_LEN)
        
        workout_type = _clean_str(ex.get("workout_type"), "workout_type", 50)
        _require(workout_type.lower() in ALLOWED_WORKOUT_TYPES,
                  f"workout_type must be one of: {', '.join(sorted(ALLOWED_WORKOUT_TYPES))}.")
        c_ex["workout_type"] = workout_type.lower()
        
        c_ex["notes"] = _clean_str(ex.get("notes"), "notes", MAX_NOTES_LEN, required=False)
        
        sets_in = ex.get("sets")
        _require(isinstance(sets_in, list) and len(sets_in) > 0, f"At least one set is required for exercise {c_ex['exercise_name']}.")
        
        c_sets = []
        for j, s in enumerate(sets_in):
            if not isinstance(s, dict):
                raise ApiError("Each set must be an object.", 400, "validation_error")
                
            c_set = {}
            reps = s.get("reps")
            _require(isinstance(reps, int) and not isinstance(reps, bool) and 1 <= reps <= 1000,
                      "reps must be a whole number between 1 and 1000.")
            c_set["reps"] = reps
            
            weight = s.get("weight", s.get("weight_kg", 0))
            _require(isinstance(weight, (int, float)) and not isinstance(weight, bool) and 0 <= weight <= 2000,
                      "weight must be a number between 0 and 2000.")
            c_set["weight"] = round(float(weight), 2)
            c_set["completed"] = bool(s.get("completed", True))
            
            c_sets.append(c_set)
            
        c_ex["sets"] = c_sets
        cleaned_exercises.append(c_ex)
        
    cleaned["exercises"] = cleaned_exercises
    return cleaned

def validate_exercise_payload(data: dict) -> dict:
    """Validates an update payload for a single exercise and its sets."""
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400, "validation_error")
        
    c_ex = {}
    c_ex["exercise_name"] = _clean_str(data.get("exercise_name"), "exercise_name", MAX_TEXT_LEN)
    
    workout_type = _clean_str(data.get("workout_type"), "workout_type", 50)
    _require(workout_type.lower() in ALLOWED_WORKOUT_TYPES,
              f"workout_type must be one of: {', '.join(sorted(ALLOWED_WORKOUT_TYPES))}.")
    c_ex["workout_type"] = workout_type.lower()
    
    c_ex["notes"] = _clean_str(data.get("notes"), "notes", MAX_NOTES_LEN, required=False)
    
    sets_in = data.get("sets")
    _require(isinstance(sets_in, list) and len(sets_in) > 0, "At least one set is required.")
    
    c_sets = []
    for j, s in enumerate(sets_in):
        if not isinstance(s, dict):
            raise ApiError("Each set must be an object.", 400, "validation_error")
            
        c_set = {}
        reps = s.get("reps")
        _require(isinstance(reps, int) and not isinstance(reps, bool) and 1 <= reps <= 1000,
                  "reps must be a whole number between 1 and 1000.")
        c_set["reps"] = reps
        
        weight = s.get("weight", s.get("weight_kg", 0))
        _require(isinstance(weight, (int, float)) and not isinstance(weight, bool) and 0 <= weight <= 2000,
                  "weight must be a number between 0 and 2000.")
        c_set["weight"] = round(float(weight), 2)
        c_set["completed"] = bool(s.get("completed", True))
        
        c_sets.append(c_set)
        
    c_ex["sets"] = c_sets
    return c_ex



def validate_list_params(args) -> dict:
    search = args.get("search", "").strip()[:200] or None
    workout_type = args.get("workout_type", "").strip().lower() or None
    if workout_type and workout_type not in ALLOWED_WORKOUT_TYPES:
        raise ApiError("Invalid workout_type filter.", 400, "validation_error")

    sort = args.get("sort", "date_desc")
    if sort not in ALLOWED_SORTS:
        raise ApiError("Invalid sort option.", 400, "validation_error")

    try:
        limit = min(int(args.get("limit", 200)), 500)
        offset = max(int(args.get("offset", 0)), 0)
    except (TypeError, ValueError) as exc:
        raise ApiError("limit/offset must be integers.", 400, "validation_error") from exc

    return {"search": search, "workout_type": workout_type, "sort": sort, "limit": limit, "offset": offset}
