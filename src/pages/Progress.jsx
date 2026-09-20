import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { api } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import { ErrorState, EmptyState } from "../components/StateViews";
import { SkeletonGrid } from "../components/Skeleton";
import { TiltCard } from "../components/TiltCard";

const CHART_COLORS = ["#8a5cf6", "#22d3ee", "#ff6b45", "#34d399", "#fbbf24", "#f9575d"];

export function Progress() {
  const { data: analytics, status, error, reload } = useFetch(() => api.get("/api/workouts/analytics"), []);
  const { data: exercisesData } = useFetch(() => api.get("/api/workouts/exercises"), []);

  const [selectedExercise, setSelectedExercise] = useState("");
  const [progression, setProgression] = useState(null);
  const [progressionStatus, setProgressionStatus] = useState("idle");

  useEffect(() => {
    if (exercisesData?.exercises?.length && !selectedExercise) {
      setSelectedExercise(exercisesData.exercises[0]);
    }
  }, [exercisesData, selectedExercise]);

  useEffect(() => {
    if (!selectedExercise) return;
    setProgressionStatus("loading");
    api.get("/api/workouts/progress", { exercise: selectedExercise })
      .then((data) => { setProgression(data.exercise_progression || []); setProgressionStatus("success"); })
      .catch(() => setProgressionStatus("error"));
  }, [selectedExercise]);

  // --- Defensive data accessors (never pass null/undefined to Recharts) ---
  const dashboardStats = analytics?.dashboard_stats || {};
  const totalWorkouts = dashboardStats.total_workouts ?? 0;
  const volumeTrend = Array.isArray(analytics?.volume_trend) ? analytics.volume_trend : [];
  const frequencyByType = Array.isArray(analytics?.frequency_by_type) ? analytics.frequency_by_type : [];
  const plateaus = Array.isArray(analytics?.plateaus) ? analytics.plateaus : [];
  const safeProgression = Array.isArray(progression) ? progression : [];

  return (
    <div>
      <div className="rf-page-header">
        <div>
          <h1 className="rf-page-title">Progress</h1>
          <p className="rf-page-subtitle">Trends computed directly from your logged sets.</p>
        </div>
      </div>

      {status === "loading" && <div style={{ marginTop: 24 }}><SkeletonGrid count={2} height="260px" /></div>}
      {status === "error" && <ErrorState message={error?.message} onRetry={reload} />}

      {status === "success" && totalWorkouts === 0 && (
        <EmptyState title="Nothing to show yet" description="Log a few workouts and your trends will appear here." />
      )}

      {status === "success" && totalWorkouts > 0 && (
        <>
          <div className="rf-section-head"><h2 className="rf-section-title">Volume Trend (last 26 weeks)</h2></div>
          <div className="rf-card">
            {volumeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={volumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="week" tick={{ fill: "#9c99ab", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9c99ab", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#191925", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10 }} />
                  <Line type="monotone" dataKey="volume" stroke="#8a5cf6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="rf-text-dim" style={{ padding: "40px 0", textAlign: "center" }}>No volume data available yet.</p>
            )}
          </div>

          <div className="rf-section-head"><h2 className="rf-section-title">Exercise Progression</h2></div>
          <div className="rf-card">
            <div className="rf-field" style={{ maxWidth: 280, marginBottom: 20 }}>
              <label htmlFor="exercise-select">Exercise</label>
              <select id="exercise-select" className="rf-select" value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}>
                {(exercisesData?.exercises || []).map((ex) => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
            {progressionStatus === "loading" && <LoadingState label="Loading progression…" />}
            {progressionStatus === "success" && safeProgression.length > 0 && (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={safeProgression}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: "#9c99ab", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9c99ab", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#191925", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10 }} />
                  <Line type="monotone" dataKey="max_weight" name="Top set (kg)" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="estimated_1rm" name="Est. 1RM" stroke="#ff6b45" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
            {progressionStatus === "success" && safeProgression.length === 0 && (
              <p className="rf-text-dim">No data for this exercise yet.</p>
            )}
          </div>

          <div className="rf-section-head"><h2 className="rf-section-title">Training Split</h2></div>
          <div className="rf-card">
            {frequencyByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={frequencyByType}
                    dataKey="count"
                    nameKey="workout_type"
                    outerRadius={90}
                    label={(entry) => `${entry.workout_type} (${entry.count})`}
                  >
                    {frequencyByType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#191925", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="rf-text-dim" style={{ padding: "40px 0", textAlign: "center" }}>No training split data yet.</p>
            )}
          </div>

          {plateaus.length > 0 && (
            <>
              <div className="rf-section-head"><h2 className="rf-section-title">Plateaus Detected</h2></div>
              <div className="rf-stat-grid">
                {plateaus.map((p) => (
                  <TiltCard key={p.exercise_name} className="rf-stat-card">
                    <span className="rf-badge rf-badge--warning">No progress · {p.sessions_considered} sessions</span>
                    <div className="rf-stat-value" style={{ fontSize: "1.7rem", margin: "10px 0 4px" }}>{p.weight} kg</div>
                    <div className="rf-stat-sub">{p.exercise_name}</div>
                  </TiltCard>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function LoadingState({ label = "Loading…" }) {
  return (
    <div className="rf-state rf-state--loading">
      <div className="rf-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
