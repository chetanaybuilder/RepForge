"""
RepForge Exercise Library Routes.

Purpose:
    Exposes endpoints for exploring the comprehensive exercise taxonomy (800+ movements),
    filtering by anatomical muscle group, equipment, and category, managing user favorites,
    and serving cached exercise biomechanical demonstration images.

Security:
    - Path Traversal Defense: Strict validation on image subpaths.
    - CSRF Protection: Enforced on all mutating favorite interactions.
    - Content Security & Caching: Long-lived immutable cache headers for media.
"""

from __future__ import annotations

import logging
from pathlib import Path
import re
import urllib.request

from flask import Blueprint, current_app, g, jsonify, request, send_file
from werkzeug.wrappers import Response

from auth.decorators import csrf_protect, login_required
from auth.session_store import get_session
from database import queries_exercises as eq
from utils.errors import ApiError

logger = logging.getLogger("repforge.routes.exercises")

exercise_bp = Blueprint("exercises", __name__, url_prefix="/api/exercises")

IMAGE_CACHE_DIR = Path(__file__).resolve().parent.parent / "database" / "data" / "images"
IMAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Safe regex pattern: allows only alphanumeric, hyphens, underscores, dots, and single slash
SAFE_IMAGE_PATH_RE = re.compile(r"^[a-zA-Z0-9_\-\.\%]+/[a-zA-Z0-9_\-\.\%]+\.(jpg|jpeg|png)$")


@exercise_bp.route("", methods=["GET"])
def list_exercises() -> Response:
    """
    Lists exercises with full-text search, muscle filtering, and pagination.

    Returns:
        Response: JSON payload containing exercise items and pagination total.
    """
    # Soft user identification without forcing 401
    user_id = getattr(g, "user_id", None)
    if not user_id:
        cookie_val = request.cookies.get(
            current_app.config.get("SESSION_COOKIE_NAME", "repforge_session")
        )
        if cookie_val:
            sess = get_session(cookie_val)
            if sess:
                user_id = sess.get("user_id")

    search = request.args.get("search", type=str)
    muscle = request.args.get("muscle", type=str)
    equipment = request.args.get("equipment", type=str)
    category = request.args.get("category", type=str)
    favorites_only = request.args.get("favorites_only", "false").lower() in ("true", "1", "yes")

    try:
        limit = min(max(1, int(request.args.get("limit", 30))), 100)
    except (ValueError, TypeError):
        limit = 30

    try:
        offset = max(0, int(request.args.get("offset", 0)))
    except (ValueError, TypeError):
        offset = 0

    result = eq.list_exercises(
        search=search,
        muscle=muscle,
        equipment=equipment,
        category=category,
        favorites_only=favorites_only,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    return jsonify(result)


@exercise_bp.route("/filters", methods=["GET"])
def get_filters() -> Response:
    """
    Returns taxonomy filters (muscles, equipment, categories) for search filtering.

    Returns:
        Response: JSON dictionary of filter options.
    """
    options = eq.get_exercise_filter_options()
    return jsonify(options)


@exercise_bp.route("/<exercise_id>", methods=["GET"])
def get_exercise_detail(exercise_id: str) -> Response:
    """
    Fetches comprehensive movement instructions, muscle activation targets, and imagery.

    Args:
        exercise_id: Primary key exercise slug.

    Returns:
        Response: JSON payload of the requested exercise.
    """
    user_id = getattr(g, "user_id", None)
    if not user_id:
        cookie_val = request.cookies.get(
            current_app.config.get("SESSION_COOKIE_NAME", "repforge_session")
        )
        if cookie_val:
            sess = get_session(cookie_val)
            if sess:
                user_id = sess.get("user_id")

    exercise = eq.get_exercise_by_id(exercise_id, user_id=user_id)
    if not exercise:
        raise ApiError("Exercise not found", 404, "not_found")

    return jsonify({"exercise": exercise})


@exercise_bp.route("/<exercise_id>/favorite", methods=["POST"])
@login_required
@csrf_protect
def toggle_favorite_exercise(exercise_id: str) -> Response:
    """
    Toggles the authenticated user's favorite bookmark for an exercise.

    Args:
        exercise_id: Target exercise identifier.

    Returns:
        Response: JSON confirmation with updated favorite state.
    """
    exercise = eq.get_exercise_by_id(exercise_id, user_id=g.user_id)
    if not exercise:
        raise ApiError("Exercise not found", 404, "not_found")

    result = eq.toggle_favorite(g.user_id, exercise_id)
    return jsonify(result)


@exercise_bp.route("/images/<path:image_path>", methods=["GET"])
def get_exercise_image(image_path: str) -> Response:
    """
    Serves cached exercise demonstration images or streams and caches from source repository.

    Prevents external hotlinking by hosting all media through RepForge's origin.

    Args:
        image_path: Subpath in format '<exercise_slug>/<filename>.jpg'

    Returns:
        Response: Binary JPEG/PNG image with long-lived caching headers.
    """
    # Security: Defense against directory traversal
    if ".." in image_path or "\\" in image_path or image_path.startswith("/"):
        raise ApiError("Invalid image path format", 400, "bad_request")

    if not SAFE_IMAGE_PATH_RE.match(image_path):
        raise ApiError("Unrecognized image resource path", 400, "bad_request")

    local_path = (IMAGE_CACHE_DIR / image_path).resolve()

    # Guard: Ensure resolved file is strictly inside IMAGE_CACHE_DIR
    if not str(local_path).startswith(str(IMAGE_CACHE_DIR.resolve())):
        raise ApiError("Access denied", 403, "forbidden")

    # If cached locally on disk, stream directly
    if local_path.is_file():
        response = send_file(local_path, mimetype="image/jpeg")
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    # Not cached locally yet: fetch once from open-source repository
    upstream_url = (
        f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{image_path}"
    )
    try:
        req = urllib.request.Request(
            upstream_url,
            headers={"User-Agent": "RepForge-Exercise-CDN/2.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status != 200:
                raise ApiError("Exercise image not found upstream", 404, "not_found")
            data = resp.read()

        local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(data)

        response = send_file(local_path, mimetype="image/jpeg")
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response
    except Exception as exc:
        logger.warning(
            "Failed upstream image fetch for %s: %s",
            image_path,
            exc,
        )
        raise ApiError("Exercise image unavailable", 404, "not_found") from exc
