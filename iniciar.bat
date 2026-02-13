@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Iniciador de Servicios
echo ========================================
echo.

:check_docker
REM 1. Verificar si Docker está corriendo
echo [1/3] Verificando motor de Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] El motor de Docker no esta iniciado.
    echo Intentando abrir Docker Desktop automaticamente...
    
    REM Intentar iniciar Docker Desktop
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    echo.
    echo Esperando a que el motor de Docker este listo...
    echo Esto puede tardar hasta un minuto...
    echo.
    
    :wait_loop
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        <nul set /p=.
        timeout /t 5 /nobreak >nul
        goto wait_loop
    )
    echo.
    echo Docker Engine: LISTO
) else (
    echo Docker Engine: OK
)
echo.

REM 2. Verificar si los contenedores ya están corriendo
echo [2/3] Verificando estado de los contenedores...
REM Buscamos si hay contenedores del proyecto activos
docker compose ps --quiet --filter "status=running" > temp_ps.txt
set /p RUNNING_COUNT=<temp_ps.txt
del temp_ps.txt

if "!RUNNING_COUNT!"=="" (
    echo Los servicios estan detenidos. Iniciando...
    echo.
    
    REM 3. Iniciar servicios
    echo [3/3] Levantando servicios con Docker Compose...
    docker compose up -d
    
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: No se pudieron iniciar los servicios.
        pause
        exit /b 1
    )
    echo Servicios iniciados correctamente.
) else (
    echo [2/3] Los servicios ya se encuentran en ejecucion.
    echo [3/3] No se requiere ninguna accion adicional.
)

echo.
echo ========================================
echo   Estado: SISTEMA ACTIVO
echo ========================================
echo.
echo Puede acceder en: http://localhost:3002
echo.
pause
