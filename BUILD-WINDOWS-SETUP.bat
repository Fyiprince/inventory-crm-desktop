@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ==========================================
echo Inventory CRM - Windows Installer Builder
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode
where npm >nul 2>nul
if errorlevel 1 goto :nonpm

node --version
call npm --version
echo.

echo [1/5] Installing project dependencies...
call npm run install:all
if errorlevel 1 goto :fail

echo.
echo [2/5] Rebuilding Electron runtime scripts...
call npm rebuild electron --foreground-scripts
if errorlevel 1 goto :fail

echo.
echo [3/5] Generating Prisma client and native engines...
call npm --prefix backend-node rebuild @prisma/client @prisma/engines --foreground-scripts
if errorlevel 1 goto :fail
call npm --prefix backend-node run prisma:generate
if errorlevel 1 goto :fail

echo.
echo [4/5] Building React frontend...
call npm run frontend:build
if errorlevel 1 goto :fail

echo.
echo [5/5] Building Windows NSIS installer...
call npx electron-builder --win nsis
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo SUCCESS
 echo Installer is in the dist folder.
echo ==========================================
explorer "%~dp0dist"
pause
exit /b 0

:nonode
echo ERROR: Node.js is not installed or not in PATH.
pause
exit /b 1

:nonpm
echo ERROR: npm is not installed or not in PATH.
pause
exit /b 1

:fail
echo.
echo BUILD FAILED. Read the error above.
pause
exit /b 1
