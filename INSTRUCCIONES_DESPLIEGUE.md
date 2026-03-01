# 🚀 Instrucciones de Despliegue - Sistema de Catálogos

## 📋 Resumen de Puertos

### Puertos Ocupados en el Servidor (172.16.222.222)
- **8080** → cbd-monitor-frontend
- **5001** → cbd-monitor-backend  
- **80** → validaciones-frontend
- **5000** → validaciones-backend
- **5678** → validaciones-n8n

### Puertos Asignados para SIGEL
- **8002** → Backend (puerto interno del container: 8001)
- **3002** → Frontend (puerto interno del container: 80)

## 📦 Archivos Necesarios

Asegúrate de tener los siguientes archivos antes de subir al servidor:

1. ✅ `docker-compose.yml` - Configuración de Docker Compose
2. ✅ `backend/Dockerfile` - Imagen del backend
3. ✅ `frontend/Dockerfile` - Imagen del frontend
4. ✅ `frontend/nginx.conf` - Configuración de Nginx
5. ✅ `backend/.env` - Variables de entorno del backend (crear)

## 🔧 Configuración Previa

### 1. Crear archivo `.env` para el backend

En el servidor, crear el archivo `backend/.env` con la siguiente configuración:

```env
# Base de datos
DATABASE_URL=postgresql+asyncpg://usuario:password@host:5432/nombre_db

# Seguridad
SECRET_KEY=tu_clave_secreta_muy_segura_aqui_cambiala_en_produccion

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion
EMAIL_FROM=tu_email@gmail.com

# Puerto (opcional, por defecto 8001)
PORT=8001
```

**⚠️ IMPORTANTE**: 
- No subir el archivo `.env` al repositorio (debe estar en `.gitignore`)
- Cambiar todas las credenciales por valores reales
- Para Gmail, usar "Contraseña de aplicación" en lugar de la contraseña normal

### 2. Verificar puertos disponibles

En el servidor, ejecutar:

```bash
# Verificar que los puertos 8002 y 3002 estén libres
netstat -tuln | grep -E ':(8002|3002)'
# o
ss -tuln | grep -E ':(8002|3002)'
```

Si los puertos están ocupados, editar `docker-compose.yml` y cambiar los puertos en la sección `ports`.

## 📤 Subir el Proyecto al Servidor

### Opción 1: Usando Git (Recomendado)

```bash
# En el servidor (172.16.222.222)
cd /ruta/donde/quieres/el/proyecto
git clone https://github.com/lprafael/sist_base.git
cd SIGEL
```

### Opción 2: Usando SCP/SFTP

```bash
# Desde tu máquina local
scp -r . user@172.16.222.222:/ruta/destino/SIGEL
```

## 🐳 Construcción y Despliegue con Docker

### 1. Construir las imágenes

```bash
cd SIGEL
docker-compose build
```

Este comando construirá las imágenes para:
- Backend (Python + FastAPI)
- Frontend (React + Nginx)

### 2. Crear el archivo `.env` del backend

```bash
cd backend
cp env_example.txt .env
nano .env  # Editar con los valores reales
cd ..
```

### 3. Iniciar los contenedores

```bash
docker-compose up -d
```

El flag `-d` ejecuta los contenedores en modo detached (en segundo plano).

### 4. Verificar que los contenedores estén corriendo

```bash
docker-compose ps
# o
docker container ls | grep SIGEL
```

Deberías ver:
- `SIGEL-backend` en el puerto 8002
- `SIGEL-frontend` en el puerto 3002

### 5. Ver los logs

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend

# Ver logs solo del frontend
docker-compose logs -f frontend
```

## 🔍 Verificación del Despliegue

### 1. Verificar Backend

```bash
# Desde el servidor
curl http://localhost:8002/health
# o
curl http://172.16.222.222:8002/health
```

### 2. Verificar Frontend

Abrir en el navegador:
```
http://172.16.222.222:3002
```

### 3. Verificar conexión Frontend-Backend

El frontend debería poder comunicarse con el backend a través del proxy `/api` configurado en nginx.

## 🔄 Comandos Útiles

### Detener los contenedores
```bash
docker-compose down
```

### Detener y eliminar volúmenes
```bash
docker-compose down -v
```

### Reiniciar los contenedores
```bash
docker-compose restart
```

### Reconstruir las imágenes (después de cambios en el código)
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Ver el estado de los contenedores
```bash
docker-compose ps
```

### Acceder al contenedor del backend
```bash
docker-compose exec backend bash
```

### Acceder al contenedor del frontend
```bash
docker-compose exec frontend sh
```

## 🗄️ Inicialización de la Base de Datos

Si es la primera vez que despliegas el sistema:

```bash
# Acceder al contenedor del backend
docker-compose exec backend bash

# Dentro del contenedor, ejecutar:
python init_database.py
python create_admin.py
```

## 🔐 Credenciales por Defecto

Después de ejecutar `create_admin.py`, las credenciales iniciales son:

- **Usuario**: `admin`
- **Contraseña**: `Admin123!`
- **Email**: `admin@vmt-cid.com`

**⚠️ IMPORTANTE**: Cambiar la contraseña después del primer acceso.

## 🛠️ Solución de Problemas

### Problema: Los contenedores no inician

```bash
# Ver logs detallados
docker-compose logs

# Verificar que los puertos no estén ocupados
netstat -tuln | grep -E ':(8002|3002)'
```

### Problema: Error de conexión a la base de datos

- Verificar que la URL de la base de datos en `backend/.env` sea correcta
- Verificar que la base de datos esté accesible desde el servidor
- Verificar credenciales de la base de datos

### Problema: El frontend no se conecta al backend

- Verificar que ambos contenedores estén corriendo: `docker-compose ps`
- Verificar los logs del frontend: `docker-compose logs frontend`
- Verificar que nginx esté configurado correctamente (archivo `nginx.conf`)
- Verificar que el backend responda: `curl http://localhost:8002/health`

### Problema: Error al construir las imágenes

```bash
# Limpiar caché y reconstruir
docker-compose build --no-cache

# Verificar que Docker tenga suficiente espacio
docker system df
```

## 📝 Notas Adicionales

1. **Puertos**: Si necesitas cambiar los puertos, edita `docker-compose.yml` y actualiza la sección `ports`.

2. **Variables de Entorno**: Todas las variables sensibles deben estar en `backend/.env`, nunca en el código.

3. **Actualizaciones**: Para actualizar el sistema:
   ```bash
   git pull
   docker-compose build
   docker-compose up -d
   ```

4. **Backups**: Configurar backups regulares de la base de datos.

5. **Monitoreo**: Considerar agregar healthchecks y monitoreo para producción.

## 🔗 URLs de Acceso

Una vez desplegado, el sistema será accesible en:

- **Frontend**: `http://172.16.222.222:3002`
- **Backend API**: `http://172.16.222.222:8002`
- **Documentación API**: `http://172.16.222.222:8002/docs` (si está habilitada)

---

**Última actualización**: Diciembre 2024
