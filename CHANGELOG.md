# Changelog

All notable changes to the **Personal Timesheet Assistant** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

## [1.1.0] - 2026-02-25

### Added
- **Main Dashboard**: A side-by-side dashboard layout placed above the main chat interface. Can be toggled on/off to save space.
- **Weekly Activity Chart**: A visual bar chart showing the total time logged for each day from Monday to Friday of the current week.
- **Reminder Board**: A grid of sticky notes to track tasks needing attention.
  - **Dynamic Reminders**: Automatically generates sticky notes for *Idle Matters* (> 3 days no activity), *New Scans* (0 hours logged, shows external ID), and *Urgent Matters* (flags set to Red).
  - **Manual Reminders**: Add, edit, and delete your own custom sticky notes.
- **Automatic Database Backups**: 
  - Automatically creates a backup of `timesheet.db` and `settings.json` into a local `backups/` directory on application startup and every 24 hours.
  - Retains only the 7 most recent backups to save disk space.
- **Matters Overview Modal**: A comprehensive table view to see all matters, their status, external IDs, and total time logged at a glance.

### Changed
- Refined the Reminder system to completely ignore closed/archived matters and matters flagged as "Green" (Completed).
- Updated local `.gitignore` to explicitly exclude the `backups/` directory to prevent accidental upload of timesheet databases to GitHub.

## [1.0.0] - Initial Release

### Added
- Natural Language Time Logging with optional multi-provider AI enhancement (Claude, Gemini, OpenAI, Grok).
- Local SQLite database for time tracking.
- Outlook COM scanner to automatically identify and import matters from Microsoft Outlook.
- Glassmorphism UI with extensive theme color customization.
- Live active timer with start/pause/resume functionality.
- Encrypted storage of AI API keys using Windows DPAPI (`secrets.enc`).
- Date picker and manual time logging features.
- CSV Export function.
