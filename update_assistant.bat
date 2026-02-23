@echo off
setlocal enabledelayedexpansion
pushd "%~dp0"

echo ==============================================
echo   Personal Timesheet Assistant - Updater
echo ==============================================
echo.

:: ── Check git is available ──────────────────────────────────────────────────
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] git is not installed or not in your PATH.
    echo         Download it from https://git-scm.com/download/win
    pause
    exit /b 1
)

:: ── Check we are inside a git repo ──────────────────────────────────────────
git rev-parse --git-dir >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] This folder is not a git repository.
    echo         Please re-download the app from GitHub.
    pause
    exit /b 1
)

:: ── Stop any running server first ───────────────────────────────────────────
echo [1/5] Stopping any running server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
taskkill /F /IM uvicorn.exe /T >nul 2>nul

:: ── Show current version (commit) before update ─────────────────────────────
echo [2/5] Current version:
git log --oneline -1
echo.

:: ── Snapshot requirements.txt hash before pull ──────────────────────────────
set REQ_BEFORE=
for /f "skip=1 tokens=*" %%h in ('certutil -hashfile requirements.txt MD5 2^>nul') do (
    if not defined REQ_BEFORE set REQ_BEFORE=%%h
)

:: ── Pull latest code from GitHub ────────────────────────────────────────────
echo [3/5] Pulling latest updates from GitHub...
git pull --ff-only origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] git pull failed.
    echo         This can happen if you have local code changes that conflict.
    echo         Your data files (timesheet.db, settings.json, secrets.enc) are safe.
    echo         Contact the app maintainer if this keeps happening.
    pause
    exit /b 1
)

:: ── Show new version after pull ─────────────────────────────────────────────
echo.
echo [4/5] Updated to:
git log --oneline -1
echo.

:: ── Reinstall dependencies only if requirements.txt changed ─────────────────
set REQ_AFTER=
for /f "skip=1 tokens=*" %%h in ('certutil -hashfile requirements.txt MD5 2^>nul') do (
    if not defined REQ_AFTER set REQ_AFTER=%%h
)

if not "%REQ_BEFORE%"=="%REQ_AFTER%" (
    echo [5/5] New dependencies detected — installing...
    if exist venv\Scripts\activate.bat (
        call venv\Scripts\activate.bat
        python -m pip install --upgrade pip --quiet
        python -m pip install -r requirements.txt --quiet
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to install new dependencies.
            echo         Try running setup_assistant.bat to do a full reinstall.
            pause
            exit /b 1
        )
        echo        Dependencies updated successfully.
    ) else (
        echo [WARN] venv not found — skipping dependency install.
        echo        Run setup_assistant.bat first if you haven't already.
    )
) else (
    echo [5/5] No new dependencies — skipping install.
)

echo.
echo ==============================================
echo   Update complete! Run run_assistant.bat
echo   to start the app with the latest version.
echo ==============================================
echo.
pause
