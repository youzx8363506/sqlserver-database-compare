@echo off
title SQL Server Database Compare Tool - Menu

REM 确保在脚本所在目录
cd /d "%~dp0"

:MENU
cls
echo ========================================
echo SQL Server Database Compare Tool
echo ========================================
echo.
echo Please select an option:
echo.
echo 1. Start All Services
echo 2. Stop All Services  
echo 3. Build Project
echo 4. Exit
echo.
echo ========================================
set /p choice=Enter your choice (1-4): 

if "%choice%"=="1" goto START_DEV
if "%choice%"=="2" goto STOP_SERVICES
if "%choice%"=="3" goto BUILD_PROJECT
if "%choice%"=="4" goto EXIT
echo Invalid choice. Please try again.
pause
goto MENU

:START_DEV
echo.
echo Starting development services...
echo.
pushd "%~dp0"
call start.bat
popd
goto MENU

:STOP_SERVICES
echo.
echo Stopping all services...
echo.
pushd "%~dp0"
call stop.bat
popd
goto MENU

:BUILD_PROJECT
echo.
echo Building project...
echo.
pushd "%~dp0"
call build.bat
popd
goto MENU

:EXIT
echo.
echo Goodbye!
exit