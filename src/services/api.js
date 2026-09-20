// Force relative paths in production so a bad VITE_API_URL doesn't break the app
const API_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "");

// The CSRF token lives only in memory (set once /api/me returns it after
// login) — never in localStorage/sessionStorage. A full page reload fetches
// it again from /api/me, which is why AuthContext always calls that first.
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = "GET", body, params } = {}) {
  let url = `${API_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (query) url += `?${query}`;
  }

  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include", // sends the HttpOnly session cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0, "network_error");
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

export const api = {
  get: (path, params) => request(path, { method: "GET", params }),
  post: (path, body) => request(path, { method: "POST", body: body ?? {} }),
  put: (path, body) => request(path, { method: "PUT", body: body ?? {} }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export { ApiError, API_URL };
