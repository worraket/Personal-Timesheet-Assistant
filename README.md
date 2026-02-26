# 🕐 Personal Timesheet Assistant

A local web app for **lawyers and legal professionals** to track billable time against matters — no cloud, no subscriptions. Built with FastAPI + SQLite + vanilla JS, running fully on your own machine.

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **Natural Language Logging** | Type `"Reviewed merger docs for 1.5h"` and it auto-matches the matter and logs the time |
| 🤖 **AI-First Smart Matching** | Optional AI enhancement: if enabled, uses **Claude, Gemini, OpenAI, or Grok** first to match entries (then falls back to NLP). Rich context (matter ID, description, client name) helps AI make accurate decisions |
| 🔐 **Encrypted API Keys** | All API keys stored locally in encrypted `secrets.enc` using Windows DPAPI — never plain text, never cloud |
| ⏱️ **Timer Button** | Start/pause/resume a live timer next to Log Time, then stop and log with a description |
| 📧 **Outlook Scanner** | Scans your local Outlook inbox to automatically discover matters from email subjects/bodies |
| 📋 **Matter Management** | Add, edit, and view all matters including client name, client email, external ID, and description |
| 📊 **Main Dashboard** | Integrated activity dashboard featuring a Monday-Friday bar chart and an editable Sticky Note Reminder Board |
| 💾 **Automatic Backups** | Daily local backups (max 7-day retention) of the SQLite database and settings to prevent data loss |
| 🔄 **Auto Update** | Built-in, 1-click upgrade button in Settings that downloads and safely applies the latest releases without requiring Git |
| 📈 **Summary Report** | Units and minutes logged today, this week, this month, and last month — per matter and overall. Sorted by most recent entry |
| ✏️ **Edit / Delete Logs** | Edit or delete any time log from the Summary or Matter Details panels |
| ➕ **Add Time from Matter Details** | Directly log time against any matter from its detail popup with a date picker and minute input |
| 📤 **CSV Export** | Export all logs to a BOM-encoded UTF-8 CSV file (Excel-compatible, including Thai characters) |
| 🎨 **Fully Customisable Theme** | Glassmorphism UI with configurable gradient colours, individual button colours (Log, Scan, Manual, Timer, Matters, Reset, Summary, Show Closed), panel opacity, and custom background image |
| 🧙 **First-Run Wizard** | Prompts for your name and email on first launch so Outlook scanning works immediately |

---

## 📅 Version History

See the **[CHANGELOG.md](CHANGELOG.md)** for a complete history of updates.

### What's New in v1.4.0
- **Chat Bubble Customization**: Added deep customization for chat bubbles. You can now pick exact hex colors for both User and AI messages in the Settings modal with real-time live preview.

### What's New in v1.3.x
- **Dashboard: Daily Records**: An interactive "Weekly Activity" chart. Click any bar to instantly see the full list of time entries for that day.
- **Premium UI Overhaul**: Fixed the sidebar visibility toggles with new icons and improved the visual distinction of archived (closed) matters.
- **Zero-Dependency Auto-Updater**: Instant, GitHub-connected automatic updates on boot via pure Python (no local Git required!).
- **Matter Management Fixes**: Improved sorting, z-index layering for modals, and included log-less matters in the overview summary.

### What's New in v1.2.0
- **Advanced Dashboard Theming**: New controls in settings to pinpoint exact colors for your Weekly Activity chart and set transparency levels exclusively for dashboard cards.
- **Dedicated Storage**: Sticky notes now utilize their very own structured local cache (`stickynote.json`).
- **Improved Interaction**: Sticky note pop-ups now support Esc-key and outside-click closures for a vastly improved UX.

### What's New in v1.1.0
- **Main Dashboard**: A side-by-side dashboard layout featuring a weekly activity chart and a dynamic Sticky Note reminder board.
- **Automatic Database Backups**: Automatically creates a copy of `timesheet.db` and `settings.json` on application startup and every 24 hours.
- **Auto Update Engine**: A Git-free auto-update feature allowing users to download and install new features seamlessly via Settings.
- **Matters Overview Modal**: A table-based view of all active and closed matters.

---

## 🖥️ Requirements

- **Windows 10 / 11** (Outlook scanner requires local Outlook via `pywin32`)
- **Python 3.9+** in your PATH
- **Microsoft Outlook** (desktop app) — only needed for the Outlook scan feature

---

## 🚀 Quick Start

### 1. Install Python (if you don't have it)

