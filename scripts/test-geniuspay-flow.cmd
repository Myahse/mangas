@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-geniuspay-flow.ps1" %*
exit /b %ERRORLEVEL%
