@echo off
setlocal

echo ==============================================
echo   Personal Timesheet Assistant - Update
echo ==============================================
echo.
echo Please wait while the application shuts down...
timeout /t 5 /nobreak >nul

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    pause
    exit /b 1
)

echo.
echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Downloading and applying update...
python backend\apply_update.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The update process failed. See the messages above.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo   Update Successful!
echo ==============================================
echo.
echo You may now restart the application using run_assistant.bat
echo.
pause
