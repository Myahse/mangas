@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-api-flow.ps1" %*
exit /b %ERRORLEVEL%
