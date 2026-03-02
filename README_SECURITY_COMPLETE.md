# Sistema de Seguridad Completo - VMT-CID

## Resumen
El sistema implementa seguridad de nivel empresarial:
- Contraseñas solo como hash bcrypt
- Autenticación JWT
- Control de acceso por roles y permisos (RBAC)
- Auditoría de accesos y cambios
- Notificaciones y flujos seguros de recuperación/reenviar contraseña

---

## Arquitectura de Seguridad
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React + JWT + fetch API
- **Contraseñas:** Nunca en texto plano, solo hash bcrypt
- **Recuperación de contraseña:** Notifica al admin, nunca revela la contraseña
- **Reenvío de contraseña:** Solo admin puede generar y enviar una nueva contraseña temporal al usuario, que se actualiza en el backend y se envía por email
- **Logs:** Todos los accesos y cambios quedan auditados
- **CORS:** Solo frontend autorizado

---

## Flujos de Contraseña
- **Olvidé mi contraseña:** El usuario solicita desde el login, el admin es notificado por email.
- **Reenviar contraseña:** El admin puede generar una nueva contraseña temporal desde la gestión de usuarios, que se envía por email y actualiza el hash.

---

## Recomendaciones
- Cambia tu contraseña tras recibir una temporal.
- Usa contraseñas robustas.
- Protege el archivo .env y la configuración SMTP.

---

## Contacto
- soporte@vmt-cid.com


Este documento describe la implementación completa del sistema de seguridad para el Sistema de Gestión de Catálogos VMT-CID.

## 🎯 Resumen del Sistema

Se ha implementado un sistema de seguridad completo que incluye:

- **Autenticación JWT** con tokens seguros
- **Sistema de roles y permisos** granular
- **Gestión de usuarios** con interfaz administrativa
- **Notificaciones por email** automáticas
- **Logs de auditoría** completos
- **Interfaz de usuario** moderna y responsiva

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de       │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   Datos         │
│                 │    │                 │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Autenticación │    │   Autorización  │    │   Logs de       │
│   JWT           │    │   Roles/Permisos│    │   Auditoría     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Instalación y Configuración

### 1. Backend

#### Instalar Dependencias
```bash
cd backend
pip install -r requirements.txt
```

#### Configurar Variables de Entorno
Crear archivo `.env` en `backend/`:
```env
# Base de datos
DATABASE_URL=postgresql+asyncpg://usuario:password@192.168.100.112:5432/nombre_db

# Seguridad
SECRET_KEY=tu_clave_secreta_muy_segura_aqui_cambiala_en_produccion

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion
EMAIL_FROM=tu_email@gmail.com
```

#### Crear Usuario Administrador
```bash
python create_admin.py
```

#### Ejecutar Backend
```bash
uvicorn main:app --reload
```

### 2. Frontend

#### Instalar Dependencias
```bash
cd frontend
npm install
```

#### Configurar Variables de Entorno
Crear archivo `.env` en `frontend/`:
```env
VITE_REACT_APP_API_URL=http://192.168.100.112:8001
```

#### Ejecutar Frontend
```bash
npm run dev
```

## 🔐 Sistema de Autenticación

### Características
- **JWT Tokens**: Tokens seguros con expiración configurable
- **Hash de Contraseñas**: Bcrypt para máxima seguridad
- **Sesiones**: Control de sesiones activas
- **Logout Seguro**: Limpieza completa de datos

### Flujo de Autenticación
1. Usuario ingresa credenciales
2. Backend valida y genera JWT
3. Frontend almacena token en localStorage
4. Todas las peticiones incluyen token
5. Backend valida token en cada request

## 👥 Sistema de Roles y Permisos

### Roles Disponibles

#### 🔴 Administrador (`admin`)
- **Permisos**: `read`, `write`, `delete`, `manage_users`, `manage_roles`
- **Acceso**: Completo al sistema, todos los distritos y departamentos
- **Funciones**: Gestión de usuarios, logs, configuración, panel georreferenciado global

#### 🟠 Candidato a Intendente (`intendente`)
- **Permisos**: `read`, `write`, `manage_subordinates`
- **Acceso**: Limitado a su distrito asignado
- **Funciones**: Ve sus concejales, los caudillos de sus concejales, y todos los simpatizantes de su estructura. Puede crear concejales y caudillos propios.

#### 🟡 Candidato a Concejal (`concejal`)
- **Permisos**: `read`, `write`, `manage_subordinates`
- **Acceso**: Su propio registro + sus caudillos directos
- **Funciones**: Ve y gestiona sus propios caudillos y los simpatizantes de su rama. No ve datos de otros concejales.

#### 🟢 Caudillo (`caudillo`)
- **Permisos**: `write` (solo captación)
- **Acceso**: Solo su propia lista de simpatizantes
- **Funciones**: Agrega simpatizantes y ve únicamente su propia lista. No puede ver datos de otros caudillos ni niveles superiores.

### Implementación de Permisos
```python
# Backend - Verificar permisos
@Depends(check_permission("write"))

# Frontend - Mostrar/ocultar elementos
{user.rol === 'admin' && <AdminComponent />}
```

## 📧 Sistema de Notificaciones

### Tipos de Email
1. **Bienvenida**: Credenciales al crear usuario
2. **Restablecimiento**: Token para cambiar contraseña
3. **Notificaciones**: Alertas de seguridad

### Configuración Gmail
1. Activar verificación en dos pasos
2. Generar contraseña de aplicación
3. Configurar en variables de entorno

## 📊 Logs de Auditoría

