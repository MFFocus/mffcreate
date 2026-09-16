@echo off
echo =========================================================
echo       MffConvert - Free & Local-First AI Study Tool
echo =========================================================
echo Cost: $0  ^|  API Keys: None  ^|  Telemetry: Disabled
echo.

start "MffConvert Backend" cmd /k "run_backend.bat"
start "MffConvert Frontend" cmd /k "run_frontend.bat"

echo Backend launching on http://127.0.0.1:8000
echo Frontend launching on http://localhost:3000
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000
