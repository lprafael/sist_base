# Script para desinstalar el servicio de Windows de la API

$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$nssmPath = Join-Path $scriptPath "nssm.exe"
$serviceName = "PoliversoAPI"

# Verificar si NSSM existe
if (-not (Test-Path $nssmPath)) {
    Write-Host "❌ NSSM no encontrado en: $nssmPath" -ForegroundColor Red
    Write-Host "El servicio puede no estar instalado con NSSM." -ForegroundColor Yellow
    exit 1
}

# Verificar si el servicio existe
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if (-not $existingService) {
    Write-Host "❌ El servicio '$serviceName' no está instalado" -ForegroundColor Yellow
    exit 0
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Desinstalando servicio" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Nombre del servicio: $serviceName" -ForegroundColor Gray
Write-Host ""

# Detener el servicio si está corriendo
if ($existingService.Status -eq "Running") {
    Write-Host "Deteniendo servicio..." -ForegroundColor Cyan
    & $nssmPath stop $serviceName
    Start-Sleep -Seconds 2
}

# Desinstalar el servicio
Write-Host "Desinstalando servicio..." -ForegroundColor Cyan
& $nssmPath remove $serviceName confirm

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Servicio desinstalado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error al desinstalar el servicio" -ForegroundColor Red
    exit 1
}
