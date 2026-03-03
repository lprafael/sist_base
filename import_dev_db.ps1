# import_dev_db.ps1
Write-Host "Iniciando la RESTAURACIÓN de la base de datos de desarrollo..." -ForegroundColor Cyan

# Comprobar si el contenedor está corriendo
$containerId = docker ps -q -f name=SIGEL-db
if (-not $containerId) {
    Write-Host "El contenedor 'SIGEL-db' no está en ejecución. Asegúrate de tener docker-compose up -d corriendo." -ForegroundColor Red
    exit
}

# Comprobar si el archivo de backup existe
if (-not (Test-Path ".\sigel_dev_db.backup")) {
    Write-Host "El archivo de backup 'sigel_dev_db.backup' no existe en esta carpeta." -ForegroundColor Red
    exit
}

Write-Host "Copiando archivo al contenedor..." -ForegroundColor Yellow
docker cp .\sigel_dev_db.backup SIGEL-db:/tmp/sigel_dev_db.backup

Write-Host "Restaurando la base de datos... (puede tardar un rato)" -ForegroundColor Yellow
# Usamos -c (--clean) para borrar las tablas existentes y reescribirlas, y -1 (--single-transaction) para evitar datos parciales si hay error
docker exec -t SIGEL-db pg_restore -U postgres -d SIGEL -c -1 /tmp/sigel_dev_db.backup

Write-Host "Eliminando archivo temporal en el contenedor..." -ForegroundColor Yellow
docker exec -t SIGEL-db rm /tmp/sigel_dev_db.backup

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "¡Restauración completada con éxito!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "Si tienes errores al iniciar el backend, reinícialo con:" -ForegroundColor White
Write-Host "docker compose restart backend" -ForegroundColor Yellow
