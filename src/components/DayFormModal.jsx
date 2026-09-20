import { useEffect, useState } from "react";

export const DAY_WORKOUT_TYPES = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "upper", label: "Upper" },
  { value: "lower", label: "Lower" },
  { value: "full_body", label: "Full Body" },
  { value: "cardio", label: "Cardio" },
  { value: "core", label: "Core" },
  { value: "mobility", label: "Mobility" },
  { value: "other", label: "Other" },
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

export function DayFormModal({ open, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Re-initialize with an empty form every time it opens for now,
      // since this modal is only used for "Log a workout (Day)"
      setForm({ ...EMPTY_FORM, exercises: [{ ...EMPTY_EXERCISE, sets: [{ ...EMPTY_SET }] }] });
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

  const addExercise = () => {
    setField("exercises", [...form.exercises, { ...EMPTY_EXERCISE, sets: [{ ...EMPTY_SET }] }]);
  };

  const removeExercise = (eIdx) => {
    const newExs = form.exercises.filter((_, i) => i !== eIdx);
    setField("exercises", newExs);
  };

  const addSet = (eIdx) => {
    const newExs = [...form.exercises];
    // Copy last set values if available
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
        newErrors[`ex_${eIdx}_name`] = "Required";
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
    <div className="rf-modal-overlay" onClick={onClose} style={{ overflowY: 'auto', padding: '20px' }}>
      <div className="rf-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 800, margin: 'auto' }}>
        <div className="rf-modal-header">
          <h3 className="rf-modal-title">Log a Workout Day</h3>
          <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.general && <div className="rf-field-error" style={{marginBottom: 16}}>{errors.general}</div>}
          
          <div className="rf-form-grid">
            <div className="rf-field">
              <label htmlFor="wf-date">Date</label>
              <input id="wf-date" type="date" className="rf-input" value={form.date} onChange={(e) => setField("date", e.target.value)} required />
              {errors.date && <span className="rf-field-error">{errors.date}</span>}
            </div>
            <div className="rf-field">
              <label htmlFor="wf-day">Day label (optional)</label>
              <input id="wf-day" type="text" className="rf-input" placeholder="e.g. Push Day" value={form.day} onChange={(e) => setField("day", e.target.value)} maxLength={50} />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 8 }}>Exercises</h4>
            {form.exercises.map((ex, eIdx) => (
              <div key={eIdx} style={{ background: '#1e1e1e', padding: 16, borderRadius: 8, marginBottom: 16, position: 'relative' }}>
                <button type="button" className="rf-icon-btn" style={{ position: 'absolute', top: 8, right: 8, color: '#f87171' }} onClick={() => removeExercise(eIdx)}>✕</button>
                <div className="rf-form-grid">
                  <div className="rf-field">
                    <label>Workout type</label>
                    <select className="rf-select" value={ex.workout_type} onChange={(e) => updateExercise(eIdx, "workout_type", e.target.value)}>
                      {DAY_WORKOUT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rf-field">
                    <label>Exercise Name</label>
                    <input type="text" className="rf-input" placeholder="Bench Press" value={ex.exercise_name} onChange={(e) => updateExercise(eIdx, "exercise_name", e.target.value)} required />
                    {errors[`ex_${eIdx}_name`] && <span className="rf-field-error">{errors[`ex_${eIdx}_name`]}</span>}
                  </div>
                </div>
                
                <div className="rf-field" style={{ marginTop: 12 }}>
                  <label>Notes</label>
                  <input type="text" className="rf-input" placeholder="Optional notes" value={ex.notes} onChange={(e) => updateExercise(eIdx, "notes", e.target.value)} />
                </div>

                <div style={{ marginTop: 16 }}>
                  {errors[`ex_${eIdx}_general`] && <span className="rf-field-error">{errors[`ex_${eIdx}_general`]}</span>}
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#888', fontSize: '0.85rem' }}>
                        <th style={{ paddingBottom: 8 }}>Set</th>
                        <th style={{ paddingBottom: 8 }}>kg</th>
                        <th style={{ paddingBottom: 8 }}>Reps</th>
                        <th style={{ paddingBottom: 8 }}>✓</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((set, sIdx) => (
                        <tr key={sIdx}>
                          <td style={{ padding: '4px 0' }}>{sIdx + 1}</td>
                          <td style={{ padding: '4px 0' }}>
                            <input type="number" step="0.5" className="rf-input" style={{ width: 80, padding: '4px 8px' }} value={set.weight} onChange={(e) => updateSet(eIdx, sIdx, "weight", e.target.valueAsNumber)} />
                            {errors[`ex_${eIdx}_s_${sIdx}_weight`] && <span className="rf-field-error">{errors[`ex_${eIdx}_s_${sIdx}_weight`]}</span>}
                          </td>
                          <td style={{ padding: '4px 0' }}>
                            <input type="number" className="rf-input" style={{ width: 80, padding: '4px 8px' }} value={set.reps} onChange={(e) => updateSet(eIdx, sIdx, "reps", e.target.valueAsNumber)} />
                            {errors[`ex_${eIdx}_s_${sIdx}_reps`] && <span className="rf-field-error">{errors[`ex_${eIdx}_s_${sIdx}_reps`]}</span>}
                          </td>
                          <td style={{ padding: '4px 0' }}>
                            <input type="checkbox" checked={set.completed} onChange={(e) => updateSet(eIdx, sIdx, "completed", e.target.checked)} />
                          </td>
                          <td style={{ padding: '4px 0', textAlign: 'right' }}>
                            <button type="button" className="rf-icon-btn" style={{ color: '#f87171' }} onClick={() => removeSet(eIdx, sIdx)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" className="rf-btn rf-btn--ghost rf-btn--sm" style={{ marginTop: 8 }} onClick={() => addSet(eIdx)}>+ Add Set</button>
                </div>
              </div>
            ))}
            <button type="button" className="rf-btn rf-btn--ghost" style={{ width: '100%' }} onClick={addExercise}>+ Add Exercise</button>
          </div>

          <div className="rf-form-actions" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #333' }}>
            <button type="button" className="rf-btn rf-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="rf-btn rf-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save Day"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
