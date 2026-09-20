import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";
import { ErrorState, EmptyState } from "../components/StateViews";
import { SkeletonGrid } from "../components/Skeleton";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { PrimaryButton } from "../components/PrimaryButton";
import { TiltCard } from "../components/TiltCard";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const DEFAULT_STATS_SCHEMA = {
  stats: {
    total_volume: 0,
    total_workouts: 0,
    workouts_completed: 0,
    training_days: 0,
    current_streak: 0,
    longest_streak: 0,
    personal_records_count: 0,
    unique_exercises: 0,
  },
  recent_prs: [],
  recent_workouts: [],
};

export function Dashboard() {
  const { user } = useAuth();
  const { data, status, error, reload } = useFetch(
    () => api.get("/api/workouts/stats"),
    [],
    () => false,
    null,
    DEFAULT_STATS_SCHEMA
  );
  const { data: analyticsData } = useFetch(
    () => api.get("/api/workouts/analytics"),
    [],
    () => false,
    null,
    { volume_trend: [] }
  );

  const firstName = user?.name?.split(" ")[0] || "Lifter";
  const stats = data?.stats || DEFAULT_STATS_SCHEMA.stats;
  const recentPrs = Array.isArray(data?.recent_prs) ? data.recent_prs : [];
  const recentWorkouts = Array.isArray(data?.recent_workouts) ? data.recent_workouts : [];
  const volumeTrend = Array.isArray(analyticsData?.volume_trend)
    ? analyticsData.volume_trend
    : [];

  const isLoading = status === "loading" || (!data?.stats && status !== "error");

  return (
    <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="rf-page-header">
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 6 }}>
            02 — DASHBOARD OVERVIEW
          </div>
          <h1 className="rf-page-title">
            Welcome back, <span className="rf-gradient-text">{firstName}</span>
          </h1>
          <p className="rf-page-subtitle">
            Cumulative volume load, training metrics, and progression intelligence.
          </p>
        </div>
        <Link to="/workouts">
          <PrimaryButton className="rf-btn--sm">
            + Log Session
          </PrimaryButton>
        </Link>
      </div>

      {isLoading && <SkeletonGrid count={6} />}
      {status === "error" && (
        <ErrorState message={error?.message} onRetry={reload} />
      )}

      {!isLoading && status !== "error" && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%" }}
        >
          {/* ==================================================================
              1. PRIORITY HERO: TOTAL VOLUME LOAD & STREAK MOMENTUM
              ================================================================== */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="rf-hero-pod"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 28,
                alignItems: "center",
                position: "relative",
                zIndex: 2,
              }}
            >
              {/* PRIMARY FOCUS: TOTAL VOLUME */}
              <div>
                <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)", marginBottom: 8 }}>
                  PRIMARY TELEMETRY · CUMULATIVE LOAD
                </div>
                <div
                  style={{
                    fontFamily: "var(--rf-font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(2.5rem, 2rem + 2.5vw, 4.2rem)",
                    color: "var(--rf-text-pure)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  <AnimatedNumber value={stats?.total_volume ?? 0} format={formatNumber} />
                  <span
                    style={{
                      fontSize: "clamp(1.1rem, 0.9rem + 0.6vw, 1.5rem)",
                      color: "var(--rf-cyan)",
                      marginLeft: 10,
                      fontWeight: 700,
                    }}
                  >
                    KG
                  </span>
                </div>
                <p style={{ margin: "10px 0 0 0", color: "var(--rf-text-sub)", fontSize: "0.9rem" }}>
                  Total mechanical load moved across all verified training sets.
                </p>
              </div>

              {/* SECONDARY HERO: CURRENT STREAK */}
              <div
                style={{
                  background: "rgba(10, 10, 22, 0.6)",
                  border: "1px solid rgba(255, 51, 102, 0.3)",
                  borderRadius: "var(--rf-radius-lg)",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div className="rf-telemetry-tag" style={{ color: "var(--rf-ember)", marginBottom: 6 }}>
                  TRAINING MOMENTUM
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div
                    style={{
                      fontFamily: "var(--rf-font-display)",
                      fontWeight: 800,
                      fontSize: "2.4rem",
                      color: "var(--rf-text-pure)",
                      lineHeight: 1,
                    }}
                  >
                    <AnimatedNumber value={stats?.current_streak ?? 0} />
                  </div>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--rf-ember)" }}>
                    DAYS STREAK
                  </span>
                </div>
                <div className="rf-stat-sub" style={{ marginTop: 6 }}>
                  Longest recorded: {stats?.longest_streak ?? 0} consecutive days
                </div>
              </div>
            </div>
          </motion.div>

          {/* ==================================================================
              2. VOLUME PROGRESSION TRAJECTORY CHART (Visual intelligence)
              ================================================================== */}
          {volumeTrend.length > 0 && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="rf-pod"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)" }}>
                    PROGRESSION CURVE
                  </div>
                  <h3 style={{ fontSize: "1.15rem", color: "var(--rf-text-pure)", marginTop: 2 }}>
                    Volume Progression Over Time
                  </h3>
                </div>
                <span className="rf-badge rf-badge--cyan">Weekly Load (kg)</span>
              </div>

              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashVolumeGrad" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#dashVolumeGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ==================================================================
              3. WORKOUT STATISTICS PODS
              ================================================================== */}
          <div className="rf-stat-grid">
            <StatPod
              label="Total Workouts"
              value={stats?.total_workouts ?? stats?.workouts_completed ?? 0}
              sub="Sessions completed"
              glow="cyan"
            />
            <StatPod
              label="Active Training Days"
              value={stats?.training_days ?? 0}
              sub="Unique gym days"
              glow="violet"
            />
            <StatPod
              label="Personal Records"
              value={stats?.personal_records_count ?? 0}
              sub="Historical peak lifts"
              glow="ember"
            />
            <StatPod
              label="Movements Logged"
              value={stats?.unique_exercises ?? 0}
              sub="Tracked exercises"
              glow="cyan"
            />
          </div>

          {/* ==================================================================
              4. RECENT PR MILESTONES
              ================================================================== */}
          <div>
            <div className="rf-section-head">
              <h2 className="rf-section-title">
                <span style={{ color: "var(--rf-ember)" }}>⚡</span> Recent Personal Records
              </h2>
            </div>

            {recentPrs.length === 0 ? (
              <div className="rf-pod" style={{ textAlign: "center", padding: "28px 16px" }}>
                <p style={{ margin: 0, color: "var(--rf-text-sub)", fontSize: "0.88rem" }}>
                  No personal records in the last 30 days. Log your upcoming sessions to register new peak loads.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                {recentPrs.map((pr) => (
                  <div key={pr?.exercise_name || Math.random()} className="rf-pr-card">
                    <div className="rf-badge rf-badge--ember">
                      PR · {formatDate(pr?.date)}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--rf-font-display)",
                        fontWeight: 800,
                        fontSize: "2rem",
                        color: "#fff",
                        margin: "12px 0 4px",
                      }}
                    >
                      {pr?.weight ?? 0} <span style={{ fontSize: "1rem", color: "var(--rf-text-sub)" }}>kg</span>
                    </div>
                    <div style={{ color: "var(--rf-text-bright)", fontWeight: 600, fontSize: "0.95rem" }}>
                      {pr?.exercise_name || "Exercise"}
                    </div>
                    <div className="rf-stat-sub">
                      {pr?.sets ?? 1} sets × {pr?.reps ?? 0} reps
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================================
              5. RECENT SESSIONS HISTORY
              ================================================================== */}
          <div>
            <div className="rf-section-head">
              <h2 className="rf-section-title">
                <span>▦</span> Recent Training Sessions
              </h2>
              <Link to="/workouts" className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)" }}>
                LOG WORKOUT →
              </Link>
            </div>

            {recentWorkouts.length === 0 ? (
              <EmptyState
                title="No logged sessions found"
                description="Begin tracking by logging your first workout session."
                action={
                  <Link to="/workouts">
                    <PrimaryButton className="rf-btn--sm">Log Workout</PrimaryButton>
                  </Link>
                }
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recentWorkouts.map((day, i) => {
                  const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
                  const totalSets = exercises.reduce(
                    (acc, ex) => acc + (Array.isArray(ex?.sets) ? ex.sets.length : (Number(ex?.sets) || 1)),
                    0
                  );
                  const uniqueTypes = [
                    ...new Set(
                      exercises.map((ex) =>
                        (ex?.workout_type || "workout").replace("_", " ")
                      )
                    ),
                  ].join(" · ");

                  return (
                    <div
                      key={day?.id || i}
                      className="rf-pod"
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "var(--rf-radius-sm)",
                            background: "rgba(0, 242, 254, 0.08)",
                            border: "1px solid rgba(0, 242, 254, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--rf-font-mono)",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "var(--rf-cyan)",
                          }}
                        >
                          #{String(i + 1).padStart(2, "0")}
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontFamily: "var(--rf-font-display)",
                                fontWeight: 700,
                                fontSize: "1.05rem",
                                color: "var(--rf-text-pure)",
                              }}
                            >
                              Day {day?.day_number ?? (i + 1)}
                            </span>
                            <span className="rf-badge rf-badge--cyan">
                              {exercises.length} Exercises
                            </span>
                            {uniqueTypes && (
                              <span style={{ fontSize: "0.76rem", color: "var(--rf-text-faint)", textTransform: "capitalize" }}>
                                {uniqueTypes}
                              </span>
                            )}
                          </div>
                          <div className="rf-stat-sub" style={{ marginTop: 2 }}>
                            {totalSets} total sets logged
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div className="rf-telemetry-tag" style={{ color: "var(--rf-text-faint)", fontSize: "0.75rem" }}>
                          {formatDate(day?.date)}
                        </div>
                        <Link to="/workouts">
                          <button className="rf-icon-btn" aria-label="View in workouts">
                            →
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatPod({ label, value, sub, glow = "cyan" }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
      <TiltCard className="rf-stat-card" glowColor={glow}>
        <div className="rf-stat-label">{label}</div>
        <div className="rf-stat-value">
          <AnimatedNumber value={value} format={formatNumber} />
        </div>
        {sub && <div className="rf-stat-sub">{sub}</div>}
      </TiltCard>
    </motion.div>
  );
}

function formatNumber(n) {
  const val = Number(n);
  if (isNaN(val)) return "0";
  return new Intl.NumberFormat().format(Math.round(val));
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}
