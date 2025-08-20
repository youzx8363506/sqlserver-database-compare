@echo off
title Install Dependencies
echo ========================================
echo Installing Dependencies...
echo ========================================
echo.

echo Checking Node.js...
node --version
if %ERRORLEVEL% neq 0 (
    echo Error: Please install Node.js first
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Checking npm...
npm --version
if %ERRORLEVEL% neq 0 (
    echo Error: npm not found
    pause
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd web-server
npm install
if %ERRORLEVEL% neq 0 (
    echo Backend install failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo Installing frontend dependencies...
cd web-ui
npm install
if %ERRORLEVEL% neq 0 (
    echo Frontend install failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo To start the application:
echo 1. Run start.bat
echo 2. Or manually:
echo    - Backend: cd web-server && npm run dev
echo    - Frontend: cd web-ui && npm run dev
echo.
echo Then visit: http://localhost:3000
echo ========================================
pause