# Guía Completa: Mantener la API siempre activa en Windows

Esta guía explica diferentes métodos para mantener tu API FastAPI siempre activa en Windows, incluso si se cae o hay errores.

## 🚀 Inicio Rápido

### Opción Recomendada (Producción)
```powershell
# 1. Abrir PowerShell como Administrador
# 2. Navegar al directorio backend
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend

# 3. Ejecutar el instalador del servicio
.\install_service_nssm.ps1

# 4. El servicio se instalará y se iniciará automáticamente
```

### Opción Rápida (Desarrollo)
```powershell
cd backend
.\start_api.ps1
```

---

## 📋 Opciones Disponibles

### 1. 🏆 **NSSM (Recomendado) - Servicio de Windows**

**Ventajas:**
- ✅ Se ejecuta como servicio nativo de Windows
- ✅ Se inicia automáticamente al arrancar el sistema
- ✅ Reinicio automático en caso de error
- ✅ No requiere sesión de usuario activa
- ✅ Gestión fácil desde el Administrador de servicios
- ✅ Logs automáticos en archivos

**Desventajas:**
- ⚠️ Requiere permisos de administrador para instalar
- ⚠️ Necesita descargar NSSM (el script lo hace automáticamente)

**Instalación Paso a Paso:**

1. **Abrir PowerShell como Administrador**
   - Presiona `Win + X` y selecciona "Windows PowerShell (Administrador)"
   - O busca "PowerShell" en el menú inicio, clic derecho → "Ejecutar como administrador"

2. **Navegar al directorio backend**
   ```powershell
   cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
   ```

3. **Ejecutar el script de instalación**
   ```powershell
   .\install_service_nssm.ps1
   ```

4. **El script hará lo siguiente:**
   - Verificará si NSSM está instalado (si no, lo descargará automáticamente)
   - Creará el servicio "PoliversoAPI"
   - Configurará el reinicio automático
   - Configurará los logs
   - Te preguntará si deseas iniciar el servicio ahora

**Instalación Manual (Alternativa):**

Si prefieres hacerlo manualmente:

1. Descargar NSSM desde: https://nssm.cc/download
2. Extraer `nssm.exe` (versión win64 o win32 según tu sistema) en la carpeta `backend`
3. Ejecutar los siguientes comandos (ajustar la ruta):
   ```powershell
   # Instalar el servicio
   .\nssm.exe install PoliversoAPI "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\venv\Scripts\python.exe" "-m uvicorn main:app --host 0.0.0.0 --port 8001"
   
   # Configurar directorio de trabajo
   .\nssm.exe set PoliversoAPI AppDirectory "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend"
   
   # Configurar descripción
   .\nssm.exe set PoliversoAPI Description "API del Sistema Poliverso - Backend FastAPI"
   
   # Configurar inicio automático
   .\nssm.exe set PoliversoAPI Start SERVICE_AUTO_START
   
   # Configurar reinicio automático en caso de error
   .\nssm.exe set PoliversoAPI AppExit Default Restart
   .\nssm.exe set PoliversoAPI AppRestartDelay 5000
   
   # Configurar logs
   .\nssm.exe set PoliversoAPI AppStdout "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stdout.log"
   .\nssm.exe set PoliversoAPI AppStderr "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stderr.log"
   
   # Iniciar el servicio
   net start PoliversoAPI
   ```

**Comandos Útiles:**

```powershell
# Iniciar servicio
net start PoliversoAPI

# Detener servicio
net stop PoliversoAPI

# Reiniciar servicio
net stop PoliversoAPI
net start PoliversoAPI

# Ver estado detallado
sc query PoliversoAPI

# Ver estado rápido
Get-Service PoliversoAPI

# Ver logs en tiempo real (salida estándar)
Get-Content C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stdout.log -Wait

# Ver logs de errores en tiempo real
Get-Content C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stderr.log -Wait

# Ver últimas 50 líneas de logs
Get-Content C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stdout.log -Tail 50

# Buscar errores en los logs
Select-String -Path "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stderr.log" -Pattern "error|exception|failed" -CaseSensitive:$false

# Desinstalar servicio
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
.\uninstall_service_nssm.ps1

# O manualmente:
.\nssm.exe stop PoliversoAPI
.\nssm.exe remove PoliversoAPI confirm
```

