@echo off
rem Double-click: opens the next step of the brand rollout in Warp (one tab per lane).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\parallel\start.ps1" -Batch brand-rollout %*
if errorlevel 1 pause
