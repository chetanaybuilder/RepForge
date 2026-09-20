/**
 * RepForge Production API Client
 *
 * Handles HTTP transport, automatic CSRF double-submit token injection,
 * credential management, URL normalization, and structured error responses.
 */

// Force relative paths in production so a bad VITE_API_URL doesn't break the app
const API_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "");

/**
 * Memory-only CSRF Token Storage.
 * The CSRF token is deliberately never written to localStorage or sessionStorage
 * to protect against persistent XSS exfiltration. Re-authenticated sessions
 * hydrate this token into memory on app boot.
 */
let csrfToken = null;

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

/**
 * Structured API Error containing HTTP status and application error codes.
 */
class ApiError extends Error {
  /**
   * @param {string} message Human-readable error description
   * @param {number} status HTTP response code
   * @param {string} code Application-specific error code
   */
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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
async function request(path, { method = "GET", body, params } = {}) {
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

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include", // Enforces sending HttpOnly SameSite session cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(
      "Could not connect to RepForge server. Please verify your network connection.",
      0,
      "network_error"
    );
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
    throw new ApiError(message, response.status, code);
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
  delete: (path) => request(path, { method: "DELETE" }),
};

export { ApiError, API_URL };
