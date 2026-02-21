# 🕐 Personal Timesheet Assistant

A local web app for **lawyers and legal professionals** to track billable time against matters — no cloud, no subscriptions. Built with FastAPI + SQLite + vanilla JS, running fully on your own machine.

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **Natural Language Logging** | Type `"Reviewed merger docs for 1.5h"` and it auto-matches the matter and logs the time |
| ⏱️ **Floating Timer Widget** | Start/pause/resume a live timer, then stop and log with a description — draggable, persists across refreshes |
| 📧 **Outlook Scanner** | Scans your local Outlook inbox to automatically discover matters from email subjects/bodies |
| 📋 **Matter Management** | Add, edit, and view all matters including client name, client email, external ID, and description |
| 📊 **Summary Dashboard** | Units and minutes logged today, this week, this month, and last month — per matter and overall |
| ✏️ **Edit / Delete Logs** | Edit or delete any time log from the Summary or Matter Details panels |
| ➕ **Add Time from Matter Details** | Directly log time against any matter from its detail popup with a date picker and minute input |
| 📤 **CSV Export** | Export all logs to a BOM-encoded UTF-8 CSV file (Excel-compatible, including Thai characters) |
| 🎨 **Customisable Theme** | Glassmorphism UI with configurable gradient colours, button colours, panel opacity, timer indicator colour, and custom background image |
| 🧙 **First-Run Wizard** | Prompts for your name and email on first launch so Outlook scanning works immediately |

---

## 📅 Version History

### Latest Updates
- **Matter Status Flags**: Added color-coded status indicators (Green, Yellow, Red) to matters for easy visual tracking.
- **Matter Sorting**: Added the ability to sort the matter list by ID (A-Z, Z-A) and by Status Priority.
- **Matter Closure**: Added the ability to "Close" matters to hide them from the active list, along with a toggle button in the header to show/hide closed matters.
- **Improved Timer Widget**: Refactored the floating timer widget drag-and-drop logic for immediate, zero-latency responsiveness and guaranteed stability across window resizes.

---

## 🖥️ Requirements

- **Windows 10 / 11** (Outlook scanner requires local Outlook via `pywin32`)
- **Python 3.9+** in your PATH
- **Microsoft Outlook** (desktop app) — only needed for the Outlook scan feature

---

## 🚀 Quick Start

### 1. Download the project

1. Go to the GitHub repository page
2. Click the green **`<> Code`** button
3. Select **"Download ZIP"** from the dropdown
4. Extract the ZIP to a folder of your choice (e.g. `C:\Tools\PersonalTimesheetAssistant\`)

### 2. Run setup (one time only)

Double-click **`setup_assistant.bat`** or run it from a terminal:

```
setup_assistant.bat
```

This will:
- Create a Python virtual environment (`venv/`)
- Install all dependencies from `requirements.txt`
- Initialise the SQLite database

### 3. Start the app

Double-click **`run_assistant.bat`**. It will:
- Activate the virtual environment
- Start the FastAPI server on `http://localhost:8000`
- Open your browser automatically

### 4. Stop the app

Double-click **`kill_assistant.bat`** to terminate all server processes.

---

## 📁 Project Structure

```
PersonalTimesheetAssistant/
├── backend/
│   ├── main.py              # FastAPI endpoints
│   ├── database.py          # SQLAlchemy models (Matter, TimeLog)
│   ├── nlp_service.py       # Duration extraction, date extraction, matter matching
│   ├── outlook_service.py   # Outlook COM scanning via pywin32
│   ├── settings_service.py  # Read/write settings.json
│   ├── time_service.py      # Duration → billable units conversion
│   └── migrate_db.py        # One-time DB → JSON settings migration helper
├── frontend/
│   ├── index.html           # Single-page app layout
│   ├── style.css            # Glassmorphism theme + all component styles
│   ├── app.js               # Core UI logic and API calls
│   └── timer.js             # Timer widget state machine + drag-to-move
├── tests/                   # Backend unit tests
├── settings.json            # Persisted user settings (theme, identity)
├── timesheet.db             # SQLite database (matters + time logs)
├── requirements.txt
├── setup_assistant.bat
├── run_assistant.bat
└── kill_assistant.bat
```

---

## ⚙️ Configuration

Settings are stored in `settings.json` (not in the database). You can edit them through **Settings** (⚙️ button) in the UI:

| Setting | Description |
|---|---|
| Full Name | Used as the Outlook scan identity |
| Work Email | Used to filter Outlook emails sent/received by you |
| Background colours | Gradient start/end for the app background |
| Button colours | Individual colour per action button |
| Panel opacity | Glassmorphism panel transparency (0–1) |
| Background image | Upload a custom background photo |
| Timer indicator colour | Colour of the pulsing dot on the timer widget |

---

## 🧠 How Time Logging Works

1. **Type naturally** in the log input: `"Worked on Matter X for 45 mins"`
2. The NLP service extracts the **duration** and **date** from your text
3. It **fuzzy-matches** your text against all known matter names and external IDs
4. If one match: logs immediately. If multiple matches: shows a disambiguation picker
5. Units are calculated at **6 minutes per unit** (1 unit = 0.1 of an hour)

### Direct logging methods
- **Timer widget** → Stop → fill description → Save
- **Matter Details popup** → Add Time → enter minutes + optional description → Save Log
- **Chat input** → natural language text

---

## 🔌 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/matters` | List all matters |
| `POST` | `/api/matters/manual` | Add a matter manually |
| `PUT` | `/api/matters/{id}` | Update a matter |
| `POST` | `/api/scan` | Scan Outlook for new matters |
| `POST` | `/api/log` | Log time via NLP text |
| `POST` | `/api/log/direct` | Log time directly (matter_id + duration_minutes) |
| `PUT` | `/api/logs/{id}` | Edit a time log |
| `DELETE` | `/api/logs/{id}` | Delete a time log |
| `GET` | `/api/summary` | Aggregated summary by matter and period |
| `GET` | `/api/export` | Download CSV export |
| `GET` | `/api/settings` | Get all settings |
| `POST` | `/api/settings` | Save settings |
| `POST` | `/api/upload/background` | Upload background image |
| `DELETE` | `/api/settings/background` | Remove background image |
| `POST` | `/api/reset` | Reset all matters and logs |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, FastAPI, Uvicorn |
| Database | SQLite via SQLAlchemy |
| NLP | `thefuzz` + `python-Levenshtein` + regex |
| Outlook | `pywin32` (COM automation) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Persistence | `settings.json` for settings, `localStorage` for timer state/position |

---

## 📝 Notes

- The Outlook scanner reads **locally cached emails** via the Outlook COM API — it does not connect directly to a mail server and requires the Outlook desktop app to be installed.
- Time units are calculated using the **6-minute billing unit** standard common in legal practice (1 hour = 10 units).
- `timesheet.db` and `settings.json` are excluded from version control via `.gitignore` — your data stays local.

---

## 📄 License

Personal / internal use. Not licensed for redistribution.
