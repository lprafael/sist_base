@echo off
REM Script batch para mantener la API siempre activa en Windows
REM Este script reinicia automáticamente la API si se cae

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_PATH=%SCRIPT_DIR%
set PYTHON_EXE=%BACKEND_PATH%venv\Scripts\python.exe

REM Verificar si existe el entorno virtual
if not exist "%PYTHON_EXE%" (
    echo ❌ No se encontró el entorno virtual en: %PYTHON_EXE%
    echo Por favor, asegúrate de tener el entorno virtual creado.
    pause
    exit /b 1
)

echo ========================================
echo   Iniciando API con Auto-Restart
echo ========================================
echo Ruta del backend: %BACKEND_PATH%
echo Python: %PYTHON_EXE%
echo Presiona Ctrl+C para detener el servicio
echo.

set RESTART_COUNT=0
set MAX_RESTARTS=1000

:LOOP
set /a RESTART_COUNT+=1
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set DATE=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a:%%b
set TIMESTAMP=%DATE% %TIME%

echo [%TIMESTAMP%] Iniciando API (Intento #%RESTART_COUNT%)...

cd /d "%BACKEND_PATH%"

REM Iniciar uvicorn
"%PYTHON_EXE%" -m uvicorn main:app --host 0.0.0.0 --port 8001

REM Verificar el código de salida
if %ERRORLEVEL% EQU 0 (
    echo [%TIMESTAMP%] API terminó normalmente
    goto :END
)

REM Si hay error, esperar 5 segundos y reiniciar
echo [%TIMESTAMP%] ❌ Error detectado. Reiniciando en 5 segundos...
timeout /t 5 /nobreak >nul

if %RESTART_COUNT% LSS %MAX_RESTARTS% (
    goto :LOOP
) else (
    echo ❌ Se alcanzó el límite de reinicios (%MAX_RESTARTS%)
    echo Por favor, revisa los logs para identificar el problema.
)

:END
pause
