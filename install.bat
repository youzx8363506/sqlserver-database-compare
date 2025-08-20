@echo off
echo ========================================
echo SQL Server 数据库比较工具安装脚本
echo ========================================
echo.

echo 检查 Node.js 版本...
node --version
if %ERRORLEVEL% neq 0 (
    echo 错误: 请先安装 Node.js ^(版本 ^>= 18.12.1^)
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 检查 npm 版本...
npm --version
if %ERRORLEVEL% neq 0 (
    echo 错误: npm 未正确安装
    pause
    exit /b 1
)

echo.
echo ========================================
echo 开始安装依赖包...
echo ========================================

echo.
echo [1/2] 安装后端依赖...
cd /d "%~dp0\web-server"
npm install
if %ERRORLEVEL% neq 0 (
    echo 错误: 后端依赖安装失败
    pause
    exit /b 1
)

echo.
echo [2/2] 安装前端依赖...
cd /d "%~dp0\web-ui"
npm install
if %ERRORLEVEL% neq 0 (
    echo 错误: 前端依赖安装失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 现在您可以运行以下命令启动服务:
echo 1. 双击 start.bat 启动开发服务
echo 2. 或者手动启动:
echo    - 后端: cd web-server ^&^& npm run dev
echo    - 前端: cd web-ui ^&^& npm run dev
echo.
echo 然后访问: http://localhost:3000
echo ========================================

pause