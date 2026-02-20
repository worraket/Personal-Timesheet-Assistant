import json
import os
from sqlalchemy.orm import Session
from . import database

SETTINGS_FILE = "settings.json"

def _load_settings() -> dict:
    if not os.path.exists(SETTINGS_FILE):
        return {}
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_settings(data: dict):
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def get_setting(key: str, default: str = "") -> str:
    data = _load_settings()
    return data.get(key, default)

def set_setting(key: str, value: str):
    data = _load_settings()
    data[key] = value
    _save_settings(data)

def get_user_identifiers():
    # Defaulting to the user's current values for now to maintain existing behavior
    return {
        "full_name": get_setting("user_full_name", ""),
        "email": get_setting("user_email", "")
    }

def migrate_from_db(db: Session):
    if os.path.exists(SETTINGS_FILE):
        return # Already migrated
    
    print("Migrating settings from DB to JSON...")
    try:
        # Check if table exists (it should if models are loaded)
        # We use the ORM model from database.py
        settings = db.query(database.UserSetting).all()
        data = {}
        for s in settings:
            data[s.key] = s.value
        
        if data:
            _save_settings(data)
            print(f"Migrated {len(data)} settings.")
        else:
            print("No settings found in DB.")
            
    except Exception as e:
        print(f"Migration failed (non-critical if table doesn't exist): {e}")
