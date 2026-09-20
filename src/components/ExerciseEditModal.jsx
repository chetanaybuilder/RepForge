import { useEffect, useState } from "react";
import { DAY_WORKOUT_TYPES } from "./DayFormModal";
import { PrimaryButton } from "./PrimaryButton";

const EMPTY_SET = { reps: 10, weight: 60, completed: true };
const EMPTY_EXERCISE = {
  workout_type: "push",
  exercise_name: "",
  notes: "",
  sets: [{ ...EMPTY_SET }],
};

export function ExerciseEditModal({ open, initialValue, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_EXERCISE);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && initialValue) {
      setForm({
        workout_type: initialValue.workout_type || "push",
        exercise_name: initialValue.exercise_name || "",
        notes: initialValue.notes || "",
        sets:
          initialValue.sets && initialValue.sets.length > 0
            ? initialValue.sets.map((s) => ({ ...s }))
            : [{ ...EMPTY_SET }],
      });
      setErrors({});
    }
  }, [open, initialValue]);

  if (!open) return null;

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const updateSet = (sIdx, field, value) => {
    const newSets = [...form.sets];
    newSets[sIdx] = { ...newSets[sIdx], [field]: value };
    setField("sets", newSets);
  };

  const adjustSetNumeric = (sIdx, field, delta) => {
    const current = form.sets[sIdx][field] || 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    updateSet(sIdx, field, next);
  };

  const addSet = () => {
    const lastSet = form.sets[form.sets.length - 1] || EMPTY_SET;
    setField("sets", [...form.sets, { ...lastSet }]);
  };

  const removeSet = (sIdx) => {
    setField(
      "sets",
      form.sets.filter((_, i) => i !== sIdx)
    );
  };

  const validate = () => {
    let isValid = true;
    const newErrors = {};

    if (!form.exercise_name.trim()) {
      newErrors.exercise_name = "Exercise name is required";
      isValid = false;
    }

    if (form.sets.length === 0) {
      newErrors.general = "Add at least one set.";
      isValid = false;
    }

    form.sets.forEach((s, sIdx) => {
      if (!Number.isInteger(s.reps) || s.reps < 1) {
        newErrors[`s_${sIdx}_reps`] = "Invalid";
        isValid = false;
      }
      if (typeof s.weight !== "number" || Number.isNaN(s.weight) || s.weight < 0) {
        newErrors[`s_${sIdx}_weight`] = "Invalid";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ ...form });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rf-modal-overlay" onClick={onClose}>
      <div
        className="rf-modal rf-modal--md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rf-modal-handle" />
        <div className="rf-modal-header">
          <div>
            <div className="rf-telemetry-tag" style={{ marginBottom: 2 }}>
              TACTICAL MOVEMENT OVERRIDE
            </div>
            <h3 className="rf-modal-title">Edit Movement & Sets</h3>
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

            <div className="rf-form-grid rf-form-grid--2">
              <div className="rf-field">
                <label className="rf-label">Target Split</label>
                <select
                  className="rf-select"
                  value={form.workout_type}
                  onChange={(e) => setField("workout_type", e.target.value)}
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
                  value={form.exercise_name}
                  onChange={(e) => setField("exercise_name", e.target.value)}
                  required
                />
                {errors.exercise_name && (
                  <span className="rf-field-error">{errors.exercise_name}</span>
                )}
              </div>
            </div>

            <div className="rf-field" style={{ marginTop: 14 }}>
              <label className="rf-label">Notes & Execution Cues</label>
              <input
                type="text"
                className="rf-input"
                placeholder="Optional movement cues"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>

            {/* Set Steppers */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="rf-label">Recorded Sets</span>
                <span style={{ fontSize: "0.74rem", color: "var(--rf-text-faint)", fontFamily: "var(--rf-font-mono)" }}>
                  {form.sets.length} SETS TOTAL
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {form.sets.map((set, sIdx) => (
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
                          onClick={() => updateSet(sIdx, "completed", !set.completed)}
                          title="Toggle set completion"
                        >
                          {set.completed ? "✓" : "○"}
                        </button>
                        <span style={{ fontSize: "0.78rem", color: set.completed ? "var(--rf-emerald)" : "var(--rf-text-faint)", fontWeight: 600 }}>
                          {set.completed ? "Completed" : "Pending"}
                        </span>
                      </div>

                      {form.sets.length > 1 && (
                        <button
                          type="button"
                          className="rf-icon-btn"
                          style={{ color: "var(--rf-ember)", width: 32, height: 32 }}
                          onClick={() => removeSet(sIdx)}
                          aria-label="Remove Set"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: "0.72rem", color: "var(--rf-text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                          Weight (kg)
                        </div>
                        <div className="rf-stepper-control">
                          <button
                            type="button"
                            className="rf-stepper-btn"
                            onClick={() => adjustSetNumeric(sIdx, "weight", -2.5)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="rf-stepper-value"
                            value={set.weight}
                            onChange={(e) => updateSet(sIdx, "weight", e.target.valueAsNumber || 0)}
                          />
                          <button
                            type="button"
                            className="rf-stepper-btn"
                            onClick={() => adjustSetNumeric(sIdx, "weight", 2.5)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: "0.72rem", color: "var(--rf-text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                          Reps
                        </div>
                        <div className="rf-stepper-control">
                          <button
                            type="button"
                            className="rf-stepper-btn"
                            onClick={() => adjustSetNumeric(sIdx, "reps", -1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            className="rf-stepper-value"
                            value={set.reps}
                            onChange={(e) => updateSet(sIdx, "reps", e.target.valueAsNumber || 0)}
                          />
                          <button
                            type="button"
                            className="rf-stepper-btn"
                            onClick={() => adjustSetNumeric(sIdx, "reps", 1)}
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
                onClick={addSet}
              >
                + Add Set
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
              {saving ? "Updating Movement…" : "Save Changes"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
