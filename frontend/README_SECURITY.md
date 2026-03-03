# Sistema de Seguridad - Frontend VMT-CID

Este documento describe cómo configurar y usar el sistema de seguridad implementado en el frontend.

## Características Implementadas

### 🔐 Autenticación Frontend
- **Pantalla de Login**: Interfaz moderna y responsiva
- **Gestión de Sesiones**: Tokens JWT almacenados en localStorage
- **Logout Seguro**: Cierre de sesión con limpieza de datos
- **Protección de Rutas**: Acceso controlado por roles

### 👥 Gestión de Usuarios (Solo Admin)
- **Lista de Usuarios**: Vista completa de todos los usuarios
- **Crear Usuarios**: Formulario para crear nuevos usuarios
- **Desactivar Usuarios**: Control de estado de usuarios
- **Roles Visuales**: Badges para identificar roles

### 🛡️ Control de Acceso
- **Menú Dinámico**: Opciones según el rol del usuario
- **Protección de Endpoints**: Todas las peticiones incluyen token
- **Manejo de Errores**: Respuestas apropiadas para errores de autorización

## Configuración

### 1. Variables de Entorno

Crear o actualizar el archivo `.env` en el directorio `frontend/`:

```env
VITE_REACT_APP_API_URL=http://192.168.100.112:8001
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Ejecutar el Frontend

```bash
npm run dev
```

## Uso del Sistema

### Inicio de Sesión

1. Abrir la aplicación en el navegador
2. Ingresar credenciales:
   - **Usuario**: `admin`
   - **Contraseña**: `Admin123!` (cambiar después del primer login)
3. Hacer clic en "Iniciar Sesión"

### Navegación por Roles

#### 🔑 Administrador (`admin`)
- Acceso completo a todos los módulos y todos los distritos
- Gestión de usuarios (crear intendentes, concejales, referentes)
- Auditoría, backups y configuración del sistema
- Panel georreferenciado sin restricciones

#### 🏛️ Candidato a Intendente (`intendente`)
- Ve su equipo: concejales + referentes de sus concejales + sus referentes propios
- Ve todos los simpatizantes de su estructura
- Puede crear referentes dentro de su distrito
- Panel georreferenciado filtrado a su distrito

#### 🏙️ Candidato a Concejal (`concejal`)
- Ve sus referentes directos y sus propios simpatizantes
- Puede crear referentes propios
- No ve datos de otros concejales ni del intendente

#### 👥 Referente (`referente`)
- Solo puede agregar y ver su propia lista de simpatizantes
- No ve datos de otros referentes ni de niveles superiores
- Sin acceso a gestión de usuarios

### Gestión de Usuarios (Admin, Intendente y Concejal)

1. Hacer clic en **"Mi Equipo"** (o "Gestión de Usuarios" si eres admin) en el menú lateral
2. Para crear un nuevo usuario:
   - Hacer clic en "Crear Usuario"
   - Llenar el formulario con los datos del usuario
   - Seleccionar el rol apropiado (solo los roles que tu nivel puede crear)
   - Hacer clic en "Crear"
3. Para desactivar un usuario:
   - Hacer clic en 🚫 en la fila correspondiente
   - Confirmar la acción

## Estructura de Archivos

```
frontend/src/
├── App.jsx                    # Aplicación principal con autenticación
├── components/
│   ├── Login.jsx             # Componente de login
│   ├── Login.css             # Estilos del login
│   ├── UserManagement.jsx    # Gestión de usuarios
│   └── UserManagement.css    # Estilos de gestión de usuarios
├── GremiosCRUD.jsx           # CRUD de gremios (actualizado)
├── EotsCRUD.jsx              # CRUD de EOTs (actualizado)
└── FeriadosCRUD.jsx          # CRUD de feriados (actualizado)
```

## Seguridad Implementada

### Autenticación
- Tokens JWT almacenados en localStorage
- Verificación automática de sesión al cargar la app
- Logout seguro con limpieza de datos

### Autorización
- Control de acceso basado en roles
- Menú dinámico según permisos
- Protección de endpoints en todas las peticiones

### Manejo de Errores
- Respuestas apropiadas para errores 401/403
- Mensajes de error claros para el usuario
- Redirección automática al login si es necesario

## Personalización

### Cambiar Estilos del Login

Editar `frontend/src/components/Login.css`:

```css
.login-container {
  /* Personalizar colores, fuentes, etc. */
  background: linear-gradient(135deg, #tu-color-1 0%, #tu-color-2 100%);
}
```

### Agregar Nuevos Roles

1. Actualizar el mapeo de roles en `App.jsx`:

```javascript
const getRoleLabel = (role) => {
  switch(role) {
    case 'admin':      return '🔑 Administrador';
    case 'intendente': return '🏛️ Candidato a Intendente';
    case 'concejal':   return '🏙️ Candidato a Concejal';
    case 'referente':   return '👥 Referente';
    default: return role;
  }
};
```

2. Actualizar la lógica de visibilidad en el menú:

```javascript
{user.rol === 'admin' && (
  <button onClick={() => setTab("usuarios")}>
    Gestión de Usuarios
  </button>
)}
```

### Personalizar Mensajes

Los mensajes de error y éxito se pueden personalizar en cada componente:

```javascript
setMensaje("Mensaje personalizado");
```

## Troubleshooting

### Error de Conexión
- Verificar que el backend esté ejecutándose
- Confirmar la URL en `VITE_REACT_APP_API_URL`
- Revisar la consola del navegador para errores

### Error de Autenticación
- Verificar que las credenciales sean correctas
- Confirmar que el usuario esté activo
- Revisar que el token no haya expirado

### Error de Autorización
- Verificar que el usuario tenga los permisos necesarios
- Confirmar que el rol esté correctamente asignado
- Revisar los logs del backend

## Producción

### Configuraciones de Seguridad
1. Usar HTTPS en producción
2. Configurar CORS apropiadamente en el backend
3. Implementar rate limiting
4. Configurar headers de seguridad

### Optimizaciones
1. Minificar y comprimir archivos
2. Implementar lazy loading para componentes
3. Configurar cache apropiado
4. Monitorear rendimiento

### Monitoreo
1. Implementar logging de errores
2. Monitorear métricas de rendimiento
3. Configurar alertas de seguridad
4. Revisar logs de acceso regularmente 