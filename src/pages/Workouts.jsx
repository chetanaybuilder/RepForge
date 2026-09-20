import { useMemo, useState } from "react";
import { useWorkouts } from "../hooks/useWorkouts";
import { useToast } from "../context/ToastContext";
import { ErrorState, EmptyState } from "../components/StateViews";
import { SkeletonGrid } from "../components/Skeleton";
import { DayFormModal } from "../components/DayFormModal";
import { ExerciseEditModal } from "../components/ExerciseEditModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PrimaryButton } from "../components/PrimaryButton";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";

export function Workouts() {
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({ search: search || undefined }),
    [search]
  );

  const { workouts, status, error, reload, createWorkout } = useWorkouts(filters);
  const toast = useToast();

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editExerciseModalOpen, setEditExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [expandedDayId, setExpandedDayId] = useState(null);

  const [aiLoading, setAiLoading] = useState({});
  const [aiResults, setAiResults] = useState({});

  const openCreateDay = () => setDayModalOpen(true);
  const openEditExercise = (ex) => {
    setEditingExercise(ex);
    setEditExerciseModalOpen(true);
  };

  const handleSaveDay = async (payload) => {
    try {
      await createWorkout(payload);
      toast.success("Workout session recorded.");
      setDayModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not save workout session.");
    }
  };

  const handleSaveExercise = async (payload) => {
    try {
      await api.put(`/api/workouts/exercises/${editingExercise.id}`, payload);
      toast.success("Exercise telemetry updated.");
      setEditExerciseModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not update exercise.");
    }
  };

  const confirmDeleteExercise = async () => {
    try {
      await api.delete(`/api/workouts/exercises/${pendingDelete.id}`);
      toast.success("Exercise removed.");
      reload();
    } catch (err) {
      toast.error(err.message || "Could not delete exercise.");
    } finally {
      setPendingDelete(null);
    }
  };

  const runAiAnalysis = async (dayId) => {
    setAiLoading((prev) => ({ ...prev, [dayId]: true }));
    try {
      const data = await api.post(`/api/ai/insights/${dayId}`);
      setAiResults((prev) => ({ ...prev, [dayId]: data.insights }));
      toast.success("Session analysis synthesized.");
    } catch (err) {
      toast.error(err.message || "AI Analysis unavailable.");
    } finally {
      setAiLoading((prev) => ({ ...prev, [dayId]: false }));
    }
  };

  return (
    <div>
      {/* ====================================================================
          PAGE HEADER & CALL TO ACTION
          ==================================================================== */}
      <div className="rf-page-header">
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 6 }}>
            TRAINING LOG ARCHIVE
          </div>
          <h1 className="rf-page-title">Workouts & Protocols</h1>
          <p className="rf-page-subtitle">
            Every set and rep logged with verified biometric accuracy.
          </p>
        </div>
        <PrimaryButton className="rf-btn--sm" onClick={openCreateDay}>
          + Log Session
        </PrimaryButton>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 24 }}>
        <div className="rf-search-wrapper">
          <span className="rf-search-icon">🔍</span>
          <input
            type="search"
            className="rf-input rf-search-input"
            placeholder="Search movements, muscle split, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {status === "loading" && <SkeletonGrid count={3} height="120px" />}
      {status === "error" && (
        <ErrorState message={error?.message} onRetry={reload} />
      )}

      {status === "success" && workouts.length === 0 && (
        <EmptyState
          title={search ? "No training data matched query" : "No workouts recorded yet"}
          description={
            search
              ? "Try broadening your movement search or clear filters."
              : "Initiate your training program by logging your first workout day."
          }
          action={
            <PrimaryButton className="rf-btn--sm" onClick={openCreateDay}>
              Log First Session
            </PrimaryButton>
          }
        />
      )}

      {status === "success" && workouts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {workouts.map((day) => {
            const isExpanded = expandedDayId === day.id;
            const primaryTypes = [
              ...new Set(day.exercises.map((ex) => ex.workout_type.replace("_", " "))),
            ].join(" · ");
            const totalSets = day.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

            return (
              <div
                key={day.id}
                className={`rf-workout-card${isExpanded ? " rf-workout-card--expanded" : ""}`}
              >
                {/* Header Bar */}
                <div
                  className="rf-workout-header"
                  onClick={() => setExpandedDayId(isExpanded ? null : day.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "var(--rf-radius-sm)",
                        background: isExpanded ? "rgba(0, 242, 254, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        border: isExpanded ? "1px solid rgba(0, 242, 254, 0.4)" : "1px solid var(--rf-border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--rf-font-mono)",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: isExpanded ? "var(--rf-cyan)" : "var(--rf-text-bright)",
                        transition: "all var(--rf-transition-fast)",
                      }}
                    >
                      <span>D{day.day_number}</span>
                    </div>

                    <div className="rf-workout-title-group">
                      <div className="rf-workout-day-badge">
                        <span>{day.day ? day.day : `Session #${day.day_number}`}</span>
                        <span className="rf-badge rf-badge--cyan">
                          {formatDate(day.date)}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--rf-text-sub)", textTransform: "capitalize" }}>
                        {day.exercises.length} Movements · {totalSets} sets {primaryTypes ? `(${primaryTypes})` : ""}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      color: "var(--rf-text-faint)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s var(--rf-ease-spring)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    ▼
                  </div>
                </div>

                {/* Expanded Session Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      className="rf-workout-body"
                    >
                      {/* AI Session Trigger */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 0",
                          borderBottom: "1px solid var(--rf-border-subtle)",
                        }}
                      >
                        <span className="rf-telemetry-tag" style={{ color: "var(--rf-text-sub)" }}>
                          SESSION BREAKDOWN
                        </span>
                        <button
                          type="button"
                          className="rf-btn rf-btn--violet rf-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            runAiAnalysis(day.id);
                          }}
                          disabled={aiLoading[day.id]}
                        >
                          {aiLoading[day.id] ? "Synthesizing Neural Review…" : "◈ AI Session Diagnostics"}
                        </button>
                      </div>

                      {/* In-line AI Diagnostic Results */}
                      {aiResults[day.id] && (
                        <div
                          className="rf-pod rf-pod--violet"
                          style={{ margin: "16px 0", padding: 18 }}
                        >
                          <div className="rf-badge rf-badge--violet" style={{ marginBottom: 10 }}>
                            ◈ Neural Biomechanical Assessment
                          </div>
                          <p style={{ margin: "0 0 12px 0", fontSize: "0.92rem", lineHeight: 1.6, color: "var(--rf-text-bright)" }}>
                            {aiResults[day.id].deep_review}
                          </p>

                          {aiResults[day.id].good_points?.length > 0 && (
                            <div className="rf-insight-card rf-insight-card--success">
                              <span className="rf-insight-tag" style={{ color: "var(--rf-emerald)" }}>
                                ↗ Biomechanical Strengths
                              </span>
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.86rem", color: "var(--rf-text-bright)" }}>
                                {aiResults[day.id].good_points.map((p, pIdx) => (
                                  <li key={pIdx}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {aiResults[day.id].critical_points?.length > 0 && (
                            <div className="rf-insight-card rf-insight-card--warning">
                              <span className="rf-insight-tag" style={{ color: "var(--rf-ember)" }}>
                                ⚠ Fatigue / Overload Alerts
                              </span>
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.86rem", color: "var(--rf-text-bright)" }}>
                                {aiResults[day.id].critical_points.map((p, pIdx) => (
                                  <li key={pIdx}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Exercise Cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {day.exercises.map((ex, i) => (
                          <div key={ex.id} className="rf-exercise-pod">
                            <div className="rf-exercise-head">
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span className="rf-badge rf-badge--cyan">
                                  {ex.workout_type.replace("_", " ")}
                                </span>
                                <span className="rf-exercise-name">{ex.exercise_name}</span>
                              </div>

                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  type="button"
                                  className="rf-btn rf-btn--ghost rf-btn--sm"
                                  onClick={() => openEditExercise(ex)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="rf-btn rf-btn--danger rf-btn--sm"
                                  onClick={() => setPendingDelete(ex)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {ex.notes && (
                              <p style={{ margin: "4px 0 10px 0", fontSize: "0.82rem", color: "var(--rf-text-sub)", fontStyle: "italic" }}>
                                "{ex.notes}"
                              </p>
                            )}

                            {/* Sets Chips */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                              {ex.sets.map((set, sIdx) => (
                                <div
                                  key={set.id || sIdx}
                                  className={`rf-set-chip ${set.completed ? "rf-set-chip--done" : ""}`}
                                >
                                  <span>S{sIdx + 1}:</span>
                                  <strong>{set.weight} kg</strong>
                                  <span>×</span>
                                  <strong>{set.reps} reps</strong>
                                  {set.completed && <span style={{ color: "var(--rf-emerald)" }}>✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DayFormModal
        open={dayModalOpen}
        onSave={handleSaveDay}
        onClose={() => setDayModalOpen(false)}
      />

      <ExerciseEditModal
        open={editExerciseModalOpen}
        initialValue={editingExercise}
        onSave={handleSaveExercise}
        onClose={() => setEditExerciseModalOpen(false)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this Movement?"
        message={
          pendingDelete
            ? `Permanently remove ${pendingDelete.exercise_name} and all its recorded sets. If this is the last exercise, the Day session will also be pruned.`
            : ""
        }
        confirmLabel="Confirm Delete"
        onConfirm={confirmDeleteExercise}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
