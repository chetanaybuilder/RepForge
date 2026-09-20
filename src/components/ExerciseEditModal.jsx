import { useEffect, useState } from "react";
import { DAY_WORKOUT_TYPES } from "./DayFormModal";

const EMPTY_SET = { reps: 10, weight: 0, completed: true };
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
      // Map initial value to form
      setForm({
        workout_type: initialValue.workout_type || "push",
        exercise_name: initialValue.exercise_name || "",
        notes: initialValue.notes || "",
        sets: initialValue.sets && initialValue.sets.length > 0 
          ? initialValue.sets.map(s => ({ ...s }))
          : [{ ...EMPTY_SET }]
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
    setField("sets", [...form.sets, { ...lastSet }]);
  };

  const removeSet = (sIdx) => {
    setField("sets", form.sets.filter((_, i) => i !== sIdx));
  };

  const validate = () => {
    let isValid = true;
    const newErrors = {};

    if (!form.exercise_name.trim()) {
      newErrors.exercise_name = "Required";
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
    <div className="rf-modal-overlay" onClick={onClose} style={{ overflowY: 'auto', padding: '20px' }}>
      <div className="rf-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 600, margin: 'auto' }}>
        <div className="rf-modal-header">
          <h3 className="rf-modal-title">Edit Exercise</h3>
          <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.general && <div className="rf-field-error" style={{marginBottom: 16}}>{errors.general}</div>}
          
          <div className="rf-form-grid">
            <div className="rf-field">
              <label>Workout type</label>
              <select className="rf-select" value={form.workout_type} onChange={(e) => setField("workout_type", e.target.value)}>
                {DAY_WORKOUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="rf-field">
              <label>Exercise Name</label>
              <input type="text" className="rf-input" placeholder="Bench Press" value={form.exercise_name} onChange={(e) => setField("exercise_name", e.target.value)} required />
              {errors.exercise_name && <span className="rf-field-error">{errors.exercise_name}</span>}
            </div>
          </div>
          
          <div className="rf-field" style={{ marginTop: 12 }}>
            <label>Notes</label>
            <input type="text" className="rf-input" placeholder="Optional notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </div>

          <div style={{ marginTop: 16 }}>
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
                {form.sets.map((set, sIdx) => (
                  <tr key={sIdx}>
                    <td style={{ padding: '4px 0' }}>{sIdx + 1}</td>
                    <td style={{ padding: '4px 0' }}>
                      <input type="number" step="0.5" className="rf-input" style={{ width: 80, padding: '4px 8px' }} value={set.weight} onChange={(e) => updateSet(sIdx, "weight", e.target.valueAsNumber)} />
                      {errors[`s_${sIdx}_weight`] && <span className="rf-field-error">{errors[`s_${sIdx}_weight`]}</span>}
                    </td>
                    <td style={{ padding: '4px 0' }}>
                      <input type="number" className="rf-input" style={{ width: 80, padding: '4px 8px' }} value={set.reps} onChange={(e) => updateSet(sIdx, "reps", e.target.valueAsNumber)} />
                      {errors[`s_${sIdx}_reps`] && <span className="rf-field-error">{errors[`s_${sIdx}_reps`]}</span>}
                    </td>
                    <td style={{ padding: '4px 0' }}>
                      <input type="checkbox" checked={set.completed} onChange={(e) => updateSet(sIdx, "completed", e.target.checked)} />
                    </td>
                    <td style={{ padding: '4px 0', textAlign: 'right' }}>
                      <button type="button" className="rf-icon-btn" style={{ color: '#f87171' }} onClick={() => removeSet(sIdx)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="rf-btn rf-btn--ghost rf-btn--sm" style={{ marginTop: 8 }} onClick={addSet}>+ Add Set</button>
          </div>

          <div className="rf-form-actions" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #333' }}>
            <button type="button" className="rf-btn rf-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="rf-btn rf-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
