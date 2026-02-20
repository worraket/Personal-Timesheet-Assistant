from fastapi import FastAPI, Depends, HTTPException
from typing import Optional
import re
import csv
import io
import os
import signal
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from . import database

database.init_db()

from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File
import shutil

# Ensure assets directory exists
os.makedirs("frontend/assets", exist_ok=True)


# ... imports

app = FastAPI(title="Personal Timesheet Assistant")

@app.on_event("startup")
def startup_event():
    # Migrate settings from DB to JSON if needed
    db = database.SessionLocal()
    try:
        settings_service.migrate_from_db(db)
    except Exception as e:
        print(f"Startup migration warning: {e}")
    finally:
        db.close()


from . import outlook_service
from . import time_service
from . import settings_service
from pydantic import BaseModel

class SettingsRequest(BaseModel):
    full_name: str
    email: str
    ui_bg_image_url: str = ""
    ui_bg_gradient_start: str = "#fbfbfd"
    ui_bg_gradient_end: str = "#f0f2f5"
    ui_btn_scan_color: str = "#0071e3"
    ui_btn_export_color: str = "#e5e5e5"
    ui_btn_manual_color: str = "#f5f5f5"
    ui_btn_log_color: str = "#007AFF"
    ui_panel_opacity: float = 0.4
    ui_timer_color: str = "#FF3B30"

@app.get("/api/settings")
def get_settings():
    settings = settings_service.get_user_identifiers()
    # Add UI settings
    settings["ui_bg_image_url"] = settings_service.get_setting("ui_bg_image_url", "")
    settings["ui_bg_gradient_start"] = settings_service.get_setting("ui_bg_gradient_start", "#fbfbfd")

    settings["ui_bg_gradient_end"] = settings_service.get_setting("ui_bg_gradient_end", "#f0f2f5")
    settings["ui_btn_scan_color"] = settings_service.get_setting("ui_btn_scan_color", "#0071e3")
    settings["ui_btn_export_color"] = settings_service.get_setting("ui_btn_export_color", "#e5e5e5")
    settings["ui_btn_manual_color"] = settings_service.get_setting("ui_btn_manual_color", "#f5f5f5")
    settings["ui_btn_manual_color"] = settings_service.get_setting("ui_btn_manual_color", "#f5f5f5")
    settings["ui_btn_log_color"] = settings_service.get_setting("ui_btn_log_color", "#007AFF")
    settings["ui_panel_opacity"] = float(settings_service.get_setting("ui_panel_opacity", "0.4"))
    settings["ui_timer_color"] = settings_service.get_setting("ui_timer_color", "#FF3B30")
    return settings

@app.post("/api/settings")
def update_settings(request: SettingsRequest):
    settings_service.set_setting("user_full_name", request.full_name)
    settings_service.set_setting("user_email", request.email)
    settings_service.set_setting("ui_bg_image_url", request.ui_bg_image_url)
    settings_service.set_setting("ui_bg_gradient_start", request.ui_bg_gradient_start)

    settings_service.set_setting("ui_bg_gradient_end", request.ui_bg_gradient_end)
    settings_service.set_setting("ui_btn_scan_color", request.ui_btn_scan_color)
    settings_service.set_setting("ui_btn_export_color", request.ui_btn_export_color)
    settings_service.set_setting("ui_btn_manual_color", request.ui_btn_manual_color)
    settings_service.set_setting("ui_btn_manual_color", request.ui_btn_manual_color)
    settings_service.set_setting("ui_btn_log_color", request.ui_btn_log_color)
    settings_service.set_setting("ui_panel_opacity", str(request.ui_panel_opacity))
    settings_service.set_setting("ui_timer_color", request.ui_timer_color)
    return {"message": "Settings updated successfully"}

@app.post("/api/upload/background")
async def upload_background(file: UploadFile = File(...)):
    try:
        # Create unique filename or overwrite specific one
        # To keep it simple and clean, let's use a standard name so it overwrites
        # But to avoid caching issues, we might want to append a timestamp in the frontend URL, 
        # or save with a unique name and return it.
        # Let's save with a unique name based on timestamp.
        timestamp = int(datetime.now().timestamp())
        extension = os.path.splitext(file.filename)[1]
        filename = f"bg_{timestamp}{extension}"
        file_path = f"frontend/assets/{filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"url": f"/assets/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/settings/background")