**Gestión desde el Administrador de Servicios:**

1. Presiona `Win + R`, escribe `services.msc` y presiona Enter
2. Busca "PoliversoAPI" en la lista
3. Puedes iniciar, detener, reiniciar o ver propiedades desde aquí
4. Clic derecho → Propiedades para ver configuración avanzada

**Configuración Avanzada de NSSM:**

```powershell
# Ver toda la configuración del servicio
.\nssm.exe dump PoliversoAPI

# Cambiar el tiempo de espera antes de reiniciar (en milisegundos)
.\nssm.exe set PoliversoAPI AppRestartDelay 10000

# Cambiar el comportamiento al cerrar
.\nssm.exe set PoliversoAPI AppExit Default Restart  # Reiniciar siempre
.\nssm.exe set PoliversoAPI AppExit Default Exit     # Salir sin reiniciar

# Configurar variables de entorno
.\nssm.exe set PoliversoAPI AppEnvironmentExtra "PATH=%PATH%;C:\ruta\adicional"

# Rotar logs automáticamente (evitar que crezcan demasiado)
.\nssm.exe set PoliversoAPI AppRotateFiles 1
.\nssm.exe set PoliversoAPI AppRotateOnline 1
.\nssm.exe set PoliversoAPI AppRotateSeconds 86400  # Rotar cada 24 horas
.\nssm.exe set PoliversoAPI AppRotateBytes 10485760  # Rotar cuando llegue a 10MB
```

---

### 2. ⚡ **Script PowerShell con Auto-Restart**

**Ventajas:**
- ✅ Fácil de usar
- ✅ Reinicio automático en caso de error
- ✅ No requiere instalación adicional
- ✅ Fácil de depurar (ves los logs en tiempo real)
- ✅ No requiere permisos de administrador

**Desventajas:**
- ❌ Requiere que el usuario esté logueado
- ❌ Se detiene si cierras la ventana de PowerShell
- ❌ No se inicia automáticamente al arrancar el sistema

**Uso Básico:**

```powershell
# Navegar al directorio backend
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend

# Ejecutar el script
.\start_api.ps1
```

**El script hará lo siguiente:**
- Verificará que existe el entorno virtual
- Iniciará uvicorn en el puerto 8001
- Si la API se cae, esperará 5 segundos y la reiniciará automáticamente
- Mostrará logs en tiempo real en la consola
- Se detendrá al presionar `Ctrl + C`

**Para ejecutar en segundo plano (ventana oculta):**

```powershell
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
Start-Process powershell -ArgumentList "-File", ".\start_api.ps1" -WindowStyle Hidden
```

**Para ejecutar en una nueva ventana:**

```powershell
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
Start-Process powershell -ArgumentList "-File", ".\start_api.ps1"
```

**Detener el proceso:**

```powershell
# Encontrar el proceso
Get-Process python | Where-Object {$_.Path -like "*sist_base*"}

# Detener todos los procesos Python del proyecto
Get-Process python | Where-Object {$_.Path -like "*sist_base*"} | Stop-Process -Force

# O más específico, detener solo uvicorn
Get-Process python | Where-Object {
    $_.CommandLine -like "*uvicorn*" -and $_.Path -like "*sist_base*"
} | Stop-Process -Force
```

**Personalizar el script:**

Puedes editar `start_api.ps1` para cambiar:
- El tiempo de espera antes de reiniciar (línea con `Start-Sleep -Seconds 5`)
- El límite de reinicios (línea con `$maxRestarts = 1000`)
- El puerto (modificando el comando uvicorn)

---

