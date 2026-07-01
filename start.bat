@echo off
title AI Expense Tracker Launcher
echo =========================================================
echo Starting AI Personal Expense Automation System...
echo =========================================================
echo.

echo [1/3] Launching Backend API (Port 5000)...
start "Expense Tracker - Backend API" cmd /k "cd backend && Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process && npm run dev"

timeout /t 3 /nobreak > null

echo [2/3] Launching Telegram Bot Worker...
start "Expense Tracker - Telegram Bot" cmd /k "cd telegram-bot && Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process && npm run dev"

timeout /t 3 /nobreak > null

echo [3/3] Launching Frontend Dashboard (Port 3000)...
start "Expense Tracker - Frontend Dashboard" cmd /k "cd frontend && Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process && npm run dev"

echo.
echo =========================================================
echo All services launched successfully!
echo.
echo Web Dashboard URL: http://localhost:3000
echo Backend API URL:  http://localhost:5000
echo =========================================================
echo.
pause
