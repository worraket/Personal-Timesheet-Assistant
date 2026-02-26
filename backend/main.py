from fastapi import FastAPI, Depends, HTTPException
from typing import Optional
import re
import csv
import io
import os
import signal
import asyncio
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from . import database
from . import migrate_db
from . import migrate_db_closed
from . import migrate_db_company
from . import backup_service

from . import settings_service
database.init_db()
settings_service.migrate_sticky_notes()

from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File
import shutil

# Ensure assets directory exists
os.makedirs("frontend/assets", exist_ok=True)


app = FastAPI(title="Personal Timesheet Assistant")

async def _backup_loop():
    while True:
        try:
            backup_service.perform_backup()
        except Exception as e:
            print(f"Background backup failed: {e}")
        # Wait 24 hours (86400 seconds)
        await asyncio.sleep(86400)

@app.on_event("startup")
def startup_event():
    # Migrate settings from DB to JSON if needed
    db = database.SessionLocal()
    try:
        settings_service.migrate_from_db(db)
        migrate_db.migrate()
        migrate_db_closed.add_is_closed_column()
        migrate_db_company.migrate_company_column()
        settings_service.migrate_plaintext_keys()
    except Exception as e:
        print(f"Startup migration warning: {e}")
    finally:
        db.close()
        
    # Start the continuous backup loop
    asyncio.create_task(_backup_loop())


from . import outlook_service
from . import time_service
from . import settings_service
from . import nlp_service
from . import ai_service
from . import dashboard_service
from . import update_service
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
    ui_card_opacity: float = 0.9
    ui_chart_bar_color: str = "#0071e3"
    ui_timer_color: str = "#FF3B30"
    ui_btn_timer_color: str = "#ffffff"
    ui_btn_matters_color: str = "#f8fafc"
    ui_btn_reset_color: str = "#ffffff"
    ui_btn_summary_color: str = "#ffffff"
    ui_btn_closed_color: str = "#ffffff"
    ai_enabled: bool = False
    ai_provider: str = "thefuzz"
    ai_key_claude: str = ""
    ai_key_gemini: str = ""
    ai_key_openai: str = ""
    ai_key_grok: str = ""

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
    settings["ui_btn_log_color"] = settings_service.get_setting("ui_btn_log_color", "#007AFF")
    settings["ui_panel_opacity"] = float(settings_service.get_setting("ui_panel_opacity", "0.4"))
    settings["ui_card_opacity"] = float(settings_service.get_setting("ui_card_opacity", "0.9"))
    settings["ui_chart_bar_color"] = settings_service.get_setting("ui_chart_bar_color", "#0071e3")
    settings["ui_timer_color"] = settings_service.get_setting("ui_timer_color", "#FF3B30")
    settings["ui_btn_timer_color"] = settings_service.get_setting("ui_btn_timer_color", "#ffffff")
    settings["ui_btn_matters_color"] = settings_service.get_setting("ui_btn_matters_color", "#f8fafc")
    settings["ui_btn_reset_color"] = settings_service.get_setting("ui_btn_reset_color", "#ffffff")
    settings["ui_btn_summary_color"] = settings_service.get_setting("ui_btn_summary_color", "#ffffff")
    settings["ui_btn_closed_color"] = settings_service.get_setting("ui_btn_closed_color", "#ffffff")
    # Add AI settings
    settings["ai_enabled"] = settings_service.get_setting("ai_enabled", "false") == "true"
    settings["ai_provider"] = settings_service.get_setting("ai_provider", "thefuzz")
    settings["ai_key_claude"] = settings_service.get_setting("ai_key_claude", "")
    settings["ai_key_gemini"] = settings_service.get_setting("ai_key_gemini", "")
    settings["ai_key_openai"] = settings_service.get_setting("ai_key_openai", "")
    settings["ai_key_grok"] = settings_service.get_setting("ai_key_grok", "")
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
    settings_service.set_setting("ui_btn_log_color", request.ui_btn_log_color)
    settings_service.set_setting("ui_panel_opacity", str(request.ui_panel_opacity))
    settings_service.set_setting("ui_card_opacity", str(request.ui_card_opacity))
    settings_service.set_setting("ui_chart_bar_color", request.ui_chart_bar_color)
    settings_service.set_setting("ui_timer_color", request.ui_timer_color)
    settings_service.set_setting("ui_btn_timer_color", request.ui_btn_timer_color)
    settings_service.set_setting("ui_btn_matters_color", request.ui_btn_matters_color)
    settings_service.set_setting("ui_btn_reset_color", request.ui_btn_reset_color)
    settings_service.set_setting("ui_btn_summary_color", request.ui_btn_summary_color)
    settings_service.set_setting("ui_btn_closed_color", request.ui_btn_closed_color)
    # Save AI settings
    settings_service.set_setting("ai_enabled", str(request.ai_enabled).lower())
    settings_service.set_setting("ai_provider", request.ai_provider)
    settings_service.set_setting("ai_key_claude", request.ai_key_claude)
    settings_service.set_setting("ai_key_gemini", request.ai_key_gemini)
    settings_service.set_setting("ai_key_openai", request.ai_key_openai)
    settings_service.set_setting("ai_key_grok", request.ai_key_grok)
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

