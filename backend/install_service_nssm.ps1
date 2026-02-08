# Script para instalar la API como servicio de Windows usando NSSM
# NSSM (Non-Sucking Service Manager) es una herramienta gratuita y fácil de usar

$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = $scriptPath
$pythonExe = Join-Path $backendPath "venv\Scripts\python.exe"
$nssmPath = Join-Path $scriptPath "nssm.exe"

# Verificar si existe el entorno virtual
if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ No se encontró el entorno virtual en: $pythonExe" -ForegroundColor Red
    Write-Host "Por favor, asegúrate de tener el entorno virtual creado." -ForegroundColor Yellow
    exit 1
}

# Verificar si NSSM está disponible
if (-not (Test-Path $nssmPath)) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  NSSM no encontrado" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NSSM (Non-Sucking Service Manager) es necesario para instalar el servicio." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "1. Descargar NSSM manualmente:" -ForegroundColor White
    Write-Host "   https://nssm.cc/download" -ForegroundColor Gray
    Write-Host "   Extraer nssm.exe en: $backendPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Usar Chocolatey (si está instalado):" -ForegroundColor White
    Write-Host "   choco install nssm" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Usar winget:" -ForegroundColor White
    Write-Host "   winget install NSSM.NSSM" -ForegroundColor Gray
    Write-Host ""
    
    $download = Read-Host "¿Deseas que descargue NSSM automáticamente? (S/N)"
    if ($download -eq "S" -or $download -eq "s") {
        Write-Host "Descargando NSSM..." -ForegroundColor Cyan
        $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $zipPath = Join-Path $env:TEMP "nssm.zip"
        
        try {
            Invoke-WebRequest -Uri $nssmUrl -OutFile $zipPath
            Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
            $nssmSource = Get-ChildItem -Path $env:TEMP -Filter "nssm.exe" -Recurse | Select-Object -First 1
            if ($nssmSource) {
                Copy-Item $nssmSource.FullName -Destination $nssmPath -Force
                Write-Host "✅ NSSM descargado e instalado correctamente" -ForegroundColor Green
            } else {
                Write-Host "❌ No se pudo encontrar nssm.exe en el archivo descargado" -ForegroundColor Red
                exit 1
            }
        } catch {
            Write-Host "❌ Error descargando NSSM: $_" -ForegroundColor Red
            Write-Host "Por favor, descárgalo manualmente desde https://nssm.cc/download" -ForegroundColor Yellow
            exit 1
        }
    } else {
        exit 1
    }
}

# Verificar si el servicio ya existe
$serviceName = "PoliversoAPI"
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  El servicio ya existe" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    $action = Read-Host "¿Deseas (R)einiciar, (D)esinstalar o (C)ancelar? (R/D/C)"
    
    if ($action -eq "D" -or $action -eq "d") {
        Write-Host "Desinstalando servicio..." -ForegroundColor Cyan
        & $nssmPath stop $serviceName
        Start-Sleep -Seconds 2
        & $nssmPath remove $serviceName confirm
        Write-Host "✅ Servicio desinstalado" -ForegroundColor Green
        exit 0
    } elseif ($action -eq "R" -or $action -eq "r") {
        Write-Host "Reinstalando servicio..." -ForegroundColor Cyan
        & $nssmPath stop $serviceName
        Start-Sleep -Seconds 2
        & $nssmPath remove $serviceName confirm
        Start-Sleep -Seconds 1
    } else {
        exit 0
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalando servicio de Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Nombre del servicio: $serviceName" -ForegroundColor Gray
Write-Host "Ruta del backend: $backendPath" -ForegroundColor Gray
Write-Host ""

# Instalar el servicio
Write-Host "Instalando servicio..." -ForegroundColor Cyan
& $nssmPath install $serviceName "$pythonExe" "-m uvicorn main:app --host 0.0.0.0 --port 8001"

# Configurar el directorio de trabajo
& $nssmPath set $serviceName AppDirectory "$backendPath"

# Configurar descripción
& $nssmPath set $serviceName Description "API del Sistema Poliverso - Backend FastAPI"

# Configurar para que se inicie automáticamente
& $nssmPath set $serviceName Start SERVICE_AUTO_START

# Configurar reinicio automático en caso de error
& $nssmPath set $serviceName AppRestartDelay 5000
& $nssmPath set $serviceName AppExit Default Restart
& $nssmPath set $serviceName AppRestartDelay 5000

# Configurar variables de entorno si es necesario
# & $nssmPath set $serviceName AppEnvironmentExtra "PATH=%PATH%;$backendPath\venv\Scripts"

# Configurar logs
$logPath = Join-Path $backendPath "logs"
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force | Out-Null
}
& $nssmPath set $serviceName AppStdout "$logPath\service_stdout.log"
& $nssmPath set $serviceName AppStderr "$logPath\service_stderr.log"

Write-Host ""
Write-Host "✅ Servicio instalado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Iniciar servicio:   net start $serviceName" -ForegroundColor White
Write-Host "  Detener servicio:   net stop $serviceName" -ForegroundColor White
Write-Host "  Ver estado:         sc query $serviceName" -ForegroundColor White
Write-Host "  Desinstalar:        $nssmPath remove $serviceName confirm" -ForegroundColor White
Write-Host ""

$startNow = Read-Host "¿Deseas iniciar el servicio ahora? (S/N)"
if ($startNow -eq "S" -or $startNow -eq "s") {
    Write-Host "Iniciando servicio..." -ForegroundColor Cyan
    net start $serviceName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Servicio iniciado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al iniciar el servicio. Revisa los logs en: $logPath" -ForegroundColor Red
    }
}
