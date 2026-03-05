import sqlite3
import os

DB_PATH = "./timesheet.db"

def add_ai_tags_column():
    """Adds ai_tags column to matters table if it doesn't exist."""
    if not os.path.exists(DB_PATH):
        print("Database file not found. Skipping ai_tags migration.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check if column exists
        cursor.execute("PRAGMA table_info(matters)")
        columns = [info[1] for info in cursor.fetchall()]

        if "ai_tags" not in columns:
            print("Adding 'ai_tags' column to matters table...")
            cursor.execute("ALTER TABLE matters ADD COLUMN ai_tags TEXT")
            conn.commit()
            print("Successfully added 'ai_tags' column.")
        else:
            print("'ai_tags' column already exists.")

    except sqlite3.Error as e:
        print(f"Error migrating database (ai_tags): {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_ai_tags_column()