### 3. 📝 **Script Batch con Auto-Restart**

**Ventajas:**
- ✅ Muy simple
- ✅ Funciona en cualquier Windows (incluso versiones antiguas)
- ✅ No requiere PowerShell (funciona en CMD)
- ✅ No requiere permisos de administrador

**Desventajas:**
- ❌ Requiere que el usuario esté logueado
- ❌ Se detiene si cierras la ventana de CMD
- ❌ No se inicia automáticamente al arrancar el sistema
- ❌ Menos funcionalidades que PowerShell

**Uso:**

```cmd
REM Navegar al directorio backend
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend

REM Ejecutar el script
start_api.bat
```

**El script hará lo siguiente:**
- Verificará que existe el entorno virtual
- Iniciará uvicorn en el puerto 8001
- Si la API se cae, esperará 5 segundos y la reiniciará automáticamente
- Mostrará logs en la consola
- Se detendrá al presionar `Ctrl + C` o cerrar la ventana

**Para ejecutar en segundo plano:**

```cmd
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
start /B start_api.bat
```

**Para ejecutar minimizado:**

```cmd
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
start /MIN start_api.bat
```

**Detener el proceso:**

```cmd
REM Encontrar el PID del proceso
tasklist | findstr python

REM Detener el proceso (reemplazar PID con el número real)
taskkill /PID <PID> /F
```

---

### 4. 🐳 **Docker con Restart Policy (Si usas Docker)**

Si estás usando Docker, puedes configurar la política de reinicio en `docker-compose.yml`:

```yaml
services:
  backend:
    restart: always  # Siempre reinicia
    # o
    restart: unless-stopped  # Reinicia a menos que se detenga manualmente
    # o
    restart: on-failure  # Solo reinicia si hay error
```

**Uso:**

```powershell
# Iniciar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Reiniciar el contenedor
docker-compose restart backend

# Detener
docker-compose stop backend

# Ver estado
docker-compose ps
```

**Ventajas:**
- ✅ Aislamiento completo
- ✅ Fácil de desplegar
- ✅ Reinicio automático configurable
- ✅ Logs integrados

**Desventajas:**
- ❌ Requiere Docker instalado
- ❌ Consume más recursos
- ❌ Configuración adicional necesaria

---

### 5. ⏰ **Windows Task Scheduler (Tarea Programada)**

**Ventajas:**
- ✅ Se ejecuta al inicio del sistema
- ✅ Puede ejecutarse sin usuario logueado
- ✅ No requiere software adicional
- ✅ Integrado en Windows

**Desventajas:**
- ⚠️ No reinicia automáticamente si se cae (necesita configuración adicional)
- ⚠️ Más complejo de configurar que NSSM

**Configuración Paso a Paso:**

1. **Abrir Programador de tareas**
   - Presiona `Win + R`, escribe `taskschd.msc` y presiona Enter
   - O busca "Programador de tareas" en el menú inicio

2. **Crear tarea básica**
   - Clic en "Crear tarea básica..." en el panel derecho
   - Nombre: `Poliverso API`
   - Descripción: `Inicia la API del sistema Poliverso`

3. **Configurar desencadenador**
   - Selecciona "Al iniciar sesión" o "Al iniciar el equipo"
   - Si eliges "Al iniciar el equipo", necesitarás configurar la cuenta de usuario

4. **Configurar acción**
   - Selecciona "Iniciar un programa"
   - Programa o script: `C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\start_api.bat`
   - O directamente:
     - Programa: `C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\venv\Scripts\python.exe`
     - Argumentos: `-m uvicorn main:app --host 0.0.0.0 --port 8001`
     - Iniciar en: `C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend`

5. **Configurar opciones avanzadas**
   - En la pestaña "General":
     - ✅ Marcar "Ejecutar aunque el usuario no haya iniciado sesión"
     - ✅ Marcar "Ejecutar con los privilegios más altos" (si es necesario)
   - En la pestaña "Configuración":
     - ✅ Marcar "Si la tarea ya está en ejecución, aplicar la regla siguiente: No iniciar una nueva instancia"
     - O si quieres reinicio automático: "Si la tarea falla, reiniciar cada: 1 minuto"

