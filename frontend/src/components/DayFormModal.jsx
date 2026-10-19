import { useEffect, useState } from "react";
import { PrimaryButton } from "./PrimaryButton";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { WeightScrollInput } from "./WeightScrollInput";
import { RestTimer } from "./RestTimer";
import { PlateCalculatorModal } from "./PlateCalculatorModal";

export const DAY_WORKOUT_TYPES = [
  { value: "push", label: "Push (Chest/Shoulders/Triceps)" },
  { value: "pull", label: "Pull (Back/Biceps)" },
  { value: "legs", label: "Legs (Quads/Hams/Calves)" },
  { value: "upper", label: "Upper Body" },
  { value: "lower", label: "Lower Body" },
  { value: "full_body", label: "Full Body Tactical" },
  { value: "cardio", label: "Cardio Conditioning" },
  { value: "core", label: "Core & Stability" },
  { value: "mobility", label: "Mobility & Recovery" },
  { value: "other", label: "Custom Protocol" },
];

const EMPTY_SET = { reps: 10, weight: 0, completed: true };
const EMPTY_EXERCISE = {
  workout_type: "push",
  exercise_name: "",
  notes: "",
  sets: [{ ...EMPTY_SET }],
};

const EMPTY_FORM = {
  day: "",
  date: new Date().toISOString().slice(0, 10),
  exercises: [{ ...EMPTY_EXERCISE }],
};

