"""
Consistent, safe error responses. No route should ever let a raw exception
message or traceback reach the client — that's how internal details (query
shapes, file paths, library versions) leak to an attacker.
"""

import logging
from flask import jsonify

logger = logging.getLogger("repforge.errors")


class ApiError(Exception):
    """Raise this anywhere in a route/service to produce a clean JSON error."""

    def __init__(self, message: str, status_code: int = 400, code: str = "bad_request"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


def error_response(message: str, status_code: int = 400, code: str = "bad_request"):
    return jsonify({"error": {"code": code, "message": message}}), status_code


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return error_response(err.message, err.status_code, err.code)

    @app.errorhandler(404)
    def handle_404(_err):
        import os
        from flask import request, current_app
        if request.path.startswith("/api/") or request.path.startswith("/auth/"):
            return error_response("The requested resource was not found.", 404, "not_found")
        
        index_path = os.path.join(current_app.static_folder, "index.html")
        if not os.path.exists(index_path):
            return error_response("Frontend build missing (index.html not found).", 500, "frontend_missing")
            
        return current_app.send_static_file("index.html")

    @app.errorhandler(405)
    def handle_405(_err):
        return error_response("This method is not allowed on this endpoint.", 405, "method_not_allowed")

    @app.errorhandler(413)
    def handle_413(_err):
        return error_response("Request payload is too large.", 413, "payload_too_large")

    @app.errorhandler(429)
    def handle_429(err):
        return error_response(
            "Too many requests. Please slow down and try again shortly.", 429, "rate_limited"
        )

    @app.errorhandler(500)
    def handle_500(err):
        # Log full detail server-side only.
        logger.exception("Unhandled server error: %s", err)
        return error_response(
            "Something went wrong on our end. Please try again.", 500, "internal_error"
        )

    @app.errorhandler(Exception)
    def handle_unexpected(err):
        logger.exception("Unhandled exception: %s", err)
        return error_response(
            "Something went wrong on our end. Please try again.", 500, "internal_error"
        )
