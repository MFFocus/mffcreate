@echo off
echo Starting MffConvert Next.js Frontend...
echo Opening http://localhost:3000
cd /d "%~dp0frontend"
set NODE_OPTIONS=--use-system-ca
npm start
pause
