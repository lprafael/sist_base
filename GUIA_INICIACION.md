# GUÍA DE INICIACIÓN Y UTILIZACIÓN - Sistema de Catálogos VMT-CID

## ¿Qué es el Sistema VMT-CID?
Aplicación web moderna para gestionar catálogos de gremios, EOTs y feriados, con control de acceso avanzado y flujos seguros de usuario.

---

## Primeros Pasos
1. Accede a la URL del sistema en tu navegador.
2. Inicia sesión con tus credenciales.
3. Si olvidaste tu contraseña, haz clic en "¿Olvidaste tu contraseña?" y se notificará al admin.
4. Si eres admin, puedes editar usuarios y usar el botón "Reenviar contraseña" para generar y enviar una contraseña temporal.

---

## Flujos de Contraseña
- **Recuperación de contraseña:**
  - Desde el login, el usuario solicita recuperación.
  - El admin recibe una notificación por email y puede asistir al usuario.
- **Reenviar contraseña (admin):**
  - En la gestión de usuarios, el admin puede generar y enviar una nueva contraseña temporal al usuario editado.
  - El usuario recibirá la nueva contraseña por email y podrá ingresar inmediatamente.

---

## Gestión de Usuarios
- Crear, editar, activar/desactivar, borrar y reactivar usuarios.
- Solo el usuario puede cambiar su propia contraseña desde su perfil.
- El admin nunca ve la contraseña de otros usuarios.

---

## Seguridad y Buenas Prácticas
- Cambia tu contraseña tras el primer acceso o si recibes una contraseña temporal.
- Nunca compartas tu contraseña.
- Si tienes problemas, contacta al admin o soporte.

---

## Contacto de Soporte
- Email: soporte@vmt-cid.com


## 🚀 Inicio Rápido

### **¿Qué es el Sistema VMT-CID?**
El Sistema de Catálogos VMT-CID es una aplicación web que permite gestionar catálogos de gremios, EOTs y feriados de manera segura y eficiente, con control de acceso basado en roles.

### **Características Principales**
- ✅ **Gestión de Catálogos**: Gremios, EOTs y Feriados
- ✅ **Sistema de Seguridad**: Autenticación y autorización
- ✅ **Control de Acceso**: Roles y permisos granulares
- ✅ **Auditoría**: Registro de todas las acciones
- ✅ **Interfaz Moderna**: Fácil de usar y responsive

---

## 📋 Requisitos Previos

### **Para Usuarios**
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet
- Credenciales de acceso proporcionadas por el administrador

### **Para Administradores**
- Acceso al servidor donde está desplegado el sistema
- Conocimientos básicos de administración de sistemas
- Credenciales de administrador

---

## 🔐 Primeros Pasos

### **1. Acceso al Sistema**

1. **Abrir el navegador** y navegar a la URL del sistema
2. **Ver la pantalla de login** con el logo de VMT-CID
3. **Ingresar credenciales**:
   - **Usuario**: Proporcionado por el administrador
   - **Contraseña**: Proporcionada por el administrador
4. **Hacer clic en "Iniciar Sesión"**

### **2. Credenciales por Defecto**
Si es la primera vez que se accede al sistema:

| Campo | Valor |
|-------|-------|
| **Usuario** | `admin` |
| **Contraseña** | `Admin123!` |
| **Email** | `admin@vmt-cid.com` |

⚠️ **Importante**: Cambiar la contraseña después del primer acceso.

### **3. Características del Login**
- **Mostrar/Ocultar Contraseña**: Hacer clic en el ícono del ojo 👁️
- **Validación en Tiempo Real**: El sistema valida los campos mientras escribes
- **Mensajes de Error**: Información clara si hay problemas
- **Recordar Sesión**: La sesión se mantiene activa hasta cerrar el navegador

---

## 🏠 Interfaz Principal

### **Dashboard**
Después del login exitoso, verás:

#### **Header (Cabecera)**
- **Logo del Sistema**: VMT-CID
- **Información del Usuario**: Nombre y rol
- **Botón de Logout**: Para cerrar sesión

#### **Sidebar (Menú Lateral)**
- **Gremios**: Gestión de gremios
- **EOTs**: Gestión de EOTs  
- **Feriados**: Gestión de feriados
- **Gestión de Usuarios**: Solo visible para administradores

#### **Área Principal**
- **Contenido Dinámico**: Cambia según la sección seleccionada
- **Tablas de Datos**: Con filtros y paginación
- **Botones de Acción**: Crear, editar, eliminar

---

## 📊 Gestión de Catálogos

### **Gremios**

#### **Ver Lista de Gremios**
1. Hacer clic en "Gremios" en el menú lateral
2. Ver tabla con todos los gremios activos
3. Usar filtros para buscar gremios específicos

#### **Crear Nuevo Gremio**
1. Hacer clic en el botón "Crear Gremio" (+)
2. Llenar el formulario:
   - **Nombre**: Nombre del gremio (obligatorio)
   - **Descripción**: Descripción opcional
