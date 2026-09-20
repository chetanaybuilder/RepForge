-- RepForge schema
--
-- This file is intentionally additive and idempotent: it only creates
-- objects if they don't already exist, and it never drops or truncates
-- anything. Run it once against your Supabase Postgres database (via the
-- SQL editor in the Supabase dashboard, or `psql "$DATABASE_URL" -f schema.sql`).
--
-- Supabase Auth is NOT used. This "users" table is our own application
-- table, populated by the Flask backend after verifying a Google identity.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id       TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL,
    name            TEXT,
    avatar_url      TEXT,
    password_hash   TEXT,                 -- only set if email/password signup is enabled
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- ---------------------------------------------------------------------
-- Workout Days, Exercises, Sets
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_days (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    day_number      INTEGER,
    day_label       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_days_user_id ON workout_days (user_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_user_date ON workout_days (user_id, date DESC);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_day_id  UUID NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
    exercise_name   TEXT NOT NULL,
    workout_type    TEXT NOT NULL,
    notes           TEXT,
    order_index     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_day_id ON workout_exercises (workout_day_id);

CREATE TABLE IF NOT EXISTS workout_sets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number          INTEGER NOT NULL CHECK (set_number > 0),
    reps                INTEGER NOT NULL CHECK (reps > 0),
    weight_kg           NUMERIC(7,2) NOT NULL CHECK (weight_kg >= 0),
    completed           BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets (workout_exercise_id);

-- ---------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------
-- Server-side session store. The browser only ever holds a random opaque
-- session id in an HttpOnly cookie; all session state (which user, when it
-- expires, the CSRF token bound to it) lives here, so a stolen cookie value
-- with no matching/expired row is worthless and sessions can be revoked
-- instantly by deleting the row (used by logout).
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,       -- random token, NOT the cookie's raw bytes (see auth/session_store.py)
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token      TEXT NOT NULL,
    user_agent      TEXT,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- ---------------------------------------------------------------------
-- OAuth state (short-lived CSRF protection for the Google OAuth handshake)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_states (
    state           TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

-- ---------------------------------------------------------------------
-- Goals (used by the Goals / Performance page)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type       TEXT NOT NULL,          -- 'weekly_frequency' | 'exercise_pr' | 'volume'
    exercise_name   TEXT,                   -- only relevant for exercise_pr goals
    target_value    NUMERIC(10,2) NOT NULL,
    period_start    DATE,
    period_end      DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);

-- ---------------------------------------------------------------------
-- updated_at trigger helper (kept minimal, applied per-table)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_days_updated_at ON workout_days;
CREATE TRIGGER trg_workout_days_updated_at
    BEFORE UPDATE ON workout_days
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_exercises_updated_at ON workout_exercises;
CREATE TRIGGER trg_workout_exercises_updated_at
    BEFORE UPDATE ON workout_exercises
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_goals_updated_at ON goals;
CREATE TRIGGER trg_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Since Flask (not Supabase Auth / PostgREST) is the only thing that talks
-- to this database, and it always connects with a single trusted service
-- role via DATABASE_URL, RLS is not the enforcement boundary here — the
-- Flask ownership checks in backend/database/queries_workouts.py are.
-- RLS is left enabled with a permissive policy for the service role so
-- that if this database is ever also queried through Supabase's own API
-- (PostgREST/RLS-aware clients) with anon/authenticated keys, it fails
-- closed by default rather than open.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workout_days' AND policyname = 'service_role_all_workout_days'
    ) THEN
        CREATE POLICY service_role_all_workout_days ON workout_days
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workout_exercises' AND policyname = 'service_role_all_workout_exercises'
    ) THEN
        CREATE POLICY service_role_all_workout_exercises ON workout_exercises
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workout_sets' AND policyname = 'service_role_all_workout_sets'
    ) THEN
        CREATE POLICY service_role_all_workout_sets ON workout_sets
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'service_role_all_users'
    ) THEN
        CREATE POLICY service_role_all_users ON users
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'service_role_all_goals'
    ) THEN
        CREATE POLICY service_role_all_goals ON goals
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'service_role_all_sessions'
    ) THEN
        CREATE POLICY service_role_all_sessions ON sessions
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'oauth_states' AND policyname = 'service_role_all_oauth_states'
    ) THEN
        CREATE POLICY service_role_all_oauth_states ON oauth_states
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
