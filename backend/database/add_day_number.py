"""
Migration script: Populate sequential day_number for workout_days.

Initializes pool, executes idempotent window migration, and guarantees pool closure.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

from database.db import close_pool, get_connection, init_pool


def main() -> None:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    print("Adding day_number to workout_days...")
    init_pool(os.environ["DATABASE_URL"])
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("ALTER TABLE workout_days ADD COLUMN IF NOT EXISTS day_number INTEGER;")

                cur.execute(
                    """
                    WITH numbered AS (
                        SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY date ASC, created_at ASC) as rn
                        FROM workout_days
                    )
                    UPDATE workout_days
                    SET day_number = numbered.rn
                    FROM numbered
                    WHERE workout_days.id = numbered.id AND workout_days.day_number IS NULL;
                    """
                )
                print(f"Updated {cur.rowcount} rows with sequential day numbers.")
        print("Done!")
    finally:
        close_pool()


if __name__ == "__main__":
    main()
