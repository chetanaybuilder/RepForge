import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

def main():
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv(backend_dir.parent / ".env")

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        sys.exit(1)

    print("Connecting to database...")
    conn = psycopg2.connect(db_url)
    
    with conn.cursor() as cur:
        # Check if old workouts table exists
        cur.execute("SELECT to_regclass('public.workouts');")
        workouts_exists = cur.fetchone()[0] is not None
        
        # Apply the new schema
        schema_path = backend_dir / "database" / "schema.sql"
        print(f"Applying {schema_path}...")
        with open(schema_path, "r") as f:
            cur.execute(f.read())
        
        if workouts_exists:
            print("Migrating data from old workouts table...")
            cur.execute("SELECT id, user_id, day, date, workout_type, exercise_name, sets, reps, weight, notes, created_at, updated_at FROM workouts;")
            old_workouts = cur.fetchall()
            
            for row in old_workouts:
                old_id, user_id, day_label, date, workout_type, exercise_name, sets, reps, weight, notes, created_at, updated_at = row
                
                # Create a Day for each old workout
                cur.execute("""
                    INSERT INTO workout_days (user_id, date, day_label, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (user_id, date, day_label, created_at, updated_at))
                day_id = cur.fetchone()[0]
                
                cur.execute("""
                    INSERT INTO workout_exercises (workout_day_id, exercise_name, workout_type, notes, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (day_id, exercise_name, workout_type, notes, created_at, updated_at))
                exercise_id = cur.fetchone()[0]
                
                for s in range(sets):
                    cur.execute("""
                        INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight_kg, completed)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (exercise_id, s + 1, reps, weight, True))
            
            print(f"Migrated {len(old_workouts)} workouts.")
            
            # Drop old table safely
            print("Dropping old workouts table...")
            cur.execute("DROP TABLE workouts CASCADE;")
        
        conn.commit()
        print("Migration complete!")

if __name__ == "__main__":
    main()
