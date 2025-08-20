@echo off
title Stop Services
echo ========================================
echo Stopping SQL Server Database Compare Tool
echo ========================================
echo.

echo Stopping services...
echo.

REM Stop port processes
echo [1/2] Stopping port services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1

echo [2/2] Stopping Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo ========================================
echo Services stopped successfully!
echo ========================================
echo Processed:
echo   - Port 3001 and 3000 processes
echo   - All Node.js processes
echo.
echo Note: All Node.js processes stopped for complete cleanup
echo ========================================

pause