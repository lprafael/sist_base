# export_dev_db.ps1
Write-Host "Iniciando la exportación de la base de datos de desarrollo..." -ForegroundColor Cyan

# Comprobar si el contenedor está corriendo
$containerId = docker ps -q -f name=SIGEL-db
if (-not $containerId) {
    Write-Host "El contenedor 'SIGEL-db' no está en ejecución. Asegúrate de tener docker-compose up corriendo." -ForegroundColor Red
    exit
}

Write-Host "Realizando el volcado de datos (pg_dump)... esto puede tardar un poco dependiendo del tamaño de la BD." -ForegroundColor Yellow
# Usamos formato custom (-F c) que es el mejor para pg_restore
docker exec -t SIGEL-db pg_dump -U postgres -d SIGEL -F c -f /tmp/sigel_dev_db.backup

Write-Host "Extrayendo el archivo del contenedor hacia tu PC..." -ForegroundColor Yellow
docker cp SIGEL-db:/tmp/sigel_dev_db.backup .\sigel_dev_db.backup

Write-Host "Eliminando archivo temporal en el contenedor..." -ForegroundColor Yellow
docker exec -t SIGEL-db rm /tmp/sigel_dev_db.backup

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "¡Exportación completada con éxito!" -ForegroundColor Green
Write-Host "Archivo generado: sigel_dev_db.backup" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "Ahora puedes copiar toda la carpeta SIGEL a tu pendrive." -ForegroundColor Cyan
