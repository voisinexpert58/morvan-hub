@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where npm >nul 2>nul
if errorlevel 1 (
  echo Installez Node.js 22 puis relancez ce fichier.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installez les dependances avec npm ci depuis ce dossier.
  pause
  exit /b 1
)
echo Explorer : http://localhost:5173/index.html
echo Pro : http://localhost:5173/pro.html
echo Voir SUPABASE-INTEGRATION.md pour configurer la connexion.
call npm run dev -- --port 5173 --strictPort
pause

