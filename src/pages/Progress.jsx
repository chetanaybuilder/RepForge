import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { api } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import { ErrorState, EmptyState, LoadingState } from "../components/StateViews";
import { SkeletonGrid } from "../components/Skeleton";
import { TiltCard } from "../components/TiltCard";

const CHART_COLORS = ["#00f2fe", "#8a5cf6", "#ff3366", "#00f5a0", "#ffb800", "#38bdf8"];

export function Progress() {
  const { data: analytics, status, error, reload } = useFetch(
    () => api.get("/api/workouts/analytics"),
    []
  );
  const { data: exercisesData } = useFetch(
    () => api.get("/api/workouts/exercises"),
    []
  );

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
    api
      .get("/api/workouts/progress", { exercise: selectedExercise })
      .then((data) => {
        setProgression(data.exercise_progression || []);
        setProgressionStatus("success");
      })
      .catch(() => setProgressionStatus("error"));
  }, [selectedExercise]);

  const dashboardStats = analytics?.dashboard_stats || {};
  const totalWorkouts = dashboardStats.total_workouts ?? 0;
  const volumeTrend = Array.isArray(analytics?.volume_trend) ? analytics.volume_trend : [];
  const frequencyByType = Array.isArray(analytics?.frequency_by_type) ? analytics.frequency_by_type : [];
  const plateaus = Array.isArray(analytics?.plateaus) ? analytics.plateaus : [];
  const safeProgression = Array.isArray(progression) ? progression : [];

  return (
    <div>
      {/* Page Header */}
      <div className="rf-page-header">
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 6 }}>
            EMPIRICAL PERFORMANCE TELEMETRY
          </div>
          <h1 className="rf-page-title">Progression & Biomechanics</h1>
          <p className="rf-page-subtitle">
            Longitudinal trends, estimated 1RM projections, and fatigue distribution.
          </p>
        </div>
      </div>

      {status === "loading" && <SkeletonGrid count={2} height="280px" />}
      {status === "error" && (
        <ErrorState message={error?.message} onRetry={reload} />
      )}

      {status === "success" && totalWorkouts === 0 && (
        <EmptyState
          title="No progression metrics recorded"
          description="Log multiple sessions to synthesize volume trajectories and personal record trends."
        />
      )}

      {status === "success" && totalWorkouts > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* ================================================================
              1. 26-WEEK VOLUME LOAD TRAJECTORY
              ================================================================ */}
          <div className="rf-pod">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)" }}>
                  LOAD INDEX
                </div>
                <h3 style={{ fontSize: "1.15rem", color: "var(--rf-text-pure)", marginTop: 2 }}>
                  26-Week Cumulative Volume Trend (kg)
                </h3>
              </div>
              <span className="rf-badge rf-badge--cyan">Biomechanical Work</span>
            </div>

            {volumeTrend.length > 0 ? (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00f2fe" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="week" tick={{ fill: "#60637a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#60637a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10, 10, 20, 0.95)",
                        border: "1px solid rgba(0, 242, 254, 0.3)",
                        borderRadius: "10px",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.8)",
                      }}
                      formatter={(val) => [`${formatNumber(val)} kg`, "Volume"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#00f2fe"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#volumeGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ color: "var(--rf-text-sub)", textAlign: "center", padding: "40px 0" }}>
                Insufficient volume telemetry.
              </p>
            )}
          </div>

          {/* ================================================================
              2. EXERCISE PROGRESSION & ESTIMATED 1RM
              ================================================================ */}
          <div className="rf-pod">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="rf-telemetry-tag" style={{ color: "var(--rf-violet)" }}>
                  STRENGTH OVERLOAD
                </div>
                <h3 style={{ fontSize: "1.15rem", color: "var(--rf-text-pure)", marginTop: 2 }}>
                  Exercise Progression & Est. 1RM
                </h3>
              </div>

              {/* Movement Selector */}
              <div style={{ width: "min(100%, 280px)" }}>
                <select
                  id="exercise-select"
                  aria-label="Select movement to view progression"
                  className="rf-select"
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                >
                  {(exercisesData?.exercises || []).map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {progressionStatus === "loading" && (
              <LoadingState label="Synthesizing progression curve…" />
            )}

            {progressionStatus === "success" && safeProgression.length > 0 && (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={safeProgression} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "#60637a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#60637a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10, 10, 20, 0.95)",
                        border: "1px solid rgba(138, 92, 246, 0.4)",
                        borderRadius: "10px",
                      }}
                      formatter={(val, name) => [`${val} kg`, name]}
                    />
                    <Line
                      type="monotone"
                      dataKey="max_weight"
                      name="Top Set (kg)"
                      stroke="#00f2fe"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#00f2fe" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="estimated_1rm"
                      name="Est. 1RM (kg)"
                      stroke="#ff3366"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {progressionStatus === "success" && safeProgression.length === 0 && (
              <p style={{ color: "var(--rf-text-sub)", textAlign: "center", padding: "40px 0" }}>
                No progression data logged for this exercise yet.
              </p>
            )}
          </div>

          {/* ================================================================
              3. TRAINING SPLIT RADAR & DISTRIBUTION
              ================================================================ */}
          <div className="rf-pod">
            <div className="rf-telemetry-tag" style={{ color: "var(--rf-emerald)", marginBottom: 4 }}>
              ANATOMICAL SPLIT
            </div>
            <h3 style={{ fontSize: "1.15rem", color: "var(--rf-text-pure)", marginBottom: 18 }}>
              Movement Distribution
            </h3>

            {frequencyByType.length > 0 ? (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={frequencyByType}
                      dataKey="count"
                      nameKey="workout_type"
                      outerRadius={95}
                      innerRadius={50}
                      paddingAngle={4}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {frequencyByType.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10, 10, 20, 0.95)",
                        border: "1px solid var(--rf-border-laser)",
                        borderRadius: "10px",
                      }}
                      formatter={(val) => [`${val} sessions`, "Frequency"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ color: "var(--rf-text-sub)", textAlign: "center", padding: "40px 0" }}>
                No training split data recorded.
              </p>
            )}
          </div>

          {/* ================================================================
              4. PLATEAUS DETECTED
              ================================================================ */}
          {plateaus.length > 0 && (
            <div>
              <div className="rf-section-head">
                <h2 className="rf-section-title">
                  <span style={{ color: "var(--rf-ember)" }}>⚠</span> Plateaus & Stagnation Diagnostics
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                {plateaus.map((p) => (
                  <TiltCard key={p.exercise_name} className="rf-stat-card" glowColor="ember">
                    <span className="rf-badge rf-badge--ember">
                      Stalled · {p.sessions_considered} Sessions
                    </span>
                    <div
                      style={{
                        fontFamily: "var(--rf-font-display)",
                        fontSize: "1.8rem",
                        fontWeight: 800,
                        color: "#fff",
                        margin: "12px 0 4px",
                      }}
                    >
                      {p.weight} kg
                    </div>
                    <div style={{ color: "var(--rf-text-pure)", fontWeight: 600 }}>
                      {p.exercise_name}
                    </div>
                    <div className="rf-stat-sub" style={{ color: "var(--rf-ember)" }}>
                      Zero progressive overload detected. Deload or adjust volume.
                    </div>
                  </TiltCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatNumber(n) {
  return new Intl.NumberFormat().format(Math.round(n));
}
