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

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div>
      <div className="rf-page-header">
        <div>
          <h1 className="rf-page-title">Welcome back, <span className="rf-gradient-text">{firstName}</span></h1>
          <p className="rf-page-subtitle">Here's where your training stands today.</p>
        </div>
        <Link to="/workouts">
          <PrimaryButton className="rf-btn--sm">+ Log a workout</PrimaryButton>
        </Link>
      </div>

      {status === "loading" && <SkeletonGrid />}
      {status === "error" && <ErrorState message={error?.message} onRetry={reload} />}

      {status === "success" && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
          <div className="rf-stat-grid">
            <StatCard label="Total Workouts" value={data.stats.total_workouts} />
            <StatCard label="Current Streak" value={`${data.stats.current_streak}d`} sub={`Longest: ${data.stats.longest_streak}d`} />
            <StatCard label="Training Days" value={data.stats.training_days} />
            <StatCard label="Total Volume" value={`${formatNumber(data.stats.total_volume)} kg`} />
            <StatCard label="Personal Records" value={data.stats.personal_records_count} />
            <StatCard label="Unique Exercises" value={data.stats.unique_exercises} />
          </div>

          <div className="rf-section-head">
            <h2 className="rf-section-title">Recent Workouts</h2>
            <Link to="/workouts" className="rf-text-dim">View all →</Link>
          </div>
          {data.recent_workouts.length === 0 ? (
            <EmptyState
              title="No workouts yet"
              description="Log your first session to start seeing real stats here."
              action={<Link to="/workouts"><PrimaryButton className="rf-btn--sm">Log a workout</PrimaryButton></Link>}
            />
          ) : (
            <div>
              {data.recent_workouts.map((day, i) => (
                <div key={day.id} className="rf-workout-row">
                  <span className="rf-workout-index">{String(i + 1).padStart(2, "0")}</span>
                  <div className="rf-workout-main">
                    <span className="rf-workout-tag">{day.exercises.length} Exercises</span>
                    <div className="rf-workout-exercise">Day {day.day_number}</div>
                    <div className="rf-workout-meta">
                      {day.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} total sets logged
                    </div>
                  </div>
                  <span className="rf-workout-date">{formatDate(day.date)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rf-section-head">
            <h2 className="rf-section-title">Recent PRs</h2>
            <Link to="/progress" className="rf-text-dim">See progress →</Link>
          </div>
          {data.recent_prs.length === 0 ? (
            <p className="rf-text-dim">No new personal records in the last 30 days — keep logging to catch the next one.</p>
          ) : (
            <div className="rf-stat-grid">
              {data.recent_prs.map((pr) => (
                <div key={pr.exercise_name} className="rf-stat-card">
                  <span className="rf-badge rf-badge--ember">PR · {formatDate(pr.date)}</span>
                  <div className="rf-stat-value" style={{ fontSize: "1.7rem", marginTop: 10 }}>{pr.weight} kg</div>
                  <div className="rf-stat-sub">{pr.exercise_name} · {pr.sets} × {pr.reps}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
      <TiltCard className="rf-stat-card">
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
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
