# Script para verificar el estado del servicio y la API

$ErrorActionPreference = "Continue"

$serviceName = "PoliversoAPI"
$apiUrl = "http://localhost:8002/health"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Estado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar servicio de Windows
Write-Host "1. Verificando servicio de Windows..." -ForegroundColor Yellow
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service) {
    $statusColor = if ($service.Status -eq "Running") { "Green" } else { "Red" }
    Write-Host "   Servicio: $serviceName" -ForegroundColor Gray
    Write-Host "   Estado: $($service.Status)" -ForegroundColor $statusColor
    Write-Host "   Tipo de inicio: $($service.StartType)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Servicio '$serviceName' no está instalado" -ForegroundColor Yellow
}
Write-Host ""

# Verificar proceso Python
Write-Host "2. Verificando procesos Python..." -ForegroundColor Yellow
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*sist_base*" -or $_.CommandLine -like "*uvicorn*"
}

if ($pythonProcesses) {
    Write-Host "   ✅ Procesos Python encontrados:" -ForegroundColor Green
    foreach ($proc in $pythonProcesses) {
        Write-Host "      - PID: $($proc.Id) | Memoria: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ No se encontraron procesos Python de la API" -ForegroundColor Red
}
Write-Host ""

# Verificar puerto
Write-Host "3. Verificando puerto 8001..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "   ✅ Puerto 8001 está en uso" -ForegroundColor Green
    Write-Host "      Estado: $($portInUse.State)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Puerto 8001 no está en uso" -ForegroundColor Red
}
Write-Host ""

# Verificar API HTTP
Write-Host "4. Verificando respuesta de la API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API responde correctamente" -ForegroundColor Green
        Write-Host "      Status: $($response.StatusCode)" -ForegroundColor Gray
        try {
            $content = $response.Content | ConvertFrom-Json
            Write-Host "      Respuesta: $($content | ConvertTo-Json -Compress)" -ForegroundColor Gray
        } catch {
            Write-Host "      Respuesta: $($response.Content)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ API no responde: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Verificar logs
Write-Host "5. Verificando logs..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$logPath = Join-Path $scriptPath "logs"

if (Test-Path $logPath) {
    $stdoutLog = Join-Path $logPath "service_stdout.log"
    $stderrLog = Join-Path $logPath "service_stderr.log"
    
    if (Test-Path $stdoutLog) {
        $stdoutSize = (Get-Item $stdoutLog).Length / 1KB
        Write-Host "   ✅ Log stdout existe: $([math]::Round($stdoutSize, 2)) KB" -ForegroundColor Green
        
        # Mostrar últimas líneas
        $lastLines = Get-Content $stdoutLog -Tail 3 -ErrorAction SilentlyContinue
        if ($lastLines) {
            Write-Host "      Últimas líneas:" -ForegroundColor Gray
            $lastLines | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        }
    }
    
    if (Test-Path $stderrLog) {
        $stderrSize = (Get-Item $stderrLog).Length / 1KB
        $hasErrors = (Get-Content $stderrLog -ErrorAction SilentlyContinue).Count -gt 0
        if ($hasErrors) {
            Write-Host "   ⚠️  Log stderr existe: $([math]::Round($stderrSize, 2)) KB (contiene errores)" -ForegroundColor Yellow
            $errorLines = Get-Content $stderrLog -Tail 3 -ErrorAction SilentlyContinue
            if ($errorLines) {
                Write-Host "      Últimos errores:" -ForegroundColor Gray
                $errorLines | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkRed }
            }
        } else {
            Write-Host "   ✅ Log stderr existe: $([math]::Round($stderrSize, 2)) KB (sin errores)" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ⚠️  Directorio de logs no existe: $logPath" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación completada" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
