@echo off
title PersonalTimesheetAssistant - Database Migration Tool
color 0A

echo ============================================================
echo   PersonalTimesheetAssistant - Database Migration Tool
echo ============================================================
echo.

REM ── Check if timesheet.db exists ────────────────────────────
if not exist "%~dp0timesheet.db" (
    echo [ERROR] timesheet.db not found in this folder.
    echo         Make sure you run this from the project folder.
    echo         Or run the app at least once to create the database.
    echo.
    pause
    exit /b 1
)

REM ── Try to find Python ──────────────────────────────────────
set PYTHON_CMD=

REM Check for 'python' in PATH
python --version >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON_CMD=python
    goto :found_python
)

REM Check for 'python3' in PATH
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON_CMD=python3
    goto :found_python
)

REM Check common install locations
if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
    set PYTHON_CMD="%LocalAppData%\Programs\Python\Python313\python.exe"
    goto :found_python
)
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set PYTHON_CMD="%LocalAppData%\Programs\Python\Python312\python.exe"
    goto :found_python
)
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
    set PYTHON_CMD="%LocalAppData%\Programs\Python\Python311\python.exe"
    goto :found_python
)
if exist "%LocalAppData%\Programs\Python\Python310\python.exe" (
    set PYTHON_CMD="%LocalAppData%\Programs\Python\Python310\python.exe"
    goto :found_python
)

REM Check if venv exists in project folder
if exist "%~dp0venv\Scripts\python.exe" (
    set PYTHON_CMD="%~dp0venv\Scripts\python.exe"
    goto :found_python
)

echo [ERROR] Python not found on this PC.
echo         Please install Python 3.10 or newer from https://python.org
echo         and make sure to check "Add Python to PATH" during install.
echo.
pause
exit /b 1

:found_python
echo [OK] Found Python: %PYTHON_CMD%
echo.

REM ── Run the migration script ─────────────────────────────────
REM Change directory to project root so relative paths work
cd /d "%~dp0"

%PYTHON_CMD% migrate_database.py

echo.
echo ============================================================
echo   Migration process finished. Press any key to close.
echo ============================================================
pause >nul
