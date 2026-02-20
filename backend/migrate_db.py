import sqlite3

def migrate():
    conn = sqlite3.connect("timesheet.db")
    cursor = conn.cursor()
    
    try:
        print("Checking for client_name column...")
        try:
            cursor.execute("SELECT client_name FROM matters LIMIT 1")
            print("client_name column already exists.")
        except sqlite3.OperationalError:
            print("Adding client_name column...")
            cursor.execute("ALTER TABLE matters ADD COLUMN client_name TEXT")
            print("client_name column added.")

        print("Checking for client_email column...")
        try:
            cursor.execute("SELECT client_email FROM matters LIMIT 1")
            print("client_email column already exists.")
        except sqlite3.OperationalError:
            print("Adding client_email column...")
            cursor.execute("ALTER TABLE matters ADD COLUMN client_email TEXT")
            print("client_email column added.")
            
        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
