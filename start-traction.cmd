@echo off
rem Double-click: opens the next step of the traction batch in Warp (one tab per lane, c2 account).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\parallel\start.ps1" -Batch traction %*
if errorlevel 1 pause
