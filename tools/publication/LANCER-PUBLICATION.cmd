@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ============================================================
echo    MERP-UI - Construction d'une archive Foundry / GitHub
echo ============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Construire-Release.ps1" -RepoPath "%~dp0..\.."
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" (
  echo [ERREUR] L'archive n'a pas ete publiee. Lire le message ci-dessus.
) else (
  echo [OK] Construction terminee. Aucun fichier du depot n'a ete modifie.
)
echo.
pause
exit /b %RESULT%
