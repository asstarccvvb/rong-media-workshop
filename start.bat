@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo  媒体运营平台 启动中...
echo  启动后请在浏览器打开 http://127.0.0.1:3211
echo  按 Ctrl+C 停止服务
echo ============================================
node server.mjs
pause
