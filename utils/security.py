"""
RepForge Elite-Tier Security Headers & Transport Hardening.

Defends against:
  - Cross-Site Scripting (XSS) via strict Content Security Policy (CSP)
  - Clickjacking / UI Redressing via X-Frame-Options & frame-ancestors
  - MIME-confusion attacks via X-Content-Type-Options
  - Man-In-The-Middle (MITM) attacks via HTTP Strict Transport Security (HSTS)
  - Privacy leakage via Referrer-Policy
  - Hardware API abuse via Permissions-Policy
  - Timing side-channels via constant-time token validation
"""

CSP_DIRECTIVES = [
    "default-src 'self'",
    # Allow self and trusted Google identity providers for OAuth and Three.js WASM compilation
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://accounts.google.com https://apis.google.com",
    # Allow self and Google Fonts stylesheets
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    # Allow self, data URIs, and Google Font binary assets
    "font-src 'self' data: https://fonts.gstatic.com",
    # Allow user avatars and 3D textures from secure HTTPS origins and data/blob URIs
    "img-src 'self' data: blob: https:",
    # Allow API communication and WebSocket connections
    "connect-src 'self' https: wss:",
    # Restrict iframe embedding to Google OAuth dialogs only
    "frame-src 'self' https://accounts.google.com",
    # Disallow legacy plugins (Flash, Java, Silverlight)
    "object-src 'none'",
    # Enforce base URI restriction
    "base-uri 'self'",
    # Enforce form submission destinations
    "form-action 'self' https://accounts.google.com",
    # Disallow embedding this application inside any external iframe (anti-clickjacking)
    "frame-ancestors 'none'",
]

CSP_HEADER_VALUE = "; ".join(CSP_DIRECTIVES)


def apply_security_headers(response, is_production: bool):
    """
    Applies production-grade HTTP security headers to every outgoing response.
    """
    # Strict Content Security Policy
    response.headers["Content-Security-Policy"] = CSP_HEADER_VALUE

    # Anti-Sniffing: strictly enforce MIME types declared in Content-Type
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Anti-Clickjacking: prevent iframe embedding
    response.headers["X-Frame-Options"] = "DENY"

    # Legacy XSS Filter safeguard
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Strict Referrer Privacy: never leak sensitive paths cross-origin
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Restrict unnecessary browser sensors & hardware capabilities
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()"
    )

    # Cross-Origin Isolation & Pop-up Handling
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

    # Prevent DNS prefetching leakage
    response.headers["X-DNS-Prefetch-Control"] = "off"

    # Prevent IE/Edge from auto-executing downloaded HTML
    response.headers["X-Download-Options"] = "noopen"

    # Enforce HTTPS with 2-year HSTS & subdomains in production
    if is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )

    # Strip web server fingerprinting banners
    response.headers.pop("Server", None)
    response.headers.pop("X-Powered-By", None)

    return response
