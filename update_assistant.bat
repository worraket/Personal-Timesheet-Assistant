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
    echo [WARN] This folder is not a git repository.
    echo        This happens when the app was downloaded as a ZIP instead of cloned.
    echo.
    echo        A re-clone will download the latest code from GitHub into this folder.
    echo        Your data files ^(timesheet.db, settings.json, secrets.enc^) will be preserved.
    echo.
    set /p RECLONE_CHOICE="Do you want to re-clone from GitHub now? (Y/N): "
    if /i "!RECLONE_CHOICE!"=="Y" goto :DoReClone
    echo Cancelled.
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
    echo [WARN] git pull failed. This usually means there are local code conflicts.
    echo.
    echo        Option: Re-clone from GitHub ^(replaces code files only^).
    echo        Your data ^(timesheet.db, settings.json, secrets.enc^) will be preserved.
    echo.
    set /p RECLONE_CHOICE2="Do you want to re-clone from GitHub to fix this? (Y/N): "
    if /i "!RECLONE_CHOICE2!"=="Y" goto :DoReClone
    echo Cancelled. Your data is safe.
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
goto :EOF

:: ════════════════════════════════════════════════════════════════════════════
:DoReClone
:: Re-clone: preserve user data, replace all code files with fresh GitHub copy
:: ════════════════════════════════════════════════════════════════════════════
echo.
echo ==============================================
echo   Re-cloning from GitHub...
echo ==============================================
echo.

set REPO_URL=https://github.com/worraket/Personal-Timesheet-Assistant.git
set CLONE_TMP=%TEMP%\PTA_reclone_%RANDOM%

:: ── Back up user data files ──────────────────────────────────────────────────
echo [1/4] Backing up your data files...
set DATA_BACKUP=%TEMP%\PTA_data_%RANDOM%
mkdir "%DATA_BACKUP%"

if exist timesheet.db         copy /Y timesheet.db         "%DATA_BACKUP%\" >nul
if exist settings.json        copy /Y settings.json        "%DATA_BACKUP%\" >nul
if exist secrets.enc          copy /Y secrets.enc          "%DATA_BACKUP%\" >nul
if exist frontend\assets      xcopy /E /I /Q frontend\assets "%DATA_BACKUP%\assets\" >nul

echo        Data backed up to: %DATA_BACKUP%
echo.

:: ── Clone into a temp folder ─────────────────────────────────────────────────
echo [2/4] Cloning latest code from GitHub...
git clone --depth 1 "%REPO_URL%" "%CLONE_TMP%"
if %errorlevel% neq 0 (
    echo [ERROR] git clone failed. Check your internet connection and try again.
    echo         Your data backup is at: %DATA_BACKUP%
    pause
    exit /b 1
)

:: ── Copy new code files into current folder (overwrite code, skip data) ──────
echo [3/4] Installing new code files...
:: Use robocopy to copy everything except user data files and venv
robocopy "%CLONE_TMP%" "%~dp0" /E /XD venv .git "%CLONE_TMP%\venv" /XF timesheet.db settings.json secrets.enc /NFL /NDL /NJH /NJS >nul

:: Clean up temp clone
rmdir /s /q "%CLONE_TMP%" >nul 2>nul

:: ── Restore user data files ──────────────────────────────────────────────────
echo [4/4] Restoring your data files...
if exist "%DATA_BACKUP%\timesheet.db"  copy /Y "%DATA_BACKUP%\timesheet.db"  . >nul
if exist "%DATA_BACKUP%\settings.json" copy /Y "%DATA_BACKUP%\settings.json" . >nul
if exist "%DATA_BACKUP%\secrets.enc"   copy /Y "%DATA_BACKUP%\secrets.enc"   . >nul
if exist "%DATA_BACKUP%\assets"        xcopy /E /I /Q "%DATA_BACKUP%\assets" frontend\assets\ >nul

rmdir /s /q "%DATA_BACKUP%" >nul 2>nul

echo.
echo ==============================================
echo   Re-clone complete!
echo   Run setup_assistant.bat to reinstall
echo   dependencies, then run run_assistant.bat.
echo ==============================================
echo.
pause
