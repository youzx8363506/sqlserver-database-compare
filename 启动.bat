@echo off
title SQL Server 数据库比较工具

echo ========================================
echo SQL Server 数据库比较工具
echo ========================================
echo.

echo 正在启动后端服务...
cd /d "%~dp0\web-server"
start "后端服务" cmd /k "echo 后端服务启动中... && npm run dev"

echo 等待后端服务启动...
timeout /t 3 /nobreak > nul

echo 正在启动前端服务...
cd /d "%~dp0\web-ui"
start "前端服务" cmd /k "echo 前端服务启动中... && npm run dev"

echo.
echo ========================================
echo 服务启动完成！
echo ========================================
echo 后端API服务: http://localhost:3001
echo 前端Web界面: http://localhost:3000
echo.
echo 两个服务窗口已经启动，请保持这些窗口打开
echo 等待几秒钟服务完全启动，然后访问:
echo http://localhost:3000
echo ========================================
echo.
echo 按任意键关闭此启动窗口 (服务窗口请保持打开)...
pause