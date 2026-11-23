@echo off
rem Double-click: opens the next step of the icanspeak.it relaunch in Warp (one tab per lane).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\parallel\start.ps1" -Batch site-launch %*
if errorlevel 1 pause
