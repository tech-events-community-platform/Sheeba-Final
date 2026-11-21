@echo off
title Sheba Launcher
echo ========================================================
echo           Starting Sheba Fullstack Platform
echo ========================================================

echo [1/4] Starting PostgreSQL Server...
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" -l "C:\Users\HP\postgres.log"

echo [2/4] Ensuring database migrations and user accounts are seeded...
cd /d "%~dp0backend"
call npm run db:migrate
call npm run db:seed

echo [3/4] Launching Backend Server on http://localhost:5000...
start "Sheba Backend (Port 5000)" cmd.exe /k "cd /d %~dp0backend && npm run dev"

echo [4/4] Launching Frontend Server on http://localhost:5173...
start "Sheba Frontend (Port 5173)" cmd.exe /k "cd /d %~dp0frontend && npm run dev"

echo ========================================================
echo Done! Both servers have been launched in separate windows.
echo Keep those windows open while using the app in your browser!
echo ========================================================
pause
