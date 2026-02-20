@echo off
setlocal
echo ==============================================
echo   Personal Timesheet Assistant - Kill Switch
echo ==============================================

set PORT=8000

echo Finding processes on port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do (
    set PID=%%a
)

if "%PID%"=="" (
    echo [INFO] No processes found listening on port %PORT%.
) else (
    echo [ACTION] Terminating process PID: %PID%...
    taskkill /F /PID %PID%
    if %errorlevel% equ 0 (
        echo [SUCCESS] Server process terminated.
    ) else (
        echo [ERROR] Failed to terminate process. You might need to run this as Administrator.
    )
)

:: Also look for any remaining python/uvicorn processes just in case
echo Checking for any remaining uvicorn/python server processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo.
echo Shutdown complete.
pause
