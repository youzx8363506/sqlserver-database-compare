@echo off
echo Building SQL Server Database Compare Tool
echo ========================================
echo.

echo [1/3] Building main project...
cd /d "%~dp0"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Main project build failed
    pause
    exit /b 1
)
echo Main project build successful!

echo.
echo [2/3] Building backend...
cd /d "%~dp0\web-server"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Backend build failed
    pause
    exit /b 1
)
echo Backend build successful!

echo.
echo [3/3] Building frontend...
cd /d "%~dp0\web-ui"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Frontend build failed
    pause
    exit /b 1
)
echo Frontend build successful!

echo.
echo ========================================
echo Build completed!
echo ========================================
echo Main project output: dist\
echo Backend output: web-server\dist\
echo Frontend output: web-ui\dist\
echo ========================================

pause