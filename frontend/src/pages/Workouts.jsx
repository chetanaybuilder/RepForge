import { useMemo, useState } from "react";
import { useWorkouts } from "../hooks/useWorkouts";
import { useToast } from "../context/ToastContext";
import { ErrorState, EmptyState } from "../components/StateViews";
import { SkeletonGrid } from "../components/Skeleton";
import { DayFormModal, DAY_WORKOUT_TYPES } from "../components/DayFormModal";
import { ExerciseEditModal } from "../components/ExerciseEditModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PrimaryButton } from "../components/PrimaryButton";
import { api } from "../services/api";

export function Workouts() {
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({ search: search || undefined }),
    [search]
  );

  const { workouts, status, error, reload, createWorkout, updateWorkout, deleteWorkout } = useWorkouts(filters);
  const toast = useToast();

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editExerciseModalOpen, setEditExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [expandedDayId, setExpandedDayId] = useState(null);
  
  const [aiLoading, setAiLoading] = useState({});
  const [aiResults, setAiResults] = useState({});

  const openCreateDay = () => setDayModalOpen(true);
  const openEditExercise = (ex) => { setEditingExercise(ex); setEditExerciseModalOpen(true); };

  const handleSaveDay = async (payload) => {
    try {
      await createWorkout(payload);
      toast.success("Workout day logged.");
      setDayModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not save this workout day.");
    }
  };

  const handleSaveExercise = async (payload) => {
    try {
      await api.put(`/api/workouts/exercises/${editingExercise.id}`, payload);
      toast.success("Exercise updated.");
      setEditExerciseModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not update this exercise.");
    }
  };

  const confirmDeleteExercise = async () => {
    try {
      await api.delete(`/api/workouts/exercises/${pendingDelete.id}`);
      toast.success("Exercise deleted.");
      reload();
    } catch (err) {
      toast.error(err.message || "Could not delete this exercise.");
    } finally {
      setPendingDelete(null);
    }
  };

  const runAiAnalysis = async (dayId) => {
    setAiLoading(prev => ({ ...prev, [dayId]: true }));
    try {
      const data = await api.post(`/api/ai/insights/${dayId}`);
      setAiResults(prev => ({ ...prev, [dayId]: data.insights }));
    } catch (err) {
      toast.error(err.message || "AI Analysis failed.");
    } finally {
      setAiLoading(prev => ({ ...prev, [dayId]: false }));
    }
  };

  return (
    <div>
      <div className="rf-page-header">
        <div>
          <h1 className="rf-page-title">Workouts</h1>
          <p className="rf-page-subtitle">Every set you've logged, searchable and sortable.</p>
        </div>
        <PrimaryButton className="rf-btn--sm" onClick={openCreateDay}>+ Log a day</PrimaryButton>
      </div>

      <div className="rf-filter-bar">
        <input
          type="search"
          className="rf-input rf-search"
          placeholder="Search day, exercise, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {status === "loading" && <div style={{ marginTop: 24 }}><SkeletonGrid count={3} height="100px" /></div>}
      {status === "error" && <ErrorState message={error?.message} onRetry={reload} />}

      {status === "success" && workouts.length === 0 && (
        <EmptyState
          title={search ? "No workouts match your filters" : "No workouts yet"}
          description={search ? "Try clearing your search or filters." : "Log your first session to get started."}
          action={<PrimaryButton className="rf-btn--sm" onClick={openCreateDay}>Log a day</PrimaryButton>}
        />
      )}

      {status === "success" && workouts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {workouts.map((day) => {
            const isExpanded = expandedDayId === day.id;
            const primaryTypes = [...new Set(day.exercises.map(ex => ex.workout_type.replace("_", " ")))].join(", ");

            return (
            <div key={day.id} style={{ background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
              <div 
                onClick={() => setExpandedDayId(isExpanded ? null : day.id)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '24px', cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid #333' : 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#252525'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <h3 style={{ margin: 0, color: '#fff' }}>Day {day.day_number}</h3>
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>{formatDate(day.date)}</span>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>
                    {day.exercises.length} exercises {primaryTypes ? `• ${primaryTypes}` : ''}
                  </div>
                </div>
                <div style={{ color: '#888', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
              
              {isExpanded && (
                <div style={{ padding: '24px', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button 
                      className="rf-btn rf-btn--ghost rf-btn--sm" 
                      onClick={(e) => { e.stopPropagation(); runAiAnalysis(day.id); }}
                      disabled={aiLoading[day.id]}
                    >
                      {aiLoading[day.id] ? "Analyzing..." : "✨ AI Analyze Day"}
                    </button>
                  </div>

                  {/* AI Results Inline Rendering */}
                  {aiResults[day.id] && (
                    <div style={{ marginBottom: 24, padding: 16, background: '#2c2c2c', borderRadius: 8, borderLeft: '4px solid #4a90e2' }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#4a90e2' }}>AI Session Analysis</h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>{aiResults[day.id].deep_review}</p>
                      {aiResults[day.id].good_points?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <strong style={{ color: '#48bb78', fontSize: '0.9rem' }}>↗ Good Points</strong>
                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.9rem', color: '#bbb' }}>
                            {aiResults[day.id].good_points.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                      {aiResults[day.id].critical_points?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <strong style={{ color: '#f56565', fontSize: '0.9rem' }}>⚠ Critical Points</strong>
                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.9rem', color: '#bbb' }}>
                            {aiResults[day.id].critical_points.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {day.exercises.map((ex, i) => (
                      <div key={ex.id} className="rf-workout-row" style={{ padding: '16px', background: '#141414', borderRadius: '8px' }}>
                        <span className="rf-workout-index">{String(i + 1).padStart(2, "0")}</span>
                        <div className="rf-workout-main" style={{ flex: 1 }}>
                          <span className="rf-workout-tag">{ex.workout_type.replace("_", " ")}</span>
                          <div className="rf-workout-exercise">{ex.exercise_name}</div>
                          <div className="rf-workout-meta">
                            {ex.sets.length} sets • {ex.sets.reduce((acc, s) => acc + s.reps, 0)} total reps
                          </div>
                          {ex.notes && <div className="rf-workout-notes">"{ex.notes}"</div>}
                          
                          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {ex.sets.map((set, sIdx) => (
                              <div key={set.id || sIdx} style={{ padding: '4px 8px', background: set.completed ? '#2d3748' : '#2d374880', borderRadius: '4px', fontSize: '0.85rem', color: set.completed ? '#fff' : '#888', border: set.completed ? '1px solid #4a5568' : '1px dashed #4a5568' }}>
                                {set.weight}kg × {set.reps}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="rf-workout-actions">
                          <button className="rf-btn rf-btn--ghost rf-btn--sm" onClick={(e) => { e.stopPropagation(); openEditExercise(ex); }}>Edit</button>
                          <button className="rf-btn rf-btn--danger rf-btn--sm" onClick={(e) => { e.stopPropagation(); setPendingDelete(ex); }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <DayFormModal
        open={dayModalOpen}
        onSave={handleSaveDay}
        onClose={() => setDayModalOpen(false)}
      />

      <ExerciseEditModal
        open={editExerciseModalOpen}
        initialValue={editingExercise}
        onSave={handleSaveExercise}
        onClose={() => setEditExerciseModalOpen(false)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this exercise?"
        message={pendingDelete ? `This will permanently remove ${pendingDelete.exercise_name} and its sets. If this is the last exercise, the Day will also be removed.` : ""}
        confirmLabel="Delete"
        onConfirm={confirmDeleteExercise}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
