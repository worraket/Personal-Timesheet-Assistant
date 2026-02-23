import json
import os
import base64
from sqlalchemy.orm import Session
from . import database

try:
    import win32crypt
except ImportError:
    win32crypt = None

SETTINGS_FILE = "settings.json"
SECRETS_FILE = "secrets.enc"

# Keys that are stored encrypted in secrets.enc
_SECRET_KEYS = frozenset({
    "ai_key_claude",
    "ai_key_gemini",
    "ai_key_openai",
    "ai_key_grok",
})


# --- Plain settings I/O ---

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


# --- Encrypted secrets I/O ---

def _load_secrets() -> dict:
    if not os.path.exists(SECRETS_FILE):
        return {}
    try:
        with open(SECRETS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_secrets(data: dict):
    with open(SECRETS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# --- DPAPI encryption helpers ---

def _encrypt(plain_text: str) -> str:
    if not plain_text:
        return ""
    if win32crypt is None:
        return plain_text
    encrypted_bytes = win32crypt.CryptProtectData(
        plain_text.encode("utf-8"), None, None, None, None, 0
    )
    return base64.b64encode(encrypted_bytes).decode("ascii")

def _decrypt(encrypted_b64: str) -> str:
    if not encrypted_b64:
        return ""
    if win32crypt is None:
        return encrypted_b64
    encrypted_bytes = base64.b64decode(encrypted_b64)
    _desc, decrypted_bytes = win32crypt.CryptUnprotectData(
        encrypted_bytes, None, None, None, 0
    )
    return decrypted_bytes.decode("utf-8")


# --- Public API ---

def get_setting(key: str, default: str = "") -> str:
    if key in _SECRET_KEYS:
        secrets = _load_secrets()
        encrypted_value = secrets.get(key, "")
        if not encrypted_value:
            return default
        try:
            return _decrypt(encrypted_value)
        except Exception:
            return default
    data = _load_settings()
    return data.get(key, default)

def set_setting(key: str, value: str):
    if key in _SECRET_KEYS:
        secrets = _load_secrets()
        secrets[key] = _encrypt(value) if value else ""
        _save_secrets(secrets)
    else:
        data = _load_settings()
        data[key] = value
        _save_settings(data)

def get_user_identifiers():
    return {
        "full_name": get_setting("user_full_name", ""),
        "email": get_setting("user_email", "")
    }


# --- Migration functions ---

def migrate_from_db(db: Session):
    if os.path.exists(SETTINGS_FILE):
        return # Already migrated

    print("Migrating settings from DB to JSON...")
    try:
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

def migrate_plaintext_keys():
    """Move any plain-text API keys from settings.json to encrypted secrets.enc."""
    data = _load_settings()
    secrets = _load_secrets()
    migrated = False

    for key in _SECRET_KEYS:
        if key in data:
            plain_value = data[key]
            if plain_value:
                secrets[key] = _encrypt(plain_value)
            del data[key]
            migrated = True

    if migrated:
        _save_secrets(secrets)
        _save_settings(data)
        print(f"Migrated API keys from settings.json to {SECRETS_FILE}")
