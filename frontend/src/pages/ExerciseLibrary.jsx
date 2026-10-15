/**
 * RepForge - Exercise Library & Biomechanical Movement Index
 *
 * Responsibilities:
 * - Provides interactive exploration across 800+ movements seeded from free-exercise-db.
 * - Live search, muscle group taxonomy filtering, equipment filtering, and favorites bookmarking.
 * - 3D glass cards with TiltCard interaction, lazy-loaded demonstration images.
 * - Integrated detail view modal with step-by-step tactical instructions.
 * - Direct "+ Add to Workout" navigation bridging into the workout logging pipeline.
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getExerciseImageUrl } from "../services/api";
import { useToast } from "../context/ToastContext";
import { TiltCard } from "../components/TiltCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { SkeletonGrid } from "../components/Skeleton";
import { ExerciseDetailModal } from "../components/ExerciseDetailModal";
import { motion, AnimatePresence } from "framer-motion";

const PRIMARY_MUSCLE_OPTIONS = [
  { value: "", label: "All Muscles" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back / Lats" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "quadriceps", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "glutes", label: "Glutes" },
  { value: "abdominals", label: "Abdominals / Core" },
  { value: "calves", label: "Calves" },
  { value: "forearms", label: "Forearms" },
  { value: "traps", label: "Traps" },
];

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 24;

  // Taxonomy options
  const [equipmentList, setEquipmentList] = useState([]);

  // Detail Modal
  const [inspectedExercise, setInspectedExercise] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Load filter taxonomy options once
  useEffect(() => {
    let mounted = true;
    api
      .get("/api/exercises/filters")
      .then((data) => {
        if (mounted && data?.equipment) {
          setEquipmentList(data.equipment);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch exercises matching current parameters
  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: pageSize,
        offset: page * pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedMuscle) params.muscle = selectedMuscle;
      if (selectedEquipment) params.equipment = selectedEquipment;
      if (favoritesOnly) params.favorites_only = true;

      const res = await api.get("/api/exercises", params);
      setExercises(res?.items || []);
      setTotalCount(res?.total || 0);
    } catch (err) {
      setError(err?.message || "Failed to load exercise catalog.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedMuscle, selectedEquipment, favoritesOnly, page]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Reset page when filter inputs change
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(0);
  };

  const handleMuscleChange = (val) => {
    setSelectedMuscle(val);
    setPage(0);
  };

  const handleEquipmentChange = (val) => {
    setSelectedEquipment(val);
    setPage(0);
  };

  const handleFavoritesToggle = () => {
    setFavoritesOnly((prev) => !prev);
    setPage(0);
  };

  const handleToggleFavorite = async (exerciseId) => {
    // Optimistic UI update
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, is_favorite: !ex.is_favorite } : ex))
    );
    if (inspectedExercise && inspectedExercise.id === exerciseId) {
      setInspectedExercise((prev) => ({ ...prev, is_favorite: !prev.is_favorite }));
    }

    try {
      const res = await api.post(`/api/exercises/${encodeURIComponent(exerciseId)}/favorite`);
      toast.success(
        res.is_favorite ? "Exercise saved to favorites." : "Exercise removed from favorites."
      );
    } catch (err) {
      // Revert on failure
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exerciseId ? { ...ex, is_favorite: !ex.is_favorite } : ex))
      );
      toast.error(err?.message || "Could not update favorite state.");
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Page Header */}
      <div className="rf-page-header">
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 6 }}>
            05 — MOVEMENT ARCHIVE
          </div>
          <h1 className="rf-page-title">
            Exercise <span className="rf-gradient-text">Library</span>
          </h1>
          <p className="rf-page-subtitle">
            800+ biomechanical movements with multi-angle execution guides, anatomical targets, and form instructions.
          </p>
        </div>
        <Link to="/workouts">
          <PrimaryButton className="rf-btn--sm">+ Log Session</PrimaryButton>
        </Link>
      </div>

      {/* Filter Toolbar Pod */}
      <div
        className="rf-pod"
        style={{
          marginBottom: 28,
          padding: "clamp(16px, 3vw, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Search & Favorites Row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <input
              type="text"
              className="rf-input"
              placeholder="Search by movement name (e.g. Incline Bench, Deadlift, Cable Row)..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
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
                onClick={() => handleSearchChange("")}
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

          {/* Favorites Filter Button */}
          <button
            type="button"
            onClick={handleFavoritesToggle}
            className={`rf-btn ${favoritesOnly ? "rf-btn--primary" : "rf-btn--outline"}`}
            style={{
              padding: "9px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderColor: favoritesOnly ? "var(--rf-ember)" : undefined,
              boxShadow: favoritesOnly ? "0 0 16px rgba(255, 51, 102, 0.3)" : undefined,
            }}
          >
            <span>{favoritesOnly ? "★" : "☆"}</span>
            <span>Favorites</span>
          </button>
        </div>

        {/* Dropdowns & Muscle Chips Row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Muscle Select */}
          <select
            className="rf-select"
            value={selectedMuscle}
            onChange={(e) => handleMuscleChange(e.target.value)}
            style={{ flex: "1 1 180px", maxWidth: 240 }}
          >
            {PRIMARY_MUSCLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Equipment Select */}
          <select
            className="rf-select"
            value={selectedEquipment}
            onChange={(e) => handleEquipmentChange(e.target.value)}
            style={{ flex: "1 1 180px", maxWidth: 240, textTransform: "capitalize" }}
          >
            <option value="">All Equipment</option>
            {equipmentList.map((eq) => (
              <option key={eq} value={eq} style={{ textTransform: "capitalize" }}>
                {eq}
              </option>
            ))}
          </select>

          {/* Total Results Count Telemetry */}
          <div
            className="rf-telemetry-tag"
            style={{ marginLeft: "auto", color: "var(--rf-text-sub)" }}
          >
            {loading ? "SEARCHING..." : `${totalCount} MOVEMENTS INDEXED`}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {loading && <SkeletonGrid count={8} />}

      {error && (
        <div className="rf-pod" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--rf-ember)", marginBottom: 16 }}>{error}</p>
          <PrimaryButton onClick={loadExercises}>Retry Query</PrimaryButton>
        </div>
      )}

      {!loading && !error && exercises.length === 0 && (
        <div className="rf-pod" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏋️</div>
          <h3 style={{ color: "#fff", margin: "0 0 8px 0" }}>No exercises matched your criteria</h3>
          <p style={{ color: "var(--rf-text-sub)", maxWidth: 440, margin: "0 auto 20px auto", fontSize: "0.9rem" }}>
            Try expanding your search query, selecting "All Muscles", or turning off the favorites filter.
          </p>
          <button
            type="button"
            className="rf-btn rf-btn--outline"
            onClick={() => {
              setSearch("");
              setSelectedMuscle("");
              setSelectedEquipment("");
              setFavoritesOnly(false);
              setPage(0);
            }}
          >
            Reset All Filters
          </button>
        </div>
      )}

      {!loading && !error && exercises.length > 0 && (
        <>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
              width: "100%",
            }}
          >
            {exercises.map((ex) => {
              const primaryMuscle = ex.primary_muscles?.[0] || "";
              const thumb = ex.images?.[0] ? getExerciseImageUrl(ex.images[0]) : null;

              return (
                <motion.div
                  key={ex.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                >
                  <TiltCard
                    className="rf-stat-card"
                    style={{
                      height: "100%",
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                    glowColor="cyan"
                  >
                    <div>
                      {/* Thumbnail Container */}
                      <div
                        style={{
                          width: "100%",
                          height: 160,
                          borderRadius: "var(--rf-radius-sm)",
                          background: "rgba(10, 10, 20, 0.7)",
                          overflow: "hidden",
                          marginBottom: 14,
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={`${ex.name} thumbnail`}
                            loading="lazy"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              transition: "transform 0.3s ease",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "2.4rem", color: "var(--rf-text-faint)" }}>
                            ✦
                          </span>
                        )}

                        {/* Favorite button over image */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(ex.id);
                          }}
                          aria-label={ex.is_favorite ? "Unfavorite exercise" : "Favorite exercise"}
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "rgba(10, 10, 20, 0.8)",
                            backdropFilter: "blur(8px)",
                            border: ex.is_favorite
                              ? "1px solid var(--rf-ember)"
                              : "1px solid rgba(255, 255, 255, 0.15)",
                            color: ex.is_favorite ? "var(--rf-ember)" : "var(--rf-text-sub)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "1rem",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {ex.is_favorite ? "★" : "☆"}
                        </button>
                      </div>

                      {/* Badges */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {primaryMuscle && (
                          <span
                            className="rf-badge rf-badge--cyan"
                            style={{ textTransform: "capitalize", fontSize: "0.72rem" }}
                          >
                            {primaryMuscle}
                          </span>
                        )}
                        {ex.equipment && (
                          <span
                            className="rf-badge rf-badge--violet"
                            style={{ textTransform: "capitalize", fontSize: "0.72rem" }}
                          >
                            {ex.equipment}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "1.1rem",
                          color: "var(--rf-text-pure)",
                          lineHeight: 1.3,
                        }}
                      >
                        {ex.name}
                      </h3>
                    </div>

                    {/* Action Footer */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <button
                        type="button"
                        className="rf-btn rf-btn--outline rf-btn--sm"
                        style={{ flex: 1, padding: "7px 10px", fontSize: "0.82rem" }}
                        onClick={() => setInspectedExercise(ex)}
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        className="rf-btn rf-btn--primary rf-btn--sm"
                        style={{ flex: 1, padding: "7px 10px", fontSize: "0.82rem" }}
                        onClick={() => {
                          navigate(`/workouts?add_exercise=${encodeURIComponent(ex.name)}`);
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 16,
                marginTop: 36,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                className="rf-btn rf-btn--outline rf-btn--sm"
                disabled={page === 0}
                onClick={() => {
                  setPage((p) => Math.max(0, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                ← Previous
              </button>

              <span style={{ color: "var(--rf-text-sub)", fontSize: "0.9rem", fontFamily: "var(--rf-font-mono)" }}>
                PAGE {page + 1} OF {totalPages}
              </span>

              <button
                type="button"
                className="rf-btn rf-btn--outline rf-btn--sm"
                disabled={page >= totalPages - 1}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Inspect Exercise Modal */}
      <ExerciseDetailModal
        exercise={inspectedExercise}
        open={Boolean(inspectedExercise)}
        onClose={() => setInspectedExercise(null)}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
