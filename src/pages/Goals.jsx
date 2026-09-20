import { useState } from "react";
import { api } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../context/ToastContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import { SkeletonGrid } from "../components/Skeleton";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Achievement3D } from "../components/3d/Achievement3D";
import { PrimaryButton } from "../components/PrimaryButton";
import { motion } from "framer-motion";

const GOAL_TYPES = [
  { value: "weekly_frequency", label: "Weekly Training Frequency", unit: "sessions / week" },
  { value: "exercise_pr", label: "Exercise Peak PR", unit: "kg" },
  { value: "volume", label: "Total Cumulative Volume", unit: "kg" },
];

export function Goals() {
  const { data: goalsData, status, error, reload } = useFetch(
    () => api.get("/api/goals"),
    [],
    () => false,
    null,
    { goals: [] }
  );
  const { data: achievementsData, status: achStatus } = useFetch(
    () => api.get("/api/goals/achievements"),
    [],
    () => false,
    null,
    { achievements: [] }
  );
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Safe fallbacks to prevent undefined length evaluations
  const goals = Array.isArray(goalsData?.goals)
    ? goalsData.goals
    : Array.isArray(goalsData)
    ? goalsData
    : [];

  const achievements = Array.isArray(achievementsData?.achievements)
    ? achievementsData.achievements
    : Array.isArray(achievementsData)
    ? achievementsData
    : [];

  const handleDelete = async () => {
    try {
      await api.delete(`/api/goals/${pendingDelete?.id}`);
      toast.success("Objective removed.");
      reload();
    } catch (err) {
      toast.error(err?.message || "Failed to remove objective.");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="rf-page-header">
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 6 }}>
            04 — GOALS & ACHIEVEMENTS
          </div>
          <h1 className="rf-page-title">Goals & Achievements</h1>
          <p className="rf-page-subtitle">
            Active performance targets, progression milestones, and quantum crystals.
          </p>
        </div>
        <PrimaryButton className="rf-btn--sm" onClick={() => setFormOpen(true)}>
          + Set Target
        </PrimaryButton>
      </div>

      {status === "loading" && <SkeletonGrid count={4} height="140px" />}
      {status === "error" && (
        <ErrorState message={error?.message} onRetry={reload} />
      )}

      {status === "success" && (goals?.length === 0 || goalsData?.goals?.length === 0) && (
        <EmptyState
          title="No goals found"
          description="Establish weekly frequency, lift overloads, or total volume milestones."
          action={
            <PrimaryButton className="rf-btn--sm" onClick={() => setFormOpen(true)}>
              Initialize Objective
            </PrimaryButton>
          }
        />
      )}

      {status === "success" && goals?.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {goals.map((g) => (
            <GoalCard key={g?.id || g?.goal_type} goal={g} onDelete={() => setPendingDelete(g)} />
          ))}
        </div>
      )}

      {/* ====================================================================
          3D QUANTUM ACHIEVEMENTS SECTION
          ==================================================================== */}
      <div className="rf-section-head">
        <h2 className="rf-section-title">
          <span>✦</span> Quantum Milestone Crystals
        </h2>
        <span className="rf-telemetry-tag" style={{ color: "var(--rf-text-faint)" }}>
          HARDWARE VERIFIED
        </span>
      </div>

      {achStatus === "loading" && (
        <LoadingState label="Synthesizing achievement matrix…" />
      )}

      {achStatus === "success" && achievements?.length === 0 && (
        <p style={{ color: "var(--rf-text-sub)", fontSize: "0.9rem", margin: "16px 0" }}>
          No achievements available.
        </p>
      )}

      {achStatus === "success" && achievements?.length > 0 && (
        <div className="rf-achievement-grid">
          {achievements.map((a, i) => {
            const progressVal = Number(a?.progress) || 0;
            const targetVal = Number(a?.target) || 1;
            const pct = Math.min(100, Math.round((progressVal / targetVal) * 100));

            return (
              <motion.div
                key={a?.title || i}
                className={`rf-achievement-card${a?.unlocked ? " rf-achievement-card--unlocked" : ""}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", delay: i * 0.08 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Achievement3D
                    active={Boolean(a?.unlocked)}
                    size={56}
                    color={a?.unlocked ? "#00f2fe" : "#8a5cf6"}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h4 style={{ margin: 0, color: "var(--rf-text-pure)", fontSize: "1rem" }}>
                        {a?.title}
                      </h4>
                      {a?.unlocked && (
                        <span className="rf-badge rf-badge--emerald">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--rf-text-sub)" }}>
                      {a?.description}
                    </p>
                  </div>
                </div>

                <div className="rf-progress-bar-track" style={{ marginTop: 16 }}>
                  <motion.div
                    className={`rf-progress-bar-fill ${a?.unlocked ? "rf-progress-bar-fill--emerald" : ""}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", damping: 20, stiffness: 60, delay: 0.2 + i * 0.08 }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="rf-stat-sub">
                    {progressVal} / {targetVal}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--rf-font-mono)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: a?.unlocked ? "var(--rf-emerald)" : "var(--rf-text-faint)",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      {formOpen && (
        <GoalFormModal
          onClose={() => setFormOpen(false)}
          onCreated={() => {
            setFormOpen(false);
            reload();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this Target?"
        message="This objective telemetry can be reconfigured at any point."
        confirmLabel="Remove Objective"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function GoalCard({ goal, onDelete }) {
  const typeLabel =
    GOAL_TYPES.find((t) => t.value === goal?.goal_type)?.label || goal?.goal_type || "Objective";
  const progress = goal?.progress || {};
  const pct = Math.min(100, Math.round(progress?.progress_pct || 0));

  return (
    <div className="rf-pod">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="rf-badge rf-badge--cyan">
            {typeLabel}
          </span>
          {goal?.exercise_name && (
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--rf-text-pure)", marginTop: 6 }}>
              {goal.exercise_name}
            </div>
          )}
        </div>
        <button
          type="button"
          className="rf-icon-btn"
          style={{ width: 32, height: 32 }}
          onClick={onDelete}
          aria-label="Remove Objective"
        >
          ✕
        </button>
      </div>

      <div className="rf-progress-bar-track">
        <div
          className={`rf-progress-bar-fill ${progress?.is_complete ? "rf-progress-bar-fill--emerald" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="rf-stat-sub">
          {progress?.current_value ?? 0} / {goal?.target_value ?? 0} {progress?.unit || ""}
        </span>
        <span
          className={`rf-badge ${
            progress?.is_complete ? "rf-badge--emerald" : "rf-badge--cyan"
          }`}
        >
          {progress?.is_complete ? "Target Achieved ✓" : `${pct}% Active`}
        </span>
      </div>
    </div>
  );
}

function GoalFormModal({ onClose, onCreated }) {
  const [goalType, setGoalType] = useState("weekly_frequency");
  const [exerciseName, setExerciseName] = useState("");
  const [targetValue, setTargetValue] = useState(3);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const toast = useToast();

  const unit = GOAL_TYPES.find((t) => t.value === goalType)?.unit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (goalType === "exercise_pr" && !exerciseName.trim()) {
      setErrorMsg("Exercise name is required for a Peak PR objective.");
      return;
    }
    if (!targetValue || targetValue <= 0) {
      setErrorMsg("Target value must be greater than zero.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/goals", {
        goal_type: goalType,
        exercise_name: goalType === "exercise_pr" ? exerciseName.trim() : null,
        target_value: Number(targetValue),
      });
      toast.success("New objective synthesized.");
      onCreated();
    } catch (err) {
      toast.error(err.message || "Failed to set objective.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rf-modal-overlay" onClick={onClose}>
      <div
        className="rf-modal rf-modal--sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rf-modal-handle" />
        <div className="rf-modal-header">
          <div>
            <div className="rf-telemetry-tag" style={{ marginBottom: 2 }}>
              PERFORMANCE OBJECTIVE
            </div>
            <h3 className="rf-modal-title">Establish Target</h3>
          </div>
          <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div className="rf-modal-body">
            <div className="rf-field">
              <label className="rf-label" htmlFor="goal-type">
                Target Metric Protocol
              </label>
              <select
                id="goal-type"
                className="rf-select"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                {GOAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {goalType === "exercise_pr" && (
              <div className="rf-field" style={{ marginTop: 14 }}>
                <label className="rf-label" htmlFor="goal-exercise">
                  Target Movement
                </label>
                <input
                  id="goal-exercise"
                  className="rf-input"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="e.g. Barbell Squat"
                  required
                />
              </div>
            )}

            <div className="rf-field" style={{ marginTop: 14 }}>
              <label className="rf-label" htmlFor="goal-target">
                Objective Threshold ({unit})
              </label>
              <input
                id="goal-target"
                type="number"
                step="0.5"
                min="0"
                className="rf-input"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.valueAsNumber)}
                required
              />
            </div>

            {errorMsg && (
              <div className="rf-field-error" style={{ marginTop: 14 }}>
                {errorMsg}
              </div>
            )}
          </div>

          <div className="rf-modal-footer">
            <button
              type="button"
              className="rf-btn rf-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Synthesizing…" : "Activate Objective"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
