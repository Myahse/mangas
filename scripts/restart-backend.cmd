@echo off
setlocal
echo Stopping MangAfric backend (if running)...
for /f "tokens=2 delims=," %%a in ('tasklist /fi "imagename eq java.exe" /fo csv /nh 2^>nul') do (
  wmic process where "ProcessId=%%~a" get CommandLine 2>nul | findstr /i "com.mangafriq.Application" >nul
  if not errorlevel 1 taskkill /PID %%~a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo Starting backend...
cd /d "%~dp0..\backend\mangafrik"
call mvnw.cmd spring-boot:run
