# Personal Timesheet Assistant: System Architecture & Feature Summary

This document summarizes the architecture, features, database schema, and design philosophy of the **Personal Timesheet Assistant**, to serve as a reference point for porting these concepts to a full server-based timesheet system.

## 1. Core Features & Functionality
The application is a standalone, local-first web app tailored for legal professionals (or anyone using a 6-minute billing unit).
*   **Time Logging (AI-First NLP):** Users can type natural language strings (e.g., `"Drafted employment contract for 1.5h"`). The backend uses NLP (and optionally LLM API providers like Claude, Gemini, OpenAI) to extract duration, date, match the correct Matter, and log the time automatically.
*   **Outlook Scanner:** Uses local COM integration (`pywin32`) to scan the user's Microsoft Outlook inbox, extracting subjects and client emails to automatically generate new Matters.
*   **Main Dashboard:** Features a dynamic Weekly Activity Chart (bar chart summarizing Monday-Friday hours) and a "Reminder Board" of sticky notes. Notes can be manually created or dynamically generated (e.g., flagging "Idle" matters with no recent logs).
*   **Live Timer:** A floating JS timer widget that tracks active work, which can then be stopped and saved as a time log.
*   **Summary & Export:** Aggregates time logged by day, week, month, and matter. Allows CSV exports.

## 2. Database Structure
The application primarily uses a local SQLite database (`timesheet.db`) via SQLAlchemy. It has two main tables:

### `matters` Table
Represents a project, client case, or billing bucket.
*   `id` (Integer, Primary Key)
*   `name` (String) - e.g., "Client X - Acquisition"
*   `external_id` (String) - Billing code or case number
*   `description` (Text) 
*   `client_name` (String)
*   `client_email` (String)
*   `status_flag` (String) - "yellow" (active), "green" (completed), "red" (urgent)
*   `is_closed` (Boolean) - Archive flag
*   `source_email_id` (String) - Prevents duplicate Outlook imports
*   `created_at` (DateTime)

### `time_logs` Table
Represents actual work entries.
*   `id` (Integer, Primary Key)
*   `matter_id` (Integer, Foreign Key) 
*   `duration_minutes` (Integer) - Raw minutes worked
*   `units` (Integer) - Billable increments (1 unit = 6 minutes)
*   `description` (Text) - Work narrative
*   `log_date` (DateTime) - Date the work occurred
*   `created_at` (DateTime) - Timestamp of when the log was entered

## 3. Storage & Configuration (Non-DB)
To keep the database purely focused on timesheet data, user configurations are stored in separate files:
*   **`settings.json`**: Stores user identity (Name, Email), AI Provider settings (Which AI to use, Enable/Disable flag), and UI Theme customization data (Gradient colors, button colors, panel opacity).
*   **`stickynote.json`**: A dedicated file storing full JSON models of user-created manual sticky notes and color/title overrides for system-generated dynamic sticky notes.
*   **`secrets.enc`**: Stores the actual AI API keys (Claude, OpenAI, etc.). It uses Windows DPAPI to encrypt these keys, tying them securely to the user's local Windows OS account.

## 4. Backend Architecture
*   **Framework:** Python 3 + FastAPI + Uvicorn.
*   **Services Module:** Logic is separated into domain-specific files (`dashboard_service.py`, `ai_service.py`, `nlp_service.py`, `time_service.py`, `settings_service.py`).
*   **Automated Backups:** On startup (and daily), `backup_service.py` safely duplicates `timesheet.db`, `settings.json`, and `stickynote.json` into a compressed `backups/` directory, keeping a 7-day rolling retention.
*   **Automated Updates:** The app can fetch `.zip` releases from GitHub via endpoints in `apply_update.py` and extract them locally, explicitly protecting user data files from being overwritten.

## 5. UI/UX Design Philosophy
*   **Technology:** Single Page Application (SPA) built purely in Vanilla HTML, CSS, and JavaScript. No React/Vue/NPM overhead.
*   **Aesthetics (Glassmorphism):** The UI uses modern, Apple-inspired frosted glass effects (`backdrop-filter: blur`), rounded corners, and subtle box shadows overlaid on a customizable gradient or photo background.
*   **Configurability (Live Theming):** The "Theme Settings" modal allows users to inject custom CSS variables (`--scan-btn-bg`, `--chart-bar-color`, `--card-opacity`, etc.) via HTML color pickers and sliders. These variables update immediately in JS for a live preview, and are saved to `settings.json`.
*   **Modals & UX:** All workflows (Adding Matters, Editing Logs, Viewing Settings, Reading Matters Details) occur in lightweight popup modals that trap focus and can easily be closed via ESC key, clicking outside the window, or clicking an 'X' button.

## 6. Porting to a Full Server System
When mapping this to a cloud-based multi-tenant application with Claude:
1.  **Users Table & Auth:** You will need to introduce a `users` table and Row-Level Security (RLS) or tenant isolation, changing `secrets.enc` DPAPI to cloud-hosted Encrypted Vaults.
2.  **Schema Migration:** `matters` and `time_logs` schemas translate perfectly, but will need `user_id` or `tenant_id` foreign keys.
3.  **Config Migration:** Move `settings.json` and `stickynote.json` JSON structures into PostgreSQL `JSONB` columns attached to a User Profile table.
4.  **Outlook Integration:** You will likely need to move from local COM scanning (`pywin32`) to OAuth2 Microsoft Graph API integration for server-side inbox reading.