@app.get("/api/logs/daily")
def get_daily_logs(date: str, db: Session = Depends(database.get_db)):
    """Fetch all logs for a specific YYYY-MM-DD date."""
    try:
        from datetime import datetime, time
        # Parse the date string
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        start_time = datetime.combine(target_date, time.min)
        end_time = datetime.combine(target_date, time.max)

        logs = db.query(database.TimeLog).filter(
            database.TimeLog.log_date >= start_time,
            database.TimeLog.log_date <= end_time
        ).all()

        results = []
        for l in logs:
            results.append({
                "id": l.id,
                "matter_id": l.matter_id,
                "matter_name": l.matter.name if l.matter else "Unknown Matter",
                "matter_external_id": l.matter.external_id if l.matter else None,
                "duration_minutes": l.duration_minutes,
                "units": l.units,
                "description": l.description,
                "log_date": l.log_date.strftime("%Y-%m-%d %H:%M")
            })
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MatterManualRequest(BaseModel):
    name: str
    external_id: Optional[str] = None
    description: Optional[str] = None
    company_name: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    status_flag: str = "yellow"
    is_closed: bool = False

class MatterUpdateRequest(BaseModel):
    name: Optional[str] = None
    external_id: Optional[str] = None
    description: Optional[str] = None
    company_name: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    status_flag: Optional[str] = None
    is_closed: Optional[bool] = None

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
        company_name=request.company_name,
        client_name=request.client_name,
        client_email=request.client_email,
        status_flag=request.status_flag,
        is_closed=request.is_closed
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
    if request.company_name is not None:
        matter.company_name = request.company_name
    if request.client_name is not None:
        matter.client_name = request.client_name
    if request.client_email is not None:
        matter.client_email = request.client_email
    if request.status_flag is not None:
        matter.status_flag = request.status_flag
    if request.is_closed is not None:
        matter.is_closed = request.is_closed
        
    db.commit()
    db.refresh(matter)
    return {"message": "Matter updated successfully", "matter": matter}

@app.delete("/api/matters/{matter_id}")
def delete_matter(matter_id: int, db: Session = Depends(database.get_db)):
    matter = db.query(database.Matter).filter(database.Matter.id == matter_id).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
        
    db.query(database.TimeLog).filter(database.TimeLog.matter_id == matter_id).delete()
    db.delete(matter)
    db.commit()
    return {"message": "Matter permanently deleted"}

@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(database.get_db)):
    weekly_stats = dashboard_service.get_weekly_stats(db)
    sticky_notes = dashboard_service.get_all_sticky_notes(db)
    return {
        "weekly_stats": weekly_stats,
        "sticky_notes": sticky_notes
    }

class StickyNote(BaseModel):
    id: str
    title: str
    text: str
    color: str

@app.post("/api/sticky-notes")
def add_sticky_note(note: StickyNote):
    dashboard_service.add_manual_note(note.dict())
    return {"message": "Note added"}

@app.delete("/api/sticky-notes/{note_id}")
def delete_sticky_note(note_id: str):
    dashboard_service.delete_manual_note(note_id)
    return {"message": "Note deleted"}

from typing import Optional

class StickyNoteUpdate(BaseModel):
    text: Optional[str] = None
    title: Optional[str] = None
    color: Optional[str] = None

@app.put("/api/sticky-notes/{note_id}")
def update_sticky_note(note_id: str, update: StickyNoteUpdate):
    dashboard_service.update_sticky_note(note_id, update.dict(exclude_unset=True))
    return {"message": "Note updated"}

@app.get("/api/update/check")
def check_for_updates():
    return update_service.check_for_updates()

