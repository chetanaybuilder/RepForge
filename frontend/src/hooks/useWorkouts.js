/**
 * frontend\src\hooks\useWorkouts.js
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * Maximum entries retained in the module-level workouts cache.
 * Bounded to prevent memory leaks during prolonged single-page sessions.
 */
const MAX_CACHE_SIZE = 25;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * In-memory response cache for workout queries keyed by filter state.
 * Prevents unnecessary re-fetching on rapid navigation switches.
 * @type {Map<string, Array<Object>>}
 */
const globalWorkoutsCache = new Map();

/**
 * Sets a value in the workout cache with bounded FIFO eviction.
 * @param {string} key
 * @param {Array<Object>} value
 */
function setBoundedCache(key, value) {
  if (globalWorkoutsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = globalWorkoutsCache.keys().next().value;
    if (oldestKey) globalWorkoutsCache.delete(oldestKey);
  }
  globalWorkoutsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getCachedValue(key) {
  const entry = globalWorkoutsCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    globalWorkoutsCache.delete(key);
    return undefined;
  }
  globalWorkoutsCache.delete(key);
  globalWorkoutsCache.set(key, entry);
  return entry.value;
}

export function clearWorkoutsCache() {
  globalWorkoutsCache.clear();
}

/**
 * Custom React hook managing workout session lifecycle, state caching,
 * and optimistic mutations.
 *
 * @param {Object} [filters={}] Query filter parameters (e.g. { search: string, workout_type: string })
 * @returns {{
 *   workouts: Array<Object>,
 *   status: "loading" | "success" | "error",
 *   error: Error | null,
 *   reload: (forceSilent?: boolean) => Promise<void>,
 *   createWorkout: (payload: Object) => Promise<Object>
 * }} Workouts list, status, errors, and mutation handlers
 */
export function useWorkouts(filters = {}) {
  const { user } = useAuth();
  const key = `${user?.id ?? "anonymous"}:${JSON.stringify(filters)}`;
  const requestId = useRef(0);
  const mounted = useRef(true);
  const [workouts, setWorkouts] = useState(() => {
    const cached = getCachedValue(key);
    return Array.isArray(cached) ? cached : [];
  });
  const [status, setStatus] = useState(() =>
    getCachedValue(key) !== undefined ? "success" : "loading"
  );
  const [error, setError] = useState(null);

  /**
   * Load workout days from backend with cache validation and safe fallbacks.
   * @param {boolean} [forceSilent=false] If true, avoids toggling status to loading
   */
  const load = useCallback(
    async (forceSilent = false) => {
      const id = ++requestId.current;
      if (getCachedValue(key) === undefined && !forceSilent) {
        setStatus("loading");
      }
      setError(null);
      try {
        const data = await api.get("/api/workouts", filters);
        if (!mounted.current || id !== requestId.current) return;
        const safeWorkouts = Array.isArray(data?.workouts) ? data.workouts : [];
        setBoundedCache(key, safeWorkouts);
        setWorkouts(safeWorkouts);
        setStatus("success");
      } catch (err) {
        if (!mounted.current || id !== requestId.current) return;
        setError(err);
        if (getCachedValue(key) === undefined) setStatus("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
    };
  }, [load]);

  useEffect(() => {
    const reset = () => {
      clearWorkoutsCache();
      requestId.current++;
      setWorkouts([]);
      setStatus("loading");
      setError(null);
    };
    window.addEventListener("repforge:auth-reset", reset);
    return () => window.removeEventListener("repforge:auth-reset", reset);
  }, []);

  useEffect(() => {
    const cached = getCachedValue(key);
    setWorkouts(Array.isArray(cached) ? cached : []);
    setStatus(cached !== undefined ? "success" : "loading");
    setError(null);
  }, [key]);

  /**
   * Optimistically prepend a newly created workout session day.
   * @param {Object} payload Workout day payload
   * @returns {Promise<Object>} Created workout day
   */
  const createWorkout = useCallback(
    async (payload) => {
      const data = await api.post("/api/workouts", payload);
      if (data?.workout) {
        setWorkouts((prev) => [data.workout, ...prev]);
        for (const cacheKey of [...globalWorkoutsCache.keys()]) {
          if (cacheKey.startsWith(`${user?.id ?? "anonymous"}:`)) {
            globalWorkoutsCache.delete(cacheKey);
          }
        }
      }
      return data?.workout;
    },
    [user?.id]
  );

  return {
    workouts: Array.isArray(workouts) ? workouts : [],
    status,
    error,
    reload: load,
    createWorkout,
  };
}
