# 📦 Guía de Instalación para Cliente - Sistema de Catálogos VMT-CID

## ❓ Preguntas Frecuentes

### ¿Por qué usar Docker?

Docker es la opción **más práctica** para instalar el sistema porque:

1. ✅ **Aislamiento**: No contamina el sistema del cliente (no instala Node.js, Python, etc.)
2. ✅ **Portabilidad**: Funciona igual en cualquier PC (Windows, Linux, Mac)
3. ✅ **Simplicidad**: Un solo comando levanta todo (`docker compose up -d`)
4. ✅ **Consistencia**: Mismo entorno en desarrollo y producción
5. ✅ **Mantenimiento**: Fácil de actualizar o reinstalar

### ¿Necesito hacer build del frontend manualmente?

**No, no es necesario.** El Dockerfile del frontend ya lo hace automáticamente:

- Al ejecutar `docker compose build`, Docker:
  1. Instala las dependencias de Node.js
  2. Ejecuta `npm run build` automáticamente
  3. Copia los archivos compilados a Nginx
  4. Todo se hace dentro del contenedor, sin necesidad de tener Node.js instalado en tu PC

**Ventaja**: No necesitas instalar Node.js, npm, ni hacer el build manualmente.

---

## 🚚 Pasos para migrar el proyecto a la PC del cliente

**¿Ya está el proyecto en Docker?** Sí. El proyecto incluye:

- `docker-compose.yml` (en la raíz)
- `backend/Dockerfile`
- `frontend/Dockerfile`
- Scripts `instalar.bat` (Windows) e `instalar.sh` (Linux/Mac)

### En tu entorno (desarrollador) — qué entregar

1. **Copia completa del proyecto** en una carpeta (USB, ZIP, red, etc.). Debe incluir al menos:
   - `backend/` (código, `requirements.txt`, `Dockerfile`, **sin** `.env` con datos sensibles si prefieres configurarlo en la PC del cliente)
   - `frontend/` (código, `package.json`, `Dockerfile`)
   - `docker-compose.yml`
   - `instalar.bat` e `instalar.sh`
   - Opcional: este archivo `GUIA_INSTALACION_CLIENTE.md`

2. **Base de datos**:  
   - Si el cliente usa **PostgreSQL en su PC**: deja instrucciones para crear la BD y ejecutar migraciones (por ejemplo `backend/initBD.sql` o scripts que uses).  
   - Si usas **servidor remoto**: solo necesitarás la URL en el `.env` del cliente.

### En la PC del cliente — cómo proceder

