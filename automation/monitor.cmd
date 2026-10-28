@echo off
rem Starts the EnglishAcademy content-run monitor (if it is not running yet) and opens it.
cd /d "%~dp0"
start "EnglishAcademy monitor" /min node "%~dp0monitor.mjs"
timeout /t 1 /nobreak >nul
start "" http://localhost:4455
