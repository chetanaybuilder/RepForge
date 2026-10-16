/**
 * RepForge - Exercise Picker Modal
 *
 * Responsibilities:
 * - High-speed, thumb-friendly movement selector for the workout logger.
 * - Allows searching across 800+ movements and filtering by anatomical muscle group.
 * - Selecting an exercise auto-populates exercise name and suggested workout type.
 */

import { useState, useEffect, useMemo } from "react";
import { api, getExerciseImageUrl } from "../services/api";

const COMMON_MUSCLES = [
  "all",
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quadriceps",
  "hamstrings",
  "glutes",
  "abdominals",
  "calves",
];

export function ExercisePickerModal({ open, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("all");
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let isCancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = {
          limit: 40,
        };
        if (search.trim()) params.search = search.trim();
        if (selectedMuscle !== "all") params.muscle = selectedMuscle;

        const data = await api.get("/api/exercises", params);
        if (!isCancelled) {
          setExercises(data?.items || data?.exercises || []);
        }
      } catch {
        if (!isCancelled) setExercises([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, selectedMuscle]);

  if (!open) return null;

  return (
    <div
      className="rf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
    >
      <div
        className="rf-modal rf-modal--lg"
        style={{
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)", marginBottom: 4 }}>
              EXERCISE TAXONOMY
            </div>
            <h2 id="picker-title" style={{ margin: 0, fontSize: "1.3rem", color: "#fff" }}>
              Select Movement
            </h2>
          </div>
          <button
            type="button"
            className="rf-icon-btn"
            onClick={onClose}
            aria-label="Close picker"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            className="rf-input"
            placeholder="Search 800+ movements (e.g. Incline Bench, Squat, Pull-Up)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ paddingLeft: 38 }}
          />
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--rf-text-faint)",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--rf-text-faint)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Muscle Filter Chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {COMMON_MUSCLES.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() => setSelectedMuscle(muscle)}
              className="rf-badge"
              style={{
                cursor: "pointer",
                textTransform: "capitalize",
                background:
                  selectedMuscle === muscle
                    ? "rgba(0, 242, 254, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                borderColor:
                  selectedMuscle === muscle
                    ? "var(--rf-cyan)"
                    : "rgba(255, 255, 255, 0.1)",
                color: selectedMuscle === muscle ? "var(--rf-cyan)" : "var(--rf-text-sub)",
                whiteSpace: "nowrap",
              }}
            >
              {muscle}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minHeight: 280,
            paddingRight: 4,
          }}
        >
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--rf-text-faint)" }}>
              <div className="rf-spin" style={{ display: "inline-block", fontSize: "1.5rem", marginBottom: 8 }}>
                ◈
              </div>
              <div>Scanning exercise database...</div>
            </div>
          )}

          {!loading && exercises.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--rf-text-faint)" }}>
              No exercises match your query. Try a different muscle group or keyword.
            </div>
          )}

          {!loading &&
            exercises.map((ex) => {
              const primaryMuscle = ex.primary_muscles?.[0] || "";
              const thumb = ex.images?.[0] ? getExerciseImageUrl(ex.images[0]) : null;

              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    onSelect(ex);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 14px",
                    borderRadius: "var(--rf-radius-md)",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--rf-cyan)";
                    e.currentTarget.style.background = "rgba(0, 242, 254, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: "rgba(10, 10, 20, 0.6)",
                      overflow: "hidden",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={ex.name}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "1.1rem", color: "var(--rf-text-faint)" }}>🏋️</span>
                    )}
                  </div>

                  {/* Name & Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--rf-text-pure)",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ex.name}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                      {primaryMuscle && (
                        <span
                          className="rf-telemetry-tag"
                          style={{ color: "var(--rf-cyan)", fontSize: "0.7rem" }}
                        >
                          {primaryMuscle}
                        </span>
                      )}
                      {ex.equipment && (
                        <span
                          className="rf-telemetry-tag"
                          style={{ color: "var(--rf-text-sub)", fontSize: "0.7rem" }}
                        >
                          {ex.equipment}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Select indicator */}
                  <div style={{ color: "var(--rf-cyan)", fontSize: "1.2rem", fontWeight: 700 }}>
                    +
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
