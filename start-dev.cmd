@echo off
setlocal

cd /d "%~dp0"
set "PORT=43017"

echo Starting discipline-gacha dev server...
echo Project root: %CD%
echo Expected URL: http://localhost:%PORT%
echo.

if not exist "package.json" (
  echo [ERROR] package.json not found. Please run this script from the project root.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [ERROR] node_modules not found.
  echo Run "npm install" first, then try again.
  pause
  exit /b 1
)

set "FOUND_PORT_PROCESS="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%PORT%" ^| findstr /C:"LISTENING"') do (
  set "FOUND_PORT_PROCESS=1"
  echo Releasing port %PORT% from PID %%P...
  taskkill /PID %%P /T /F >nul 2>&1
)

if defined FOUND_PORT_PROCESS (
  timeout /t 2 /nobreak >nul
  echo.
)

set "PORT_STILL_BUSY="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%PORT%" ^| findstr /C:"LISTENING"') do (
  set "PORT_STILL_BUSY=%%P"
)

if defined PORT_STILL_BUSY (
  echo [ERROR] Port %PORT% is still in use by PID %PORT_STILL_BUSY%.
  echo Close that process and run this script again.
  pause
  exit /b 1
)

if exist ".next" (
  echo Clearing stale .next cache...
  rmdir /s /q ".next" >nul 2>&1
  if exist ".next" (
    echo [WARN] .next cache was not fully removed. Some files may still be locked.
  )
  echo.
)

call npm run dev

endlocal