def delete_background():
    # 1. Get current setting
    current_url = settings_service.get_setting("ui_bg_image_url", "")
    
    # 2. If it's a local asset, delete the file
    if current_url and current_url.startswith("/assets/"):
        filename = current_url.replace("/assets/", "")
        # Security fix: Prevent path traversal
        filename = os.path.basename(filename)
        
        if not filename:
             return {"message": "Invalid filename"}

        file_path = os.path.join("frontend", "assets", filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")
                # Log but verify we still clear setting
    
    # 3. Clear setting
    settings_service.set_setting("ui_bg_image_url", "")
    return {"message": "Background removed successfully"}

@app.post("/api/reset")
def reset_database(db: Session = Depends(database.get_db)):
    # Clear TimeLogs first due to foreign key constraints
    db.query(database.TimeLog).delete()
    # Then clear Matters
    db.query(database.Matter).delete()
    db.commit()
    return {"message": "Database reset successfully"}



@app.get("/api/matters")
def get_matters(db: Session = Depends(database.get_db)):
    matters = db.query(database.Matter).all()
    return matters

class MatterManualRequest(BaseModel):
    name: str
    external_id: Optional[str] = None
    description: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None

class MatterUpdateRequest(BaseModel):
    name: Optional[str] = None
    external_id: Optional[str] = None
    description: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None

@app.post("/api/matters/manual")
def add_matter_manual(request: MatterManualRequest, db: Session = Depends(database.get_db)):
    # Check if matter with same name exists
    existing = db.query(database.Matter).filter(database.Matter.name == request.name).first()
    if existing:
         raise HTTPException(status_code=400, detail="Matter with this name already exists.")

    new_matter = database.Matter(
        name=request.name,
        external_id=request.external_id,
        description=request.description,
        client_name=request.client_name,
        client_email=request.client_email
    )
    db.add(new_matter)
    db.commit()
    db.refresh(new_matter)
    return {"message": "Matter added successfully", "matter": new_matter}

@app.put("/api/matters/{matter_id}")
def update_matter(matter_id: int, request: MatterUpdateRequest, db: Session = Depends(database.get_db)):
    matter = db.query(database.Matter).filter(database.Matter.id == matter_id).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
        
    if request.name is not None:
        matter.name = request.name
    if request.external_id is not None:
        matter.external_id = request.external_id
    if request.description is not None:
        matter.description = request.description
    if request.client_name is not None:
        matter.client_name = request.client_name
    if request.client_email is not None:
        matter.client_email = request.client_email
        
    db.commit()
    db.refresh(matter)
    return {"message": "Matter updated successfully", "matter": matter}

@app.post("/api/scan")
def scan_outlook(db: Session = Depends(database.get_db)):
    try:
        settings = settings_service.get_user_identifiers()
        found_matters = outlook_service.get_outlook_matters(settings, limit=50, scan_depth=2000)
        count = 0
        added_matters = []
        
        for m in found_matters:
            # Check by External ID first (primary key for scans), then Name
            existing = None
            if m.get('external_id'):
                existing = db.query(database.Matter).filter(database.Matter.external_id == m['external_id']).first()
            
            if not existing:
                existing = db.query(database.Matter).filter(database.Matter.name == m['name']).first()
            
            # If still not existing, check by source_email_id to catch duplicates with different names/IDs?
            # Actually source_email_id is unique per email, not per matter. 
            # But we can check if we already processed this email for *creation*.
            # The logic below creates a new matter if no matching matter found.
            
            if not existing:
                new_matter = database.Matter(
                    name=m['name'],
                    external_id=m.get('external_id'),
                    description=m.get('description', ''),
                    source_email_id=m['source_email_id'],
                    client_name=m.get('client_name'),
                    client_email=m.get('client_email')
                )
                db.add(new_matter)
                added_matters.append(m['name'])
                count += 1
            else:
                # OPTIONAL: logic to update existing matter with new client info if missing?
                # For now, preserve existing data.
                pass
        
        db.commit()
        return {
            "message": f"Scan completed. Added {count} new matters.",
            "added_matters": added_matters
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from . import nlp_service
from pydantic import BaseModel

class LogRequest(BaseModel):
    text: str
    date: Optional[str] = None # Optional date string from UI
    matter_id: Optional[int] = None # Optional explicit matter ID (for disambiguation)

class LogUpdate(BaseModel):
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    log_date: Optional[str] = None # ISO format

@app.post("/api/log")
def log_time(request: LogRequest, db: Session = Depends(database.get_db)):
    text = request.text
    # 1. Extract duration
    duration = nlp_service.extract_duration(text)
    
    # Allow duration via request if not in text (future extensibility), but primarily check text first
    if duration == 0:
         return JSONResponse(status_code=400, content={"detail": "Missing duration", "code": "ERR_MISSING_DURATION"})
    
    # 0. Check for explicit matter_id (Disambiguation case)
    if request.matter_id:
        matched_matter = db.query(database.Matter).filter(database.Matter.id == request.matter_id).first()
        if not matched_matter:
             raise HTTPException(status_code=404, detail="Selected matter not found")
             
        # Skip NLP matching if explicit ID provided
        log_date = nlp_service.extract_date(text)
        if not log_date and request.date:
             try:
                 log_date = datetime.fromisoformat(request.date)
             except ValueError:
                 pass
        if not log_date:
             log_date = datetime.now()
             
        units = time_service.calculate_units(duration)
        # Strip "Worked on [Matter Name]" prefix
        clean_desc = text
        prefix = f"Worked on {matched_matter.name}"
        if clean_desc.lower().startswith(prefix.lower()):
             clean_desc = clean_desc[len(prefix):].strip()
             # Remove leading punctuation (comma, hyphen, etc.)
             clean_desc = re.sub(r'^[\s,\.-]+', '', clean_desc).strip()

        new_log = database.TimeLog(
            matter_id=matched_matter.id,
            duration_minutes=duration,
            units=units,
            description=clean_desc,
            log_date=log_date
        )
        db.add(new_log)
        db.commit()
        return {
            "message": "Time logged successfully",
            "matter": matched_matter.name,
            "duration": duration,
            "units": units,
            "description": text,
            "date": log_date.strftime("%Y-%m-%d %H:%M")
        }

    # 1.5 Extract date
    # Try text extraction first
    log_date = nlp_service.extract_date(text)
    
    # If not in text, try request body
    if not log_date and request.date:
        try:
            log_date = datetime.fromisoformat(request.date)
        except ValueError:
            pass
            
    # Default to now if still not found
    if not log_date:
        log_date = datetime.now()

    # 2. Match matter
    matters = db.query(database.Matter).all()
    candidates = nlp_service.match_matter(text, matters)
    
    matched_matter = None
    
    if not candidates:
        # No candidates found
        # Return 409 with empty candidates list to prompt creation or manual selection
        return JSONResponse(
            status_code=409,
            content={
                "detail": "Could not identify the matter. Please select one.",
                "candidates": []
            }
        )
    elif len(candidates) == 1:
        # One high-confidence match
        matched_matter = candidates[0]
    else:
        # Multiple candidates
        # Return 409 with list of candidates
        candidate_list = [{"id": m.id, "name": m.name, "description": m.description or ""} for m in candidates]
        return JSONResponse(
            status_code=409,
            content={
                "detail": "Multiple matters matched. Please select one.",
                "candidates": candidate_list
            }
        )
            
    # 3. Create TimeLog
    units = time_service.calculate_units(duration)
    
    # Strip "Worked on [Matter Name]" prefix
    clean_desc = text
    prefix = f"Worked on {matched_matter.name}"
    if clean_desc.lower().startswith(prefix.lower()):
            clean_desc = clean_desc[len(prefix):].strip()
            # Remove leading punctuation (comma, hyphen, etc.)
            clean_desc = re.sub(r'^[\s,\.-]+', '', clean_desc).strip()

    new_log = database.TimeLog(
        matter_id=matched_matter.id,
        duration_minutes=duration,
        units=units,
        description=clean_desc,
        log_date=log_date
    )
    db.add(new_log)
    db.commit()
    
    return {
        "message": "Time logged successfully",
        "matter": matched_matter.name,
        "duration": duration,
        "units": units,
        "description": text,
        "date": log_date.strftime("%Y-%m-%d %H:%M")
    }

@app.delete("/api/logs/{log_id}")
def delete_log(log_id: int, db: Session = Depends(database.get_db)):
    log = db.query(database.TimeLog).filter(database.TimeLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"message": "Log deleted"}

class DirectLogRequest(BaseModel):
    matter_id: int
    duration_minutes: int
    description: str = ""
    date: Optional[str] = None

@app.post("/api/log/direct")
def create_direct_log(request: DirectLogRequest, db: Session = Depends(database.get_db)):
    """Create a time log with an exact duration (used by the timer module)."""
    matter = db.query(database.Matter).filter(database.Matter.id == request.matter_id).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    log_date = datetime.now()
    if request.date:
        try:
            log_date = datetime.fromisoformat(request.date)
        except ValueError:
            pass  # fallback to now

    units = time_service.calculate_units(request.duration_minutes)
    log = database.TimeLog(
        matter_id=matter.id,
        description=request.description,
        duration_minutes=request.duration_minutes,
        units=units,
        log_date=log_date
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "message": "Log saved",
        "matter": matter.name,
        "minutes": request.duration_minutes,
        "units": units
    }

@app.put("/api/logs/{log_id}")
def update_log(log_id: int, request: LogUpdate, db: Session = Depends(database.get_db)):
    log = db.query(database.TimeLog).filter(database.TimeLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    if request.description is not None:
        log.description = request.description
    if request.duration_minutes is not None:
        log.duration_minutes = request.duration_minutes
        log.units = time_service.calculate_units(request.duration_minutes)
    if request.log_date:
        try:
            log.log_date = datetime.fromisoformat(request.log_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
            
    db.commit()
    db.refresh(log)
    return {"message": "Log updated"}

# ... (Log logic remains same)

# Export Logic Update
@app.get("/api/export")
def export_logs(db: Session = Depends(database.get_db)):
    logs = db.query(database.TimeLog).join(database.Matter).all()
    
    # Use utf-8-sig (BOM) for Excel compatibility with Thai
    output = io.StringIO()
    # Write BOM manually if strict control is needed, but usually encoding='utf-8-sig' in open() handles it.
    # Since we are using StringIO, we can write the BOM character first.
    output.write('\ufeff') 
    
    writer = csv.writer(output)
    
    # Header
    # a) Date and time, b) Matter ID, c) Matter Description, d) Activities, c) time used (in minutes), d) time used (in Units)
    writer.writerow(["Date", "Matter ID", "Matter Description", "Activities", "Time Used (Minutes)", "Time Used (Units)"])
    
    # Data
    for log in logs:
        # Use external_id if available, otherwise empty string or fallback
        matter_id = log.matter.external_id if log.matter.external_id else ""
                
        writer.writerow([
            log.log_date.strftime("%Y-%m-%d"),
            matter_id,
            log.matter.name,
            log.description,
            log.duration_minutes,
            log.units
        ])
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=timesheet_logs.csv"}
    )

@app.get("/api/summary")
def get_summary(db: Session = Depends(database.get_db)):
    from sqlalchemy import func
    from datetime import datetime, timedelta

    # 1. Fetch all matters and logs with join
    logs = db.query(database.TimeLog).join(database.Matter).all()
    
    # 2. Daily, Weekly, and Monthly filters
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday()) # Monday
    
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 1:
        last_month_start = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        last_month_start = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = this_month_start - timedelta(seconds=1)

    daily_logs = [l for l in logs if l.log_date >= today_start]
    weekly_logs = [l for l in logs if l.log_date >= week_start]
    month_logs = [l for l in logs if l.log_date >= this_month_start]
    prev_month_logs = [l for l in logs if l.log_date >= last_month_start and l.log_date <= last_month_end]
    
    # 3. Group by matter
    matters = db.query(database.Matter).all()
    matter_summary = {}
    
    for m in matters:
        matter_logs = [l for l in logs if l.matter_id == m.id]
        if not matter_logs:
            continue
            
        matter_summary[m.id] = {
            "id": m.id,
            "name": m.name,
            "external_id": m.external_id,
            "total_minutes": sum(l.duration_minutes for l in matter_logs),
            "total_units": sum(l.units for l in matter_logs),
            "records": [
                {
                    "id": l.id,
                    "date": l.log_date.strftime("%Y-%m-%d %H:%M"),
                    "minutes": l.duration_minutes,
                    "units": l.units,
                    "description": l.description
                } for l in sorted(matter_logs, key=lambda x: x.log_date, reverse=True)
            ]
        }
    
    return {
        "by_matter": list(matter_summary.values()),
        "reports": {
            "today": {
                "minutes": sum(l.duration_minutes for l in daily_logs),
                "units": sum(l.units for l in daily_logs)
            },
            "this_week": {
                "minutes": sum(l.duration_minutes for l in weekly_logs),
                "units": sum(l.units for l in weekly_logs)
            },
            "this_month": {
                "minutes": sum(l.duration_minutes for l in month_logs),
                "units": sum(l.units for l in month_logs)
            },
            "last_month": {
                "minutes": sum(l.duration_minutes for l in prev_month_logs),
                "units": sum(l.units for l in prev_month_logs)
            }
        },
        "grand_total_units": sum(l.units for l in logs)
    }

app.mount("/", StaticFiles(directory="frontend", html=True), name="static")
