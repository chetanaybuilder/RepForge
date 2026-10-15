-- ============================================================================
-- RepForge Demo Athlete Seed Data for Showcase & Playwright Automation
-- ============================================================================

INSERT OR REPLACE INTO users (id, google_id, email, name, avatar_url)
VALUES (
    'demo-athlete-2040',
    'demo-google-id',
    'athlete@repforge.app',
    'Marcus Vance',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
);

-- Workout Days
INSERT OR REPLACE INTO workout_days (id, user_id, date, day_number, day_label)
VALUES 
    ('day-demo-1', 'demo-athlete-2040', date('now', '-6 days'), 1, 'Leg Hypertrophy & Squat'),
    ('day-demo-2', 'demo-athlete-2040', date('now', '-4 days'), 2, 'Chest & Anterior Deltoid Focus'),
    ('day-demo-3', 'demo-athlete-2040', date('now', '-2 days'), 3, 'Posterior Chain & Deadlift Density'),
    ('day-demo-4', 'demo-athlete-2040', date('now', '-1 day'), 4, 'Shoulders, Arms & Conditioning');

-- Workout Exercises & Sets for Day 1
INSERT OR REPLACE INTO workout_exercises (id, workout_day_id, exercise_name, workout_type, order_index)
VALUES 
    ('ex-demo-1-1', 'day-demo-1', 'Barbell Squat', 'Legs', 1),
    ('ex-demo-1-2', 'day-demo-1', 'Romanian Deadlift', 'Legs', 2);

INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight_kg, completed)
VALUES 
    ('set-demo-1-1-1', 'ex-demo-1-1', 1, 5, 120.0, 1),
    ('set-demo-1-1-2', 'ex-demo-1-1', 2, 5, 130.0, 1),
    ('set-demo-1-1-3', 'ex-demo-1-1', 3, 5, 142.5, 1),
    ('set-demo-1-2-1', 'ex-demo-1-2', 1, 8, 110.0, 1),
    ('set-demo-1-2-2', 'ex-demo-1-2', 2, 8, 120.0, 1);

-- Workout Exercises & Sets for Day 2
INSERT OR REPLACE INTO workout_exercises (id, workout_day_id, exercise_name, workout_type, order_index)
VALUES 
    ('ex-demo-2-1', 'day-demo-2', 'Barbell Bench Press', 'Push', 1),
    ('ex-demo-2-2', 'day-demo-2', 'Incline Dumbbell Press', 'Push', 2);

INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight_kg, completed)
VALUES 
    ('set-demo-2-1-1', 'ex-demo-2-1', 1, 5, 95.0, 1),
    ('set-demo-2-1-2', 'ex-demo-2-1', 2, 5, 105.0, 1),
    ('set-demo-2-1-3', 'ex-demo-2-1', 3, 4, 115.0, 1),
    ('set-demo-2-2-1', 'ex-demo-2-2', 1, 8, 36.0, 1),
    ('set-demo-2-2-2', 'ex-demo-2-2', 2, 8, 40.0, 1);

-- Workout Exercises & Sets for Day 3
INSERT OR REPLACE INTO workout_exercises (id, workout_day_id, exercise_name, workout_type, order_index)
VALUES 
    ('ex-demo-3-1', 'day-demo-3', 'Barbell Deadlift', 'Pull', 1),
    ('ex-demo-3-2', 'day-demo-3', 'Pull-Up', 'Pull', 2);

INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight_kg, completed)
VALUES 
    ('set-demo-3-1-1', 'ex-demo-3-1', 1, 4, 170.0, 1),
    ('set-demo-3-1-2', 'ex-demo-3-1', 2, 3, 190.0, 1),
    ('set-demo-3-1-3', 'ex-demo-3-1', 3, 2, 210.0, 1),
    ('set-demo-3-2-1', 'ex-demo-3-2', 1, 8, 20.0, 1),
    ('set-demo-3-2-2', 'ex-demo-3-2', 2, 6, 25.0, 1);

-- Workout Exercises & Sets for Day 4
INSERT OR REPLACE INTO workout_exercises (id, workout_day_id, exercise_name, workout_type, order_index)
VALUES 
    ('ex-demo-4-1', 'day-demo-4', 'Overhead Press', 'Push', 1),
    ('ex-demo-4-2', 'day-demo-4', 'Lateral Raise', 'Push', 2);

INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight_kg, completed)
VALUES 
    ('set-demo-4-1-1', 'ex-demo-4-1', 1, 5, 65.0, 1),
    ('set-demo-4-1-2', 'ex-demo-4-1', 2, 5, 72.5, 1),
    ('set-demo-4-1-3', 'ex-demo-4-1', 3, 5, 77.5, 1),
    ('set-demo-4-2-1', 'ex-demo-4-2', 1, 12, 16.0, 1),
    ('set-demo-4-2-2', 'ex-demo-4-2', 2, 12, 18.0, 1);

-- Goals
INSERT OR REPLACE INTO goals (id, user_id, goal_type, exercise_name, target_value, is_active)
VALUES 
    ('goal-demo-1', 'demo-athlete-2040', 'exercise_pr', 'Barbell Deadlift', 220.0, 1),
    ('goal-demo-2', 'demo-athlete-2040', 'weekly_frequency', NULL, 4.0, 1),
    ('goal-demo-3', 'demo-athlete-2040', 'exercise_pr', 'Barbell Bench Press', 120.0, 1);