export function DayFormModal({ open, onSave, onClose, initialExercise }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(null);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [weightMode, setWeightMode] = useState("total");
  const [barWeight, setBarWeight] = useState("");
  const [plateModalTarget, setPlateModalTarget] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        date: new Date().toISOString().slice(0, 10),
        exercises: [
          {
            ...EMPTY_EXERCISE,
            exercise_name: initialExercise || "",
            sets: [{ ...EMPTY_SET }],
          },
        ],
      });
      setErrors({});
      setWeightMode("total");
      setBarWeight("");
      setPlateModalTarget(null);
    }
  }, [open, initialExercise]);

  if (!open) return null;

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const updateExercise = (eIdx, field, value) => {
    const newExs = [...form.exercises];
    newExs[eIdx] = { ...newExs[eIdx], [field]: value };
    setField("exercises", newExs);
  };

  const moveExercise = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= form.exercises.length) return;
    const newExs = [...form.exercises];
    const [moved] = newExs.splice(fromIdx, 1);
    newExs.splice(toIdx, 0, moved);
    setField("exercises", newExs);
  };

  const addExercise = () => {
    const lastWorkoutType = form.exercises[form.exercises.length - 1]?.workout_type || "push";
    setField("exercises", [
      ...form.exercises,
      {
        workout_type: lastWorkoutType,
        exercise_name: "",
        notes: "",
        sets: [{ ...EMPTY_SET }],
      },
    ]);
  };

  const removeExercise = (eIdx) => {
    if (form.exercises.length <= 1) return;
    const newExs = form.exercises.filter((_, i) => i !== eIdx);
    setField("exercises", newExs);
  };

  const updateSet = (eIdx, sIdx, field, value) => {
    const newExs = [...form.exercises];
    const newSets = [...newExs[eIdx].sets];
    newSets[sIdx] = { ...newSets[sIdx], [field]: value };
    newExs[eIdx] = { ...newExs[eIdx], sets: newSets };
    setField("exercises", newExs);
  };

  const addSet = (eIdx) => {
    const newExs = [...form.exercises];
    const lastSet = newExs[eIdx].sets[newExs[eIdx].sets.length - 1] || EMPTY_SET;
    newExs[eIdx].sets = [
      ...newExs[eIdx].sets,
      { weight: lastSet.weight, reps: lastSet.reps, completed: true },
    ];
    setField("exercises", newExs);
  };

  const handleSelectFromPicker = (selectedEx) => {
    if (pickerActiveIndex !== null && pickerActiveIndex < form.exercises.length) {
      updateExercise(pickerActiveIndex, "exercise_name", selectedEx.name);
      const muscle = (selectedEx.primary_muscles?.[0] || "").toLowerCase();
      if (["chest", "shoulders", "triceps"].includes(muscle)) {
        updateExercise(pickerActiveIndex, "workout_type", "push");
      } else if (["back", "lats", "biceps", "traps", "forearms"].includes(muscle)) {
        updateExercise(pickerActiveIndex, "workout_type", "pull");
      } else if (["quadriceps", "hamstrings", "glutes", "calves"].includes(muscle)) {
        updateExercise(pickerActiveIndex, "workout_type", "legs");
      } else if (["abdominals"].includes(muscle)) {
        updateExercise(pickerActiveIndex, "workout_type", "core");
      }
    }
    setPickerActiveIndex(null);
  };

  const removeSet = (eIdx, sIdx) => {
    const newExs = [...form.exercises];
    if (newExs[eIdx].sets.length <= 1) return;
    newExs[eIdx].sets = newExs[eIdx].sets.filter((_, i) => i !== sIdx);
    setField("exercises", newExs);
  };

  const validate = () => {
    let isValid = true;
    const newErrors = {};

    if (!form.date) {
      newErrors.date = "Date is required.";
      isValid = false;
    }

    if (form.exercises.length === 0) {
      newErrors.general = "Add at least one exercise.";
      isValid = false;
    }

    form.exercises.forEach((ex, eIdx) => {
      if (!ex.exercise_name.trim()) {
        newErrors[`ex_${eIdx}_name`] = "Exercise name required";
        isValid = false;
      }
      if (ex.sets.length === 0) {
        newErrors[`ex_${eIdx}_general`] = "Add at least one set.";
        isValid = false;
      }
      ex.sets.forEach((s, sIdx) => {
        if (!Number.isInteger(s.reps) || s.reps < 1) {
          newErrors[`ex_${eIdx}_s_${sIdx}_reps`] = "Invalid";
          isValid = false;
        }
        if (typeof s.weight !== "number" || Number.isNaN(s.weight) || s.weight < 0) {
          newErrors[`ex_${eIdx}_s_${sIdx}_weight`] = "Invalid";
          isValid = false;
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ ...form, day: form.day || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rf-modal-overlay" onClick={onClose}>
      <div
        className="rf-modal rf-modal--lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rf-modal-handle" />
        <div className="rf-modal-header">
          <div>
            <div className="rf-telemetry-tag" style={{ marginBottom: 2 }}>
              TRAINING SESSION PROTOCOL
            </div>
            <h3 className="rf-modal-title">Log Workout Session</h3>
          </div>
          <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}
        >
          <div className="rf-modal-body">
            {errors.general && (
              <div className="rf-field-error" style={{ marginBottom: 14 }}>
                {errors.general}
              </div>
            )}

            {/* Session Metadata Grid */}
            <div className="rf-form-grid rf-form-grid--2" style={{ gap: 12, marginBottom: 16 }}>
              <div className="rf-field">
                <label className="rf-label" htmlFor="wf-date">
                  Execution Date
                </label>
                <input
                  id="wf-date"
                  type="date"
                  className="rf-input rf-input--compact"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  required
                />
                {errors.date && <span className="rf-field-error">{errors.date}</span>}
              </div>

              <div className="rf-field">
                <label className="rf-label" htmlFor="wf-day">
                  Session Tag / Day Focus
                </label>
                <input
                  id="wf-day"
                  type="text"
                  className="rf-input rf-input--compact"
                  placeholder="e.g. Heavy Push Focus"
                  value={form.day}
                  onChange={(e) => setField("day", e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>

            {/* Exercises Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {form.exercises.map((ex, eIdx) => (
                <div
                  key={eIdx}
                  className="rf-pod"
                  style={{
                    background: "rgba(14, 14, 26, 0.85)",
                    border: "1px solid var(--rf-border-laser)",
                    padding: "14px 14px",
                    position: "relative",
                  }}
                >
                  {/* Exercise Header with Reorder and Delete Controls */}
                  <div className="rf-exercise-card-header">
                    <div className="rf-exercise-card-title-group">
                      <span
                        className="rf-telemetry-tag"
                        style={{ color: "var(--rf-cyan)", fontSize: "0.68rem" }}
                      >
                        MOVEMENT #{String(eIdx + 1).padStart(2, "0")}
                      </span>
                      {ex.exercise_name && (
                        <span className="rf-exercise-card-name-preview">· {ex.exercise_name}</span>
                      )}
                    </div>

                    <div className="rf-exercise-card-actions">
                      <button
                        type="button"
                        onClick={() => {
                          const firstWeight = ex.sets[0]?.weight || 60;
                          setPlateModalTarget({ eIdx, sIdx: 0, initialWeight: firstWeight });
                        }}
                        className="rf-telemetry-tag"
                        style={{
                          background: "rgba(138, 92, 246, 0.12)",
                          border: "1px solid rgba(138, 92, 246, 0.3)",
                          color: "var(--rf-violet)",
                          fontSize: "0.68rem",
                          padding: "3px 8px",
                          cursor: "pointer",
                          borderRadius: "var(--rf-radius-sm)",
                        }}
                        title="Calculate barbell plates for this exercise (Optional)"
                      >
                        🝙 Plate Calc
                      </button>
                      <button
                        type="button"
                        className="rf-icon-btn rf-icon-btn--xs"
                        disabled={eIdx === 0}
                        onClick={() => moveExercise(eIdx, eIdx - 1)}
                        title="Move movement up"
                        aria-label="Move exercise up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="rf-icon-btn rf-icon-btn--xs"
                        disabled={eIdx === form.exercises.length - 1}
                        onClick={() => moveExercise(eIdx, eIdx + 1)}
                        title="Move movement down"
                        aria-label="Move exercise down"
                      >
                        ▼
                      </button>
                      {form.exercises.length > 1 && (
                        <button
                          type="button"
                          className="rf-icon-btn rf-icon-btn--xs rf-icon-btn--danger"
                          onClick={() => removeExercise(eIdx)}
                          title="Remove movement"
                          aria-label="Remove exercise"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Split and Exercise Name Grid */}
                  <div
                    className="rf-form-grid rf-form-grid--2"
                    style={{ gap: 10, marginBottom: 8 }}
                  >
                    <div className="rf-field">
                      <label className="rf-label" style={{ fontSize: "0.72rem" }}>
                        Target Split
                      </label>
                      <select
                        className="rf-select rf-select--compact"
                        value={ex.workout_type}
                        onChange={(e) => updateExercise(eIdx, "workout_type", e.target.value)}
                      >
                        {DAY_WORKOUT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rf-field">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <label className="rf-label" style={{ fontSize: "0.72rem", margin: 0 }}>
                          Exercise Name
                        </label>
                        <button
                          type="button"
                          onClick={() => setPickerActiveIndex(eIdx)}
                          className="rf-telemetry-tag"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--rf-cyan)",
                            cursor: "pointer",
                            fontSize: "0.68rem",
                            padding: "0 2px",
                          }}
                        >
                          ✦ Choose from Library
                        </button>
                      </div>
                      <input
                        type="text"
                        className="rf-input rf-input--compact"
                        placeholder="e.g. Barbell Incline Press"
                        value={ex.exercise_name}
                        onChange={(e) => updateExercise(eIdx, "exercise_name", e.target.value)}
                        required
                      />
                      {errors[`ex_${eIdx}_name`] && (
                        <span className="rf-field-error">{errors[`ex_${eIdx}_name`]}</span>
                      )}
                    </div>
                  </div>

                  {/* Optional Biomechanical Cue */}
                  <div className="rf-field" style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      className="rf-input rf-input--subtle"
                      placeholder="Execution / Tempo Notes (e.g. 3s eccentric, paused) — optional"
                      value={ex.notes}
                      onChange={(e) => updateExercise(eIdx, "notes", e.target.value)}
                    />
                  </div>

                  <div className="rf-weight-entry-controls">
                    <div className="rf-weight-entry-modes" role="group" aria-label="Weight entry mode">
                      <button
                        type="button"
                        className={`rf-weight-mode${weightMode === "total" ? " rf-weight-mode--active" : ""}`}
                        aria-pressed={weightMode === "total"}
                        onClick={() => setWeightMode("total")}
                      >
                        Total Weight (kg)
                      </button>
                      <button
                        type="button"
                        className={`rf-weight-mode${weightMode === "per-side" ? " rf-weight-mode--active" : ""}`}
                        aria-pressed={weightMode === "per-side"}
                        onClick={() => setWeightMode("per-side")}
                      >
                        Plates per side
                      </button>
                    </div>
                    {weightMode === "per-side" && (
                      <div className="rf-bar-weight-control">
                        <label className="rf-label" htmlFor={`bar-weight-${eIdx}`}>
                          Bar weight (kg)
                        </label>
                        <input
                          id={`bar-weight-${eIdx}`}
                          className="rf-input rf-input--compact"
                          type="number"
                          min="0"
                          step="0.5"
                          value={barWeight}
                          onChange={(event) => {
                            const nextBarWeight = event.target.value === "" ? null : Math.max(0, Number(event.target.value));
                            setBarWeight(nextBarWeight);
                          }}
                        />
                        <span className="rf-weight-mode-help">
                          Enter the plates loaded on one side. The bar weight is added separately.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clean Set Table Architecture */}
                  <div className="rf-set-table">
                    <div className="rf-set-table-head">
                      <span className="rf-set-th rf-set-th--idx">SET</span>
                      <span className="rf-set-th rf-set-th--prev">PREV</span>
                      <span className="rf-set-th rf-set-th--weight">
                        {weightMode === "total" ? "KG TOTAL" : "KG / SIDE"}
                      </span>
                      <span className="rf-set-th rf-set-th--reps">REPS</span>
                      <span className="rf-set-th rf-set-th--check">✓</span>
                      <span className="rf-set-th rf-set-th--action"></span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {ex.sets.map((set, sIdx) => {
                        const prevRef =
                          sIdx > 0
                            ? `${ex.sets[sIdx - 1].weight} × ${ex.sets[sIdx - 1].reps}`
                            : "—";
                        return (
                          <div
                            key={sIdx}
                            className={`rf-set-row ${set.completed ? "rf-set-row--done" : ""}`}
                          >
                            {/* Lightweight Set Index */}
                            <div className="rf-set-cell rf-set-cell--idx">
                              <span className="rf-set-num">{sIdx + 1}</span>
                            </div>

                            {/* Previous / Target Reference */}
                            <div className="rf-set-cell rf-set-cell--prev">
                              <span className="rf-set-prev-label">{prevRef}</span>
                            </div>

                            {/* Precision Weight Input with Mousewheel Scroll-over & Cable Plate support */}
                            <div className="rf-set-cell rf-set-cell--weight">
                              <WeightScrollInput
                                value={weightMode === "total" ? set.weight : barWeight === "" ? "" : Math.max(0, (set.weight - Number(barWeight)) / 2)}
                                onChange={(val) =>
                                  updateSet(
                                    eIdx,
                                    sIdx,
                                    "weight",
                                    weightMode === "total" || barWeight === "" ? val : Number(barWeight) + val * 2
                                  )
                                }
                                caption={
                                  weightMode === "total"
                                    ? `${set.weight} kg total`
                                    : `${Math.max(0, (set.weight - (Number(barWeight) || 0)) / 2)} kg/side · ${set.weight} kg total`
                                }
                                ariaLabel={
                                  weightMode === "total"
                                    ? `Set ${sIdx + 1} total weight (kg)`
                                    : `Set ${sIdx + 1} plates per side (kg)`
                                }
                                disabled={weightMode === "per-side" && barWeight === ""}
                              />
                            </div>

                            {/* Minimal Reps Input */}
                            <div className="rf-set-cell rf-set-cell--reps">
                              <input
                                type="number"
                                step="1"
                                min="1"
                                className="rf-set-input"
                                value={set.reps === 0 ? "" : set.reps}
                                placeholder="0"
                                onChange={(e) =>
                                  updateSet(
                                    eIdx,
                                    sIdx,
                                    "reps",
                                    e.target.value === "" ? 0 : Number(e.target.value)
                                  )
                                }
                                aria-label={`Set ${sIdx + 1} reps`}
                              />
                            </div>

                            {/* Low-profile Checkmark (triggers Rest Timer upon set completion) */}
                            <div className="rf-set-cell rf-set-cell--check">
                              <button
                                type="button"
                                className={`rf-set-check-btn ${set.completed ? "rf-set-check-btn--active" : ""}`}
                                onClick={() => {
                                  const nextCompleted = !set.completed;
                                  updateSet(eIdx, sIdx, "completed", nextCompleted);
                                  if (nextCompleted) {
                                    setShowRestTimer(true);
                                  }
                                }}
                                title={set.completed ? "Mark set incomplete" : "Mark completed & start Rest Timer"}
                                aria-label={`Toggle set ${sIdx + 1} completion`}
                              >
                                ✓
                              </button>
                            </div>

                            {/* Delete Set */}
                            <div className="rf-set-cell rf-set-cell--action">
                              {ex.sets.length > 1 ? (
                                <button
                                  type="button"
                                  className="rf-set-delete-btn"
                                  onClick={() => removeSet(eIdx, sIdx)}
                                  title="Remove set"
                                  aria-label={`Remove set ${sIdx + 1}`}
                                >
                                  ✕
                                </button>
                              ) : (
                                <span style={{ width: 26 }} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* + Add Set Action Button */}
                    <button
                      type="button"
                      className="rf-btn rf-btn--ghost rf-add-set-btn"
                      onClick={() => addSet(eIdx)}
                    >
                      + Add Set
                    </button>
                  </div>
                </div>
              ))}

              {/* Explicit + Add Exercise Button */}
              <button
                type="button"
                className="rf-btn rf-btn--ghost rf-add-exercise-btn"
                onClick={addExercise}
              >
                + Add Exercise
              </button>
            </div>
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
              {saving ? "Recording Session…" : "Log Workout Session"}
            </PrimaryButton>
          </div>
        </form>

        <ExercisePickerModal
          open={pickerActiveIndex !== null}
          onSelect={handleSelectFromPicker}
          onClose={() => setPickerActiveIndex(null)}
        />

        <PlateCalculatorModal
          open={plateModalTarget !== null}
          initialWeight={plateModalTarget?.initialWeight}
          onApply={(totalWeight) => {
            if (plateModalTarget) {
              updateSet(plateModalTarget.eIdx, plateModalTarget.sIdx, "weight", totalWeight);
            }
          }}
          onClose={() => setPlateModalTarget(null)}
        />

        {showRestTimer && (
          <RestTimer onClose={() => setShowRestTimer(false)} />
        )}
      </div>
    </div>
  );
}