### Información Registrada
- **Usuario**: ID y nombre de usuario
- **Acción**: Tipo de operación realizada
- **IP**: Dirección IP del cliente
- **User-Agent**: Navegador/dispositivo
- **Fecha**: Timestamp de la acción
- **Detalles**: Información adicional

### Acceso a Logs
- Solo administradores pueden ver logs
- Endpoint: `GET /auth/logs`
- Filtrado por fecha y usuario

## 🛡️ Medidas de Seguridad

### Backend
- **CORS**: Configuración segura
- **Rate Limiting**: Protección contra ataques
- **Validación**: Esquemas Pydantic
- **Hash Seguro**: Bcrypt para contraseñas
- **Tokens JWT**: Algoritmo HS256

### Frontend
- **LocalStorage**: Almacenamiento seguro de tokens
- **Validación**: Verificación de formularios
- **Manejo de Errores**: Respuestas apropiadas
- **Logout Seguro**: Limpieza de datos

### Base de Datos
- **Conexiones Seguras**: SSL/TLS
- **Backups**: Respaldo regular
- **Índices**: Optimización de consultas

## 🔧 Endpoints de la API

### Autenticación
```
POST /auth/login              # Iniciar sesión
POST /auth/logout             # Cerrar sesión
POST /auth/change-password    # Cambiar contraseña
POST /auth/reset-password-request  # Solicitar reset
POST /auth/reset-password-confirm  # Confirmar reset
```

### Gestión de Usuarios (Solo Admin)
```
GET    /auth/users            # Listar usuarios
POST   /auth/users            # Crear usuario
GET    /auth/users/{id}       # Obtener usuario
PUT    /auth/users/{id}       # Actualizar usuario
DELETE /auth/users/{id}       # Desactivar usuario
GET    /auth/logs             # Ver logs
GET    /auth/roles            # Listar roles
```

### Datos (Protegidos)
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
PUT    /feriados/{fecha}      # Actualizar feriado
DELETE /feriados/{fecha}      # Eliminar feriado
```

## 📱 Interfaz de Usuario

### Pantalla de Login
- Diseño moderno y responsivo
- Validación en tiempo real
- Manejo de errores claro
- Animaciones suaves

### Dashboard Principal
- Menú dinámico según rol
- Información del usuario
- Navegación intuitiva
- Botón de logout

### Gestión de Usuarios
- Tabla con información completa
- Filtros y búsqueda
- Modal para crear usuarios
- Badges de roles y estado

## 🚨 Manejo de Errores

### Tipos de Error
- **401 Unauthorized**: Token inválido o expirado
- **403 Forbidden**: Sin permisos suficientes
- **404 Not Found**: Recurso no encontrado
- **422 Validation Error**: Datos inválidos

### Respuestas del Frontend
- Mensajes claros al usuario
- Redirección automática al login
- Limpieza de datos de sesión
- Logs de errores en consola

## 🔄 Flujo de Trabajo Típico

### 1. Primer Acceso
1. Administrador ejecuta `create_admin.py`
2. Se crea usuario admin con credenciales por defecto
3. Admin inicia sesión y cambia contraseña
4. Admin crea usuarios adicionales según necesidad

### 2. Uso Diario
1. Usuario inicia sesión con sus credenciales
2. Sistema verifica permisos y muestra menú apropiado
3. Usuario navega y realiza operaciones según su rol
4. Todas las acciones se registran en logs
5. Usuario cierra sesión al terminar

### 3. Gestión de Usuarios
1. Admin accede a "Gestión de Usuarios"
2. Crea nuevos usuarios con roles específicos
3. Sistema envía email con credenciales
4. Admin puede desactivar usuarios según necesidad

## 📈 Monitoreo y Mantenimiento

### Logs a Revisar
- Logs de acceso diarios
- Errores de autenticación
- Intentos de acceso no autorizado
- Operaciones críticas (crear/eliminar usuarios)

### Mantenimiento Regular
- Revisar logs semanalmente
- Actualizar contraseñas periódicamente
- Verificar usuarios activos
- Backup de base de datos

### Alertas de Seguridad
- Múltiples intentos de login fallidos
- Acceso desde IPs desconocidas
- Operaciones fuera de horario normal
- Cambios en roles de usuarios

## 🔮 Mejoras Futuras

### Seguridad Adicional
- Autenticación de dos factores (2FA)
- Integración con LDAP/Active Directory
- Rate limiting más sofisticado
- Auditoría de cambios de configuración

### Funcionalidades
- Dashboard de métricas de seguridad
- Reportes automáticos de actividad
- Integración con SIEM
- Notificaciones push para eventos críticos

### Usabilidad
- Interfaz de administración mejorada
- Gestión masiva de usuarios
- Plantillas de email personalizables
- Configuración de políticas de contraseñas

## 📞 Soporte

### Documentación Adicional
- `backend/README_SECURITY.md` - Documentación del backend
- `frontend/README_SECURITY.md` - Documentación del frontend
- `backend/env_example.txt` - Ejemplo de variables de entorno

### Troubleshooting Común
1. **Error de conexión**: Verificar que backend esté ejecutándose
2. **Error de autenticación**: Verificar credenciales y estado del usuario
3. **Error de permisos**: Verificar rol y permisos del usuario
4. **Error de email**: Verificar configuración SMTP

### Contacto
Para soporte técnico o consultas sobre el sistema de seguridad, contactar al equipo de desarrollo VMT-CID.

---

**Nota**: Este sistema de seguridad está diseñado para entornos de producción. Asegúrese de cambiar todas las contraseñas por defecto y configurar adecuadamente las variables de entorno antes de desplegar en producción. 