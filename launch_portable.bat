@echo off
setlocal enabledelayedexpansion
pushd "%~dp0"

echo ==============================================
echo   Personal Timesheet Assistant (Portable)
echo ==============================================
echo.

:: Define paths relative to this script
set "PYTHON_DIR=%~dp0Python"
set "APP_DIR=%~dp0App"
set "PYTHON_EXE=%PYTHON_DIR%\python.exe"

:: Verify Python exists in the portable package
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Portable Python environment not found!
    echo Ensure you extracted all files from the SFX archive.
    pause
    exit /b 1
)

:: Initialize database if it doesn't exist yet
if not exist "%APP_DIR%\timesheet.db" (
    echo [1/3] Initializing new database...
    "%PYTHON_EXE%" -c "import sys; sys.path.insert(0, r'%APP_DIR%'); from backend import database; database.init_db()"
) else (
    echo [1/3] Existing database found.
)

:: Start Backend API Server
echo [2/3] Starting Local Server ^(port 8000^)...
start "PTA Backend" /MIN "%PYTHON_EXE%" -m uvicorn backend.main:app --app-dir "%APP_DIR%" --host 127.0.0.1 --port 8000

:: Give the server a moment to boot
timeout /t 2 >nul

:: Open Frontend
echo [3/3] Launching App in your default Browser...
set "FRONTEND_URL=file:///%APP_DIR:\=/%/frontend/index.html"
:: Replace spaces with %%20 for file URL compatibility
set "FRONTEND_URL=%FRONTEND_URL: =%%20%"
start "" "%FRONTEND_URL%"

echo.
echo ==============================================
echo   App is running!
echo   Keep this window open. Closing it will stop 
echo   the program (via the taskkill below).
echo ==============================================
echo.
pause

:: On close, terminate the backend server gracefully
taskkill /F /IM uvicorn.exe /T >nul 2>nul
taskkill /FI "WINDOWTITLE eq PTA Backend" /T /F >nul 2>nul
