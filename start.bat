@echo off
chcp 65001 >nul
title Smart Trip Dev Server

echo ============================================
echo   Smart Trip - Local Development Server
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    echo Recommended version: 18.x or above
    pause
    exit /b 1
)

:: Show versions
echo [INFO] Node.js version:
node --version
echo [INFO] npm version:
npm --version
echo.

:: Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo.
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy ".env.example" ".env" >nul
        echo [ACTION] Please edit .env and fill in your keys:
        echo   - VITE_SUPABASE_URL
        echo   - VITE_SUPABASE_ANON_KEY
        echo   - VITE_GOOGLE_MAPS_KEY
        echo.
        notepad ".env"
        pause
        exit /b 1
    ) else (
        echo [ERROR] .env.example also missing. Please create .env manually.
        pause
        exit /b 1
    )
)

:: Check node_modules
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo.
)

:: Start dev server
echo [INFO] Starting Vite dev server...
echo [INFO] Press Ctrl+C to stop
echo.
npm run dev