6. **Guardar y probar**
   - Clic en "Aceptar"
   - Clic derecho en la tarea → "Ejecutar" para probar

**Comandos útiles:**

```powershell
# Ver tareas programadas
Get-ScheduledTask | Where-Object {$_.TaskName -like "*Poliverso*"}

# Ejecutar tarea manualmente
Start-ScheduledTask -TaskName "Poliverso API"

# Detener tarea
Stop-ScheduledTask -TaskName "Poliverso API"

# Ver historial de ejecuciones
Get-ScheduledTask -TaskName "Poliverso API" | Get-ScheduledTaskInfo
```

---

## 🔍 Monitoreo y Verificación

### Script de Verificación Automática

Usa el script incluido para verificar el estado completo del sistema:

```powershell
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
.\check_service.ps1
```

Este script verificará:
- ✅ Estado del servicio de Windows (si está instalado)
- ✅ Procesos Python en ejecución
- ✅ Puerto 8001 en uso
- ✅ Respuesta HTTP de la API
- ✅ Existencia y tamaño de los logs

### Ver logs del servicio (NSSM)

```powershell
# Ruta completa a los logs
$logPath = "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs"

# Logs de salida estándar (en tiempo real)
Get-Content "$logPath\service_stdout.log" -Wait

# Logs de errores (en tiempo real)
Get-Content "$logPath\service_stderr.log" -Wait

# Últimas 100 líneas de logs
Get-Content "$logPath\service_stdout.log" -Tail 100

# Buscar errores en los logs
Select-String -Path "$logPath\service_stderr.log" -Pattern "error|exception|failed" -CaseSensitive:$false

# Ver tamaño de los logs
Get-ChildItem $logPath | Format-Table Name, @{Label="Tamaño (KB)"; Expression={[math]::Round($_.Length/1KB, 2)}}, LastWriteTime
```

### Verificar que la API está funcionando

```powershell
# Desde PowerShell - Verificar endpoint de salud
Invoke-WebRequest -Uri "http://localhost:8002/health"

# Respuesta esperada: {"status":"ok"}

# Verificar con curl (si está instalado)
curl http://localhost:8002/health

# Desde navegador
# Abrir: http://localhost:8002/health
# Deberías ver: {"status":"ok"}

# Verificar documentación de la API
# Abrir: http://localhost:8002/docs

# Verificar con timeout
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8002/health" -TimeoutSec 5
    Write-Host "✅ API responde correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ API no responde: $_" -ForegroundColor Red
}
```

### Ver procesos de Python

```powershell
# Ver todos los procesos Python del proyecto
Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*sist_base*"
} | Format-Table Id, ProcessName, @{Label="Memoria (MB)"; Expression={[math]::Round($_.WS/1MB, 2)}}, Path -AutoSize

# Ver información detallada de un proceso específico
$proc = Get-Process python | Where-Object {$_.Path -like "*sist_base*"} | Select-Object -First 1
$proc | Format-List *

# Verificar puerto en uso
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Format-Table LocalAddress, LocalPort, State, OwningProcess

# Ver qué proceso está usando el puerto 8001
$connection = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($connection) {
    $process = Get-Process -Id $connection.OwningProcess
    Write-Host "Proceso usando puerto 8001: $($process.ProcessName) (PID: $($process.Id))"
}
```

### Verificar variables de entorno

```powershell
# Ver variables de entorno del proceso
$proc = Get-Process python | Where-Object {$_.Path -like "*sist_base*"} | Select-Object -First 1
if ($proc) {
    $proc.EnvironmentVariables
}

# Verificar que existe el archivo .env
Test-Path "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\.env"
```

---

## 🛠️ Solución de Problemas

