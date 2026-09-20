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

  const addSet = () => {
    const lastSet = form.sets[form.sets.length - 1] || EMPTY_SET;
    setField("sets", [
      ...form.sets,
      { weight: lastSet.weight, reps: lastSet.reps, completed: true },
    ]);
  };

  const removeSet = (sIdx) => {
    if (form.sets.length <= 1) return;
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
              <div className="rf-field-error" style={{ marginBottom: 14 }}>
                {errors.general}
              </div>
            )}

            <div className="rf-form-grid rf-form-grid--2" style={{ gap: 10, marginBottom: 8 }}>
              <div className="rf-field">
                <label className="rf-label" style={{ fontSize: "0.72rem" }}>Target Split</label>
                <select
                  className="rf-select rf-select--compact"
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
                <label className="rf-label" style={{ fontSize: "0.72rem" }}>Exercise Name</label>
                <input
                  type="text"
                  className="rf-input rf-input--compact"
                  value={form.exercise_name}
                  onChange={(e) => setField("exercise_name", e.target.value)}
                  required
                />
                {errors.exercise_name && (
                  <span className="rf-field-error">{errors.exercise_name}</span>
                )}
              </div>
            </div>

            <div className="rf-field" style={{ marginBottom: 14 }}>
              <input
                type="text"
                className="rf-input rf-input--subtle"
                placeholder="Execution / Tempo Notes (e.g. 3s eccentric, paused) — optional"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>

            {/* Clean Set Table Architecture */}
            <div className="rf-set-table">
              <div className="rf-set-table-head">
                <span className="rf-set-th rf-set-th--idx">SET</span>
                <span className="rf-set-th rf-set-th--prev">PREV</span>
                <span className="rf-set-th rf-set-th--weight">KG</span>
                <span className="rf-set-th rf-set-th--reps">REPS</span>
                <span className="rf-set-th rf-set-th--check">✓</span>
                <span className="rf-set-th rf-set-th--action"></span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {form.sets.map((set, sIdx) => {
                  const prevRef = sIdx > 0 ? `${form.sets[sIdx - 1].weight} × ${form.sets[sIdx - 1].reps}` : "—";
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

                      {/* Minimal Weight Input */}
                      <div className="rf-set-cell rf-set-cell--weight">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          className="rf-set-input"
                          value={set.weight === 0 ? "" : set.weight}
                          placeholder="0"
                          onChange={(e) =>
                            updateSet(sIdx, "weight", e.target.value === "" ? 0 : Number(e.target.value))
                          }
                          aria-label={`Set ${sIdx + 1} weight (kg)`}
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
                            updateSet(sIdx, "reps", e.target.value === "" ? 0 : Number(e.target.value))
                          }
                          aria-label={`Set ${sIdx + 1} reps`}
                        />
                      </div>

                      {/* Low-profile Checkmark */}
                      <div className="rf-set-cell rf-set-cell--check">
                        <button
                          type="button"
                          className={`rf-set-check-btn ${set.completed ? "rf-set-check-btn--active" : ""}`}
                          onClick={() => updateSet(sIdx, "completed", !set.completed)}
                          title={set.completed ? "Mark set incomplete" : "Mark set completed"}
                          aria-label={`Toggle set ${sIdx + 1} completion`}
                        >
                          ✓
                        </button>
                      </div>

                      {/* Delete Set */}
                      <div className="rf-set-cell rf-set-cell--action">
                        {form.sets.length > 1 ? (
                          <button
                            type="button"
                            className="rf-set-delete-btn"
                            onClick={() => removeSet(sIdx)}
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
