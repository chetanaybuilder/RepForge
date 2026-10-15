-- ============================================================================
-- RepForge Cloudflare D1 (SQLite) Production Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS workout_days (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    day_number INTEGER,
    day_label TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_days_user_id ON workout_days (user_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_user_date ON workout_days (user_id, date DESC);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    workout_day_id TEXT NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    workout_type TEXT NOT NULL,
    notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_day_id ON workout_exercises (workout_day_id);

CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets (workout_exercise_id);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    nonce TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    exercise_name TEXT,
    target_value REAL NOT NULL,
    period_start TEXT,
    period_end TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);

CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    force TEXT,
    level TEXT,
    mechanic TEXT,
    equipment TEXT,
    primary_muscles TEXT NOT NULL DEFAULT '[]',
    secondary_muscles TEXT NOT NULL DEFAULT '[]',
    instructions TEXT NOT NULL DEFAULT '[]',
    category TEXT,
    images TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises (name);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises (category);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises (equipment);

CREATE TABLE IF NOT EXISTS user_favorite_exercises (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_fav_exercises_user ON user_favorite_exercises (user_id);