@app.post("/api/update/run")
def trigger_update():
    update_service.run_update_sequence()
    return {"message": "Update initiated. Server is shutting down."}

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
                # Update client info if the existing record is missing it
                if not existing.client_name and m.get('client_name'):
                    existing.client_name = m['client_name']
                if not existing.client_email and m.get('client_email'):
                    existing.client_email = m['client_email']
                if not existing.source_email_id and m.get('source_email_id'):
                    existing.source_email_id = m['source_email_id']
        
        db.commit()
        return {
            "message": f"Scan completed. Added {count} new matters.",
            "added_matters": added_matters
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    matched_matter = None

    ai_enabled = settings_service.get_setting("ai_enabled", "false") == "true"
    ai_provider = settings_service.get_setting("ai_provider", "thefuzz")
    api_key = settings_service.get_setting(f"ai_key_{ai_provider}", "") if ai_provider != "thefuzz" else ""

    if ai_enabled and ai_provider != "thefuzz" and api_key:
        # AI first: if key is configured, let AI identify the matter
        candidates = []
        try:
            matters_data = [
                {"name": m.name, "external_id": m.external_id, "description": m.description, "client_name": m.client_name}
                for m in matters
            ]
            ai_result = ai_service.parse_log_entry_with_ai(text, matters_data, ai_provider, api_key)
            if ai_result.get("matter_name"):
                ai_match = next((m for m in matters if m.name == ai_result["matter_name"]), None)
                if ai_match:
                    if duration == 0 and ai_result.get("duration_minutes"):
                        duration = ai_result["duration_minutes"]
                    if not log_date and ai_result.get("date"):
                        try:
                            log_date = datetime.fromisoformat(ai_result["date"])
                        except (ValueError, TypeError):
                            pass
                    candidates = [ai_match]
        except Exception as e:
            # AI errored: fall back to NLP before popup
            print(f"AI service error in /api/log, falling back to NLP: {e}")
            candidates = nlp_service.match_matter(text, matters)
    else:
        # No AI key: use NLP only
        candidates = nlp_service.match_matter(text, matters)

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

from typing import List

class MergeRequest(BaseModel):
    log_ids: List[int]

@app.post("/api/logs/merge")
def merge_logs(request: MergeRequest, db: Session = Depends(database.get_db)):
    if not request.log_ids or len(request.log_ids) < 2:
        raise HTTPException(status_code=400, detail="Must provide at least 2 log IDs to merge")

    # Fetch all logs to merge
    logs = db.query(database.TimeLog).filter(database.TimeLog.id.in_(request.log_ids)).all()
    
    if len(logs) != len(request.log_ids):
        raise HTTPException(status_code=404, detail="One or more logs not found")

    # Validation: Same matter
    matter_ids = set([log.matter_id for log in logs])
    if len(matter_ids) > 1:
        raise HTTPException(status_code=400, detail="All logs must belong to the same matter")

    # Validation: Same local date
    dates = set([log.log_date.strftime("%Y-%m-%d") for log in logs])
    if len(dates) > 1:
        raise HTTPException(status_code=400, detail="All logs must belong to the same date")

    # Sort logs by created_at or id to keep the earliest one as the primary
    logs = sorted(logs, key=lambda x: x.id)
    primary_log = logs[0]
    logs_to_delete = logs[1:]

    # Merge data
    total_duration = sum([log.duration_minutes for log in logs])
    
    # Collect descriptions, ignoring empty ones
    descriptions = [log.description.strip() for log in logs if log.description and log.description.strip()]
    
    # Only join unique descriptions to avoid repetition
    unique_descriptions = []
    for d in descriptions:
        if d not in unique_descriptions:
            unique_descriptions.append(d)
            
    combined_description = " | ".join(unique_descriptions)

    # Update primary log
    primary_log.duration_minutes = total_duration
    primary_log.units = time_service.calculate_units(total_duration)
    primary_log.description = combined_description

    # Delete other logs
    for log in logs_to_delete:
        db.delete(log)

    db.commit()
    db.refresh(primary_log)

    return {
        "message": "Logs merged successfully",
        "log_id": primary_log.id,
        "units": primary_log.units,
        "duration": primary_log.duration_minutes
    }

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


# Export Logic Update
@app.head("/api/export")
def export_logs_head():
    """Handle HEAD requests for the export endpoint (browser preflight before download)."""
    filename = f"timesheet{datetime.now().strftime('%Y%m%d')}.csv"
    return JSONResponse(status_code=200, content=None, headers={"Content-Disposition": f"attachment; filename={filename}", "Content-Type": "text/csv"})

@app.get("/api/export")
def export_logs(db: Session = Depends(database.get_db)):
    logs = db.query(database.TimeLog).join(database.Matter).all()
    filename = f"timesheet{datetime.now().strftime('%Y%m%d')}.csv"

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
        headers={"Content-Disposition": f"attachment; filename={filename}"}
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
            
        matter_summary[m.id] = {
            "id": m.id,
            "name": m.name,
            "external_id": m.external_id,
            "client_name": m.client_name,
            "status_flag": m.status_flag or "yellow",
            "is_closed": getattr(m, 'is_closed', False),
            "total_minutes": sum(l.duration_minutes for l in matter_logs),
            "total_units": sum(l.units for l in matter_logs),
            "last_logged_at": max(l.created_at for l in matter_logs).strftime("%Y-%m-%d %H:%M:%S") if matter_logs else None,
            "records": [
                {
                    "id": l.id,
                    "date": l.log_date.strftime("%Y-%m-%d %H:%M"),
                    "logged_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else None,
                    "minutes": l.duration_minutes,
                    "units": l.units,
                    "description": l.description
                } for l in sorted(matter_logs, key=lambda x: x.log_date, reverse=True)
            ]
        }

    # Sort results: matters with logs first (by last_logged_at), then others
    def sort_key(m):
        return (m["last_logged_at"] is not None, m["last_logged_at"])

    return {
        "by_matter": sorted(matter_summary.values(), key=sort_key, reverse=True),
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
