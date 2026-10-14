import { describe, it, expect, beforeEach, vi } from "vitest";
import { api, setCsrfToken, getCsrfToken, ApiError } from "./api";

describe("API Client & CSRF Management", () => {
  beforeEach(() => {
    setCsrfToken(null);
    vi.restoreAllMocks();
  });

  it("stores and retrieves CSRF tokens in memory", () => {
    expect(getCsrfToken()).toBeNull();
    setCsrfToken("test-csrf-token-12345");
    expect(getCsrfToken()).toBe("test-csrf-token-12345");
  });

  it("injects X-CSRF-Token header on mutating requests (POST, PUT, DELETE)", async () => {
    setCsrfToken("active-csrf-token");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.post("/api/workouts", { test: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-CSRF-Token"]).toBe("active-csrf-token");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("does not inject X-CSRF-Token header on GET requests", async () => {
    setCsrfToken("active-csrf-token");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ workouts: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.get("/api/workouts");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("throws structured ApiError when backend returns error response", async () => {
    const errorPayload = {
      error: {
        code: "validation_error",
        message: "target_value must be a positive number.",
      },
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify(errorPayload),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(api.post("/api/goals", { target_value: -10 })).rejects.toThrow(ApiError);
    try {
      await api.post("/api/goals", { target_value: -10 });
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe("validation_error");
      expect(err.message).toBe("target_value must be a positive number.");
    }
  });

  it("handles network failure gracefully with network_error code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    await expect(api.get("/api/workouts")).rejects.toThrow(ApiError);
    try {
      await api.get("/api/workouts");
    } catch (err) {
      expect(err.code).toBe("network_error");
      expect(err.status).toBe(0);
    }
  });
});
