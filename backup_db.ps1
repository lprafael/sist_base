# backup_db.ps1 - Backup completo de la BD SIGEL (PostgreSQL local)
# Uso: .\backup_db.ps1
# Genera: sigel_backup_YYYYMMDD_HHMM.dump (formato custom, ideal para pg_restore)

$fecha = Get-Date -Format "yyyyMMdd_HHmm"
$archivo = "sigel_backup_$fecha.dump"

Write-Host "Backup de BD SIGEL (localhost:5432)..." -ForegroundColor Cyan
Write-Host "Archivo: $archivo" -ForegroundColor Gray

# Contraseña de Postgres (misma que en backend/.env). Para no hardcodear: $env:PGPASSWORD = "tu_password"
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = "admin" }

# pg_dump vía Docker contra tu Postgres local
docker run --rm -e PGPASSWORD=$env:PGPASSWORD -v "${PWD}:/out" postgres:18-alpine sh -c "pg_dump -h host.docker.internal -p 5432 -U postgres -d SIGEL -F c -f /out/$archivo"

if ($LASTEXITCODE -eq 0) {
    $tam = (Get-Item $archivo).Length / 1MB
    Write-Host "OK. Backup guardado: $archivo ($([math]::Round($tam, 2)) MB)" -ForegroundColor Green
    Write-Host "Copia este archivo a la otra PC y usa restore_db.ps1 (o las instrucciones dentro)." -ForegroundColor Cyan
} else {
    Write-Host "Error al crear el backup. ¿PostgreSQL está corriendo en localhost:5432?" -ForegroundColor Red
    exit 1
}
