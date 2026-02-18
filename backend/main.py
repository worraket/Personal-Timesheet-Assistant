from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from . import database

database.init_db()

from fastapi.staticfiles import StaticFiles

# ... imports

app = FastAPI(title="Personal Timesheet Assistant")


from . import outlook_service

# ... (imports already done)

@app.get("/api/matters")
def get_matters(db: Session = Depends(database.get_db)):
    matters = db.query(database.Matter).all()
    return matters

@app.post("/api/scan")
def scan_outlook(db: Session = Depends(database.get_db)):
    try:
        found_matters = outlook_service.get_outlook_matters(limit=50, scan_depth=2000)
        count = 0
        added_matters_list = []
        
        for m in found_matters:
            existing = db.query(database.Matter).filter(
                (database.Matter.source_email_id == m['source_email_id']) | 
                (database.Matter.name == m['name'])
            ).first()
            
            if not existing:
                new_matter = database.Matter(
                    name=m['name'],
                    description=m.get('description', ''),
                    source_email_id=m['source_email_id']
                )
                db.add(new_matter)
                added_matters_list.append(m['name'])
                count += 1
        
        db.commit()
        return {
            "message": f"Scan completed. Added {count} new matters.",
            "added_matters": added_matters_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from . import nlp_service
from pydantic import BaseModel

class LogRequest(BaseModel):
    text: str

@app.post("/api/log")
def log_time(request: LogRequest, db: Session = Depends(database.get_db)):
    text = request.text
    # 1. Extract duration
    duration = nlp_service.extract_duration(text)
    if duration == 0:
        raise HTTPException(status_code=400, detail="Could not extract duration from text. Please include time (e.g., '1h', '30m').")

    # 2. Match matter
    matters = db.query(database.Matter).all()
    matched_matter = nlp_service.match_matter(text, matters)
    
    if not matched_matter:
        # If no matter matched, we can still log it as "Unassigned" or ask user to select.
        # For now, let's create a "General" matter or just fail.
        # Strategy: Search for "General" matter, if not create one.
        matched_matter = db.query(database.Matter).filter(database.Matter.name == "General").first()
        if not matched_matter:
            matched_matter = database.Matter(name="General", description="Unassigned time logs")
            db.add(matched_matter)
            db.commit()
            db.refresh(matched_matter)
            
    # 3. Create TimeLog
    new_log = database.TimeLog(
        matter_id=matched_matter.id,
        duration_minutes=duration,
        description=text,
        log_date=datetime.utcnow()
    )
    db.add(new_log)
    db.commit()
    
    return {
        "message": "Time logged successfully",
        "matter": matched_matter.name,
        "duration": duration,
        "description": text
    }

import csv
import io
from fastapi.responses import StreamingResponse

@app.get("/api/export")
def export_logs(db: Session = Depends(database.get_db)):
    logs = db.query(database.TimeLog).join(database.Matter).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Date", "Matter", "Duration (mins)", "Description"])
    
    # Data
    for log in logs:
        writer.writerow([
            log.log_date.strftime("%Y-%m-%d %H:%M:%S"),
            log.matter.name,
            log.duration_minutes,
            log.description
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=timesheet_logs.csv"}
    )


app.mount("/", StaticFiles(directory="frontend", html=True), name="static")
