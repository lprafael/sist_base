# FICHA TÉCNICA - Sistema de Catálogos VMT-CID

## Información General
| Campo                  | Valor                        |
|------------------------|------------------------------|
| Nombre del Sistema     | Sistema de Catálogos VMT-CID |
| Versión                | 2.0.0                        |
| Tipo de Aplicación     | Web (SPA + API REST)         |
| Arquitectura           | Frontend-Backend Separados   |
| Estado                 | En producción                |
| Fecha de última actualización | 2025-08-07           |

---

## Arquitectura General
- **Frontend:** React 18 + Vite, CSS custom, fetch API, JWT en localStorage
- **Backend:** FastAPI (Python 3.11+), SQLAlchemy Async, PostgreSQL, Pydantic, CORS
- **Base de Datos:** PostgreSQL 14+, ORM SQLAlchemy, backup automático
- **Email:** SMTP configurable (envía notificaciones y contraseñas temporales)

---

## Funcionalidades Clave
- Gestión de usuarios (alta, edición, roles, activación/desactivación, borrado físico)
- Recuperación de contraseña (notifica al admin)
- Reenvío de contraseña temporal (admin genera y envía nueva contraseña)
- Control de acceso por roles y permisos (RBAC)
- Auditoría de accesos y acciones
- Notificaciones internas y por email
- CRUD completo de gremios, EOTs y feriados
- Exportación de datos

---

## Flujos de Contraseña
- **¿Olvidaste tu contraseña?**: El usuario solicita recuperación y el admin es notificado por email.
- **Reenviar contraseña (admin):** El admin puede generar y enviar una nueva contraseña temporal al usuario editado. El hash se actualiza y el usuario debe cambiarla tras ingresar.

---

## Endpoints Clave
- `POST /auth/login` — Login de usuario
- `POST /auth/users` — Alta de usuario
- `PUT /auth/users/{id}` — Editar usuario
- `DELETE /auth/users/{id}` — Desactivar usuario
- `DELETE /auth/users/{id}/hard` — Borrado físico
- `POST /auth/users/{id}/reactivate` — Reactivar usuario inactivo
- `POST /auth/change-password` — Cambiar contraseña propia
- `POST /notify/forgot-password` — Notificar recuperación (admin)
- `POST /notify/resend-password` — Enviar contraseña temporal al usuario

---

## Seguridad
- Contraseñas solo como hash bcrypt
- JWT tokens
- Roles y permisos granulares
- Logs de acceso y auditoría
- Protección contra CSRF y CORS

---

## Contacto Técnico
- Email: soporte@vmt-cid.com
- Documentación: README_SECURITY_COMPLETE.md, GUIA_INICIACION.md


## 📋 Información General

| Campo | Valor |
|-------|-------|
| **Nombre del Sistema** | Sistema de Catálogos VMT-CID |
| **Versión** | 1.0.0 |
| **Tipo de Aplicación** | Web Application (SPA + API) |
| **Arquitectura** | Frontend-Backend Separados |
| **Fecha de Creación** | 2024 |
| **Estado** | En Desarrollo |

---

## 🏗️ Arquitectura del Sistema

### **Frontend (React)**
- **Framework**: React 18.x
- **Lenguaje**: JavaScript/JSX
- **Bundler**: Vite
- **Gestión de Estado**: React Hooks (useState, useEffect)
- **Routing**: React Router (implícito)
- **UI Components**: CSS Custom + React Components
- **HTTP Client**: Fetch API nativo
- **Autenticación**: JWT Tokens (localStorage)

### **Backend (FastAPI)**
- **Framework**: FastAPI 0.104.x
- **Lenguaje**: Python 3.11+
- **Base de Datos**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0 (Async)
- **Autenticación**: JWT + bcrypt
- **Validación**: Pydantic
- **Email**: FastAPI-Mail
- **CORS**: Configurado para frontend

### **Base de Datos**
- **Motor**: PostgreSQL
- **ORM**: SQLAlchemy Async
- **Migraciones**: Alembic (recomendado)
- **Backup**: Automático (configurable)

---

## 🔧 Especificaciones Técnicas

### **Requisitos del Sistema**

#### **Servidor Backend**
- **OS**: Linux (Ubuntu 20.04+) / Windows Server 2019+
- **CPU**: 2 cores mínimo, 4 cores recomendado
- **RAM**: 4GB mínimo, 8GB recomendado
- **Almacenamiento**: 20GB mínimo
- **Python**: 3.11+
- **PostgreSQL**: 14+

