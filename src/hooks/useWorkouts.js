import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

/**
 * In-memory response cache for workout queries keyed by filter state.
 * Prevents unnecessary re-fetching on rapid navigation switches.
 */
const globalWorkoutsCache = new Map();

/**
 * Custom React hook managing workout session lifecycle, state caching,
 * and optimistic mutations (create, update, delete).
 *
 * @param {Object} filters Query filter parameters (e.g. { search: string })
 * @returns {Object} Workouts list, status, errors, and mutation handlers
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
   */
  const load = useCallback(async (forceSilent = false) => {
    if (!globalWorkoutsCache.has(key) && !forceSilent) {
      setStatus("loading");
    }
    setError(null);
    try {
      const data = await api.get("/api/workouts", filters);
      const safeWorkouts = Array.isArray(data?.workouts) ? data.workouts : [];
      globalWorkoutsCache.set(key, safeWorkouts);
      setWorkouts(safeWorkouts);
      setStatus("success");
    } catch (err) {
      setError(err);
      if (!globalWorkoutsCache.has(key)) setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Optimistically prepend a newly created workout session day.
   */
  const createWorkout = useCallback(async (payload) => {
    const data = await api.post("/api/workouts", payload);
    if (data?.workout) {
      setWorkouts((prev) => [data.workout, ...prev]);
    }
    return data?.workout;
  }, []);

  /**
   * Optimistically update an existing workout day in state.
   */
  const updateWorkout = useCallback(async (id, payload) => {
    const data = await api.put(`/api/workouts/${id}`, payload);
    if (data?.workout) {
      setWorkouts((prev) => prev.map((w) => (w.id === id ? data.workout : w)));
    }
    return data?.workout;
  }, []);

  /**
   * Optimistically remove a deleted workout day from state.
   */
  const deleteWorkout = useCallback(async (id) => {
    await api.delete(`/api/workouts/${id}`);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return {
    workouts: Array.isArray(workouts) ? workouts : [],
    status,
    error,
    reload: load,
    createWorkout,
    updateWorkout,
    deleteWorkout,
  };
}
