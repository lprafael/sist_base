Write-Host "Iniciando exportación del proyecto SIGEL para otra PC..." -ForegroundColor Cyan

# 1. Construir las imágenes
Write-Host "Construyendo imagen del backend..." -ForegroundColor Yellow
docker build -t sigel-backend:latest ./backend

Write-Host "Construyendo imagen del frontend..." -ForegroundColor Yellow
docker build -t sigel-frontend:latest ./frontend

Write-Host "Descargando imagen de base de datos..." -ForegroundColor Yellow
docker pull postgis/postgis:15-3.3-alpine

# 2. Exportar las imágenes
Write-Host "Exportando todas las imágenes a SIGEL_images.tar (esto puede tomar varios minutos dependiendo del disco)..." -ForegroundColor Yellow
docker save -o SIGEL_images.tar sigel-backend:latest sigel-frontend:latest postgis/postgis:15-3.3-alpine

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "¡Exportación completada con éxito!" -ForegroundColor Green
Write-Host ""
Write-Host "Para llevarlo a otra PC, copia los siguientes archivos en una carpeta (ej: C:\SIGEL):"
Write-Host "1. SIGEL_images.tar"
Write-Host "2. docker-compose.prod.yml"
Write-Host "3. La carpeta 'backend' (solamente necesitas el archivo .env adentro: backend/.env)"
Write-Host ""
Write-Host "En la nueva PC, abre una terminal en esa carpeta y ejecuta:" -ForegroundColor Cyan
Write-Host "  docker load -i SIGEL_images.tar"
Write-Host "  docker compose -f docker-compose.prod.yml up -d"
Write-Host "=====================================================" -ForegroundColor Green
