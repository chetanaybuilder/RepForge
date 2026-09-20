"""
RepForge Flask backend entry point.

Run with:
    python -m backend.app
or, in production, behind a real WSGI server:
    gunicorn -w 4 -b 0.0.0.0:5000 "backend.app:create_app()"
"""

import socket
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_getaddrinfo

import logging

from flask import Flask, jsonify

from backend.config import Config
from backend.extensions import cors, limiter
from backend.database.db import init_pool, close_pool
from backend.utils.errors import register_error_handlers, ApiError
from backend.utils.security import apply_security_headers

from backend.routes.auth_routes import auth_bp
from backend.routes.workout_routes import workout_bp
from backend.routes.goals_routes import goals_bp
from backend.routes.ai_routes import ai_bp
from backend.routes.misc_routes import misc_bp


def create_app(config_class=Config):
    logging.basicConfig(
        level=logging.INFO if config_class.IS_PRODUCTION else logging.DEBUG,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger = logging.getLogger("repforge.app")

    config_class.validate()

    app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")
    app.config.from_object(config_class)

    # --- Database ---
    if config_class.DATABASE_URL:
        init_pool(config_class.DATABASE_URL)
    else:
        logger.warning("DATABASE_URL not set — database-backed routes will fail until it is configured.")

    # --- CORS: only the configured frontend origin(s), credentials allowed
    # so the session cookie is sent on cross-port requests during local dev
    # (5173 -> 5000) and cross-subdomain requests in production. ---
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": config_class.CORS_ORIGINS},
                   r"/auth/*": {"origins": config_class.CORS_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "X-CSRF-Token"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # --- Rate limiting ---
    app.config["RATELIMIT_STORAGE_URI"] = config_class.RATELIMIT_STORAGE_URI
    limiter.init_app(app)
    limiter.default_limits = [config_class.RATELIMIT_DEFAULT]

    # --- Error handling (never leak stack traces) ---
    register_error_handlers(app)

    # --- Security headers on every response ---
    @app.after_request
    def _security_headers(response):
        return apply_security_headers(response, config_class.IS_PRODUCTION)

    # --- Blueprints ---
    app.register_blueprint(auth_bp)
    app.register_blueprint(workout_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(misc_bp)

    @app.route("/", methods=["GET"])
    def root():
        return app.send_static_file("index.html")

    @app.route("/health", methods=["GET"])
    def health():
        return app.view_functions["misc.health"]()

    @app.teardown_appcontext
    def _shutdown(_exc=None):
        pass  # connection pool is process-lifetime; nothing to do per-request

    return app


if __name__ == "__main__":
    import os

    flask_app = create_app()
    port = int(os.environ.get("PORT", 5000))
    flask_app.run(host="0.0.0.0", port=port, debug=not Config.IS_PRODUCTION)