| Paso | Acción |
|------|--------|
| **1** | Instalar **Docker Desktop** (Windows/Mac) o Docker + Docker Compose (Linux). Ver [Requisitos previos](#requisitos-previos) más abajo. |
| **2** | Tener **PostgreSQL** instalado y la base de datos creada (o la URL del servidor remoto). |
| **3** | Copiar el proyecto a la PC del cliente (misma estructura de carpetas). |
| **4** | Crear el archivo **`backend/.env`** con los datos del cliente (ver [Configurar variables de entorno](#2-configurar-variables-de-entorno)). |
| **5** | Abrir terminal en la **raíz del proyecto** y ejecutar: |
| | **Windows:** doble clic en `instalar.bat` o en CMD/PowerShell: `instalar.bat` |
| | **Linux/Mac:** `chmod +x instalar.sh` y luego `./instalar.sh` |
| | O manualmente: `docker compose build` y después `docker compose up -d` |
| **6** | Comprobar: **Frontend** → http://localhost:3002 — **Backend** → http://localhost:8002/health |

Resumen: **Sí está en Docker; en la PC del cliente solo hace falta Docker, PostgreSQL (o URL remota), configurar `backend/.env` y ejecutar `instalar.bat` / `instalar.sh` (o los comandos de Docker).**

---

## 🎯 Opción Recomendada: Docker (Más Práctica)

### Requisitos Previos

1. **Docker Desktop** instalado en la PC del cliente
   - Windows: Descargar desde https://www.docker.com/products/docker-desktop
   - Linux: `sudo apt install docker.io docker-compose` (Ubuntu/Debian)
   - Verificar: `docker --version` y `docker compose version`

2. **PostgreSQL** instalado y configurado (o acceso a servidor remoto)
   - El cliente debe tener la base de datos lista
   - O usar un servidor de base de datos remoto

### Pasos de Instalación

#### 1. Preparar el Proyecto

```bash
# Copiar todo el proyecto a la PC del cliente
# Asegúrate de incluir:
# - backend/
# - frontend/
# - docker-compose.yml
# - Todos los archivos necesarios
```

#### 2. Configurar Variables de Entorno

Crear archivo `backend/.env`:

```env
# Base de Datos
DATABASE_URL=postgresql+asyncpg://usuario:contraseña@localhost:5432/nombre_bd

# JWT
SECRET_KEY=tu-clave-secreta-muy-segura-aqui

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
EMAIL_FROM=tu-email@gmail.com

# Puerto (opcional, por defecto 8001)
PORT=8001
```

#### 3. Construir y Ejecutar con Docker

```bash
# Desde la raíz del proyecto
docker compose build

# Iniciar los servicios
docker compose up -d

# Ver logs (opcional)
docker compose logs -f
```

#### 4. Verificar que Funciona

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8002/health
- **Documentación API**: http://localhost:8002/docs

#### 5. Comandos Útiles

```bash
# Detener servicios
docker compose down

# Reiniciar servicios
docker compose restart

# Ver estado
docker compose ps

# Ver logs
docker compose logs backend
docker compose logs frontend

# Actualizar después de cambios
docker compose build --no-cache
docker compose up -d
```

---

## 🔧 Opción Alternativa: Instalación Manual (Sin Docker)

### Requisitos

- **Node.js 18+** y npm
- **Python 3.11+** y pip
- **PostgreSQL 14+**
- **Nginx** (para servir el frontend en producción)

### Pasos

#### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Configurar .env (igual que en Docker)
# Crear archivo backend/.env con las variables

# Ejecutar
uvicorn main:app --host 0.0.0.0 --port 8001
```

#### 2. Frontend

```bash
cd frontend
npm install
npm run build  # ⚠️ IMPORTANTE: Hacer build para producción

# Opción A: Servir con servidor de desarrollo (solo para pruebas)
npm run preview

# Opción B: Servir con Nginx (producción)
# Copiar contenido de frontend/dist a /var/www/html
# Configurar Nginx para servir archivos estáticos
```

---

## 📊 Comparación de Opciones

| Característica | Docker ✅ | Manual ❌ |
|----------------|----------|-----------|
| **Facilidad de instalación** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Aislamiento del sistema** | ✅ Sí | ❌ No |
| **Portabilidad** | ✅ Sí | ❌ Depende |
| **Mantenimiento** | ✅ Fácil | ⚠️ Complejo |
| **Actualizaciones** | ✅ Simple | ⚠️ Manual |
| **Requisitos** | Solo Docker | Node, Python, Nginx |
| **Tiempo de setup** | 10-15 min | 30-60 min |

---

## 🚀 Recomendación Final

**Usa Docker** porque:

1. ✅ **Un solo comando** levanta todo: `docker compose up -d`
2. ✅ **No contamina** el sistema del cliente
3. ✅ **Fácil de actualizar**: solo reconstruir y reiniciar
4. ✅ **Funciona igual** en cualquier PC
5. ✅ **El build del frontend se hace automáticamente** dentro del contenedor

---

## 📝 Checklist de Entrega al Cliente

- [ ] Docker Desktop instalado y funcionando
- [ ] PostgreSQL configurado y accesible
- [ ] Archivo `backend/.env` configurado con credenciales correctas
- [ ] Proyecto copiado completo (backend, frontend, docker-compose.yml)
- [ ] Contenedores construidos: `docker compose build`
- [ ] Servicios iniciados: `docker compose up -d`
- [ ] Frontend accesible en http://localhost:3002
- [ ] Backend respondiendo en http://localhost:8002/health
- [ ] Documentación de acceso entregada
- [ ] Credenciales de acceso configuradas

---

## 🔄 Actualizaciones Futuras

Cuando necesites actualizar el sistema:

```bash
# 1. Detener servicios
docker compose down

# 2. Actualizar código (git pull o copiar nuevos archivos)

# 3. Reconstruir imágenes
docker compose build --no-cache

# 4. Reiniciar servicios
docker compose up -d
```

---

## ⚠️ Notas Importantes

1. **Puertos**: 
   - Frontend: 3002 (puedes cambiarlo en docker-compose.yml)
   - Backend: 8002 (puedes cambiarlo en docker-compose.yml)

2. **Base de Datos**: 
   - Asegúrate de que PostgreSQL esté corriendo antes de iniciar Docker
   - O configura la conexión a un servidor remoto en `backend/.env`

3. **Firewall**: 
   - Si hay firewall, abrir puertos 3002 y 8002

4. **Permisos** (Linux):
   - Puede ser necesario: `sudo usermod -aG docker $USER`
   - Luego cerrar sesión y volver a entrar

---

## 🆘 Solución de Problemas

### Error: "docker-compose: command not found"
```bash
# Usar en su lugar:
docker compose build
docker compose up -d
```

### Error: "Cannot connect to Docker daemon"
```bash
# Iniciar Docker Desktop (Windows/Mac)
# O en Linux:
sudo systemctl start docker
sudo systemctl enable docker
```

### Error: "Port already in use"
```bash
# Cambiar puertos en docker-compose.yml
# O detener el servicio que usa el puerto
```

### Frontend no carga
```bash
# Verificar logs:
docker compose logs frontend

# Verificar que el build se hizo correctamente:
docker compose exec frontend ls -la /usr/share/nginx/html
```

### Backend no conecta a BD
```bash
# Verificar .env:
docker compose exec backend cat .env

# Verificar conexión:
docker compose exec backend python -c "import asyncpg; print('OK')"
```

---

*Última actualización: 2025-01-XX*