3. Hacer clic en "Guardar"

#### **Editar Gremio**
1. En la tabla, hacer clic en el ícono de editar (✏️)
2. Modificar los campos necesarios
3. Hacer clic en "Actualizar"

#### **Eliminar Gremio**
1. En la tabla, hacer clic en el ícono de eliminar (🗑️)
2. Confirmar la eliminación
3. El gremio se marca como inactivo

### **EOTs**

#### **Ver Lista de EOTs**
1. Hacer clic en "EOTs" en el menú lateral
2. Ver tabla con todos los EOTs activos
3. Usar filtros para buscar EOTs específicos

#### **Crear Nuevo EOT**
1. Hacer clic en el botón "Crear EOT" (+)
2. Llenar el formulario:
   - **Nombre**: Nombre del EOT (obligatorio)
   - **Descripción**: Descripción opcional
3. Hacer clic en "Guardar"

#### **Editar EOT**
1. En la tabla, hacer clic en el ícono de editar (✏️)
2. Modificar los campos necesarios
3. Hacer clic en "Actualizar"

#### **Eliminar EOT**
1. En la tabla, hacer clic en el ícono de eliminar (🗑️)
2. Confirmar la eliminación
3. El EOT se marca como inactivo

### **Feriados**

#### **Ver Lista de Feriados**
1. Hacer clic en "Feriados" en el menú lateral
2. Ver tabla con todos los feriados activos
3. Usar filtros para buscar feriados específicos

#### **Crear Nuevo Feriado**
1. Hacer clic en el botón "Crear Feriado" (+)
2. Llenar el formulario:
   - **Nombre**: Nombre del feriado (obligatorio)
   - **Fecha**: Fecha del feriado (obligatorio)
   - **Descripción**: Descripción opcional
3. Hacer clic en "Guardar"

#### **Editar Feriado**
1. En la tabla, hacer clic en el ícono de editar (✏️)
2. Modificar los campos necesarios
3. Hacer clic en "Actualizar"

#### **Eliminar Feriado**
1. En la tabla, hacer clic en el ícono de eliminar (🗑️)
2. Confirmar la eliminación
3. El feriado se marca como inactivo

---

## 👥 Gestión de Usuarios (Solo Administradores)

### **Acceso a Gestión de Usuarios**
- Solo visible para usuarios con rol "admin"
- Aparece como "Gestión de Usuarios" en el menú lateral

### **Ver Lista de Usuarios**
1. Hacer clic en "Gestión de Usuarios"
2. Ver tabla con todos los usuarios del sistema
3. Información mostrada:
   - Nombre de usuario
   - Email
   - Nombre completo
   - Rol
   - Estado (activo/inactivo)
   - Fecha de creación

### **Crear Nuevo Usuario**
1. Hacer clic en "Crear Usuario" (+)
2. Llenar el formulario:
   - **Usuario**: Nombre de usuario único
   - **Email**: Email válido y único
   - **Nombre Completo**: Nombre completo del usuario
   - **Rol**: Seleccionar rol (admin, manager, user, viewer)
3. Hacer clic en "Crear Usuario"
4. El sistema enviará un email con las credenciales

### **Editar Usuario**
1. En la tabla, hacer clic en el ícono de editar (✏️)
2. Modificar los campos necesarios
3. Hacer clic en "Actualizar"

### **Desactivar Usuario**
1. En la tabla, hacer clic en el ícono de eliminar (🗑️)
2. Confirmar la desactivación
3. El usuario se marca como inactivo

---

## 🔧 Funcionalidades Avanzadas

### **Filtros y Búsqueda**
- **Filtro por Nombre**: Buscar por nombre específico
- **Filtro por Estado**: Activo/Inactivo
- **Filtro por Fecha**: Rango de fechas
- **Búsqueda Global**: Buscar en todos los campos

### **Exportación de Datos**
- **Exportar a Excel**: Descargar datos en formato .xlsx
- **Exportar a CSV**: Descargar datos en formato .csv
- **Filtros Aplicados**: La exportación respeta los filtros activos

### **Paginación**
- **Navegación**: Botones anterior/siguiente
- **Tamaño de Página**: Seleccionar registros por página
- **Contador**: Mostrar total de registros

---

## 🔐 Gestión de Contraseñas

### **Cambiar Contraseña**
1. Hacer clic en el nombre de usuario en la cabecera
2. Seleccionar "Cambiar Contraseña"
3. Llenar el formulario:
   - **Contraseña Actual**: Contraseña actual
   - **Nueva Contraseña**: Nueva contraseña
   - **Confirmar Contraseña**: Repetir nueva contraseña
4. Hacer clic en "Cambiar Contraseña"

### **Requisitos de Contraseña**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- No puede ser igual a la anterior

### **Recuperar Contraseña**
1. En la pantalla de login, hacer clic en "¿Olvidaste tu contraseña?"
2. Ingresar el email registrado
3. El sistema enviará un enlace de recuperación
4. Seguir las instrucciones del email

---

## 🎯 Roles y Permisos

