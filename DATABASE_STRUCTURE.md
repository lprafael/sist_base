# Estructura Completa de la Base de Datos - Sistema VMT-CID

## Resumen

La base de datos del Sistema de Catálogos VMT-CID está diseñada para garantizar seguridad, trazabilidad y flexibilidad. Incluye:
- Gestión de usuarios, roles y permisos (RBAC)
- Auditoría de accesos y cambios
- Notificaciones internas y por email
- Gestión de catálogos de negocio (gremios, EOTs, feriados)
- Parámetros y configuración dinámica
- Soporte para recuperación y reenvío de contraseña segura

---

## Tablas Principales

### 1. usuarios
| Campo              | Tipo            | Descripción                                  |
|--------------------|-----------------|----------------------------------------------|
| id                 | Integer (PK)    | Identificador único                          |
| username           | String(50)      | Nombre de usuario único                      |
| email              | String(100)     | Email único                                  |
| hashed_password    | String(255)     | Contraseña hasheada (bcrypt)                 |
| nombre_completo    | String(100)     | Nombre completo                              |
| rol                | String(20)      | Rol principal                                |
| activo             | Boolean         | Estado activo/inactivo                       |
| fecha_creacion     | DateTime        | Fecha de creación                            |
| ultimo_acceso      | DateTime        | Último acceso                                |
| creado_por         | Integer (FK)    | Usuario que lo creó                          |

**Notas:**
- Las contraseñas nunca se almacenan en texto plano, solo como hash bcrypt.
- El reenvío de contraseña genera una nueva contraseña temporal y actualiza el hash.

### 2. roles
| Campo         | Tipo         | Descripción          |
|---------------|--------------|----------------------|
| id            | Integer (PK) | Identificador único  |
| nombre        | String(50)   | Nombre del rol       |
| descripcion   | String(200)  | Descripción del rol  |
| activo        | Boolean      | Estado activo        |
| fecha_creacion| DateTime     | Fecha de creación    |
| creado_por    | Integer (FK) | Usuario que lo creó  |

### 3. permisos
| Campo         | Tipo         | Descripción          |
|---------------|--------------|----------------------|
| id            | Integer (PK) | Identificador único  |
| nombre        | String(50)   | Nombre del permiso   |
| descripcion   | String(200)  | Descripción          |
| modulo        | String(50)   | Módulo (gremios, etc)|
| accion        | String(50)   | Acción (read, etc)   |
| activo        | Boolean      | Estado activo        |
| fecha_creacion| DateTime     | Fecha de creación    |

### 4. usuario_rol, rol_permiso
Tablas de asociación many-to-many para roles y permisos.

### 5. logs_acceso
Registra todos los accesos y acciones relevantes de los usuarios.

### 6. logs_auditoria
Auditoría de cambios en datos sensibles.

### 7. notificaciones
Notificaciones internas y por email (recuperación de contraseña, alertas, etc).

### 8. parametros_sistema
Configuraciones globales del sistema.

### 9. gremios, eots, feriados
Tablas de negocio para catálogos principales.

---

## Flujos de Contraseña

- **Recuperación de contraseña:** El usuario solicita recuperación y se notifica al admin por email.
- **Reenviar contraseña (admin):** El admin puede generar una contraseña temporal y enviarla por email al usuario. El sistema actualiza el hash inmediatamente.

---

## Seguridad
- Todas las contraseñas se almacenan solo como hash bcrypt.
- Jamás se envía ni almacena la contraseña original.
- Todos los cambios y accesos quedan auditados.


## 📋 Resumen Ejecutivo

Este documento describe la estructura completa de la base de datos para el Sistema de Catálogos VMT-CID, que incluye:

- **Sistema de Seguridad**: Usuarios, roles, permisos y autenticación
- **Sistema de Auditoría**: Logs de acceso y auditoría de cambios
- **Sistema de Parámetros**: Configuración dinámica del sistema
- **Sistema de Notificaciones**: Notificaciones internas del sistema
- **Sistema de Backup**: Gestión de respaldos automáticos
- **Sistema de Reportes**: Generación y gestión de reportes
- **Catálogos del Negocio**: Gremios, EOTs y Feriados

---

## 🗄️ Tablas de la Base de Datos

### 1. **SISTEMA DE SEGURIDAD**

