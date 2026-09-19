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
  { value: "weekly_frequency", label: "Weekly training frequency", unit: "sessions / week" },
  { value: "exercise_pr", label: "Exercise personal record", unit: "kg" },
  { value: "volume", label: "Total volume target", unit: "kg" },
];

export function Goals() {
  const { data: goalsData, status, error, reload } = useFetch(() => api.get("/api/goals"), []);
  const { data: achievementsData, status: achStatus } = useFetch(() => api.get("/api/goals/achievements"), []);
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const handleDelete = async () => {
    try {
      await api.delete(`/api/goals/${pendingDelete.id}`);
      toast.success("Goal removed.");
      reload();
    } catch (err) {
      toast.error(err.message || "Could not remove this goal.");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <div className="rf-page-header">
        <div>
          <h1 className="rf-page-title">Goals & Performance</h1>
          <p className="rf-page-subtitle">Set a real target. Progress is calculated straight from your logs.</p>
        </div>
        <PrimaryButton className="rf-btn--sm" onClick={() => setFormOpen(true)}>+ New goal</PrimaryButton>
      </div>

      {status === "loading" && <div style={{ marginTop: 24 }}><SkeletonGrid count={4} height="150px" /></div>}
      {status === "error" && <ErrorState message={error?.message} onRetry={reload} />}

      {status === "success" && goalsData.goals.length === 0 && (
        <EmptyState
          title="No goals set yet"
          description="Set a weekly frequency, a PR target, or a volume goal to track real progress."
          action={<PrimaryButton className="rf-btn--sm" onClick={() => setFormOpen(true)}>Set a goal</PrimaryButton>}
        />
      )}

      {status === "success" && goalsData.goals.length > 0 && (
        <div className="rf-stat-grid">
          {goalsData.goals.map((g) => (
            <GoalCard key={g.id} goal={g} onDelete={() => setPendingDelete(g)} />
          ))}
        </div>
      )}

      <div className="rf-section-head"><h2 className="rf-section-title">Achievements</h2></div>
      {achStatus === "loading" && <LoadingState label="Loading achievements…" />}
      {achStatus === "success" && (
        <div className="rf-achievement-grid">
          {achievementsData.achievements.map((a, i) => (
            <motion.div 
              key={a.title} 
              className={`rf-achievement${a.unlocked ? " rf-achievement--unlocked" : ""}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.02, boxShadow: "0 10px 30px -10px rgba(138,92,246,0.2)" }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Achievement3D active={a.unlocked} size={56} color="#8a5cf6" />
                <div>
                  <div className="rf-achievement-title">{a.title}</div>
                  <div className="rf-achievement-desc">{a.description}</div>
                </div>
              </div>
              <div className="rf-achievement-bar" style={{ marginTop: 16 }}>
                <motion.div 
                  className="rf-achievement-bar-fill" 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }}
                  transition={{ type: "spring", damping: 15, stiffness: 60, delay: 0.3 + (i * 0.1) }}
                />
              </div>
              <div className="rf-stat-sub" style={{ marginTop: 6 }}>{a.progress} / {a.target}</div>
            </motion.div>
          ))}
        </div>
      )}

      {formOpen && (
        <GoalFormModal
          onClose={() => setFormOpen(false)}
          onCreated={() => { setFormOpen(false); reload(); }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this goal?"
        message="You can always set a new one later."
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function GoalCard({ goal, onDelete }) {
  const typeLabel = GOAL_TYPES.find((t) => t.value === goal.goal_type)?.label || goal.goal_type;
  const pct = Math.min(100, goal.progress.progress_pct);
  return (
    <div className="rf-goal-card">
      <div className="rf-flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="rf-stat-label">{typeLabel}</div>
          {goal.exercise_name && <div className="rf-workout-exercise" style={{ marginTop: 4 }}>{goal.exercise_name}</div>}
        </div>
        <button className="rf-icon-btn" onClick={onDelete} aria-label="Remove goal">✕</button>
      </div>
      <div className="rf-goal-progress-track">
        <div className="rf-goal-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="rf-flex" style={{ justifyContent: "space-between" }}>
        <span className="rf-stat-sub">{goal.progress.current_value} / {goal.target_value} {goal.progress.unit}</span>
        <span className={`rf-badge ${goal.progress.is_complete ? "rf-badge--success" : "rf-badge--warning"}`}>
          {goal.progress.is_complete ? "Complete" : `${pct}%`}
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
      setErrorMsg("Exercise name is required for a PR goal.");
      return;
    }
    if (!targetValue || targetValue <= 0) {
      setErrorMsg("Target must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/goals", {
        goal_type: goalType,
        exercise_name: goalType === "exercise_pr" ? exerciseName.trim() : null,
        target_value: Number(targetValue),
      });
      toast.success("Goal created.");
      onCreated();
    } catch (err) {
      toast.error(err.message || "Could not create this goal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rf-modal-overlay" onClick={onClose}>
      <div className="rf-modal rf-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rf-modal-header">
          <h3 className="rf-modal-title">New goal</h3>
          <button className="rf-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="rf-field">
            <label htmlFor="goal-type">Goal type</label>
            <select id="goal-type" className="rf-select" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
              {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {goalType === "exercise_pr" && (
            <div className="rf-field rf-mt-24">
              <label htmlFor="goal-exercise">Exercise</label>
              <input id="goal-exercise" className="rf-input" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="Bench Press" />
            </div>
          )}

          <div className="rf-field rf-mt-24">
            <label htmlFor="goal-target">Target ({unit})</label>
            <input id="goal-target" type="number" step="0.5" min="0" className="rf-input" value={targetValue} onChange={(e) => setTargetValue(e.target.valueAsNumber)} />
          </div>

          {errorMsg && <p className="rf-field-error rf-mt-24">{errorMsg}</p>}

          <div className="rf-form-actions">
            <button type="button" className="rf-btn rf-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : "Create goal"}</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
