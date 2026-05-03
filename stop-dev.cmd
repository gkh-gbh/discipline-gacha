@echo off
setlocal

cd /d "%~dp0"

set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":43017 .*LISTENING"') do (
  set "PORT_PID=%%P"
)

if not defined PORT_PID (
  echo No process is listening on port 43017.
  exit /b 0
)

echo Stopping process on port 43017 ^(PID %PORT_PID%^)^...
taskkill /PID %PORT_PID% /T /F

endlocal
