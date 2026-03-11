# 🗳️ SIGEL - Sistema de Gestión Electoral

## 🌟 Visión General
**SIGEL** es una plataforma integral de inteligencia y gestión electoral diseñada para optimizar la captación de adherentes, la logística territorial y el análisis de datos en tiempo real. El sistema proporciona herramientas avanzadas para candidatos y equipos de campaña, garantizando una ventaja estratégica en cada etapa del proceso electoral.

---

## 📊 Módulos Principales de Gestión

### 1. 🤝 Captación y Fidelización de Simpatizantes
Gestión inteligente de la base de datos de adherentes con integración directa al padrón nacional.
- **Grados de Confianza**: Calificación de simpatizantes según su nivel de compromiso y seguridad de voto.
- **Integración con Padrón ANR 2026**: Validación automática de datos personales contra el listado oficial para las elecciones de junio 2026.
- **Geolocalización**: Registro exacto de la ubicación de los simpatizantes para optimización de visitas.
- **Logística de Movilidad**: Identificación de adherentes que cuentan o no con movilidad propia para la planificación del Día D.

### 2. 🛡️ Control y Jerarquía Territorial
Estructura de acceso multinivel para proteger la integridad de los datos y optimizar el rendimiento.
- **Roles Diferenciados**: Los **Referentes** gestionan sus propios listados sin visibilidad sobre otros grupos.
- **Consolidación del Candidato**: Vista global de todos los referentes, permitiendo auditar el trabajo territorial completo.
- **Detección de Duplicados**: Sistema automático de verificación para evitar registros redundantes entre diferentes referentes.
- **Métricas de Rendimiento**: Análisis comparativo del desempeño de cada referente en la captación de votos.

### 3. 🗺️ Inteligencia Territorial (GIS)
Visualización avanzada de datos sobre mapas interactivos.
- **Mapas de Densidad**: Identificación de "zonas calientes" con mayor concentración de adherentes.
- **Análisis por Barrio**: Desglose detallado del distrito, indicando fortalezas y debilidades por zona geográfica.
- **Resumen por Local y Mesa**: Estadísticas de captación proyectadas por cada local de votación y mesa electoral.

---

## 📅 Gestión de Actividades y Campaña

### 4. 🚀 Control de Actividades en Terreno
Seguimiento exhaustivo de la agenda proselitista.
- **Estados de Actividad**: Agendadas, En Curso, Concluidas o Canceladas.
- **Registro Multimedia**: Carga de imágenes directas desde el territorio para documentar el impacto de la actividad.
- **Análisis de Cobertura**: Identificación visual de zonas "frías" donde aún no se han realizado actividades de captación.
- **Asistencia Inteligente**: Registro de asistentes con verificación de afiliación partidaria (ANR vs otros partidos).

### 5. 🌐 Presencia Digital Integrada
Sincronización automática entre la gestión interna y la imagen pública.
- **Generación de Landing Page**: Creación automática de la página web oficial del candidato.
- **Feed de Actividades**: Actualización automática en la web de las actividades realizadas y agendadas.
- **Enlace Directo**: Integración de formularios de captación web que impactan directamente en el sistema.

---

## 🚛 Logística Operativa: El Día D

### 6. 🏁 Control de Movilizaciones en Tiempo Real
Transformación digital de la jornada electoral para maximizar la participación.
- **Gestión de Choferes**: Listado completo de conductores asignados con escaneo de **Código QR** para inicio de operaciones.
- **Rutas Optimizadas**: Los choferes visualizan en su dispositivo el listado exacto de votantes a recolectar.
- **Seguimiento GPX / Real-Time**: El candidato visualiza en un panel central la ubicación en tiempo real de todos los vehículos.
- **Estado de Recolección**: Marcación instantánea cuando un votante es recogido, actualizando el tablero de control de votantes pendientes.
- **Filtros de Prioridad**: Posibilidad de priorizar la recolección de "votantes inseguros" a primera hora para asegurar su participación.

---

## 📚 Base de Datos e Histórico

### 7. 🏛️ Inteligencia de Datos Electoral
Herramientas de consulta y análisis profundo.
- **Histórico de Resultados (1996 - 2023)**: Acceso a resultados electorales previos para análisis de tendencias y proyecciones.
- **Padrón de la Concertación**: Herramienta de verificación extra contra el listado de la última votación de la concertación.
- **Generación de Padrones**: Impresión personalizada del padrón del distrito con filtros por zona o mesa.

---

## 🛠️ Capacidades Analíticas y Herramientas Extra

### 8. 🔍 Búsqueda Avanzada y "Cercanías"
Algoritmo de inteligencia para la detección de vínculos y optimización de rutas territoriales.
- **Detección de Grupos Familiares**: Identificación de votantes que comparten direcciones o apellidos similares para un abordaje grupal eficiente.
- **Relación por Cédulas Contiguas**: Análisis de registros con numeración secuencial para identificar personas registradas en el mismo periodo o lugar.
- **Normalización Inteligente**: Sistema de limpieza automática de datos (TRIM, corrección de mayúsculas/minúsculas) para mantener la integridad del padrón.

### 9. 📈 Reportes e Intercambio de Información
Capacidades de exportación y análisis offline.
- **Exportación Multi-formato**: Descarga de listados segmentados en **Excel, CSV y PDF**.
- **Reportes de Gestión**: Informes detallados de productividad por referente y estado de captación por barrio.
- **Fichas Individuales**: Generación de perfiles detallados por cada simpatizante con su historial de interacción.

---

## 🔐 Administración y Seguridad de Grado Militar

### 10. 👤 Control de Acceso Basado en Roles (RBAC)
Gestión granular de permisos para asegurar la confidencialidad de la estrategia.
- **Jerarquía Electoral**:
    - **Admin**: Control total del sistema y configuración técnica.
    - **Intendente**: Visión global de su distrito, concejales y referentes.
    - **Concejal**: Gestión de sus propios referentes y adherentes.
    - **Referente**: Carga y visualización limitada exclusivamente a sus propios simpatizantes.

### 11. 🛡️ Auditoría y Trazabilidad Total
Transparencia absoluta sobre el uso del sistema.
- **Logs de Actividad**: Registro detallado de cada acción (creación, edición, eliminación) con marca de tiempo y usuario responsable.
- **Historial de Accesos**: Control de inicios de sesión y ubicaciones IP para prevenir accesos no autorizados.
- **Backups Automáticos**: Sistema de respaldo diario de la base de datos para garantizar la continuidad de la operación.

### 12. 📧 Comunicaciones y Notificaciones
Mantenga a su equipo coordinado en todo momento.
- **Alertas de Actividad**: Notificaciones vía email y sistema para la coordinación de agendas.
- **Recuperación Segura**: Flujos de restablecimiento de contraseñas con validación administrativa.
- **Mensajería Directa**: Integración proyectada para envío masivo de información relevante a adherentes vía WhatsApp/SMS.

---
*SIGEL: Tecnología al servicio de la victoria electoral.*
