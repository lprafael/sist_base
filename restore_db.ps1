# restore_db.ps1 - Restaurar backup de SIGEL en esta PC
# Uso: .\restore_db.ps1 [archivo.dump]
# Ejemplo: .\restore_db.ps1 .\sigel_backup_20260311_1213.dump
# En la otra PC: tener PostgreSQL instalado y crear la BD vacía "SIGEL" si no existe.

param(
    [Parameter(Position=0)]
    [string]$Archivo = (Get-ChildItem -Filter "sigel_backup_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
)

if (-not $Archivo -or -not (Test-Path $Archivo)) {
    Write-Host "Uso: .\restore_db.ps1 <archivo.dump>" -ForegroundColor Yellow
    Write-Host "Ejemplo: .\restore_db.ps1 .\sigel_backup_20260311_1213.dump" -ForegroundColor Gray
    Write-Host "No se encontró archivo .dump en la carpeta actual." -ForegroundColor Red
    exit 1
}

if (-not $env:PGPASSWORD) { $env:PGPASSWORD = "admin" }

$ruta = (Resolve-Path $Archivo).Path
$nombre = [System.IO.Path]::GetFileName($ruta)

Write-Host "Restaurando: $nombre en localhost:5432, base SIGEL..." -ForegroundColor Cyan

# Crear BD si no existe (pg_restore no crea la BD). Si ya existe, se ignora el error.
docker run --rm -e PGPASSWORD=$env:PGPASSWORD postgres:18-alpine psql -h host.docker.internal -p 5432 -U postgres -d postgres -c "CREATE DATABASE SIGEL;" 2>$null
$null = $LASTEXITCODE

# Restaurar (el archivo debe estar accesible; montamos la carpeta actual)
docker run --rm -e PGPASSWORD=$env:PGPASSWORD -v "${PWD}:/backup" postgres:18-alpine sh -c "pg_restore -h host.docker.internal -p 5432 -U postgres -d SIGEL -v --no-owner --no-acl /backup/$nombre"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restauración completada." -ForegroundColor Green
} else {
    Write-Host "Revisa que PostgreSQL esté en 5432 y que el archivo sea correcto." -ForegroundColor Red
    exit 1
}
