"""
Migration script: Populate exercise library from open-source free-exercise-db.

Initializes schema tables, performs batch upsert of exercises, and guarantees pool closure.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from psycopg2.extras import execute_values

from database.db import close_pool, get_connection, init_pool

logger = logging.getLogger("repforge.migration.exercises")


def run_migration() -> int:
    """
    Executes idempotent creation of exercise tables and seeds dataset.

    Returns:
        int: Number of exercises seeded.
    """
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set; skipping database seeding.")
        return 0

    init_pool(db_url)
    try:
        data_path = Path(__file__).resolve().parent / "data" / "exercises.json"
        if not data_path.exists():
            print(f"Data file not found at {data_path}; aborting.")
            return 0

        with open(data_path, encoding="utf-8") as f:
            exercises = json.load(f)

        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1. Ensure tables exist
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS exercises (
                        id                  TEXT PRIMARY KEY,
                        name                TEXT NOT NULL,
                        force               TEXT,
                        level               TEXT,
                        mechanic            TEXT,
                        equipment           TEXT,
                        primary_muscles     TEXT[] NOT NULL DEFAULT '{}',
                        secondary_muscles   TEXT[] NOT NULL DEFAULT '{}',
                        instructions        TEXT[] NOT NULL DEFAULT '{}',
                        category            TEXT,
                        images              TEXT[] NOT NULL DEFAULT '{}',
                        created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                    CREATE INDEX IF NOT EXISTS idx_exercises_name_lower ON exercises (lower(name));
                    CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises (category);
                    CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises (equipment);

                    CREATE TABLE IF NOT EXISTS user_favorite_exercises (
                        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        exercise_id     TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
                        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                        PRIMARY KEY (user_id, exercise_id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_user_fav_exercises_user ON user_favorite_exercises (user_id);
                    """
                )

                # 2. Batch upsert exercises
                records = [
                    (
                        ex["id"],
                        ex["name"],
                        ex.get("force"),
                        ex.get("level"),
                        ex.get("mechanic"),
                        ex.get("equipment"),
                        ex.get("primaryMuscles") or [],
                        ex.get("secondaryMuscles") or [],
                        ex.get("instructions") or [],
                        ex.get("category"),
                        ex.get("images") or [],
                    )
                    for ex in exercises
                ]

                upsert_query = """
                INSERT INTO exercises (
                    id, name, force, level, mechanic, equipment,
                    primary_muscles, secondary_muscles, instructions, category, images
                )
                VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    force = EXCLUDED.force,
                    level = EXCLUDED.level,
                    mechanic = EXCLUDED.mechanic,
                    equipment = EXCLUDED.equipment,
                    primary_muscles = EXCLUDED.primary_muscles,
                    secondary_muscles = EXCLUDED.secondary_muscles,
                    instructions = EXCLUDED.instructions,
                    category = EXCLUDED.category,
                    images = EXCLUDED.images;
                """
                execute_values(cur, upsert_query, records, page_size=200)
                print(f"Successfully seeded/updated {len(records)} exercises in database.")
                return len(records)
    finally:
        close_pool()


if __name__ == "__main__":
    run_migration()
