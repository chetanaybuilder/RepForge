"""
RepForge Consistent API Error Handling & Structured Exception Translation.

Purpose:
    Guarantees that all API endpoints emit uniform, structured JSON error responses.
    Prevents the leakage of internal infrastructure details (tracebacks, SQL schemas,
    driver versions) to clients while maintaining structured logging server-side.

Response Contract:
    ```json
    {
      "error": {
        "code": "validation_error",
        "message": "Human readable explanation",
        "details": { ... } // Optional context
      }
    }
    ```
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Flask, current_app, jsonify, request
from werkzeug.exceptions import HTTPException

logger = logging.getLogger("repforge.errors")


class ApiError(Exception):
    """
    Standard application exception for controlled API error responses.

    Attributes:
        message: Human-readable error description sent to the client.
        status_code: HTTP status code (e.g. 400, 401, 403, 404, 502).
        code: Stable machine-readable error classification string.
        details: Optional structured contextual details (e.g. field errors).
    """

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "bad_request",
        details: Any = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def error_response(
    message: str,
    status_code: int = 400,
    code: str = "bad_request",
    details: Any = None,
) -> tuple[Any, int]:
    """
    Formats a consistent JSON error response adhering to the API error contract.

    Args:
        message: Human-readable explanation.
        status_code: HTTP status code.
        code: Machine-readable error code.
        details: Optional dictionary or list of specific field errors.

    Returns:
        tuple[Response, int]: Flask JSON response and status code tuple.
    """
    payload: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return jsonify({"error": payload}), status_code


def register_error_handlers(app: Flask) -> None:
    """
    Registers global error handlers on the Flask application instance.

    Guarantees that no raw HTML error pages or unhandled exception stack traces
    leak to clients on API and auth routes.

    Args:
        app: Flask application instance.
    """

    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return error_response(err.message, err.status_code, err.code, err.details)

    @app.errorhandler(400)
    def handle_400(err):
        msg = getattr(err, "description", "Bad request.")
        return error_response(msg, 400, "bad_request")

    @app.errorhandler(401)
    def handle_401(_err):
        return error_response("Authentication required.", 401, "unauthorized")

    @app.errorhandler(403)
    def handle_403(_err):
        return error_response("Access forbidden.", 403, "forbidden")

    @app.errorhandler(404)
    def handle_404(_err):
        # Exclude API and auth paths from SPA fallback
        if request.path.startswith("/api/") or request.path.startswith("/auth/"):
            return error_response("The requested resource was not found.", 404, "not_found")

        import os

        if current_app.static_folder:
            index_path = os.path.join(current_app.static_folder, "index.html")
            if os.path.exists(index_path):
                return current_app.send_static_file("index.html")

        return error_response("The requested resource was not found.", 404, "not_found")

    @app.errorhandler(405)
    def handle_405(_err):
        return error_response("This method is not allowed on this endpoint.", 405, "method_not_allowed")

    @app.errorhandler(413)
    def handle_413(_err):
        return error_response("Request payload exceeds maximum allowed size.", 413, "payload_too_large")

    @app.errorhandler(429)
    def handle_429(_err):
        return error_response(
            "Too many requests. Please slow down and try again shortly.",
            429,
            "rate_limited",
        )

    @app.errorhandler(500)
    def handle_500(err):
        logger.exception("Internal server error encountered on %s: %s", request.path, err)
        return error_response(
            "Something went wrong on our end. Please try again.",
            500,
            "internal_error",
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        logger.warning("HTTP %d on %s: %s", err.code or 500, request.path, err.description)
        return error_response(
            err.description or "An error occurred.",
            err.code or 500,
            "http_error",
        )

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        logger.exception("Unexpected unhandled exception on %s: %s", request.path, err)
        return error_response(
            "Something went wrong on our end. Please try again.",
            500,
            "internal_error",
        )
