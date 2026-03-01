# Análisis de Puertos - Sistema de Catálogos

## 📊 Puertos Ocupados en el Servidor (172.16.222.222)

Según `docker container ls`, los siguientes puertos están en uso:

| Puerto Host | Puerto Container | Servicio | Estado |
|-------------|------------------|----------|--------|
| **8080** | 80 | cbd-monitor-frontend | ⚠️ Ocupado |
| **5001** | 5000 | cbd-monitor-backend | ⚠️ Ocupado |
| **80** | 80 | validaciones-frontend | ⚠️ Ocupado |
| **5000** | 5000 | validaciones-backend | ⚠️ Ocupado |
| **5678** | 5678 | validaciones-n8n | ⚠️ Ocupado |

## 🔍 Puertos Requeridos por SIGEL

Según la configuración actual del proyecto:

| Servicio | Puerto Actual | Archivo de Configuración |
|----------|---------------|--------------------------|
| **Backend** | **8001** | `backend/main.py` (línea 100) |
| **Frontend (dev)** | **3001** | `frontend/vite.config.js` (línea 7) |
| **Frontend (prod)** | **80** (típico) | N/A |

## ✅ Recomendaciones de Puertos

### Opción 1: Puertos Alternativos Recomendados (Sin Conflictos)

| Servicio | Puerto Recomendado | Justificación |
|----------|-------------------|---------------|
| **Backend** | **8002** | Cerca del puerto original (8001), fácil de recordar |
| **Frontend** | **3002** o **8082** | Evita conflictos con 3001 y 8080 |

### Opción 2: Puertos Alternativos (Si 8002 está ocupado)

| Servicio | Puerto Alternativo |
|----------|-------------------|
| **Backend** | **8003**, **8004**, **9000** |
| **Frontend** | **3003**, **8083**, **8084** |

## 🔧 Configuración Necesaria Antes de Subir al Servidor

### ✅ Archivos Creados

Los siguientes archivos ya han sido creados y configurados:

1. **`docker-compose.yml`** - Configuración completa con puertos 8002 (backend) y 3002 (frontend)
2. **`backend/Dockerfile`** - Imagen del backend con Python 3.11
3. **`frontend/Dockerfile`** - Imagen del frontend con React y Nginx
4. **`frontend/nginx.conf`** - Configuración de Nginx con proxy al backend
5. **`INSTRUCCIONES_DESPLIEGUE.md`** - Guía completa de despliegue

### 📝 Configuración Adicional Necesaria

1. **Crear archivo `backend/.env`** con las variables de entorno:
   - `DATABASE_URL` - URL de conexión a PostgreSQL
   - `SECRET_KEY` - Clave secreta para JWT
   - `EMAIL_*` - Configuración de email

2. **Verificar puertos libres** en el servidor antes de desplegar

## 📝 Checklist Antes de Subir

- [x] Crear `docker-compose.yml` con los puertos configurados
- [x] Crear Dockerfiles para backend y frontend
- [x] Configurar Nginx con proxy al backend
- [ ] Verificar que los puertos 8002 y 3002 estén libres en el servidor
- [ ] Crear archivo `backend/.env` con variables de entorno
- [ ] Verificar que la base de datos esté accesible desde el servidor
- [ ] Probar localmente (opcional) con los nuevos puertos
- [ ] Revisar `INSTRUCCIONES_DESPLIEGUE.md` para pasos detallados

## 🚀 Comandos Útiles para Verificar Puertos en el Servidor

```bash
# Ver todos los puertos en uso
docker container ls

# Verificar si un puerto específico está libre
netstat -tuln | grep :8002
# o
ss -tuln | grep :8002

# Ver todos los puertos escuchando
netstat -tuln
```

## ⚠️ Notas Importantes

1. **Puerto 80 está ocupado**: No puedes usar el puerto 80 para el frontend. Usa 3002, 8082 u otro puerto disponible.

2. **Puerto 5000 está ocupado**: No puedes usar el puerto 5000 para el backend.

3. **Puerto 8001**: Aunque no aparece en la lista de contenedores, es recomendable usar 8002 para evitar conflictos futuros.

4. **Acceso al sistema**: Una vez desplegado, el sistema será accesible en:
   - Frontend: `http://172.16.222.222:3002` (o el puerto que elijas)
   - Backend API: `http://172.16.222.222:8002`
