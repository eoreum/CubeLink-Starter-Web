@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE_EXE=%~dp0runtime\node\node.exe"
if exist "%NODE_EXE%" goto node_ready
where node >nul 2>nul
if errorlevel 1 (
  echo 브리지 실행 파일이 준비되지 않았습니다. setup-bridge.cmd를 먼저 실행하세요.
  pause
  exit /b 1
)
set "NODE_EXE=node"
:node_ready
if not exist "tools\arduino-cli.exe" (
  echo Arduino CLI가 준비되지 않았습니다.
  echo setup-bridge.cmd를 먼저 실행하세요.
  pause
  exit /b 1
)
"%NODE_EXE%" server.mjs
echo.
echo 브리지가 종료되었습니다.
pause
