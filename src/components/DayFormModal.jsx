import { useEffect, useState } from "react";
import { PrimaryButton } from "./PrimaryButton";

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

const EMPTY_SET = { reps: 10, weight: 60, completed: true };
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

export function DayFormModal({ open, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        date: new Date().toISOString().slice(0, 10),
        exercises: [{ ...EMPTY_EXERCISE, sets: [{ ...EMPTY_SET }] }],
      });
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const updateExercise = (eIdx, field, value) => {
    const newExs = [...form.exercises];
    newExs[eIdx] = { ...newExs[eIdx], [field]: value };
    setField("exercises", newExs);
  };

  const updateSet = (eIdx, sIdx, field, value) => {
    const newExs = [...form.exercises];
    const newSets = [...newExs[eIdx].sets];
    newSets[sIdx] = { ...newSets[sIdx], [field]: value };
    newExs[eIdx] = { ...newExs[eIdx], sets: newSets };
    setField("exercises", newExs);
  };

  const adjustSetNumeric = (eIdx, sIdx, field, delta) => {
    const current = form.exercises[eIdx].sets[sIdx][field] || 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    updateSet(eIdx, sIdx, field, next);
  };

  const addExercise = () => {
    setField("exercises", [
      ...form.exercises,
      { ...EMPTY_EXERCISE, sets: [{ ...EMPTY_SET }] },
    ]);
  };

  const removeExercise = (eIdx) => {
    const newExs = form.exercises.filter((_, i) => i !== eIdx);
    setField("exercises", newExs);
  };

  const addSet = (eIdx) => {
    const newExs = [...form.exercises];
    const lastSet = newExs[eIdx].sets[newExs[eIdx].sets.length - 1] || EMPTY_SET;
    newExs[eIdx].sets = [...newExs[eIdx].sets, { ...lastSet }];
    setField("exercises", newExs);
  };

  const removeSet = (eIdx, sIdx) => {
    const newExs = [...form.exercises];
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
            <h3 className="rf-modal-title">Log Workout Day</h3>
          </div>
          <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="rf-modal-body">
            {errors.general && (
              <div className="rf-field-error" style={{ marginBottom: 16 }}>
                {errors.general}
              </div>
            )}

            {/* Session Metadata Grid */}
            <div className="rf-form-grid rf-form-grid--2" style={{ marginBottom: 20 }}>
              <div className="rf-field">
                <label className="rf-label" htmlFor="wf-date">
                  Execution Date
                </label>
                <input
                  id="wf-date"
                  type="date"
                  className="rf-input"
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
                  className="rf-input"
                  placeholder="e.g. Heavy Push Focus"
                  value={form.day}
                  onChange={(e) => setField("day", e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>

            {/* Exercises List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {form.exercises.map((ex, eIdx) => (
                <div
                  key={eIdx}
                  className="rf-pod"
                  style={{
                    background: "rgba(16, 16, 30, 0.8)",
                    border: "1px solid var(--rf-border-laser)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)" }}>
                      MOVEMENT #{String(eIdx + 1).padStart(2, "0")}
                    </div>
                    {form.exercises.length > 1 && (
                      <button
                        type="button"
                        className="rf-icon-btn"
                        style={{ color: "var(--rf-ember)" }}
                        onClick={() => removeExercise(eIdx)}
                        aria-label="Remove Movement"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="rf-form-grid rf-form-grid--2">
                    <div className="rf-field">
                      <label className="rf-label">Target Split</label>
                      <select
                        className="rf-select"
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
                      <label className="rf-label">Exercise Name</label>
                      <input
                        type="text"
                        className="rf-input"
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

                  <div className="rf-field" style={{ marginTop: 12 }}>
                    <label className="rf-label">Biomechanical / Tempo Notes (Optional)</label>
                    <input
                      type="text"
                      className="rf-input"
                      placeholder="e.g. 3s eccentric, paused at chest"
                      value={ex.notes}
                      onChange={(e) => updateExercise(eIdx, "notes", e.target.value)}
                    />
                  </div>

                  {/* Set Cards (Mobile-first Thumb Controls) */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span className="rf-label">Sets Telemetry</span>
                      <span style={{ fontSize: "0.74rem", color: "var(--rf-text-faint)", fontFamily: "var(--rf-font-mono)" }}>
                        {ex.sets.length} SETS PLANNED
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {ex.sets.map((set, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            background: set.completed ? "rgba(0, 245, 160, 0.04)" : "rgba(10, 10, 20, 0.6)",
                            border: set.completed ? "1px solid rgba(0, 245, 160, 0.3)" : "1px solid var(--rf-border-subtle)",
                            borderRadius: "var(--rf-radius-md)",
                            padding: "10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                style={{
                                  fontFamily: "var(--rf-font-mono)",
                                  fontWeight: 800,
                                  fontSize: "0.85rem",
                                  color: "var(--rf-text-faint)",
                                }}
                              >
                                S{sIdx + 1}
                              </span>
                              <button
                                type="button"
                                className={`rf-check-pill ${set.completed ? "rf-check-pill--checked" : ""}`}
                                onClick={() => updateSet(eIdx, sIdx, "completed", !set.completed)}
                                title="Toggle set completion"
                              >
                                {set.completed ? "✓" : "○"}
                              </button>
                              <span style={{ fontSize: "0.78rem", color: set.completed ? "var(--rf-emerald)" : "var(--rf-text-faint)", fontWeight: 600 }}>
                                {set.completed ? "Completed" : "Pending"}
                              </span>
                            </div>

                            {ex.sets.length > 1 && (
                              <button
                                type="button"
                                className="rf-icon-btn"
                                style={{ color: "var(--rf-ember)", width: 32, height: 32 }}
                                onClick={() => removeSet(eIdx, sIdx)}
                                aria-label="Remove Set"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Steppers for KG and Reps */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                            }}
                          >
                            {/* Weight Stepper */}
                            <div>
                              <div style={{ fontSize: "0.72rem", color: "var(--rf-text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                                Weight (kg)
                              </div>
                              <div className="rf-stepper-control">
                                <button
                                  type="button"
                                  className="rf-stepper-btn"
                                  onClick={() => adjustSetNumeric(eIdx, sIdx, "weight", -2.5)}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  className="rf-stepper-value"
                                  value={set.weight}
                                  onChange={(e) => updateSet(eIdx, sIdx, "weight", e.target.valueAsNumber || 0)}
                                />
                                <button
                                  type="button"
                                  className="rf-stepper-btn"
                                  onClick={() => adjustSetNumeric(eIdx, sIdx, "weight", 2.5)}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Reps Stepper */}
                            <div>
                              <div style={{ fontSize: "0.72rem", color: "var(--rf-text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                                Reps
                              </div>
                              <div className="rf-stepper-control">
                                <button
                                  type="button"
                                  className="rf-stepper-btn"
                                  onClick={() => adjustSetNumeric(eIdx, sIdx, "reps", -1)}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  className="rf-stepper-value"
                                  value={set.reps}
                                  onChange={(e) => updateSet(eIdx, sIdx, "reps", e.target.valueAsNumber || 0)}
                                />
                                <button
                                  type="button"
                                  className="rf-stepper-btn"
                                  onClick={() => adjustSetNumeric(eIdx, sIdx, "reps", 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="rf-btn rf-btn--ghost rf-btn--sm"
                      style={{ marginTop: 10, width: "100%" }}
                      onClick={() => addSet(eIdx)}
                    >
                      + Add Set
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="rf-btn rf-btn--ghost"
                style={{ width: "100%", borderStyle: "dashed" }}
                onClick={addExercise}
              >
                + Add Another Movement
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
              {saving ? "Synthesizing Session…" : "Log Session"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
