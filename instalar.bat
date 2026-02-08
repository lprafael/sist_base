@echo off
echo ========================================
echo   Instalacion del Sistema VMT-CID
echo ========================================
echo.

REM Verificar Docker
echo [1/4] Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta instalado.
    echo Por favor instala Docker Desktop desde: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo Docker encontrado: OK
echo.

REM Verificar docker-compose
echo [2/4] Verificando Docker Compose...
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    docker-compose --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Docker Compose no esta instalado.
        pause
        exit /b 1
    )
)
echo Docker Compose encontrado: OK
echo.

REM Verificar archivo .env
echo [3/4] Verificando configuracion...
if not exist "backend\.env" (
    echo.
    echo ADVERTENCIA: No se encontro backend\.env
    echo.
    echo Por favor crea el archivo backend\.env con la siguiente estructura:
    echo.
    echo DATABASE_URL=postgresql+asyncpg://usuario:password@localhost:5432/nombre_bd
    echo SECRET_KEY=tu-clave-secreta-aqui
    echo PORT=8001
    echo.
    echo Presiona cualquier tecla para continuar de todas formas...
    pause >nul
)
echo Configuracion: OK
echo.

REM Construir y ejecutar
echo [4/4] Construyendo e iniciando servicios...
echo.
echo Esto puede tardar varios minutos la primera vez...
echo.

docker compose build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Fallo la construccion de las imagenes.
    pause
    exit /b 1
)

docker compose up -d
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Fallo al iniciar los servicios.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Instalacion completada exitosamente!
echo ========================================
echo.
echo Servicios disponibles en:
echo   - Frontend: http://localhost:3002
echo   - Backend:  http://localhost:8002
echo   - API Docs: http://localhost:8002/docs
echo.
echo Para ver los logs:
echo   docker compose logs -f
echo.
echo Para detener los servicios:
echo   docker compose down
echo.
pause
