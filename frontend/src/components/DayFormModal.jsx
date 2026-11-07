/**
 * frontend\src\components\DayFormModal.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PrimaryButton } from "./PrimaryButton";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { WeightScrollInput } from "./WeightScrollInput";
import { RestTimer, unlockAudio } from "./RestTimer";
import { useModalBodyLock } from "../hooks/useModalBodyLock";
import { toLocalISODate, safeFormatDate, isValidLocalDate } from "../utils/date";

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

const EMPTY_SET = { reps: 10, weight: 0, completed: false };
const EMPTY_EXERCISE = {
  workout_type: "push",
  exercise_name: "",
  notes: "",
  sets: [{ ...EMPTY_SET }],
};

const EMPTY_FORM = {
  day: "",
  date: "",
  exercises: [{ ...EMPTY_EXERCISE }],
};
let nextEditorId = 1;
const createEditorId = (prefix) => `${prefix}-${nextEditorId++}`;

export function DayFormModal({ open, onSave, onClose, initialExercise, initialDay = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(null);
  const [showRestTimer, setShowRestTimer] = useState(false);

  useModalBodyLock(open);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (pickerActiveIndex !== null) {
        setPickerActiveIndex(null);
      } else if (showRestTimer) {
        setShowRestTimer(false);
      } else {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, showRestTimer, pickerActiveIndex, onClose]);

  useEffect(() => {
    if (!open) return;

    const today = toLocalISODate();
    setForm(
      initialDay
        ? {
            day: initialDay.day || "",
            date: safeFormatDate(initialDay.date) || today,
            exercises: initialDay.exercises.map((exercise) => ({
              _id: createEditorId("exercise"),
              workout_type: exercise.workout_type || "other",
              exercise_name: exercise.exercise_name || "",
              notes: exercise.notes || "",
              sets: exercise.sets.map((set) => ({
                _id: createEditorId("set"),
                reps: Number(set.reps),
                weight: Number(set.weight ?? set.weight_kg ?? 0),
                completed: Boolean(set.completed),
              })),
            })),
          }
        : {
            ...EMPTY_FORM,
            date: today,
            exercises: [
              {
                ...EMPTY_EXERCISE,
                _id: createEditorId("exercise"),
                exercise_name: initialExercise || "",
                sets: [{ ...EMPTY_SET, _id: createEditorId("set") }],
              },
            ],
          }
    );
    setErrors({});
  }, [open, initialExercise, initialDay]);

  if (!open) return null;

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addExercise = () => {
    const lastWorkoutType = form.exercises[form.exercises.length - 1]?.workout_type || "push";
    const nextIndex = form.exercises.length;
    const nextExercises = [
      ...form.exercises,
      {
        _id: createEditorId("exercise"),
        workout_type: lastWorkoutType,
        exercise_name: "",
        notes: "",
        sets: [{ ...EMPTY_SET, _id: createEditorId("set") }],
      },
    ];

    setField("exercises", nextExercises);

    setTimeout(() => {
      const card = document.querySelector(`[data-exercise-index="${nextIndex}"]`);
      card?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }, 0);
  };

  const updateExercise = (eIdx, field, value) => {
    const nextExercises = [...form.exercises];
    nextExercises[eIdx] = { ...nextExercises[eIdx], [field]: value };
    setField("exercises", nextExercises);
  };

  const moveExercise = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= form.exercises.length) return;
    const nextExercises = [...form.exercises];
    const [moved] = nextExercises.splice(fromIdx, 1);
    nextExercises.splice(toIdx, 0, moved);
    setField("exercises", nextExercises);
  };

  const addSet = (eIdx) => {
    setForm((current) => {
      const exercise = current.exercises[eIdx];
      if (!exercise) return current;
      const lastSet = exercise.sets[exercise.sets.length - 1] || EMPTY_SET;
      const exercises = [...current.exercises];
      exercises[eIdx] = {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            _id: createEditorId("set"),
            weight: lastSet.weight,
            reps: lastSet.reps,
            completed: false,
          },
        ],
      };
      return { ...current, exercises };
    });
  };

  const updateSet = (eIdx, sIdx, field, value) => {
    const nextExercises = [...form.exercises];
    const nextSets = [...nextExercises[eIdx].sets];
    nextSets[sIdx] = { ...nextSets[sIdx], [field]: value };
    nextExercises[eIdx] = { ...nextExercises[eIdx], sets: nextSets };
    setField("exercises", nextExercises);
  };

  const removeExercise = (eIdx) => {
    if (form.exercises.length <= 1) return;
    const nextExercises = form.exercises.filter((_, idx) => idx !== eIdx);
    setField("exercises", nextExercises);
  };

  const removeSet = (eIdx, sIdx) => {
    setForm((current) => {
      const exercise = current.exercises[eIdx];
      if (!exercise || exercise.sets.length <= 1) return current;
      const exercises = [...current.exercises];
      exercises[eIdx] = { ...exercise, sets: exercise.sets.filter((_, idx) => idx !== sIdx) };
      return { ...current, exercises };
    });
  };

  const handleSelectFromPicker = (selectedEx) => {
    if (pickerActiveIndex !== null) {
      const muscle = (selectedEx.primary_muscles?.[0] || "").toLowerCase();
      const mappedType = ["chest", "shoulders", "triceps"].includes(muscle)
        ? "push"
        : ["back", "lats", "middle back", "lower back", "biceps", "traps", "forearms"].includes(
              muscle
            )
          ? "pull"
          : ["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"].includes(
                muscle
              )
            ? "legs"
            : muscle === "abdominals"
              ? "core"
              : null;
      setForm((current) => {
        if (pickerActiveIndex < 0 || pickerActiveIndex >= current.exercises.length) return current;
        const exercises = [...current.exercises];
        exercises[pickerActiveIndex] = {
          ...exercises[pickerActiveIndex],
          exercise_name: selectedEx.name,
          ...(mappedType ? { workout_type: mappedType } : {}),
        };
        return { ...current, exercises };
      });
    }
    setPickerActiveIndex(null);
  };

  const validate = () => {
    const nextErrors = {};
    let isValid = true;

    if (!form.date) {
      nextErrors.date = "Date is required.";
      isValid = false;
    } else if (!isValidLocalDate(form.date)) {
      nextErrors.date = "Enter a valid date.";
      isValid = false;
    }

    if (form.exercises.length === 0) {
      nextErrors.general = "Add at least one exercise.";
      isValid = false;
    }

    form.exercises.forEach((exercise, eIdx) => {
      if (!exercise.exercise_name.trim()) {
        nextErrors[`ex_${eIdx}_name`] = "Exercise name required";
        isValid = false;
      }
      if (exercise.sets.length === 0) {
        nextErrors[`ex_${eIdx}_general`] = "Add at least one set.";
        isValid = false;
      }

      exercise.sets.forEach((set, sIdx) => {
        if (!Number.isInteger(set.reps) || set.reps < 1) {
          nextErrors[`ex_${eIdx}_s_${sIdx}_reps`] = "Invalid";
          isValid = false;
        }
        if (
          typeof set.weight !== "number" ||
          !Number.isFinite(set.weight) ||
          set.weight < 0 ||
          set.weight > 1000
        ) {
          nextErrors[`ex_${eIdx}_s_${sIdx}_weight`] = "Invalid";
          isValid = false;
        }
      });
    });

    setErrors(nextErrors);
    return isValid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        day: form.day || null,
        date: form.date,
        exercises: form.exercises.map((exercise) => ({
          exercise_name: exercise.exercise_name,
          workout_type: exercise.workout_type,
          notes: exercise.notes,
          sets: exercise.sets.map((set) => ({
            reps: set.reps,
            weight: set.weight,
            completed: Boolean(set.completed),
          })),
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="rf-modal-overlay rf-modal-overlay--sheet" onClick={onClose}>
      <div
        className="rf-modal rf-modal--lg rf-day-form-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rf-modal-handle" />

        <div className="rf-modal-header">
          <div>
            <div className="rf-telemetry-tag rf-day-form-kicker">
              {initialDay ? "EDIT SAVED SESSION" : "TRAINING SESSION PROTOCOL"}
            </div>
            <h3 className="rf-modal-title">
              {initialDay ? "Edit Workout Session" : "Log Workout Session"}
            </h3>
          </div>
          <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form id="day-form" noValidate onSubmit={handleSubmit} className="rf-day-form">
          <div className="rf-modal-body">
            {errors.general && (
              <div className="rf-field-error rf-day-form-error">{errors.general}</div>
            )}

            <div className="rf-form-grid rf-form-grid--2 rf-day-form-grid">
              <div className="rf-field">
                <label className="rf-label" htmlFor="wf-date">
                  Execution Date
                </label>
                <input
                  id="wf-date"
                  type="date"
                  className="rf-input rf-input--compact"
                  value={form.date}
                  onChange={(event) => setField("date", event.target.value)}
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
                  onChange={(event) => setField("day", event.target.value)}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="rf-workout-exercise-list">
              {form.exercises.map((exercise, eIdx) => (
                <div
                  key={exercise._id || eIdx}
                  data-exercise-index={eIdx}
                  className="rf-pod rf-workout-exercise-card rf-day-form-exercise-card"
                >
                  <div className="rf-exercise-card-header">
                    <div className="rf-exercise-card-title-group">
                      <span className="rf-telemetry-tag rf-day-form-movement">
                        MOVEMENT #{String(eIdx + 1).padStart(2, "0")}
                      </span>
                      {exercise.exercise_name && (
                        <span className="rf-exercise-card-name-preview">
                          · {exercise.exercise_name}
                        </span>
                      )}
                    </div>

                    <div className="rf-exercise-card-actions">
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

                  <div className="rf-form-grid rf-form-grid--2 rf-day-form-compact-grid">
                    <div className="rf-field">
                      <label className="rf-label rf-day-form-compact-label">Target Split</label>
                      <select
                        className="rf-select rf-select--compact"
                        value={exercise.workout_type}
                        onChange={(event) =>
                          updateExercise(eIdx, "workout_type", event.target.value)
                        }
                      >
                        {DAY_WORKOUT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rf-field">
                      <div className="rf-day-form-name-header">
                        <label className="rf-label rf-day-form-compact-label rf-day-form-name-label">
                          Exercise Name
                        </label>
                        <button
                          type="button"
                          onClick={() => setPickerActiveIndex(eIdx)}
                          className="rf-telemetry-tag rf-day-form-picker-button"
                        >
                          ✦ Choose from Library
                        </button>
                      </div>
                      <input
                        type="text"
                        className="rf-input rf-input--compact"
                        placeholder={eIdx === 0 ? "Enter first exercise" : "Enter another exercise"}
                        aria-label={`Exercise ${eIdx + 1} name`}
                        value={exercise.exercise_name}
                        onChange={(event) =>
                          updateExercise(eIdx, "exercise_name", event.target.value)
                        }
                        required
                      />
                      {errors[`ex_${eIdx}_name`] && (
                        <span className="rf-field-error">{errors[`ex_${eIdx}_name`]}</span>
                      )}
                    </div>
                  </div>

                  <div className="rf-field rf-day-form-notes-field">
                    <input
                      type="text"
                      className="rf-input rf-input--subtle"
                      placeholder="Execution / Tempo Notes (e.g. 3s eccentric, paused) — optional"
                      value={exercise.notes}
                      onChange={(event) => updateExercise(eIdx, "notes", event.target.value)}
                    />
                  </div>

                  <div className="rf-set-table">
                    <div className="rf-set-table-head">
                      <span className="rf-set-th rf-set-th--idx">SET</span>
                      <span className="rf-set-th rf-set-th--weight">WEIGHT (KG)</span>
                      <span className="rf-set-th rf-set-th--reps">REPS</span>
                      <span className="rf-set-th rf-set-th--check" aria-label="Complete">
                        ✓
                      </span>
                    </div>

                    <div className="rf-day-form-set-list">
                      {exercise.sets.map((set, sIdx) => (
                        <div
                          key={set._id || sIdx}
                          className={`rf-set-row ${set.completed ? "rf-set-row--done" : ""}`}
                        >
                          <div className="rf-set-cell rf-set-cell--idx">
                            <span className="rf-set-num">{sIdx + 1}</span>
                          </div>

                          <div className="rf-set-cell rf-set-cell--weight">
                            <WeightScrollInput
                              value={set.weight}
                              onChange={(value) => updateSet(eIdx, sIdx, "weight", value)}
                              ariaLabel={`Set ${sIdx + 1} weight (kg)`}
                            />
                          </div>

                          <div className="rf-set-cell rf-set-cell--reps">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              max="1000"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="rf-set-input"
                              value={set.reps === 0 ? "" : set.reps}
                              placeholder="0"
                              onChange={(event) =>
                                updateSet(
                                  eIdx,
                                  sIdx,
                                  "reps",
                                  event.target.value === "" ? 0 : Number(event.target.value)
                                )
                              }
                              aria-label={`Set ${sIdx + 1} reps`}
                            />
                          </div>

                          <div className="rf-set-cell rf-set-cell--actions">
                            <button
                              type="button"
                              className={`rf-set-check-btn ${set.completed ? "rf-set-check-btn--active" : ""}`}
                              onClick={() => {
                                const nextCompleted = !set.completed;
                                updateSet(eIdx, sIdx, "completed", nextCompleted);
                                if (nextCompleted) {
                                  unlockAudio();
                                  setShowRestTimer(true);
                                }
                              }}
                              title={
                                set.completed
                                  ? "Mark set incomplete"
                                  : "Mark completed & start Rest Timer"
                              }
                              aria-label={`Toggle set ${sIdx + 1} completion`}
                            >
                              ✓
                            </button>
                            {exercise.sets.length > 1 ? (
                              <button
                                type="button"
                                className="rf-set-delete-btn"
                                onClick={() => removeSet(eIdx, sIdx)}
                                title="Remove set"
                                aria-label={`Remove set ${sIdx + 1}`}
                              >
                                ✕
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

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
            <PrimaryButton type="submit" form="day-form" disabled={saving}>
              {saving
                ? initialDay
                  ? "Saving Session…"
                  : "Recording Session…"
                : initialDay
                  ? "Save Changes"
                  : "Save Session"}
            </PrimaryButton>
          </div>
        </form>

        <ExercisePickerModal
          open={pickerActiveIndex !== null}
          onSelect={handleSelectFromPicker}
          onClose={() => setPickerActiveIndex(null)}
        />

        {showRestTimer && (
          <RestTimer bottomOffset={88} defaultMinimized onClose={() => setShowRestTimer(false)} />
        )}
      </div>
    </div>,
    document.body
  );
}
