@echo off
setlocal

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-admin.ps1" -NoPrompt -OpenAnyway %*

if errorlevel 1 (
  echo.
  echo Startup failed. Press any key to close this window.
  pause >nul
)

endlocal
