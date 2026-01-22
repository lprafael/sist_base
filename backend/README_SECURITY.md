# Sistema de Seguridad - VMT-CID

Este documento describe cómo configurar y usar el sistema de seguridad implementado en el backend.

## Características Implementadas

### 🔐 Autenticación
- **Login/Logout**: Sistema de autenticación con JWT
- **Gestión de contraseñas**: Hash seguro con bcrypt
- **Tokens de acceso**: JWT con expiración configurable
- **Sesiones seguras**: Control de acceso basado en tokens

### 👥 Gestión de Usuarios
- **Creación de usuarios**: Solo administradores pueden crear usuarios
- **Roles y permisos**: Sistema de roles con permisos específicos
- **Activación/Desactivación**: Control de estado de usuarios
- **Auditoría**: Logs de todas las acciones de usuarios

### 📧 Notificaciones por Email
- **Bienvenida**: Email automático con credenciales al crear usuario
- **Restablecimiento de contraseña**: Sistema de recuperación seguro
- **Notificaciones**: Alertas de seguridad

### 🛡️ Roles y Permisos

#### Admin
- Acceso completo al sistema
- Gestión de usuarios
- Gestión de roles
- Ver logs de acceso
- CRUD completo en todos los módulos

#### Manager
- Acceso completo a datos
- CRUD en gremios, EOTs y feriados
- No puede gestionar usuarios

#### User
- Lectura y escritura de datos
- No puede eliminar registros
- No puede gestionar usuarios

#### Viewer
- Solo lectura
- No puede modificar datos

## Configuración Inicial

### 1. Instalar Dependencias

```bash
pip install -r requirements.txt
```

### 2. Configurar Variables de Entorno

Crear un archivo `.env` en el directorio `backend/` con el siguiente contenido:

```env
# Configuración de la base de datos
DATABASE_URL=postgresql+asyncpg://usuario:password@192.168.100.112:5432/nombre_db

# Configuración de seguridad
SECRET_KEY=tu_clave_secreta_muy_segura_aqui_cambiala_en_produccion

# Configuración de email (para Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion
EMAIL_FROM=tu_email@gmail.com
```

### 3. Configurar Email (Gmail)

Para usar Gmail como servidor de email:

1. Activar la verificación en dos pasos en tu cuenta de Google
2. Generar una "Contraseña de aplicación":
   - Ve a https://myaccount.google.com/apppasswords
   - Selecciona "Otra" y dale un nombre (ej: "VMT-CID")
   - Usa la contraseña generada en `EMAIL_PASSWORD`

### 4. Crear Usuario Administrador

```bash
python create_admin.py
```

Esto creará un usuario administrador con:
- Usuario: `admin`
- Contraseña: `Admin123!`
- Email: `admin@vmt-cid.com`

**IMPORTANTE**: Cambia la contraseña después del primer inicio de sesión.

## Uso de la API

### Autenticación

#### Login
```bash
POST /auth/login
{
    "username": "admin",
    "password": "Admin123!"
}
```

Respuesta:
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@vmt-cid.com",
        "nombre_completo": "Administrador del Sistema",
        "rol": "admin",
        "activo": true,
        "fecha_creacion": "2024-01-01T00:00:00",
        "ultimo_acceso": "2024-01-01T12:00:00"
    }
}
```

#### Usar Token
Incluir el token en el header de todas las peticiones:
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Gestión de Usuarios

#### Crear Usuario (Solo Admin)
```bash
POST /auth/users
Authorization: Bearer <token>
{
    "username": "nuevo_usuario",
    "email": "usuario@ejemplo.com",
    "nombre_completo": "Usuario Ejemplo",
    "rol": "user"
}
```

#### Listar Usuarios (Solo Admin)
```bash
GET /auth/users
Authorization: Bearer <token>
```

#### Cambiar Contraseña
```bash
POST /auth/change-password
Authorization: Bearer <token>
{
    "current_password": "contraseña_actual",
    "new_password": "NuevaContraseña123!"
}
```

#### Restablecer Contraseña
```bash
# Solicitar restablecimiento
POST /auth/reset-password-request
{
    "email": "usuario@ejemplo.com"
}

# Confirmar con token
POST /auth/reset-password-confirm
{
    "token": "token_recibido_por_email",
    "new_password": "NuevaContraseña123!"
}
```

### Endpoints Protegidos

Todos los endpoints CRUD ahora requieren autenticación y permisos específicos:

- **GET** endpoints: Requieren permiso `read`
- **POST** endpoints: Requieren permiso `write`
- **PUT** endpoints: Requieren permiso `write`
- **DELETE** endpoints: Requieren permiso `delete`

### Logs de Acceso

#### Ver Logs (Solo Admin)
```bash
GET /auth/logs?limit=100
Authorization: Bearer <token>
```

## Seguridad

### Contraseñas
- Mínimo 8 caracteres
- Debe contener mayúsculas, minúsculas y números
- Hash seguro con bcrypt

### Tokens JWT
- Expiración configurable (30 minutos por defecto)
- Algoritmo HS256
- Clave secreta configurable

### Logs de Auditoría
- Todas las acciones se registran
- Incluye IP, User-Agent y detalles
- Solo administradores pueden ver logs

## Desarrollo

### Estructura de Archivos
```
backend/
├── main.py              # Aplicación principal
├── models.py            # Modelos de base de datos
├── schemas.py           # Esquemas Pydantic
├── security.py          # Configuración de seguridad
├── auth.py              # Endpoints de autenticación
├── email_service.py     # Servicio de email
├── create_admin.py      # Script para crear admin
└── requirements.txt     # Dependencias
```

### Agregar Nuevos Permisos

1. Editar `security.py` y agregar el permiso a los roles correspondientes
2. Usar `@Depends(check_permission("nuevo_permiso"))` en los endpoints

### Personalizar Roles

Editar el diccionario `ROLES` en `security.py`:

```python
ROLES = {
    "admin": {
        "description": "Administrador del sistema",
        "permissions": ["read", "write", "delete", "manage_users", "manage_roles"]
    },
    "nuevo_rol": {
        "description": "Descripción del nuevo rol",
        "permissions": ["read", "write"]
    }
}
```

## Producción

### Configuraciones de Seguridad
1. Cambiar `SECRET_KEY` por una clave segura y única
2. Configurar `allow_origins` en CORS para dominios específicos
3. Usar HTTPS en producción
4. Configurar rate limiting
5. Monitorear logs de acceso

### Base de Datos
1. Usar conexiones seguras (SSL)
2. Configurar backups regulares
3. Monitorear el rendimiento

### Email
1. Usar un servicio de email confiable (SendGrid, AWS SES, etc.)
2. Configurar SPF, DKIM y DMARC
3. Monitorear la entrega de emails 