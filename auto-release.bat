@echo off
REM Script simple pour auto-bump version et push

setlocal enabledelayedexpansion

REM Lire la version actuelle
set /p currentVersion=<version.txt

REM Augmenter la version (0.02 -> 0.03)
for /f "tokens=1,2 delims=." %%a in ("%currentVersion%") do (
    set major=%%a
    set minor=%%b
)

set /a minor=%minor% + 1

if %minor% lss 10 (
    set newVersion=%major%.0%minor%
) else (
    set newVersion=%major%.%minor%
)

echo [INFO] Version: %currentVersion% -^> %newVersion%
echo %newVersion% > version.txt

REM Generer changelog simple
echo v%newVersion% - Updated >> changelog.txt

REM Git
git add .
git commit -m "v%newVersion% - Auto release [skip ci]"
git push origin main

echo [SUCCESS] Released v%newVersion%!
