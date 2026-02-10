@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Actualizador del Sistema VMT-CID
echo ========================================
echo.

REM 1. Bajar cambios de GitHub
echo [1/3] Descargando ultimos cambios desde GitHub (rama playa)...
git pull origin playa
if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudieron descargar los cambios. 
    echo Verifique su conexion a Internet o si hay conflictos locales.
    pause
    exit /b 1
)
echo Cambios descargados: OK
echo.

REM 2. Detener y reconstruir contenedores
echo [2/3] Reconstruyendo contenedores de Docker...
echo Esto puede tardar unos minutos...

REM Detener para asegurar limpieza
docker compose down

REM Reconstruir frontend sin cache (critico para cambios de codigo/estilos)
echo Reconstruyendo Frontend...
docker compose build --no-cache frontend

REM Reconstruir backend
echo Reconstruyendo Backend...
docker compose build backend

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Fallo la reconstruccion de las imagenes.
    pause
    exit /b 1
)
echo Construccion: OK
echo.

REM 3. Iniciar servicios
echo [3/3] Iniciando servicios actualizados...
docker compose up -d

if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudieron iniciar los servicios.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Sistema actualizado exitosamente!
echo ========================================
echo.
echo Puede acceder en: http://localhost:3002
echo.
pause
