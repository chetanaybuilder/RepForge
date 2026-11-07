/**
 * RepForge Production API Client
 *
 * Handles HTTP transport, automatic CSRF double-submit token injection,
 * credential management, URL normalization, and structured error responses.
 */

// Use configured VITE_API_URL or fall back to empty string (relative paths / same-origin proxy)
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/**
 * Memory-only CSRF Token Storage.
 * The CSRF token is deliberately never written to localStorage or sessionStorage
 * to protect against persistent XSS exfiltration. Re-authenticated sessions
 * hydrate this token into memory on app boot.
 */
let csrfToken = null;
let unauthorizedHandler = null;

/**
 * Sets the active anti-CSRF token in memory.
 * @param {string|null} token
 */
export function setCsrfToken(token) {
  csrfToken = token;
}

/**
 * Retrieves the active anti-CSRF token from memory.
 * @returns {string|null}
 */
export function getCsrfToken() {
  return csrfToken;
}

/** Register one application-level handler for expired sessions (401 responses). */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

/** Invoke the global 401 handler for direct fetch callers such as the Coach stream. */
export function notifyUnauthorized() {
  unauthorizedHandler?.();
}

/**
 * Structured API Error containing HTTP status and application error codes.
 */
class ApiError extends Error {
  /**
   * @param {string} message Human-readable error description
   * @param {number} status HTTP response code
   * @param {string} code Application-specific error code
   */
  constructor(message, status, code, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Core HTTP dispatch wrapper around native fetch with interceptors.
 *
 * @param {string} path Endpoint path (e.g. "/api/workouts")
 * @param {Object} options Request configuration
 * @param {string} [options.method="GET"] HTTP verb
 * @param {Object} [options.body] Request payload to be JSON-serialized
 * @param {Object} [options.params] URL query parameters
 * @returns {Promise<any>} Parsed response data
 * @throws {ApiError} Structured API exception on failure
 */
async function request(path, { method = "GET", body, params, timeoutMs = 30000, signal } = {}) {
  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(method) &&
    !csrfToken &&
    path !== "/auth/logout"
  ) {
    try {
      const me = await fetch(`${API_URL}/api/me`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (me.ok) {
        const data = await me.json();
        if (data?.csrf_token) setCsrfToken(data.csrf_token);
      }
    } catch {
      // The original mutation request will report a network or authentication error.
    }
  }

  let url = `${API_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (query) url += `?${query}`;
  }

  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // Mutating requests require the anti-CSRF token
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include", // Enforces sending HttpOnly SameSite session cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkErr) {
    if (timedOut) {
      throw new ApiError("The request timed out. Please try again.", 0, "timeout");
    }
    if (controller.signal.aborted) {
      throw new ApiError("The request was cancelled.", 0, "request_aborted");
    }
    throw new ApiError(
      "Could not connect to RepForge server. Please verify your network connection.",
      0,
      "network_error"
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.error?.message || "Something went wrong. Please try again.";
    const code = data?.error?.code || "unknown_error";
    const details = data?.error?.details ?? data?.details ?? null;
    if (response.status === 401) {
      setCsrfToken(null);
      notifyUnauthorized();
    }
    throw new ApiError(message, response.status, code, details);
  }

  return data;
}

/**
 * Semantic HTTP verb helpers for unified application access.
 */
export const api = {
  get: (path, params) => request(path, { method: "GET", params }),
  post: (path, body) => request(path, { method: "POST", body: body ?? {} }),
  put: (path, body) => request(path, { method: "PUT", body: body ?? {} }),
  patch: (path, body) => request(path, { method: "PATCH", body: body ?? {} }),
  delete: (path) => request(path, { method: "DELETE" }),
  getExerciseImageUrl: (imagePath) => {
    if (!imagePath) return "";
    return `${API_URL}/api/exercises/images/${String(imagePath).split("/").map(encodeURIComponent).join("/")}`;
  },
};

export function getExerciseImageUrl(imagePath) {
  if (!imagePath) return "";
  return `${API_URL}/api/exercises/images/${String(imagePath).split("/").map(encodeURIComponent).join("/")}`;
}

export { ApiError, API_URL };
