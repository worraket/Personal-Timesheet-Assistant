@echo off
setlocal enabledelayedexpansion
pushd "%~dp0"

echo Checking for Python...

:: 1. Try 'python' command
where python >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :FoundPython
)

:: 2. Try 'py' launcher
where py >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    goto :FoundPython
)

:: 3. If not found, ask user
echo.
echo Python was not found in your system PATH.
echo Please enter the full path to your python.exe (e.g. C:\Python39\python.exe)
set /p PYTHON_CMD="Path: "

:FoundPython
echo.
echo Using Python: "%PYTHON_CMD%"
"%PYTHON_CMD%" --version >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: The specified command '%PYTHON_CMD%' is not working or not found.
    pause
    exit /b
)

echo ==============================================
echo   Personal Timesheet Assistant - Setup
echo ==============================================
echo.

echo 1. Creating Virtual Environment...
echo Close any running instances of the app...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul
timeout /t 2 >nul

if exist venv (
    echo Removing old virtual environment...
    rmdir /s /q venv
    if exist venv (
        echo Error: Could not delete old venv folder. prevent usage.
        echo Please ensure no other programs are using the venv folder.
        pause
        exit /b
    )
)

"%PYTHON_CMD%" -m venv venv
if %errorlevel% neq 0 (
    echo Error: Failed to create venv.
    pause
    exit /b
)

echo 2. Installing Dependencies...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Error: venv/Scripts/activate.bat not found. Virtual environment creation may have failed.
    pause
    exit /b
)

python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies.
    pause
    exit /b
)

echo 3. Initializing Database...
python -c "from backend import database; database.init_db()"
if %errorlevel% neq 0 (
    echo Error: Failed to initialize database.
    pause
    exit /b
)

echo.
echo ----------------------------------------------
echo   Setup Complete!
echo   Run 'run_assistant.bat' to start the app.
echo ----------------------------------------------
echo.
pause
