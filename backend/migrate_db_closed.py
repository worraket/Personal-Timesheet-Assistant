import sqlite3

def add_is_closed_column():
    """Adds the is_closed column to the matters table if it doesn't exist."""
    print("Checking if 'is_closed' column exists in SQLite database...")
    try:
        conn = sqlite3.connect("./timesheet.db")
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(matters)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "is_closed" not in columns:
            print("Adding 'is_closed' column to 'matters' table...")
            cursor.execute("ALTER TABLE matters ADD COLUMN is_closed BOOLEAN DEFAULT 0")
            conn.commit()
            print("Migration successful.")
        else:
            print("'is_closed' column already exists. No migration needed.")
            
    except Exception as e:
        print(f"Error checking/adding column: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    add_is_closed_column()