#### **Cliente Frontend**
- **Navegador**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RAM**: 2GB mínimo
- **Resolución**: 1024x768 mínimo, 1920x1080 recomendado

#### **Red**
- **Ancho de Banda**: 1Mbps mínimo
- **Latencia**: <100ms recomendado
- **Protocolo**: HTTPS (producción)

---

## 📊 Estructura de Datos

### **Tablas Principales**

#### **Catálogos del Negocio**
- `gremios`: Gestión de gremios
- `eots`: Gestión de EOTs
- `feriados`: Gestión de feriados

#### **Sistema de Seguridad**
- `usuarios`: Usuarios del sistema
- `roles`: Roles de acceso
- `permisos`: Permisos granulares
- `sesiones_usuarios`: Sesiones activas
- `password_resets`: Resets de contraseña

#### **Auditoría y Logs**
- `logs_acceso`: Logs de acceso al sistema
- `logs_auditoria`: Logs de cambios en datos

#### **Configuración**
- `parametros_sistema`: Parámetros configurables
- `configuracion_email`: Configuración de email

#### **Sistema**
- `notificaciones`: Notificaciones internas
- `backups_sistema`: Gestión de backups
- `reportes`: Gestión de reportes

---

## 🔐 Sistema de Seguridad

### **Autenticación**
- **Método**: JWT (JSON Web Tokens)
- **Algoritmo**: HS256
- **Expiración**: Configurable (8 horas por defecto)
- **Refresh**: No implementado (futuro)

### **Autorización**
- **Modelo**: RBAC (Role-Based Access Control)
- **Roles**: admin, manager, user, viewer
- **Permisos**: Granulares por módulo y acción
- **Verificación**: Middleware en cada endpoint

### **Contraseñas**
- **Hashing**: bcrypt
- **Salt Rounds**: 12
- **Política**: Mínimo 8 caracteres, mayúsculas, minúsculas, números

### **Auditoría**
- **Logs de Acceso**: Todos los intentos de login
- **Logs de Auditoría**: Todos los cambios en datos
- **Retención**: Configurable
- **Exportación**: Disponible para administradores

---

## 🌐 API Endpoints

### **Autenticación**
```
POST /auth/login              # Login de usuario
POST /auth/logout             # Logout de usuario
POST /auth/change-password    # Cambio de contraseña
POST /auth/reset-password-request  # Solicitar reset
POST /auth/reset-password-confirm  # Confirmar reset
GET  /auth/me                 # Información del usuario actual
```

### **Gestión de Usuarios**
```
GET    /auth/users            # Listar usuarios
POST   /auth/users            # Crear usuario
GET    /auth/users/{id}       # Obtener usuario
PUT    /auth/users/{id}       # Actualizar usuario
DELETE /auth/users/{id}       # Desactivar usuario
```

### **Catálogos**
```
GET    /gremios               # Listar gremios
POST   /gremios               # Crear gremio
PUT    /gremios/{id}          # Actualizar gremio
DELETE /gremios/{id}          # Eliminar gremio

GET    /eots                  # Listar EOTs
POST   /eots                  # Crear EOT
PUT    /eots/{id}             # Actualizar EOT
DELETE /eots/{id}             # Eliminar EOT

GET    /feriados              # Listar feriados
POST   /feriados              # Crear feriado
PUT    /feriados/{id}         # Actualizar feriado
DELETE /feriados/{id}         # Eliminar feriado
```

### **Sistema**
```
GET    /auth/roles            # Listar roles
GET    /auth/logs             # Logs de auditoría
GET    /health                # Health check
```

---

## 📱 Interfaz de Usuario

### **Componentes Principales**
- **Login**: Autenticación con validación
- **Dashboard**: Vista principal con navegación
- **CRUD Tables**: Tablas con filtros y paginación
- **User Management**: Gestión de usuarios (admin)
- **Modals**: Formularios de creación/edición

### **Características UI/UX**
- **Responsive**: Adaptable a diferentes pantallas
- **Accesibilidad**: ARIA labels y navegación por teclado
- **Feedback**: Mensajes de éxito/error
- **Loading States**: Indicadores de carga
- **Validation**: Validación en tiempo real

### **Tecnologías Frontend**
- **CSS**: Custom CSS con variables
- **Icons**: SVG inline
- **Tables**: React Table (@tanstack/react-table)
- **Forms**: Controlled components
- **State Management**: React Hooks