### El servicio no inicia

**Síntomas:** El servicio aparece como "Detenido" o no se puede iniciar.

**Soluciones:**

1. **Verificar que el entorno virtual existe:**
   ```powershell
   Test-Path "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\venv\Scripts\python.exe"
   ```
   Si retorna `False`, necesitas crear el entorno virtual:
   ```powershell
   cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. **Verificar logs de errores:**
   ```powershell
   Get-Content "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stderr.log" -Tail 50
   ```

3. **Probar manualmente si la API funciona:**
   ```powershell
   cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
   .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
   ```
   Si funciona manualmente, el problema está en la configuración del servicio.

4. **Verificar la configuración del servicio:**
   ```powershell
   cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
   .\nssm.exe get PoliversoAPI Application
   .\nssm.exe get PoliversoAPI AppDirectory
   ```

5. **Verificar permisos:**
   ```powershell
   # Verificar que el servicio tiene permisos para ejecutar
   icacls "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\venv\Scripts\python.exe"
   ```

### El servicio se reinicia constantemente

**Síntomas:** El servicio inicia pero se detiene inmediatamente y vuelve a iniciar en un bucle.

**Soluciones:**

1. **Revisar logs de errores:**
   ```powershell
   Get-Content "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stderr.log" -Tail 100
   ```

2. **Verificar que el puerto 8001 no esté en uso por otro proceso:**
   ```powershell
   netstat -ano | findstr :8001
   ```
   Si hay otro proceso usando el puerto, detenerlo:
   ```powershell
   # Obtener el PID del proceso
   $connection = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
   if ($connection) {
       Stop-Process -Id $connection.OwningProcess -Force
   }
   ```

3. **Verificar variables de entorno necesarias:**
   ```powershell
   # Verificar que existe el archivo .env
   Test-Path "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\.env"
   
   # Verificar contenido del .env (sin mostrar valores sensibles)
   Get-Content "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\.env" | Select-String -Pattern "^[^#]" | ForEach-Object { $_.Line.Split('=')[0] }
   ```

4. **Aumentar el tiempo de espera antes de reiniciar:**
   ```powershell
   cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
   .\nssm.exe set PoliversoAPI AppRestartDelay 10000
   ```

5. **Desactivar temporalmente el reinicio automático para ver el error:**
   ```powershell
   .\nssm.exe set PoliversoAPI AppExit Default Exit
   net start PoliversoAPI
   # Esperar a que falle y revisar los logs
   ```

### Permisos insuficientes

**Síntomas:** Error al instalar o iniciar el servicio, mensajes de "acceso denegado".

**Soluciones:**

1. **Ejecutar PowerShell como Administrador:**
   - Presiona `Win + X`
   - Selecciona "Windows PowerShell (Administrador)"
   - O busca "PowerShell" → clic derecho → "Ejecutar como administrador"

2. **Verificar permisos en la carpeta del proyecto:**
   ```powershell
   # Ver permisos actuales
   icacls "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend"
   
   # Dar permisos completos al usuario actual (si es necesario)
   icacls "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend" /grant "${env:USERNAME}:(OI)(CI)F"
   ```

3. **Verificar política de ejecución de scripts:**
   ```powershell
   Get-ExecutionPolicy
   ```
   Si está en "Restricted", cambiarlo:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

4. **Verificar que el servicio puede acceder a los archivos:**
   - En NSSM, verificar que "Log on" está configurado correctamente
   - Si usas cuenta de usuario, verificar que tiene permisos

### El servicio inicia pero la API no responde

**Síntomas:** El servicio está "En ejecución" pero `http://localhost:8002/health` no responde.

**Soluciones:**

1. **Verificar que el servicio realmente está ejecutando uvicorn:**
   ```powershell
   Get-Process python | Where-Object {$_.Path -like "*sist_base*"}
   ```

2. **Verificar los logs del servicio:**
   ```powershell
   Get-Content "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs\service_stdout.log" -Tail 50
   ```

