@echo off
title SQL Server Database Compare Tool

echo ========================================
echo SQL Server Database Compare Tool
echo ========================================
echo.

echo Starting backend service...
cd /d "%~dp0\web-server"
start "Backend Service" cmd /k "npm run dev"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting frontend service...
cd /d "%~dp0\web-ui"  
start "Frontend Service" cmd /k "npm run dev"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo Backend API: http://localhost:3001
echo Frontend Web: http://localhost:3000
echo.
echo Two service windows have started
echo Wait a few seconds then visit: http://localhost:3000
echo ========================================
echo.
echo Press any key to close this window...
pause