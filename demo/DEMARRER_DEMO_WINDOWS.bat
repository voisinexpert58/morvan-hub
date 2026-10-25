@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 goto using_py
where python >nul 2>nul
if %errorlevel%==0 goto using_python
echo Python est necessaire pour lancer la demonstration.
echo Installez Python ou lancez un serveur HTTP dans ce dossier.
pause
exit /b 1
:using_py
start "" "http://localhost:8080/"
py -m http.server 8080
goto end
:using_python
start "" "http://localhost:8080/"
python -m http.server 8080
:end
pause