3. **Verificar firewall de Windows:**
   ```powershell
   # Ver reglas de firewall para el puerto 8001
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*8001*"}
   
   # Si no hay regla, crear una (ejecutar como administrador)
   New-NetFirewallRule -DisplayName "Poliverso API - Puerto 8001" -Direction Inbound -LocalPort 8001 -Protocol TCP -Action Allow
   ```

4. **Probar con el host 127.0.0.1 en lugar de localhost:**
   ```powershell
   Invoke-WebRequest -Uri "http://127.0.0.1:8001/health"
   ```

5. **Verificar que uvicorn está escuchando en todas las interfaces:**
   - El comando debe incluir `--host 0.0.0.0`
   - Verificar en NSSM: `.\nssm.exe get PoliversoAPI AppParameters`

### Error: "No se puede encontrar el módulo uvicorn"

**Solución:**

1. **Asegurarse de que el entorno virtual está activado al instalar:**
   ```powershell
   cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. **Verificar que uvicorn está instalado:**
   ```powershell
   .\venv\Scripts\python.exe -m pip list | Select-String uvicorn
   ```

3. **Reinstalar uvicorn si es necesario:**
   ```powershell
   .\venv\Scripts\python.exe -m pip install uvicorn[standard]
   ```

### Error: "El puerto 8001 ya está en uso"

**Solución:**

```powershell
# Encontrar el proceso que usa el puerto
$connection = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($connection) {
    $process = Get-Process -Id $connection.OwningProcess
    Write-Host "Proceso usando el puerto: $($process.ProcessName) (PID: $($process.Id))"
    
    # Detener el proceso (cuidado, esto detendrá cualquier proceso usando el puerto)
    Stop-Process -Id $connection.OwningProcess -Force
}
```

### El servicio funciona pero se detiene después de un tiempo

**Posibles causas y soluciones:**

1. **Timeout de sesión:**
   - Verificar que el servicio está configurado para ejecutarse sin sesión de usuario
   - En NSSM, verificar que "Log on" está configurado como "Local System account"

2. **Memoria insuficiente:**
   ```powershell
   # Ver uso de memoria
   Get-Process python | Where-Object {$_.Path -like "*sist_base*"} | Format-Table ProcessName, @{Label="Memoria (MB)"; Expression={[math]::Round($_.WS/1MB, 2)}}
   ```

3. **Errores no capturados que causan cierre:**
   - Revisar logs de errores
   - Agregar manejo de excepciones en el código de la API

4. **Problemas de conexión a la base de datos:**
   - Verificar que la base de datos está accesible
   - Revisar logs para errores de conexión

### El script PowerShell no se ejecuta

**Solución:**

```powershell
# Verificar política de ejecución
Get-ExecutionPolicy

# Si está en Restricted, cambiarla
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# O ejecutar el script con bypass temporal
powershell -ExecutionPolicy Bypass -File .\start_api.ps1
```

---

## 📊 Comparación de Métodos

| Método | Auto-inicio | Sin sesión | Reinicio automático | Facilidad | Logs automáticos |
|--------|-------------|------------|---------------------|-----------|------------------|
| **NSSM** | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ | ✅ |
| **PowerShell Script** | ❌ | ❌ | ✅ | ⭐⭐⭐⭐⭐ | ⚠️ |
| **Batch Script** | ❌ | ❌ | ✅ | ⭐⭐⭐⭐⭐ | ⚠️ |
| **Docker** | ✅ | ✅ | ✅ | ⭐⭐⭐ | ✅ |
| **Task Scheduler** | ✅ | ✅ | ⚠️ | ⭐⭐⭐ | ⚠️ |

---

## 🎯 Recomendación

**Para producción:** Usa **NSSM** (Opción 1) - Es la solución más robusta y profesional.

**Para desarrollo:** Usa el **script PowerShell** (Opción 2) - Es más fácil de depurar.

**Para entornos con Docker:** Usa **Docker con restart policy** (Opción 4) - Aislamiento completo.

---

## 📁 Archivos Creados

Esta guía incluye los siguientes scripts en la carpeta `backend`:

| Archivo | Descripción |
|---------|-------------|
| `start_api.ps1` | Script PowerShell con auto-restart |
| `start_api.bat` | Script Batch con auto-restart |
| `install_service_nssm.ps1` | Instalador del servicio Windows (NSSM) |
| `uninstall_service_nssm.ps1` | Desinstalador del servicio Windows |
| `check_service.ps1` | Script de verificación del estado del servicio |
| `SERVICIO_WINDOWS.md` | Esta guía completa |

---

## 📞 Soporte y Recursos Adicionales

### Revisar Logs

```powershell
# Ruta de los logs
$logPath = "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs"

