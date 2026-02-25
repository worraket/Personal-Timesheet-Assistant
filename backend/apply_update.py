import os
import shutil
import urllib.request
import zipfile
import subprocess
import json

REPO_URL = "https://github.com/worraket/Personal-Timesheet-Assistant/archive/refs/heads/main.zip"
API_URL = "https://api.github.com/repos/worraket/Personal-Timesheet-Assistant/commits/main"
ZIP_FILE = "update_temp.zip"
EXTRACT_DIR = "update_extract"
PROTECTED_PATHS = ["timesheet.db", "settings.json", "secrets.enc", "backups", ".git", "update_assistant.bat"]

def apply_update():
    try:
        # 1. Fetch the latest SHA first so we can save it later
        print("Checking latest version...")
        req = urllib.request.Request(API_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            latest_sha = data.get("sha", "")
            
        if not latest_sha:
            print("Failed to verify latest version SHA from GitHub API.")
            return False

        # 2. Download ZIP
        print("Downloading latest updates from GitHub...")
        urllib.request.urlretrieve(REPO_URL, ZIP_FILE)
        
        # 3. Extract ZIP
        print("Extracting files...")
        with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
            zip_ref.extractall(EXTRACT_DIR)
            
        # The zip extracts into a folder like 'Personal-Timesheet-Assistant-main'
        extracted_folders = os.listdir(EXTRACT_DIR)
        if not extracted_folders:
            print("Extraction error: No folders found in zip.")
            return False
            
        source_dir = os.path.join(EXTRACT_DIR, extracted_folders[0])
        
        # 4. Copy files over, respecting protected paths
        print("Applying new files...")
        _copy_tree_safe(source_dir, ".", PROTECTED_PATHS)
        
        # 5. Clean up temp files
        print("Cleaning up temporary files...")
        if os.path.exists(ZIP_FILE):
            os.remove(ZIP_FILE)
        if os.path.exists(EXTRACT_DIR):
            shutil.rmtree(EXTRACT_DIR, ignore_errors=True)
            
        # 6. Install dependencies
        print("Updating dependencies...")
        subprocess.check_call(["pip", "install", "-r", "requirements.txt"])
        
        # 7. Update .version file
        with open(".version", "w", encoding="utf-8") as f:
            f.write(latest_sha)
            
        print(f"Successfully updated to version {latest_sha[:7]}!")
        return True

    except Exception as e:
        print(f"Update error: {e}")
        # Attempt cleanup on failure too
        if os.path.exists(ZIP_FILE):
            os.remove(ZIP_FILE)
        if os.path.exists(EXTRACT_DIR):
            shutil.rmtree(EXTRACT_DIR, ignore_errors=True)
        return False

def _copy_tree_safe(src, dst, protected):
    for item in os.listdir(src):
        # Skip protected top-level items
        if item in protected:
            continue
            
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        
        if os.path.isdir(s):
            if not os.path.exists(d):
                os.makedirs(d)
            _copy_tree_safe(s, d, []) # Subdirectories are not protected by top-level names
        else:
            shutil.copy2(s, d)

if __name__ == "__main__":
    success = apply_update()
    if not success:
        exit(1)
