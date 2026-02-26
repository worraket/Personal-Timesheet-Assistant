import sys
from . import update_service
from . import apply_update

def run():
    print("Checking for updates from GitHub...")
    status = update_service.check_for_updates()
    
    if status.get("update_available"):
        print(f"Update found (Version: {status.get('latest_sha')})! Applying now...")
        success = apply_update.apply_update()
        if not success:
            print("Warning: The auto-update process encountered an error.")
    else:
        print("App is up to date.")

if __name__ == "__main__":
    run()
