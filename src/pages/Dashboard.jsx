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

export function Dashboard() {
  const { user } = useAuth();
  const { data, status, error, reload } = useFetch(
    () => api.get("/api/workouts/stats"),
    []
  );

  const firstName = user?.name?.split(" ")[0] || "Lifter";

  return (
    <div>
      {/* ====================================================================
          COMMAND DECK HEADER
          ==================================================================== */}
      <div className="rf-page-header">
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 6 }}>
            NEURAL COMMAND DECK · SYSTEM NOMINAL
          </div>
          <h1 className="rf-page-title">
            Welcome back, <span className="rf-gradient-text">{firstName}</span>
          </h1>
          <p className="rf-page-subtitle">
            Biomechanical intelligence summary synthesized from your logged sets.
          </p>
        </div>
        <Link to="/workouts">
          <PrimaryButton className="rf-btn--sm">
            + Log Session
          </PrimaryButton>
        </Link>
      </div>

      {status === "loading" && <SkeletonGrid count={6} />}
      {status === "error" && (
        <ErrorState message={error?.message} onRetry={reload} />
      )}

      {status === "success" && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {/* ==================================================================
              1. PRIMARY BIOMETRIC TRAINING STATE (Hero Command Deck)
              ================================================================== */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="rf-hero-pod"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 24,
                alignItems: "center",
                position: "relative",
                zIndex: 2,
              }}
            >
              {/* Primary Metric: Current Streak */}
              <div>
                <div className="rf-telemetry-tag" style={{ color: "var(--rf-ember)", marginBottom: 8 }}>
                  MOMENTUM CORE
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div
                    style={{
                      fontFamily: "var(--rf-font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(2.4rem, 2rem + 2vw, 3.6rem)",
                      color: "var(--rf-text-pure)",
                      lineHeight: 1,
                    }}
                  >
                    <AnimatedNumber value={data.stats.current_streak} />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--rf-font-display)",
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "var(--rf-ember)",
                    }}
                  >
                    DAYS ACTIVE
                  </span>
                </div>
                <div className="rf-stat-sub" style={{ marginTop: 6 }}>
                  Longest recorded streak: {data.stats.longest_streak} days
                </div>
              </div>

              {/* Secondary Hero Metric: Total Volume Load */}
              <div>
                <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)", marginBottom: 8 }}>
                  CUMULATIVE LOAD
                </div>
                <div
                  style={{
                    fontFamily: "var(--rf-font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(1.8rem, 1.5rem + 1.2vw, 2.6rem)",
                    color: "var(--rf-text-pure)",
                    lineHeight: 1,
                  }}
                >
                  <AnimatedNumber value={data.stats.total_volume} format={formatNumber} />
                  <span style={{ fontSize: "1rem", color: "var(--rf-text-sub)", marginLeft: 8, fontWeight: 500 }}>
                    KG LOGGED
                  </span>
                </div>
                <div className="rf-stat-sub" style={{ marginTop: 6 }}>
                  Total biomechanical load across all verified lifts
                </div>
              </div>

              {/* AI Consciousness Shortcut */}
              <div
                style={{
                  background: "rgba(138, 92, 246, 0.1)",
                  border: "1px solid rgba(138, 92, 246, 0.3)",
                  borderRadius: "var(--rf-radius-md)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div className="rf-badge rf-badge--violet" style={{ alignSelf: "flex-start" }}>
                  ◈ AI Subsystem
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--rf-text-bright)" }}>
                  Gemini Coach has processed your training logs.
                </p>
                <Link to="/ai-analysis">
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--rf-cyan)",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    Open Neural Analysis →
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ==================================================================
              2. SECONDARY PERFORMANCE METRICS (KPI Grid)
              ================================================================== */}
          <div className="rf-stat-grid">
            <StatPod
              label="Total Sessions"
              value={data.stats.total_workouts}
              sub="Recorded training days"
              glow="cyan"
            />
            <StatPod
              label="Training Days"
              value={data.stats.training_days}
              sub="Unique calendar dates"
              glow="violet"
            />
            <StatPod
              label="Personal Records"
              value={data.stats.personal_records_count}
              sub="Historical peak overloads"
              glow="ember"
            />
            <StatPod
              label="Movements Logged"
              value={data.stats.unique_exercises}
              sub="Unique exercises tracked"
              glow="cyan"
            />
          </div>

          {/* ==================================================================
              3. RECENT PR SHOWCASE
              ================================================================== */}
          <div className="rf-section-head">
            <h2 className="rf-section-title">
              <span style={{ color: "var(--rf-ember)" }}>⚡</span> Recent Personal Records
            </h2>
            <Link to="/progress" className="rf-telemetry-tag" style={{ color: "var(--rf-text-sub)" }}>
              ALL PROGRESS →
            </Link>
          </div>

          {data.recent_prs.length === 0 ? (
            <div className="rf-pod" style={{ textAlign: "center", padding: "28px 16px" }}>
              <p style={{ margin: 0, color: "var(--rf-text-sub)", fontSize: "0.88rem" }}>
                No personal records logged in the last 30 days. Maintain intensity to set your next milestone.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {data.recent_prs.map((pr) => (
                <div key={pr.exercise_name} className="rf-pr-card">
                  <div className="rf-badge rf-badge--ember">
                    PR · {formatDate(pr.date)}
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
                    {pr.weight} <span style={{ fontSize: "1rem", color: "var(--rf-text-sub)" }}>kg</span>
                  </div>
                  <div style={{ color: "var(--rf-text-bright)", fontWeight: 600, fontSize: "0.95rem" }}>
                    {pr.exercise_name}
                  </div>
                  <div className="rf-stat-sub">
                    {pr.sets} sets × {pr.reps} reps
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==================================================================
              4. RECENT TRAINING SESSIONS TIMELINE
              ================================================================== */}
          <div className="rf-section-head">
            <h2 className="rf-section-title">
              <span>▦</span> Training Timeline
            </h2>
            <Link to="/workouts" className="rf-telemetry-tag" style={{ color: "var(--rf-text-sub)" }}>
              VIEW WORKOUT LOG →
            </Link>
          </div>

          {data.recent_workouts.length === 0 ? (
            <EmptyState
              title="No training telemetry recorded"
              description="Log your first session to initiate the neural feedback model."
              action={
                <Link to="/workouts">
                  <PrimaryButton className="rf-btn--sm">Log Workout Day</PrimaryButton>
                </Link>
              }
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.recent_workouts.map((day, i) => {
                const totalSets = day.exercises.reduce(
                  (acc, ex) => acc + ex.sets.length,
                  0
                );
                const uniqueTypes = [
                  ...new Set(
                    day.exercises.map((ex) =>
                      ex.workout_type.replace("_", " ")
                    )
                  ),
                ].join(" · ");

                return (
                  <motion.div
                    key={day.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="rf-pod rf-surface--interactive"
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
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--rf-font-mono)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--rf-cyan)",
                        }}
                      >
                        <span>#{String(i + 1).padStart(2, "0")}</span>
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
                            Day {day.day_number}
                          </span>
                          <span className="rf-badge rf-badge--cyan">
                            {day.exercises.length} Movements
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
                      <div
                        className="rf-telemetry-tag"
                        style={{ color: "var(--rf-text-faint)", fontSize: "0.75rem" }}
                      >
                        {formatDate(day.date)}
                      </div>
                      <Link to="/workouts">
                        <button className="rf-icon-btn" aria-label="Inspect workout">
                          →
                        </button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
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
  return new Intl.NumberFormat().format(Math.round(n));
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