#### 1.1 `usuarios`
**Propósito**: Almacena información de todos los usuarios del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `username` | String(50) | Nombre de usuario único |
| `email` | String(100) | Email único del usuario |
| `hashed_password` | String(255) | Contraseña hasheada con bcrypt |
| `nombre_completo` | String(100) | Nombre completo del usuario |
| `rol` | String(20) | Rol principal (compatibilidad) |
| `activo` | Boolean | Estado activo/inactivo |
| `fecha_creacion` | DateTime | Fecha de creación |
| `ultimo_acceso` | DateTime | Último acceso al sistema |
| `creado_por` | Integer (FK) | Usuario que lo creó |

**Relaciones**:
- `roles` (many-to-many): Roles asignados al usuario
- `sesiones` (one-to-many): Sesiones activas del usuario
- `logs_acceso` (one-to-many): Logs de acceso del usuario
- `logs_auditoria` (one-to-many): Logs de auditoría del usuario

#### 1.2 `roles`
**Propósito**: Define los roles del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String(50) | Nombre del rol |
| `descripcion` | String(200) | Descripción del rol |
| `activo` | Boolean | Estado activo/inactivo |
| `fecha_creacion` | DateTime | Fecha de creación |
| `creado_por` | Integer (FK) | Usuario que lo creó |

**Relaciones**:
- `usuarios` (many-to-many): Usuarios con este rol
- `permisos` (many-to-many): Permisos asignados al rol

#### 1.3 `permisos`
**Propósito**: Define los permisos específicos del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String(50) | Nombre del permiso |
| `descripcion` | String(200) | Descripción del permiso |
| `modulo` | String(50) | Módulo (gremios, eots, etc.) |
| `accion` | String(50) | Acción (read, write, delete, etc.) |
| `activo` | Boolean | Estado activo/inactivo |
| `fecha_creacion` | DateTime | Fecha de creación |

**Relaciones**:
- `roles` (many-to-many): Roles que tienen este permiso

#### 1.4 `sesiones_usuarios`
**Propósito**: Gestiona las sesiones activas de los usuarios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `usuario_id` | Integer (FK) | Usuario de la sesión |
| `token` | String(500) | Token JWT de la sesión |
| `ip_address` | String(45) | IP del cliente |
| `user_agent` | Text | User agent del navegador |
| `fecha_inicio` | DateTime | Fecha de inicio de sesión |
| `fecha_expiracion` | DateTime | Fecha de expiración |
| `activa` | Boolean | Sesión activa |
| `fecha_cierre` | DateTime | Fecha de cierre de sesión |

**Relaciones**:
- `usuario` (many-to-one): Usuario de la sesión

#### 1.5 `password_resets`
**Propósito**: Gestiona los tokens de restablecimiento de contraseña

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `email` | String(100) | Email del usuario |
| `token` | String(255) | Token único de reset |
| `expira_en` | DateTime | Fecha de expiración |
| `usado` | Boolean | Si el token fue usado |
| `fecha_creacion` | DateTime | Fecha de creación |

---

### 2. **SISTEMA DE AUDITORÍA**

#### 2.1 `logs_acceso`
**Propósito**: Registra todos los intentos de acceso al sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `usuario_id` | Integer (FK) | Usuario (si autenticado) |
| `username` | String(50) | Username intentado |
| `accion` | String(50) | Acción (login, logout, failed_login) |
| `ip_address` | String(45) | IP del cliente |
| `user_agent` | Text | User agent del navegador |
| `fecha` | DateTime | Fecha y hora del evento |
| `detalles` | JSON | Detalles adicionales |
| `exitoso` | Boolean | Si la acción fue exitosa |

**Relaciones**:
- `usuario` (many-to-one): Usuario del log

#### 2.2 `logs_auditoria`
**Propósito**: Registra todos los cambios en los datos del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `usuario_id` | Integer (FK) | Usuario que realizó la acción |
| `username` | String(50) | Username del usuario |
| `accion` | String(50) | Acción (create, update, delete, export) |
| `tabla` | String(50) | Tabla afectada |
| `registro_id` | Integer | ID del registro afectado |
| `datos_anteriores` | JSON | Datos antes del cambio |
| `datos_nuevos` | JSON | Datos después del cambio |
| `ip_address` | String(45) | IP del cliente |
| `user_agent` | Text | User agent del navegador |
| `fecha` | DateTime | Fecha y hora del evento |
| `detalles` | Text | Detalles adicionales |

