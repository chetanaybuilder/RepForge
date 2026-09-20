import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from database.db import get_connection, init_pool

def main():
    print("Adding day_number to workout_days...")
    init_pool(os.environ["DATABASE_URL"])
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE workout_days ADD COLUMN IF NOT EXISTS day_number INTEGER;")
            
            cur.execute("""
                WITH numbered AS (
                    SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY date ASC, created_at ASC) as rn
                    FROM workout_days
                )
                UPDATE workout_days
                SET day_number = numbered.rn
                FROM numbered
                WHERE workout_days.id = numbered.id AND workout_days.day_number IS NULL;
            """)
            print(f"Updated {cur.rowcount} rows with sequential day numbers.")
        conn.commit()
    print("Done!")

if __name__ == "__main__":
    main()
