@echo off
setlocal
set "PROJECT_ROOT=%~dp0"

echo Starting the school portal from %PROJECT_ROOT%
echo Close the Backend and Frontend windows to stop the portal.
echo.

start "School Portal Backend" /D "%PROJECT_ROOT%backend" cmd /k "node src/server.js"
start "School Portal Frontend" /D "%PROJECT_ROOT%frontend" cmd /k "npm run dev"

echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000/login
endlocal
