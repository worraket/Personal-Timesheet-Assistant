import os
import sqlite3
import shutil
import time
from datetime import datetime
from pathlib import Path
from backend import settings_service

BACKUP_DIR = "backups"
DB_FILE = "timesheet.db"
MAX_BACKUPS = 7

def perform_backup():
    """
    Creates a backup of the sqlite database and settings.json.
    Manages retention to keep only the latest MAX_BACKUPS files.
    """
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 1. Backup SQLite Database safely using SQLite backup API
    db_backup_filename = f"timesheet_backup_{timestamp}.db"
    db_backup_path = os.path.join(BACKUP_DIR, db_backup_filename)
    
    try:
        # Connect to existing DB and new backup DB
        source_conn = sqlite3.connect(DB_FILE)
        backup_conn = sqlite3.connect(db_backup_path)
        
        # Perform the backup
        source_conn.backup(backup_conn)
        
        backup_conn.close()
        source_conn.close()
        print(f"Database backup created: {db_backup_path}")
    except Exception as e:
        print(f"Failed to backup database: {e}")

    # 2. Backup Settings JSON
    settings_backup_filename = f"settings_backup_{timestamp}.json"
    settings_backup_path = os.path.join(BACKUP_DIR, settings_backup_filename)
    
    if os.path.exists(settings_service.SETTINGS_FILE):
        try:
            shutil.copy2(settings_service.SETTINGS_FILE, settings_backup_path)
            print(f"Settings backup created: {settings_backup_path}")
        except Exception as e:
            print(f"Failed to backup settings: {e}")

    # 3. Backup Stickynotes JSON
    sticky_backup_filename = f"stickynote_backup_{timestamp}.json"
    sticky_backup_path = os.path.join(BACKUP_DIR, sticky_backup_filename)
    
    if os.path.exists(settings_service.STICKY_NOTES_FILE):
        try:
            shutil.copy2(settings_service.STICKY_NOTES_FILE, sticky_backup_path)
            print(f"Sticky notes backup created: {sticky_backup_path}")
        except Exception as e:
            print(f"Failed to backup sticky notes: {e}")

    # 4. Apply Retention Policy
    _cleanup_old_backups(prefix="timesheet_backup_", ext=".db", max_files=MAX_BACKUPS)
    _cleanup_old_backups(prefix="settings_backup_", ext=".json", max_files=MAX_BACKUPS)
    _cleanup_old_backups(prefix="stickynote_backup_", ext=".json", max_files=MAX_BACKUPS)

def _cleanup_old_backups(prefix: str, ext: str, max_files: int):
    """
    Keeps only the latest `max_files` backups matching the prefix and extension.
    """
    try:
        files = []
        for f in os.listdir(BACKUP_DIR):
            if f.startswith(prefix) and f.endswith(ext):
                full_path = os.path.join(BACKUP_DIR, f)
                files.append({
                    "path": full_path,
                    "time": os.path.getmtime(full_path)
                })
        
        # Sort by modification time, descending (newest first)
        files.sort(key=lambda x: x["time"], reverse=True)
        
        # Delete if we have more than max_files
        if len(files) > max_files:
            for f in files[max_files:]:
                os.remove(f["path"])
                print(f"Deleted old backup: {f['path']}")
    except Exception as e:
        print(f"Error during backup cleanup: {e}")
