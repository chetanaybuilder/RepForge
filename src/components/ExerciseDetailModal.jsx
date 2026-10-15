/**
 * RepForge - Exercise Detail Modal
 *
 * Responsibilities:
 * - High-fidelity 3D glass modal displaying multi-angle biomechanical images.
 * - Displays primary & secondary targeted muscle groups, equipment, category, force, level.
 * - Numbered step-by-step instructions.
 * - Favorite bookmarking with instant optimistic update.
 * - Direct "+ Add to Workout" action to start logging sets.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getExerciseImageUrl } from "../services/api";
import { PrimaryButton } from "./PrimaryButton";

export function ExerciseDetailModal({ exercise, open, onClose, onToggleFavorite }) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const navigate = useNavigate();

  if (!open || !exercise) return null;

  const images = Array.isArray(exercise.images) ? exercise.images : [];
  const primaryMuscles = Array.isArray(exercise.primary_muscles) ? exercise.primary_muscles : [];
  const secondaryMuscles = Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : [];
  const instructions = Array.isArray(exercise.instructions) ? exercise.instructions : [];

  const handleAddToWorkout = () => {
    onClose();
    navigate(`/workouts?add_exercise=${encodeURIComponent(exercise.name)}`);
  };

  return (
    <div
      className="rf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-detail-title"
    >
      <div
        className="rf-modal rf-modal--lg"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {exercise.category && (
                <span className="rf-badge rf-badge--cyan" style={{ textTransform: "uppercase" }}>
                  {exercise.category}
                </span>
              )}
              {exercise.level && (
                <span className="rf-badge rf-badge--ember" style={{ textTransform: "uppercase" }}>
                  {exercise.level}
                </span>
              )}
              {exercise.equipment && (
                <span className="rf-badge rf-badge--violet" style={{ textTransform: "uppercase" }}>
                  {exercise.equipment}
                </span>
              )}
            </div>
            <h2
              id="exercise-detail-title"
              style={{
                margin: 0,
                fontSize: "clamp(1.2rem, 1.1rem + 0.8vw, 1.8rem)",
                fontFamily: "var(--rf-font-display)",
                color: "var(--rf-text-pure)",
              }}
            >
              {exercise.name}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="rf-icon-btn"
              onClick={() => onToggleFavorite && onToggleFavorite(exercise.id)}
              aria-label={exercise.is_favorite ? "Remove from favorites" : "Add to favorites"}
              style={{
                color: exercise.is_favorite ? "var(--rf-ember)" : "var(--rf-text-sub)",
                fontSize: "1.2rem",
              }}
            >
              {exercise.is_favorite ? "★" : "☆"}
            </button>
            <button
              type="button"
              className="rf-icon-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Biomechanical Images Display */}
        {images.length > 0 && (
          <div
            style={{
              background: "rgba(10, 10, 20, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "var(--rf-radius-md)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Main Stage Image */}
            <div
              style={{
                width: "100%",
                maxHeight: 280,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                borderRadius: "var(--rf-radius-sm)",
              }}
            >
              <img
                src={getExerciseImageUrl(images[activeImageIdx])}
                alt={`${exercise.name} - phase ${activeImageIdx + 1}`}
                loading="lazy"
                style={{
                  maxHeight: 280,
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: "var(--rf-radius-sm)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                }}
              />
            </div>

            {/* Phase Selector Tabs */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 10 }}>
                {images.map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className="rf-badge"
                    style={{
                      cursor: "pointer",
                      background:
                        activeImageIdx === idx
                          ? "rgba(0, 242, 254, 0.25)"
                          : "rgba(255, 255, 255, 0.05)",
                      borderColor:
                        activeImageIdx === idx
                          ? "var(--rf-cyan)"
                          : "rgba(255, 255, 255, 0.1)",
                      color: activeImageIdx === idx ? "var(--rf-cyan)" : "var(--rf-text-sub)",
                    }}
                  >
                    Position {idx === 0 ? "A (Start)" : "B (Execution)"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Anatomical Targets: Primary & Secondary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {primaryMuscles.length > 0 && (
            <div
              style={{
                background: "rgba(0, 242, 254, 0.04)",
                border: "1px solid rgba(0, 242, 254, 0.2)",
                borderRadius: "var(--rf-radius-md)",
                padding: "12px 16px",
              }}
            >
              <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)", marginBottom: 6 }}>
                PRIMARY TARGET
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {primaryMuscles.map((m) => (
                  <span
                    key={m}
                    style={{
                      background: "rgba(0, 242, 254, 0.15)",
                      color: "#fff",
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {secondaryMuscles.length > 0 && (
            <div
              style={{
                background: "rgba(138, 92, 246, 0.04)",
                border: "1px solid rgba(138, 92, 246, 0.2)",
                borderRadius: "var(--rf-radius-md)",
                padding: "12px 16px",
              }}
            >
              <div className="rf-telemetry-tag" style={{ color: "var(--rf-violet)", marginBottom: 6 }}>
                SYNERGISTS / SECONDARY
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {secondaryMuscles.map((m) => (
                  <span
                    key={m}
                    style={{
                      background: "rgba(138, 92, 246, 0.15)",
                      color: "#fff",
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Movement Mechanics Specs */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {exercise.mechanic && (
            <div className="rf-stat-sub">
              <strong>Mechanic:</strong> <span style={{ color: "var(--rf-text-bright)", textTransform: "capitalize" }}>{exercise.mechanic}</span>
            </div>
          )}
          {exercise.force && (
            <div className="rf-stat-sub">
              <strong>Force:</strong> <span style={{ color: "var(--rf-text-bright)", textTransform: "capitalize" }}>{exercise.force}</span>
            </div>
          )}
        </div>

        {/* Step-by-Step Instructions */}
        {instructions.length > 0 && (
          <div>
            <div className="rf-telemetry-tag" style={{ color: "var(--rf-text-sub)", marginBottom: 10 }}>
              EXECUTION PROTOCOL
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                color: "var(--rf-text-bright)",
                fontSize: "0.92rem",
                lineHeight: 1.6,
              }}
            >
              {instructions.map((step, idx) => (
                <li key={idx} style={{ paddingLeft: 4 }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Bottom Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 8,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button type="button" className="rf-btn rf-btn--outline" onClick={onClose}>
            Close
          </button>
          <PrimaryButton onClick={handleAddToWorkout}>
            + Log In Workout
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
