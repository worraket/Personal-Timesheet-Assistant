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
| 📊 **Summary Dashboard** | Units and minutes logged today, this week, this month, and last month — per matter and overall. Sorted by most recent entry |
| ✏️ **Edit / Delete Logs** | Edit or delete any time log from the Summary or Matter Details panels |
| ➕ **Add Time from Matter Details** | Directly log time against any matter from its detail popup with a date picker and minute input |
| 📤 **CSV Export** | Export all logs to a BOM-encoded UTF-8 CSV file (Excel-compatible, including Thai characters) |
| 🎨 **Fully Customisable Theme** | Glassmorphism UI with configurable gradient colours, individual button colours (Log, Scan, Manual, Timer, Matters, Reset, Summary, Show Closed), panel opacity, and custom background image |
| 🧙 **First-Run Wizard** | Prompts for your name and email on first launch so Outlook scanning works immediately |

---

## 📅 Version History

### Latest Updates
- **AI-First Flow with Rich Context**: When AI is enabled, it now runs first (not as fallback). AI receives matter details (ID, description, client name) for much better matching accuracy. Falls back to NLP only on AI error.
- **Encrypted API Keys (DPAPI)**: API keys moved from plain text `settings.json` to encrypted `secrets.enc` using Windows DPAPI. Keys are encrypted per-user on the machine; no cloud storage, no master password needed.
- **AI Toggle On/Off**: Quick toggle switch in Settings modal to enable/disable AI without removing API keys. Auto-saves immediately.
- **8 Customisable Button Colours**: Added individual colour pickers for Timer, Matters, Reset, Summary, and Show Closed buttons (in addition to existing Log, Scan, Manual).
- **Summary Sorted by Recency**: Summary dashboard now orders matters by most recent time entry (latest first) for better relevance.
- **Modal Z-Index Fix**: Matter Details modal now properly appears on top of Matters Overview modal.
- **Multi-AI Provider Support**: Optional AI enhancement with Claude, Gemini, OpenAI, and Grok APIs.
- **Matter Status Flags**: Color-coded status indicators (Green, Yellow, Red) for easy visual tracking.
- **Matter Sorting & Closure**: Sort by ID or Status; ability to close matters and toggle visibility.
- **Timer Button Integration**: Live timer integrated as a button next to Log Time input.

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
| `GET` | `/api/summary` | Aggregated summary by matter and period |
| `GET` | `/api/export` | Download CSV export |
| `GET` | `/api/settings` | Get all settings (user, theme, AI config) |
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
| AI Providers | Anthropic Claude, Google Gemini, OpenAI, xAI Grok |
| Outlook | `pywin32` (COM automation) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Encryption | Windows DPAPI for API keys in `secrets.enc` |
| Persistence | `settings.json` for settings, `secrets.enc` for encrypted API keys, `localStorage` for timer state/position |

---

## 📝 Notes

- The Outlook scanner reads **locally cached emails** via the Outlook COM API — it does not connect directly to a mail server and requires the Outlook desktop app to be installed.
- Time units are calculated using the **6-minute billing unit** standard common in legal practice (1 hour = 10 units).
- `timesheet.db`, `settings.json`, and `secrets.enc` are excluded from version control via `.gitignore` — your data stays local.
- **API Key Encryption**: All API keys are encrypted in `secrets.enc` using Windows DPAPI (Data Protection API). Keys are bound to your Windows user account and cannot be read by other users on the same machine. Encryption is transparent — you just configure keys in Settings and they're automatically encrypted.
- When rolling out to other users, each user's API keys are independently encrypted with their own Windows credentials. Copying the database to a new machine will not impact database contents (matters and time logs are unencrypted); AI will only work if the user adds their own API keys (old encrypted keys from previous user won't decrypt on new user's account).

---

## 📄 License

Personal / internal use. Not licensed for redistribution.