1. Go to the official **[Python downloads page](https://www.python.org/downloads/)**
2. Click the **"Download Python"** button for Windows
3. Run the installer and **IMPORTANT: Ensure the box "Add Python to PATH" is checked** at the bottom of the first installer window before clicking "Install Now"

### 2. Download the project

1. Go to the GitHub repository page
2. Click the green **`<> Code`** button in the top-right
3. Select **"Download ZIP"** from the dropdown menu
4. Extract the ZIP file to a folder of your choice (e.g. `C:\Tools\PersonalTimesheetAssistant\`)

### 3. Run setup (one time only)

Double-click **`setup_assistant.bat`** or run it from a terminal:

```
setup_assistant.bat
```

This will:
- Create a Python virtual environment (`venv/`)
- Install all dependencies from `requirements.txt`
- Initialise the SQLite database

### 4. Start the app

Double-click **`run_assistant.bat`**. It will:
- Activate the virtual environment
- Start the FastAPI server on `http://localhost:8000`
- Open your browser automatically

### 5. Stop the app

Double-click **`kill_assistant.bat`** to terminate all server processes.

---

## 📁 Project Structure

```
PersonalTimesheetAssistant/
├── backend/
│   ├── main.py              # FastAPI endpoints
│   ├── database.py          # SQLAlchemy models (Matter, TimeLog)
│   ├── nlp_service.py       # Duration extraction, date extraction, matter matching
│   ├── ai_service.py        # Multi-AI provider dispatcher (Claude, Gemini, OpenAI, Grok) with rich matter context
│   ├── outlook_service.py   # Outlook COM scanning via pywin32
│   ├── settings_service.py  # Read/write settings.json and encrypted secrets.enc (DPAPI)
│   ├── time_service.py      # Duration → billable units conversion
│   └── migrate_db.py        # One-time DB → JSON settings migration helper
├── frontend/
│   ├── index.html           # Single-page app layout
│   ├── style.css            # Glassmorphism theme + all component styles
│   ├── app.js               # Core UI logic and API calls
│   └── timer.js             # Timer button state machine (start/pause/resume/stop)
├── tests/                   # Backend unit tests
├── settings.json            # Persisted user settings (theme, identity, UI colors)
├── secrets.enc              # Encrypted API keys (DPAPI-protected, Windows user account bound)
├── timesheet.db             # SQLite database (matters + time logs)
├── requirements.txt
├── setup_assistant.bat
├── run_assistant.bat
└── kill_assistant.bat
```

---

## ⚙️ Configuration

Settings are stored in `settings.json` (not in the database). You can edit them through **Settings** (⚙️ button) in the UI:

### User Identity
| Setting | Description |
|---|---|
| Full Name | Used as the Outlook scan identity |
| Work Email | Used to filter Outlook emails sent/received by you |

### AI Assistant Settings (Optional)
| Setting | Description |
|---|---|
| AI Enable | Toggle to turn AI matching on or off (does not remove API keys) |
| AI Provider | Select which AI provider to use: **Default (NLP only)**, **Claude**, **Gemini**, **OpenAI**, or **Grok** |
| Claude API Key | Your Anthropic API key (if using Claude) |
| Gemini API Key | Your Google Gemini API key (if using Gemini) |
| OpenAI API Key | Your OpenAI API key (if using GPT-4o Mini) |
| Grok API Key | Your xAI Grok API key (if using Grok) |

**How AI works**: When enabled, the selected AI provider runs first to identify the matter. It receives rich context: matter name, external ID, description, and client name — making it much more accurate than text alone. Falls back to NLP only if AI errors or no key is configured.

**API Key Security**: All API keys are encrypted locally using Windows DPAPI in a separate `secrets.enc` file. Keys are tied to your Windows user account — they cannot be read by other users on the same machine.

**Cost estimates** (pay-per-call):
- **Claude Haiku**: ~$0.0005–0.001 per call (pennies/month)
- **Gemini**: Free tier available
- **OpenAI GPT-4o Mini**: ~$0.0001 per call
- **Grok**: ~$0.00002 per call

### Theme & UI
| Setting | Description |
|---|---|
| Background colours | Gradient start/end for the app background |
| Button colours | Individual colour picker for each button: Log, Scan, Manual, Timer, Matters, Reset, Summary, Show Closed |
| Dashboard aesthetics | Dedicated color picker for the Weekly Activity chart and adjustable panel capacity explicitly for dashboard widgets |
| Panel opacity | Glassmorphism panel transparency (0–1) |
| Background image | Upload a custom background photo |
| Timer indicator colour | Colour of the pulsing dot on the timer widget |

---

## 🧠 How Time Logging Works

### AI-First Flow (if enabled and API key configured)
1. **Type naturally** in the log input: `"Reviewed merger docs for 1.5h"` or `"K.Abigail / discuss on AI and playbook implementation for 5 minutes (AI explorer)"`
2. The NLP service extracts the **duration** and **date** from your text
3. If **AI is enabled** and you have an API key:
   - AI receives: your text, plus the full list of matters (name, external ID, description, client name)
   - AI returns: matched matter name, duration (if missing), date (if missing), work description
   - If one match: logs immediately. If no match or AI errors: falls back to fuzzy matching
4. If **AI is disabled** or no API key configured:
   - Falls back to fast, free fuzzy matching against matter names and external IDs
   - If one match: logs immediately. If ambiguous (0 or multiple): shows disambiguation picker

### Direct logging methods
- **Timer button** (next to Log Time) → Start/pause/resume timer → Stop → fill description → Save
- **Matter Details popup** → Add Time → enter minutes + optional description → Save Log
- **Chat input** → natural language text (processed via AI if enabled, or NLP if not)

### Why AI-First with Rich Context?
- **Accuracy**: AI sees not just the matter name, but its ID, description, and client — much more context than fuzzy string matching
- **Natural language**: You can mention project details, client names, or work types, and AI understands the intent
- **Cost-efficient**: You pay per AI call (~$0.0001–0.001), but ambiguous entries are resolved more accurately on the first try

### Billing Units
- Standard legal billing: **1 unit = 6 minutes**
- 1–6 mins → 1 unit, 7–12 mins → 2 units, etc. (rounds up)
- Automatically calculated from duration

---

## 🔌 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/matters` | List all matters |
| `POST` | `/api/matters/manual` | Add a matter manually |
| `PUT` | `/api/matters/{id}` | Update a matter |
| `POST` | `/api/scan` | Scan Outlook for new matters |
| `POST` | `/api/log` | Log time via natural language text (AI-first if enabled, otherwise NLP) |
| `POST` | `/api/log/direct` | Log time directly (matter_id + duration_minutes) |
| `PUT` | `/api/logs/{id}` | Edit a time log |
| `DELETE` | `/api/logs/{id}` | Delete a time log |
| `GET` | `/api/dashboard` | Get weekly stats and sticky note reminders |
| `GET` | `/api/update/check` | Check GitHub for new versions |
| `POST` | `/api/update/run` | Execute the auto-update workflow |
| `GET` | `/api/summary` | Aggregated summary by matter and period |
| `GET` | `/api/export` | Download CSV export |
| `GET` | `/api/settings` | Get all settings (user, theme, AI config) |
| `POST` | `/api/settings` | Save settings |
| `POST` | `/api/sticky-notes` | Create a manual sticky note |
| `PUT` | `/api/sticky-notes/{id}` | Edit a manual sticky note |
| `DELETE` | `/api/sticky-notes/{id}` | Delete a manual sticky note |
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
| AI Providers | Anthropic Claude, Google Gemini, OpenAI, xAI Grok |
| Outlook | `pywin32` (COM automation) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Encryption | Windows DPAPI for API keys in `secrets.enc` |
| Persistence | `settings.json` for settings, `secrets.enc` for encrypted API keys, `localStorage` for timer state/position |

---

## 📝 Notes

- The Outlook scanner reads **locally cached emails** via the Outlook COM API — it does not connect directly to a mail server and requires the Outlook desktop app to be installed.
- Time units are calculated using the **6-minute billing unit** standard common in legal practice (1 hour = 10 units).
- `timesheet.db`, `settings.json`, `stickynote.json`, and `secrets.enc` are excluded from version control via `.gitignore` — your data stays local.
- **API Key Encryption**: All API keys are encrypted in `secrets.enc` using Windows DPAPI (Data Protection API). Keys are bound to your Windows user account and cannot be read by other users on the same machine. Encryption is transparent — you just configure keys in Settings and they're automatically encrypted.
- When rolling out to other users, each user's API keys are independently encrypted with their own Windows credentials. Copying the database to a new machine will not impact database contents (matters and time logs are unencrypted); AI will only work if the user adds their own API keys (old encrypted keys from previous user won't decrypt on new user's account).

---

## 📄 License

Personal / internal use. Not licensed for redistribution.