### **Rol: Administrador (admin)**
- **Acceso Completo**: Todas las funcionalidades
- **Gestión de Usuarios**: Crear, editar, eliminar usuarios
- **Gestión de Roles**: Asignar roles y permisos
- **Logs de Auditoría**: Ver todos los logs del sistema
- **Configuración del Sistema**: Modificar parámetros

### **Rol: Gerente (manager)**
- **Gestión de Catálogos**: Crear, editar, eliminar
- **Exportación**: Exportar datos
- **Lectura de Usuarios**: Ver lista de usuarios
- **Logs de Auditoría**: Ver logs básicos

### **Rol: Usuario (user)**
- **Gestión Básica**: Crear y editar catálogos
- **Lectura**: Ver todos los datos
- **Sin Eliminación**: No puede eliminar registros
- **Sin Exportación**: No puede exportar datos

### **Rol: Visualizador (viewer)**
- **Solo Lectura**: Ver datos sin modificar
- **Sin Creación**: No puede crear nuevos registros
- **Sin Edición**: No puede editar registros existentes
- **Sin Eliminación**: No puede eliminar registros

---

## ⚠️ Solución de Problemas

### **Problemas de Login**

#### **"Credenciales incorrectas"**
- Verificar que el usuario y contraseña sean correctos
- Verificar que el usuario esté activo
- Contactar al administrador si el problema persiste

#### **"Usuario inactivo"**
- Contactar al administrador para reactivar la cuenta
- Verificar que no haya expirado la contraseña

#### **"Sesión expirada"**
- Volver a hacer login
- La sesión expira después de 8 horas de inactividad

### **Problemas de Interfaz**

#### **"Página no carga"**
- Verificar conexión a internet
- Recargar la página (F5)
- Limpiar caché del navegador
- Probar en otro navegador

#### **"Error al guardar datos"**
- Verificar que todos los campos obligatorios estén llenos
- Verificar que los datos sean válidos
- Recargar la página e intentar nuevamente

#### **"No puedo ver ciertas opciones"**
- Verificar que tu rol tenga los permisos necesarios
- Contactar al administrador para solicitar permisos adicionales

### **Problemas de Rendimiento**

#### **"La página es lenta"**
- Verificar conexión a internet
- Cerrar otras pestañas del navegador
- Limpiar caché del navegador
- Contactar al administrador si el problema persiste

---

## 📞 Soporte y Contacto

### **Contacto Inmediato**
- **Email**: soporte@vmt-cid.com
- **Teléfono**: [Número de soporte]
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM

### **Información para Reportar Problemas**
Al contactar soporte, proporcionar:
- **Descripción del problema**: Qué estabas haciendo cuando ocurrió
- **Pasos para reproducir**: Cómo hacer que ocurra nuevamente
- **Mensaje de error**: Copiar el mensaje exacto si aparece
- **Navegador**: Qué navegador estás usando
- **Usuario**: Tu nombre de usuario (no la contraseña)

### **Escalación de Problemas**
1. **Nivel 1**: Problemas básicos (24 horas)
2. **Nivel 2**: Problemas técnicos (4 horas)
3. **Nivel 3**: Problemas críticos (2 horas)

---

## 📚 Recursos Adicionales

### **Documentación Técnica**
- **Ficha Técnica**: `FICHA_TECNICA.md`
- **Estructura de Base de Datos**: `DATABASE_STRUCTURE.md`
- **Documentación de Seguridad**: `README_SECURITY_COMPLETE.md`

### **Videos Tutoriales**
- [Enlace a videos tutoriales]
- [Guía paso a paso en video]

### **FAQ (Preguntas Frecuentes)**
- [Enlace a FAQ]

---

## 🔄 Actualizaciones del Sistema

### **Notificaciones de Actualización**
- El sistema mostrará notificaciones cuando haya actualizaciones disponibles
- Las actualizaciones se instalan automáticamente
- No es necesario reiniciar el navegador

### **Nuevas Funcionalidades**
- Las nuevas funcionalidades se anuncian en el dashboard
- Se proporciona documentación para nuevas características
- Se ofrecen sesiones de capacitación si es necesario

---

## 📋 Checklist de Primeros Pasos

### **Para Nuevos Usuarios**
- [ ] Acceder al sistema con credenciales proporcionadas
- [ ] Cambiar contraseña por defecto
- [ ] Explorar las diferentes secciones del menú
- [ ] Crear un registro de prueba en cada catálogo
- [ ] Probar las funciones de edición y eliminación
- [ ] Familiarizarse con los filtros y búsqueda
- [ ] Revisar la documentación disponible

### **Para Administradores**
- [ ] Configurar usuarios iniciales
- [ ] Asignar roles y permisos apropiados
- [ ] Configurar parámetros del sistema
- [ ] Revisar logs de auditoría
- [ ] Configurar backups automáticos
- [ ] Establecer políticas de seguridad
- [ ] Capacitar a usuarios finales

---

*Guía actualizada: Diciembre 2024*
*Versión del sistema: 1.0.0* 