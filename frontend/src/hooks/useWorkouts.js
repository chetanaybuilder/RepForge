import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

const globalWorkoutsCache = new Map();

export function useWorkouts(filters = {}) {
  const key = JSON.stringify(filters);
  const [workouts, setWorkouts] = useState(globalWorkoutsCache.get(key) || []);
  const [status, setStatus] = useState(globalWorkoutsCache.has(key) ? "success" : "loading");
  const [error, setError] = useState(null);

  const load = useCallback(async (forceSilent = false) => {
    if (!globalWorkoutsCache.has(key) && !forceSilent) {
      setStatus("loading");
    }
    setError(null);
    try {
      const data = await api.get("/api/workouts", filters);
      globalWorkoutsCache.set(key, data.workouts);
      setWorkouts(data.workouts);
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

  const createWorkout = useCallback(async (payload) => {
    const data = await api.post("/api/workouts", payload);
    setWorkouts((prev) => [data.workout, ...prev]);
    return data.workout;
  }, []);

  const updateWorkout = useCallback(async (id, payload) => {
    const data = await api.put(`/api/workouts/${id}`, payload);
    setWorkouts((prev) => prev.map((w) => (w.id === id ? data.workout : w)));
    return data.workout;
  }, []);

  const deleteWorkout = useCallback(async (id) => {
    await api.delete(`/api/workouts/${id}`);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return { workouts, status, error, reload: load, createWorkout, updateWorkout, deleteWorkout };
}
