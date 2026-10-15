import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

/**
 * Maximum entries retained in the module-level workouts cache.
 * Bounded to prevent memory leaks during prolonged single-page sessions.
 */
const MAX_CACHE_SIZE = 25;

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
  globalWorkoutsCache.set(key, value);
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
  const key = JSON.stringify(filters);
  const [workouts, setWorkouts] = useState(() => {
    const cached = globalWorkoutsCache.get(key);
    return Array.isArray(cached) ? cached : [];
  });
  const [status, setStatus] = useState(() =>
    globalWorkoutsCache.has(key) ? "success" : "loading"
  );
  const [error, setError] = useState(null);

  /**
   * Load workout days from backend with cache validation and safe fallbacks.
   * @param {boolean} [forceSilent=false] If true, avoids toggling status to loading
   */
  const load = useCallback(
    async (forceSilent = false) => {
      if (!globalWorkoutsCache.has(key) && !forceSilent) {
        setStatus("loading");
      }
      setError(null);
      try {
        const data = await api.get("/api/workouts", filters);
        const safeWorkouts = Array.isArray(data?.workouts) ? data.workouts : [];
        setBoundedCache(key, safeWorkouts);
        setWorkouts(safeWorkouts);
        setStatus("success");
      } catch (err) {
        setError(err);
        if (!globalWorkoutsCache.has(key)) setStatus("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Optimistically prepend a newly created workout session day.
   * @param {Object} payload Workout day payload
   * @returns {Promise<Object>} Created workout day
   */
  const createWorkout = useCallback(async (payload) => {
    const data = await api.post("/api/workouts", payload);
    if (data?.workout) {
      setWorkouts((prev) => [data.workout, ...prev]);
    }
    return data?.workout;
  }, []);

  return {
    workouts: Array.isArray(workouts) ? workouts : [],
    status,
    error,
    reload: load,
    createWorkout,
  };
}