# Ver todos los archivos de log
Get-ChildItem $logPath

# Ver logs más recientes primero
Get-ChildItem $logPath | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### Ver Eventos de Windows

1. Presiona `Win + X` y selecciona "Visor de eventos"
2. Navega a: **Registros de Windows** → **Sistema**
3. Busca eventos relacionados con "PoliversoAPI" o "Python"
4. Filtra por nivel de evento (Error, Advertencia)

### Comandos Útiles de Diagnóstico

```powershell
# Estado completo del servicio
sc query PoliversoAPI

# Información detallada del servicio
Get-Service PoliversoAPI | Format-List *

# Ver configuración NSSM completa
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
.\nssm.exe dump PoliversoAPI

# Verificar conectividad de red
Test-NetConnection -ComputerName localhost -Port 8001

# Ver todas las conexiones de red en el puerto 8001
Get-NetTCPConnection -LocalPort 8001 | Format-Table LocalAddress, LocalPort, State, OwningProcess, @{Label="Proceso"; Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}}

# Ver uso de recursos del sistema
Get-Process python | Where-Object {$_.Path -like "*sist_base*"} | Format-Table Id, ProcessName, @{Label="CPU (%)"; Expression={$_.CPU}}, @{Label="Memoria (MB)"; Expression={[math]::Round($_.WS/1MB, 2)}}, StartTime
```

### Enlaces Útiles

- **NSSM (Non-Sucking Service Manager):** https://nssm.cc/
- **Documentación de FastAPI:** https://fastapi.tiangolo.com/
- **Documentación de Uvicorn:** https://www.uvicorn.org/
- **Windows Services:** https://docs.microsoft.com/en-us/windows/win32/services/services

### Contacto y Reporte de Problemas

Si encuentras problemas que no se resuelven con esta guía:

1. Ejecuta el script de verificación: `.\check_service.ps1`
2. Revisa los logs en `backend\logs\`
3. Revisa los eventos de Windows
4. Documenta los pasos que seguiste y el error exacto que recibiste
5. Incluye la salida de `.\nssm.exe dump PoliversoAPI` (si usas NSSM)

---

## 🔄 Actualización y Mantenimiento

### Actualizar el servicio después de cambios en el código

```powershell
# Detener el servicio
net stop PoliversoAPI

# Hacer tus cambios en el código...

# Reiniciar el servicio
net start PoliversoAPI
```

### Actualizar dependencias

```powershell
cd C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt --upgrade

# Reiniciar el servicio
net stop PoliversoAPI
net start PoliversoAPI
```

### Limpiar logs antiguos

```powershell
$logPath = "C:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\logs"

# Ver tamaño de logs
Get-ChildItem $logPath | Format-Table Name, @{Label="Tamaño (MB)"; Expression={[math]::Round($_.Length/1MB, 2)}}

# Eliminar logs más antiguos de 30 días
Get-ChildItem $logPath | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item

# O comprimir logs antiguos
Get-ChildItem $logPath | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Compress-Archive -DestinationPath "$logPath\logs_$(Get-Date -Format 'yyyyMMdd').zip"
```

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd")