---

## 🔄 Flujo de Datos

### **Autenticación**
1. Usuario ingresa credenciales
2. Frontend envía POST a `/auth/login`
3. Backend valida credenciales
4. Backend genera JWT token
5. Frontend almacena token en localStorage
6. Frontend incluye token en headers de requests

### **Autorización**
1. Frontend envía request con token
2. Backend middleware verifica token
3. Backend middleware verifica permisos
4. Backend procesa request o retorna 403

### **CRUD Operations**
1. Usuario interactúa con UI
2. Frontend valida datos
3. Frontend envía request a API
4. Backend valida y procesa
5. Backend registra en logs de auditoría
6. Frontend actualiza UI

---

## 📈 Rendimiento

### **Métricas Objetivo**
- **Tiempo de Respuesta API**: <200ms
- **Tiempo de Carga Frontend**: <3s
- **Concurrent Users**: 50+ usuarios
- **Uptime**: 99.5%

### **Optimizaciones**
- **Database**: Índices en campos frecuentes
- **API**: Paginación en listados
- **Frontend**: Lazy loading de componentes
- **Caching**: localStorage para datos estáticos

---

## 🔧 Configuración

### **Variables de Entorno**

#### **Backend (.env)**
```env
DATABASE_URL=postgresql+asyncpg://user:pass@192.168.100.112/vmt_SIGEL
SECRET_KEY=your-secret-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

#### **Frontend (.env)**
```env
VITE_REACT_APP_API_URL=http://192.168.100.112:8001
```

### **Configuración de Base de Datos**
- **Puerto**: 5432 (PostgreSQL)
- **Encoding**: UTF-8
- **Timezone**: UTC
- **Connection Pool**: 10-20 conexiones

---

## 🚀 Despliegue

### **Desarrollo**
```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

### **Producción**
```bash
# Backend (con Gunicorn)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend (build estático)
npm run build
# Servir con nginx/apache
```

### **Docker (Recomendado)**
```dockerfile
# Dockerfile para backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 🔍 Monitoreo y Logs

### **Logs del Sistema**
- **Nivel**: INFO, WARNING, ERROR
- **Formato**: JSON estructurado
- **Rotación**: Diaria
- **Retención**: 30 días

### **Métricas a Monitorear**
- **CPU Usage**: <80%
- **Memory Usage**: <85%
- **Disk Usage**: <90%
- **Response Time**: <200ms
- **Error Rate**: <1%

### **Alertas**
- **Sistema Down**: Inmediata
- **High CPU/Memory**: 5 minutos
- **High Error Rate**: 1 minuto
- **Database Issues**: Inmediata

---

## 🔒 Seguridad

### **Medidas Implementadas**
- **HTTPS**: Obligatorio en producción
- **CORS**: Configurado para dominio específico
- **Rate Limiting**: Implementado en endpoints críticos
- **Input Validation**: Validación en frontend y backend
- **SQL Injection**: Prevenido con ORM
- **XSS**: Prevenido con React

### **Recomendaciones de Seguridad**
- **Firewall**: Configurar reglas específicas
- **Backup**: Automático y cifrado
- **Updates**: Mantener dependencias actualizadas
- **Monitoring**: Monitoreo de logs de seguridad
- **Access Control**: Revisión periódica de permisos

---

## 📚 Dependencias

### **Backend (requirements.txt)**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
fastapi-mail==1.4.1
pydantic==2.5.0
```

### **Frontend (package.json)**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-table": "^8.10.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.1.1",
    "vite": "^5.0.0"
  }
}
```

---

## 🔄 Mantenimiento

### **Tareas Diarias**
- Revisión de logs de error
- Verificación de backups
- Monitoreo de recursos

### **Tareas Semanales**
- Limpieza de logs antiguos
- Revisión de sesiones activas
- Análisis de métricas de rendimiento

### **Tareas Mensuales**
- Actualización de dependencias
- Revisión de permisos de usuarios
- Análisis de logs de auditoría

---

## 📞 Soporte

### **Contacto Técnico**
- **Email**: soporte@vmt-cid.com
- **Documentación**: README.md
- **Issues**: GitHub Issues (si aplica)

### **Escalación**
1. **Nivel 1**: Soporte básico (24h)
2. **Nivel 2**: Soporte técnico (4h)
3. **Nivel 3**: Desarrollo (2h)

---

*Documento actualizado: Diciembre 2024*
*Versión del sistema: 1.0.0* 