**Relaciones**:
- `usuario` (many-to-one): Usuario que realizó la acción

---

### 3. **SISTEMA DE PARÁMETROS**

#### 3.1 `parametros_sistema`
**Propósito**: Almacena parámetros configurables del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `codigo` | String(50) | Código único del parámetro |
| `nombre` | String(100) | Nombre descriptivo |
| `valor` | Text | Valor del parámetro |
| `tipo` | String(20) | Tipo (string, integer, float, boolean, json) |
| `descripcion` | String(200) | Descripción del parámetro |
| `categoria` | String(50) | Categoría (seguridad, email, sistema) |
| `editable` | Boolean | Si es editable por usuarios |
| `activo` | Boolean | Estado activo/inactivo |
| `fecha_creacion` | DateTime | Fecha de creación |
| `fecha_modificacion` | DateTime | Fecha de última modificación |
| `modificado_por` | Integer (FK) | Usuario que lo modificó |

#### 3.2 `configuracion_email`
**Propósito**: Configuraciones de email del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String(100) | Nombre de la configuración |
| `host` | String(100) | Servidor SMTP |
| `puerto` | Integer | Puerto SMTP |
| `username` | String(100) | Usuario SMTP |
| `password` | String(255) | Contraseña SMTP |
| `from_email` | String(100) | Email remitente |
| `use_tls` | Boolean | Usar TLS |
| `use_ssl` | Boolean | Usar SSL |
| `activo` | Boolean | Configuración activa |
| `fecha_creacion` | DateTime | Fecha de creación |
| `creado_por` | Integer (FK) | Usuario que lo creó |

---

### 4. **SISTEMA DE NOTIFICACIONES**

#### 4.1 `notificaciones`
**Propósito**: Notificaciones internas del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `usuario_id` | Integer (FK) | Usuario destinatario |
| `titulo` | String(100) | Título de la notificación |
| `mensaje` | Text | Mensaje de la notificación |
| `tipo` | String(20) | Tipo (info, warning, error, success) |
| `leida` | Boolean | Si fue leída |
| `fecha_creacion` | DateTime | Fecha de creación |
| `fecha_lectura` | DateTime | Fecha de lectura |
| `datos_adicionales` | JSON | Datos adicionales |

---

### 5. **SISTEMA DE BACKUP Y REPORTES**

#### 5.1 `backups_sistema`
**Propósito**: Gestión de respaldos automáticos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String(100) | Nombre del backup |
| `descripcion` | Text | Descripción |
| `ruta_archivo` | String(500) | Ruta del archivo de backup |
| `tamano_bytes` | Integer | Tamaño en bytes |
| `tipo` | String(20) | Tipo (completo, incremental, diferencial) |
| `estado` | String(20) | Estado (en_proceso, completado, fallido) |
| `fecha_inicio` | DateTime | Fecha de inicio |
| `fecha_fin` | DateTime | Fecha de finalización |
| `creado_por` | Integer (FK) | Usuario que lo inició |
| `detalles` | JSON | Detalles del proceso |

#### 5.2 `reportes`
**Propósito**: Gestión de reportes del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String(100) | Nombre del reporte |
| `descripcion` | Text | Descripción |
| `tipo` | String(20) | Tipo (pdf, excel, csv, html) |
| `parametros` | JSON | Parámetros del reporte |
| `fecha_creacion` | DateTime | Fecha de creación |
| `fecha_ejecucion` | DateTime | Fecha de ejecución |
| `estado` | String(20) | Estado (pendiente, ejecutando, completado, fallido) |
| `ruta_archivo` | String(500) | Ruta del archivo generado |
| `creado_por` | Integer (FK) | Usuario que lo creó |
| `detalles` | JSON | Detalles del reporte |

---

### 6. **CATÁLOGOS DEL NEGOCIO**

#### 6.1 `gremios`
**Propósito**: Catálogo de gremios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String | Nombre del gremio |
| `descripcion` | String | Descripción |
| `fecha_creacion` | DateTime | Fecha de creación |
| `activo` | Boolean | Estado activo/inactivo |

