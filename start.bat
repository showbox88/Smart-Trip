@echo off
:: This script launches the Smart Trip Dev Server
title Smart Trip Launcher

echo --------------------------------------------
echo  Smart Trip - Dev Server Launcher
echo --------------------------------------------
echo.

:: 1. Check if Node is installed
echo [1/4] Checking environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed. Please install it from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Cleanup port 5173 (Simple way)
echo [2/4] Initializing port 5173...
:: Kill any process on port 5173 if exists. We ignore errors if none found.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :5173') do (
    echo [INFO] Found existing process on port 5173...
    taskkill /F /PID %%p >nul 2>&1
)

:: 3. Check for .env
echo [3/4] Checking configuration...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Created .env from example.
    )
)

:: 4. Check dependencies
echo [4/4] Verifying dependencies...
if not exist "node_modules" (
    echo [INFO] node_modules missing. Running npm install...
    call npm install
)

:: 5. Launch
echo.
echo [Launch] Starting Vite...
echo [Info] Server will open in your browser automatically.
echo.

:: Run dev with auto-open
npm run dev -- --open

:: If the server crashes, keep window open
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed to start.
    pause
)
