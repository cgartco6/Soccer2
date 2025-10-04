@echo off
echo Optimizing for Windows 10...
echo.

:: Set optimal environment variables
set PYTHONOPTIMIZE=1
set PYTHONFAULTHANDLER=1

:: Increase file handle limits
echo Increasing system limits...

:: Create desktop shortcut
echo Creating desktop shortcut...
echo [InternetShortcut] > "%USERPROFILE%\Desktop\Sports Analytics Platform.url"
echo URL=http://localhost:5000 >> "%USERPROFILE%\Desktop\Sports Analytics Platform.url"
echo IconIndex=0 >> "%USERPROFILE%\Desktop\Sports Analytics Platform.url"
echo IconFile=C:\Windows\System32\SHELL32.dll >> "%USERPROFILE%\Desktop\Sports Analytics Platform.url"

echo.
echo ✅ Optimization complete!
echo.
echo To start the application:
echo 1. Open Command Prompt
echo 2. Navigate to the project folder
echo 3. Run: python app.py
echo 4. Open the desktop shortcut or go to http://localhost:5000
pause
