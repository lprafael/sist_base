# 🚀 Despliegue en el Servidor 172.16.222.222

## ⚠️ Nota Importante: Docker Compose

Las versiones nuevas de Docker usan `docker compose` (sin guión) en lugar de `docker-compose`.

**Si obtienes error "docker-compose: orden no encontrada"**, prueba:

```bash
# Versión nueva (plugin)
docker compose build
docker compose up -d

# Versión antigua (standalone)
docker-compose build
docker-compose up -d
```

Si ninguna funciona, consulta `SOLUCION_DOCKER_COMPOSE.md` para instalar Docker Compose.

## 📋 Pasos para Desplegar desde GitHub

### 1. Conectarse al Servidor

```bash
ssh user@172.16.222.222
```

### 2. Clonar el Repositorio

```bash
# Navegar al directorio donde quieres el proyecto (ej: /opt o /home/user)
cd /opt  # o la ruta que prefieras

# Clonar el repositorio
git clone https://github.com/hatoweb/sist_catalogos.git
cd sist_catalogos
```

### 3. Verificar Puertos Disponibles

```bash
# Verificar que los puertos 8002 y 3002 estén libres
netstat -tuln | grep -E ':(8002|3002)'
# o
ss -tuln | grep -E ':(8002|3002)'
```

Si los puertos están ocupados, edita `docker-compose.yml` y cambia los puertos en la sección `ports`.

### 4. Configurar Variables de Entorno

```bash
cd backend
cp env_example.txt .env
nano .env  # o usa vi/vim según tu preferencia
```

Editar el archivo `.env` con los valores reales:

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
- No compartir el archivo `.env`
- Para Gmail, usar "Contraseña de aplicación" en lugar de la contraseña normal

### 5. Construir las Imágenes Docker

```bash
cd /opt/sist_catalogos  # o la ruta donde clonaste

# Probar primero con la versión nueva (sin guión)
docker compose build

# Si no funciona, usar la versión antigua (con guión)
# docker-compose build
```

Este proceso puede tardar varios minutos la primera vez.

### 6. Iniciar los Contenedores

```bash
# Versión nueva
docker compose up -d

# Si no funciona, usar:
# docker-compose up -d
```

El flag `-d` ejecuta los contenedores en modo detached (en segundo plano).

### 7. Verificar que los Contenedores Estén Corriendo

```bash
# Versión nueva
docker compose ps
# o versión antigua
# docker-compose ps

# Alternativa
docker container ls | grep sist-catalogos
```

Deberías ver:
- `sist-catalogos-backend` en el puerto 8002
- `sist-catalogos-frontend` en el puerto 3002

### 8. Ver los Logs (Opcional)

```bash
# Versión nueva
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Versión antigua
# docker-compose logs -f
# docker-compose logs -f backend
# docker-compose logs -f frontend
```

### 9. Inicializar la Base de Datos (Primera Vez)

Si es la primera vez que despliegas el sistema:

```bash
# Acceder al contenedor del backend
docker compose exec backend bash
# o: docker-compose exec backend bash

# Dentro del contenedor, ejecutar:
python init_database.py
python create_admin.py

# Salir del contenedor
exit
```

### 10. Verificar el Despliegue

#### Verificar Backend

```bash
curl http://localhost:8002/health
# o
curl http://172.16.222.222:8002/health
```

#### Verificar Frontend

Abrir en el navegador:
```
http://172.16.222.222:3002
```

## 🔄 Actualizar el Sistema

Cuando haya cambios en GitHub:

```bash
cd /opt/sist_catalogos  # o la ruta donde clonaste
git pull origin main
docker compose build
docker compose up -d
# o usar docker-compose si la versión nueva no funciona
```

## 🛠️ Comandos Útiles

### Detener los contenedores
```bash
docker compose down
# o: docker-compose down
```

### Reiniciar los contenedores
```bash
docker compose restart
# o: docker-compose restart
```

### Ver el estado
```bash
docker compose ps
# o: docker-compose ps
```

### Acceder al contenedor del backend
```bash
docker compose exec backend bash
# o: docker-compose exec backend bash
```

### Ver logs en tiempo real
```bash
docker compose logs -f
# o: docker-compose logs -f
```

## 🔐 Credenciales por Defecto

Después de ejecutar `create_admin.py`:

- **Usuario**: `admin`
- **Contraseña**: `Admin123!`
- **Email**: `lprafael1710@gmail.com`

**⚠️ IMPORTANTE**: Cambiar la contraseña después del primer acceso.

## 🔗 URLs de Acceso

- **Frontend**: `http://172.16.222.222:3002`
- **Backend API**: `http://172.16.222.222:8002`
- **API Docs**: `http://172.16.222.222:8002/docs` (si está habilitada)

## ⚠️ Solución de Problemas

### Los contenedores no inician

```bash
# Ver logs detallados
docker compose logs
# o: docker-compose logs

# Verificar que los puertos no estén ocupados
netstat -tuln | grep -E ':(8002|3002)'
```

### Error de conexión a la base de datos

- Verificar que la URL de la base de datos en `backend/.env` sea correcta
- Verificar que la base de datos esté accesible desde el servidor
- Verificar credenciales de la base de datos

### El frontend no se conecta al backend

- Verificar que ambos contenedores estén corriendo: `docker compose ps` o `docker-compose ps`
- Verificar los logs: `docker compose logs frontend` o `docker-compose logs frontend`
- Verificar que el backend responda: `curl http://localhost:8002/health`

---

**Listo para desplegar** 🎉
