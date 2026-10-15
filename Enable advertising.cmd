@echo off
cd /d "%~dp0"
set "INKRUSH_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%INKRUSH_NODE%" ("%INKRUSH_NODE%" scripts\advertising.mjs on) else (node scripts\advertising.mjs on)
pause
