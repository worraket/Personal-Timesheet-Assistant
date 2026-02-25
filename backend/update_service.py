import os
import urllib.request
import json
import subprocess
import threading

API_URL = "https://api.github.com/repos/worraket/Personal-Timesheet-Assistant/commits/main"
VERSION_FILE = ".version"

def check_for_updates() -> dict:
    """
    Compares local .version SHA with remote GitHub SHA.
    Returns dict: {"update_available": bool, "latest_sha": str, "current_sha": str}
    """
    # 1. Get current SHA
    current_sha = "unknown"
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            current_sha = f.read().strip()
            
    # 2. Get remote SHA
    latest_sha = ""
    try:
        req = urllib.request.Request(API_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            latest_sha = data.get("sha", "")
    except Exception as e:
        print(f"Error checking for updates: {e}")
        return {"update_available": False, "latest_sha": "", "current_sha": current_sha, "error": str(e)}

    # 3. Compare
    update_available = False
    if latest_sha and current_sha != latest_sha:
        update_available = True
        
    return {
        "update_available": update_available,
        "latest_sha": latest_sha[:7] if latest_sha else "",
        "current_sha": current_sha[:7] if current_sha != "unknown" else "unknown"
    }

def run_update_sequence():
    """
    Triggers the batch file in a new detached window, then exits this server process.
    """
    # Spawn the batch script detached so it survives when we kill the server
    subprocess.Popen(
        ["cmd.exe", "/c", "start", "update_assistant.bat"],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

    # We need to gracefully shut down FastAPI so the DB/files are unlocked
    # A standard way from inside a route is to send SIGTERM to our own pid
    def suicide():
        import time
        import signal
        time.sleep(2)  # Give time to return the HTTP response
        os.kill(os.getpid(), signal.SIGTERM)
        
    threading.Thread(target=suicide, daemon=True).start()
