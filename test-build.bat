@echo off
echo Testing build script...
echo.

echo Step 1: Main project
cd /d "%~dp0"
call npm run build
echo Main project done, ERRORLEVEL=%ERRORLEVEL%
echo.

echo Step 2: Backend
cd /d "%~dp0\web-server"
call npm run build
echo Backend done, ERRORLEVEL=%ERRORLEVEL%
echo.

echo Step 3: Frontend  
cd /d "%~dp0\web-ui"
call npm run build
echo Frontend done, ERRORLEVEL=%ERRORLEVEL%
echo.

echo All steps completed!
pause