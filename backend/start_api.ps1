# Script de PowerShell para mantener la API siempre activa
# Este script reinicia automáticamente la API si se cae

$ErrorActionPreference = "Continue"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = $scriptPath
$pythonExe = Join-Path $backendPath "venv\Scripts\python.exe"

# Verificar si existe el entorno virtual
if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ No se encontró el entorno virtual en: $pythonExe" -ForegroundColor Red
    Write-Host "Por favor, asegúrate de tener el entorno virtual creado." -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando API con Auto-Restart" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ruta del backend: $backendPath" -ForegroundColor Gray
Write-Host "Python: $pythonExe" -ForegroundColor Gray
Write-Host "Presiona Ctrl+C para detener el servicio" -ForegroundColor Yellow
Write-Host ""

$restartCount = 0
$maxRestarts = 1000  # Límite de reinicios (ajustar según necesidad)

while ($restartCount -lt $maxRestarts) {
    $restartCount++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "[$timestamp] Iniciando API (Intento #$restartCount)..." -ForegroundColor Green
    
    try {
        # Cambiar al directorio del backend
        Set-Location $backendPath
        
        # Iniciar uvicorn
        & $pythonExe -m uvicorn main:app --host 0.0.0.0 --port 8001
        
        # Si uvicorn termina sin error, salir del loop
        Write-Host "[$timestamp] API terminó normalmente" -ForegroundColor Yellow
        break
        
    } catch {
        $errorMsg = $_.Exception.Message
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] ❌ Error: $errorMsg" -ForegroundColor Red
        
        # Esperar 5 segundos antes de reiniciar
        Write-Host "[$timestamp] Reiniciando en 5 segundos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if ($restartCount -ge $maxRestarts) {
    Write-Host "❌ Se alcanzó el límite de reinicios ($maxRestarts)" -ForegroundColor Red
    Write-Host "Por favor, revisa los logs para identificar el problema." -ForegroundColor Yellow
}
