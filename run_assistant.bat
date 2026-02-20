@echo off
setlocal
echo ==============================================
echo   Personal Timesheet Assistant - Startup
echo ==============================================

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found! 
    echo Please run 'setup_assistant.bat' first.
    pause
    exit /b 1
)

echo [1/2] Activating virtual environment...
call venv\Scripts\activate

echo [2/2] Launching server...
echo.
echo TIP: The browser will open automatically in 5 seconds.
echo.

:: Start a background task to wait and then open the browser
:: We use 'start /b' to run this in the background so it doesn't block the server
start /b cmd /c "timeout /t 5 >nul && echo Opening browser... && start http://127.0.0.1:8000"

:: Start the server (this is a blocking operation)
python -m uvicorn backend.main:app --reload

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed or was stopped.
    pause
)
