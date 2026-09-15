@echo off
echo ============================================
echo Starting School Portal Servers
echo ============================================

echo.
echo [1/4] Killing existing node processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1
echo Done.

echo.
echo [2/4] Starting backend server on port 5000...
cd /d C:\BestSiteEver\backend
start "Backend" /B node src/server.js
echo Backend started.

echo.
echo [3/4] Starting frontend dev server on port 3003...
cd /d C:\BestSiteEver\frontend
start "Frontend" /B npm run dev
echo Frontend started.

echo.
echo [4/4] Waiting for servers to initialize...
timeout /t 8 /nobreak >nul

echo.
echo ============================================
echo Both servers are running!
echo ============================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3003/login
echo.
echo Press any key to open the portal...
pause >nul
start "" "http://localhost:3003/login"