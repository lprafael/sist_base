#!/bin/bash

echo "========================================"
echo "  Instalación del Sistema"
echo "========================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Docker
echo "[1/4] Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker no está instalado.${NC}"
    echo "Por favor instala Docker desde: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}Docker encontrado: OK${NC}"
echo ""

# Verificar docker-compose
echo "[2/4] Verificando Docker Compose..."
if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
    echo -e "${RED}ERROR: Docker Compose no está instalado.${NC}"
    exit 1
fi
echo -e "${GREEN}Docker Compose encontrado: OK${NC}"
echo ""

# Verificar archivo .env
echo "[3/4] Verificando configuración..."
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}ADVERTENCIA: No se encontró backend/.env${NC}"
    echo ""
    echo "Por favor crea el archivo backend/.env con la siguiente estructura:"
    echo ""
    echo "DATABASE_URL=postgresql+asyncpg://usuario:password@localhost:5432/nombre_bd"
    echo "SECRET_KEY=tu-clave-secreta-aqui"
    echo "PORT=8001"
    echo ""
    read -p "Presiona Enter para continuar de todas formas..."
fi
echo -e "${GREEN}Configuración: OK${NC}"
echo ""

# Construir y ejecutar
echo "[4/4] Construyendo e iniciando servicios..."
echo ""
echo "Esto puede tardar varios minutos la primera vez..."
echo ""

# Usar docker compose o docker-compose según esté disponible
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

$COMPOSE_CMD build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Falló la construcción de las imágenes.${NC}"
    exit 1
fi

$COMPOSE_CMD up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Falló al iniciar los servicios.${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "  ${GREEN}Instalación completada exitosamente!${NC}"
echo "========================================"
echo ""
echo "Servicios disponibles en:"
echo "  - Frontend: http://localhost:3002"
echo "  - Backend:  http://localhost:8002"
echo "  - API Docs: http://localhost:8002/docs"
echo ""
echo "Para ver los logs:"
echo "  $COMPOSE_CMD logs -f"
echo ""
echo "Para detener los servicios:"
echo "  $COMPOSE_CMD down"
echo ""