#### 6.2 `eots`
**Propósito**: Catálogo de EOTs

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String | Nombre del EOT |
| `descripcion` | String | Descripción |
| `fecha_creacion` | DateTime | Fecha de creación |
| `activo` | Boolean | Estado activo/inactivo |

#### 6.3 `feriados`
**Propósito**: Catálogo de feriados

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer (PK) | Identificador único |
| `nombre` | String | Nombre del feriado |
| `fecha` | Date | Fecha del feriado |
| `descripcion` | String | Descripción |
| `fecha_creacion` | DateTime | Fecha de creación |
| `activo` | Boolean | Estado activo/inactivo |

---

## 🔗 Relaciones entre Tablas

### Tablas de Asociación (Many-to-Many)

#### `usuario_rol`
- `usuario_id` → `usuarios.id`
- `rol_id` → `roles.id`

#### `rol_permiso`
- `rol_id` → `roles.id`
- `permiso_id` → `permisos.id`

### Relaciones One-to-Many

- `usuarios` → `sesiones_usuarios`
- `usuarios` → `logs_acceso`
- `usuarios` → `logs_auditoria`
- `usuarios` → `notificaciones`
- `usuarios` → `backups_sistema`
- `usuarios` → `reportes`

---

## 🎯 Roles y Permisos por Defecto

### Rol: `admin`
**Descripción**: Administrador del sistema con acceso completo
**Permisos**: Todos los permisos del sistema

### Rol: `manager`
**Descripción**: Gerente con permisos de gestión y lectura
**Permisos**:
- Gremios: read, write, export
- EOTs: read, write, export
- Feriados: read, write, export
- Usuarios: read
- Auditoría: read

### Rol: `user`
**Descripción**: Usuario con permisos básicos de lectura y escritura
**Permisos**:
- Gremios: read, write
- EOTs: read, write
- Feriados: read, write

### Rol: `viewer`
**Descripción**: Visualizador con permisos de solo lectura
**Permisos**:
- Gremios: read
- EOTs: read
- Feriados: read

---

## 📊 Parámetros del Sistema por Defecto

### Seguridad
- `SESSION_TIMEOUT_MINUTES`: 480 (8 horas)
- `MAX_LOGIN_ATTEMPTS`: 5
- `PASSWORD_EXPIRY_DAYS`: 90

### Email
- `EMAIL_ENABLED`: true
- `EMAIL_FROM_NAME`: "Sistema VMT-CID"

### Sistema
- `SYSTEM_NAME`: "Sistema de Catálogos VMT-CID"
- `SYSTEM_VERSION`: "1.0.0"
- `BACKUP_RETENTION_DAYS`: 30

---

## 🚀 Inicialización de la Base de Datos

Para inicializar la base de datos con todos los datos por defecto:

```bash
cd backend
python init_database.py
```

Esto creará:
- ✅ Todas las tablas
- ✅ Roles por defecto
- ✅ Permisos por defecto
- ✅ Usuario administrador
- ✅ Parámetros del sistema

**Usuario administrador por defecto**:
- Usuario: `admin`
- Contraseña: `Admin123!`
- Email: `admin@vmt-cid.com`
- Rol: `admin`

---

## 🔒 Consideraciones de Seguridad

1. **Contraseñas**: Hasheadas con bcrypt
2. **Tokens JWT**: Con expiración configurable
3. **Auditoría**: Todos los cambios son registrados
4. **Sesiones**: Gestión de sesiones activas
5. **Permisos**: Sistema granular de permisos
6. **Logs**: Registro de todos los accesos

---

## 📈 Monitoreo y Mantenimiento

### Logs a Monitorear
- `logs_acceso`: Intentos de login fallidos
- `logs_auditoria`: Cambios en datos críticos
- `sesiones_usuarios`: Sesiones activas

### Mantenimiento Recomendado
- Limpieza periódica de logs antiguos
- Rotación de backups
- Actualización de contraseñas
- Revisión de permisos

---

## 🔧 Migraciones Futuras

Para futuras actualizaciones de la base de datos:

1. Crear scripts de migración
2. Probar en ambiente de desarrollo
3. Hacer backup antes de aplicar
4. Documentar cambios
5. Actualizar este documento

---

*Documento actualizado: $(date)*
*Versión del sistema: 1.0.0* 