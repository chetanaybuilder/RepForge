"""
RepForge Flask Backend Application Factory & Entry Point.

Purpose:
    Instantiates and configures the Flask application, wires dependency extensions
    (database pool, CORS, rate limiting, error handlers, security headers),
    and registers domain blueprints.

Usage:
    Development:
        python app.py
    Production (Gunicorn WSGI):
        gunicorn -w 4 -k sync -b 0.0.0.0:$PORT "app:create_app()"
"""

from __future__ import annotations

import logging
import os
import socket

from flask import Flask, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix

# Conditionally force IPv4 address resolution only if explicitly configured in environment
if os.environ.get("FORCE_IPV4", "").lower() in ("1", "true", "yes"):
    _orig_getaddrinfo = socket.getaddrinfo

    def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

    socket.getaddrinfo = _ipv4_getaddrinfo

from config import Config
from database.db import init_pool
from extensions import cors, limiter
from routes.ai_routes import ai_bp
from routes.auth_routes import auth_bp
from routes.goals_routes import goals_bp
from routes.misc_routes import misc_bp
from routes.workout_routes import workout_bp
from utils.errors import register_error_handlers
from utils.security import apply_security_headers


def create_app(config_class: type[Config] = Config) -> Flask:
    """
    Application factory pattern constructing and configuring the RepForge Flask server.

    Args:
        config_class: Central configuration class defining application tokens and environment.

    Returns:
        Flask: Fully configured application instance.
    """
    logging.basicConfig(
        level=logging.INFO if config_class.IS_PRODUCTION else logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger = logging.getLogger("repforge.app")

    config_class.validate()

    current_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dist = os.path.join(current_dir, "dist")

    app = Flask(__name__, static_folder=frontend_dist, static_url_path="/")
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    app.config.from_object(config_class)

    # --- Database pool initialization ---
    if config_class.DATABASE_URL:
        init_pool(
            config_class.DATABASE_URL,
            minconn=config_class.DB_MIN_CONNECTIONS,
            maxconn=config_class.DB_MAX_CONNECTIONS,
        )
    else:
        logger.warning("DATABASE_URL not set — database-backed routes will fail until configured.")

    # --- CORS: restrict origins, allow credentials for session cookie across local dev ---
    cors.init_app(
        app,
        resources={
            r"/api/*": {"origins": config_class.CORS_ORIGINS},
            r"/auth/*": {"origins": config_class.CORS_ORIGINS},
        },
        supports_credentials=True,
        allow_headers=["Content-Type", "X-CSRF-Token"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # --- Rate limiting (Redis or memory storage) ---
    app.config["RATELIMIT_STORAGE_URI"] = config_class.RATELIMIT_STORAGE_URI
    limiter.init_app(app)
    limiter.default_limits = [config_class.RATELIMIT_DEFAULT]

    # --- Error handling (consistent JSON responses, no raw tracebacks) ---
    register_error_handlers(app)

    # --- Security headers (CSP, HSTS, X-Content-Type-Options) on all responses ---
    @app.after_request
    def _security_headers(response):
        return apply_security_headers(response, config_class.IS_PRODUCTION)

    # --- Register blueprints ---
    app.register_blueprint(auth_bp)
    app.register_blueprint(workout_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(misc_bp)

    # --- SPA catch-all route (exclude /api/ and /auth/ from returning index.html) ---
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path: str):
        # Unmatched API or auth paths must return a consistent JSON 404, not HTML
        if path.startswith("api/") or path.startswith("auth/"):
            return (
                jsonify(
                    {
                        "error": {
                            "code": "not_found",
                            "message": "The requested resource was not found.",
                        }
                    }
                ),
                404,
            )

        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)

        index_path = os.path.join(app.static_folder, "index.html")
        if os.path.exists(index_path):
            return app.send_static_file("index.html")

        return (
            jsonify(
                {
                    "error": {
                        "code": "not_found",
                        "message": "The requested resource was not found.",
                    }
                }
            ),
            404,
        )

    return app


# Provide module-level application instance for WSGI runners targeting `app:app`
# When testing or running under non-production environments without secrets, use create_app() directly.
if os.environ.get("FLASK_ENV") != "testing":
    try:
        app = create_app()
    except Exception:
        app = None
else:
    app = None

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    server_app = create_app()
    server_app.run(host="0.0.0.0", port=port, debug=not Config.IS_PRODUCTION)
