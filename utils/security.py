"""
Security headers and small hardening helpers applied to every response.
"""


def apply_security_headers(response, is_production: bool):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    # cross-origin so the static frontend (a different subdomain) can reach
    # the API while still preventing embedding in arbitrary third-party pages
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    if is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    # Removes the default Flask/Werkzeug server banner from responses where present.
    response.headers.pop("Server", None)
    return response
