@echo off
title Smart Trip Launcher
cd /d "%~dp0"

echo ============================================
echo   Smart Trip - Dev Servers Launcher
echo ============================================
echo.

:: Check Node
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    pause & exit /b 1
)

:: Check dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
)

:: Kill any existing process on port 5173
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr :5173') do (
    taskkill /F /PID %%p >nul 2>&1
)

:: Get local IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%i
)
set LOCAL_IP=%LOCAL_IP: =%

echo [1/2] Starting Vite dev server (LAN mode)...
start "Vite Dev Server" cmd /k "cd /d "%~dp0" && npm run dev -- --host"

:: Wait for Vite to start
timeout /t 3 /nobreak >nul

echo [2/2] Starting Capacitor livereload...
start "Capacitor Livereload" cmd /k "cd /d "%~dp0" && npx cap run android --live-reload --host 10.0.2.2 --port 5173"

echo.
echo ============================================
echo   Servers started!
echo   Local:   http://localhost:5173
echo   Network: http://%LOCAL_IP%:5173
echo ============================================
echo.
echo   Android device must be on same WiFi.
echo   Close this window to stop all servers.
echo ============================================
pause
