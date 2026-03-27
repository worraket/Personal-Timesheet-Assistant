import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "timesheet.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(matters)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'working_folder' not in columns:
            cursor.execute("ALTER TABLE matters ADD COLUMN working_folder TEXT")
            print("Successfully added 'working_folder' column to 'matters' table.")
        else:
            print("'working_folder' column already exists.")
            
        conn.commit()
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
