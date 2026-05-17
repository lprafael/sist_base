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

### 6. 🏁 Control de Movilizaciones y Monitoreo del Escrutinio (Día D)
Transformación digital completa de la jornada electoral para maximizar la participación y asegurar los votos.
- **Tablero del Coordinador de Logística**: Mapa interactivo en tiempo real que consolida la ubicación GPS de votantes captados y la geolocalización de choferes activos, indicando estados de recolección (`pendiente`, `en_camino`, `en_destino`).
- **Gestión de Choferes**: Listado completo de conductores asignados con escaneo de **Código QR** para inicio rápido de operaciones y asignación automática de pasajeros.
- **Rutas Optimizadas**: Los choferes visualizan en su dispositivo el listado exacto y geolocalizado de los votantes que deben recoger.
- **Día D - Monitoreo de Participación**: Tablero de control en tiempo real que segmenta simpatizantes esperados vs. votos confirmados por local y mesa electoral, facilitando la movilización focalizada en horas críticas.
- **Veedores y Fiscales de Mesa**: Registro de fiscales asignados por mesa, agilizando el flujo de reportes de participación de adherentes directamente desde los locales de votación.

---

## 📚 Base de Datos e Histórico

### 7. 🏛️ Inteligencia de Datos Electoral y Estimación D'Hondt
Herramientas de consulta profunda y proyección estadística inteligente.
- **Historial Detallado por Periodo (1996 - 2023)**: Acceso consolidado a resultados históricos de Intendencia y Junta Municipal por listas, partidos, candidatos electos y cocientes D'Hondt.
- **Estimación Inteligente de Votos Necesarios**: Algoritmo de proyección basado en umbrales históricos reales que calcula la cantidad mínima recomendada de votos para asegurar bancas (Equipo) o ganar la intendencia (Candidato Principal).
- **Control Territorial Estricto**: Restricción territorial automática de vistas históricas que se adapta dinámicamente a la jurisdicción (departamento y distrito) del candidato o coordinador logueado.
- **Generación y Descarga de Padrones**: Visualización e impresión personalizada del padrón del distrito con soporte especial para Asunción (ID 0) y filtros dinámicos por local y mesa.

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
    - **Candidato Principal (Intendente)**: Visión global de su distrito, concejales, referentes y métricas.
    - **Concejal**: Gestión de sus propios referentes y adherentes.
    - **Referente**: Carga y visualización limitada exclusivamente a sus propios simpatizantes.

### 11. 🛡️ Auditoría y Trazabilidad Total (Audit Logs)
Transparencia y seguridad absoluta sobre el uso del sistema.
- **Tablero Administrativo de Logs**: Panel premium interactivo para monitorear actividades del sistema (inicios de sesión, exportaciones, altas/bajas de adherentes) en tiempo real.
- **Filtros e Historial de Accesos**: Filtrado de logs por módulo, severidad y rango de fechas, con registro de IP de origen del usuario responsable.
- **Archivado y Limpieza Segura**: Funcionalidades protegidas para archivar logs históricos de campañas previas y depurar registros bajo estricto control de rol administrador.

### 12. 📧 Comunicaciones y Notificaciones
Mantenga a su equipo coordinado en todo momento.
- **Alertas de Actividad**: Notificaciones vía email y sistema para la coordinación de agendas.
- **Recuperación Segura**: Flujos de restablecimiento de contraseñas con validación administrativa.
- **Mensajería Directa**: Integración proyectada para envío masivo de información relevante a adherentes vía WhatsApp/SMS.

---
*SIGEL: Tecnología al servicio de la victoria electoral.*
