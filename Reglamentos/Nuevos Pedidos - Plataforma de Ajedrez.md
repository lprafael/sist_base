### **INFORME TÉCNICO: REQUERIMIENTOS Y NUEVAS SOLICITUDES DEL CLIENTE (FERLONICHESS PY) \- 23/08/2026**

#### **1\. INFORMACIÓN GENERAL Y CONTEXTO**

* **Cliente / Organización:** Ferlonichess PY (Prof. José Wilfrido Pérez Ferlone).  
* **Proyecto:** Plataforma de Gestión de Torneos y Academia de Ajedrez (*Mi Cancha / Módulo Ajedrez*).  
* **Participantes de la reunión:** Ferlonichess PY, Héctor Daniel López, Rafael López Ibarra.  
* **Objetivo de la sesión:** Revisión del flujo operativo de torneos escolares/abiertos, integración con Lichess, optimización de inscripciones y planificación de módulos académicos y de integridad.  
* 

#### **2\. ESPECIFICACIÓN DE NUEVOS REQUERIMIENTOS TÉCNICOS Y FUNCIONALES**

##### **2.1. Integración, Importación y Sincronización con Lichess**

* **Creación de Torneo en Lichess:** El cliente configura y genera el torneo Suizo directamente en los equipos de Lichess por categoría (Sub-7, Sub-9, Sub-11, Sub-13, Abierto).  
* **Importación por URL del Torneo:** El sistema debe permitir ingresar el enlace del torneo creado en Lichess y estirar automáticamente la lista de jugadores inscritos y emparejamientos.  
* **Botón de Sincronización Dinámica:**  
  * Implementar un botón de **sincronización rápida** en el panel de administración para actualizar jugadores que ingresen tardíamente y estirar los resultados al cierre de cada ronda sin reprocesar todo desde cero.  
* **Transmisión y Visualización en Vivo:**  
  * Exponer en la web app pública del torneo el tablero y estado de las partidas en tiempo real para el seguimiento de padres y espectadores.  
* **Consolidación de Puntuaciones y Tabla General:**  
  * Acumular automáticamente los puntajes obtenidos por cada jugador en las distintas fechas del circuito para construir la tabla de posiciones general.

##### **2.2. Inscripción Centralizada y Gestión de Identidades (Nicks)**

* **Formulario Nativo del Sistema:** Sustituir los formularios manuales de Google Forms por el formulario de inscripción integrado en la página del torneo.  
* **Manejo de Cuentas y Doble Nick:**  
  * Permitir que si un jugador participa con una cuenta/nick secundario (por bloqueo o cambio de cuenta en Lichess), el sistema contabilice los puntos asociados a dicho nick sin alterar de forma retroactiva el nick anterior, reflejando el desdoblamiento en el resumen.  
  * Validación cruzada entre los datos personales cargados (Cédula de Identidad, Teléfono, Categoría) y el usuario de Lichess registrado.

##### **2.3. Módulo de Integridad y Alertas Antitrampa**

* **Detección por Dispositivo (Hardware ID):** Alerta en caso de que se detecten dos cuentas distintas operando simultáneamente desde la misma máquina/navegador (posible uso de motores o manipulación simultánea).  
* **Detección por Discrepancia de Red/IP:** Identificación de sesiones concurrentes de una misma cuenta en IPs divergentes o múltiples conexiones bajo patrones sospechosos.  
* **Banderas de Alerta:** Notificaciones visuales en el panel de control (*"Alerta: Revisar cuenta"*) para que los administradores y árbitros auditen la partida.

##### **2.4. Módulo de Gestión de Academia Escolar y Calificaciones (Fase Académica)**

* **Plan Curricular Anual y Asistencia:** Registro de programas de estudio para instituciones educativas (20 colegios asociados y más de 10.000 alumnos).  
* **Clases Virtuales y Recuperaciones:** Módulo para emitir clases online, tutoriales grabados y habilitar la recuperación de contenidos para alumnos ausentes.  
* **Evaluación Automatizada de Tácticas:**  
  * Repositorio de ejercicios tácticos interactivos accesibles desde el hogar.  
  * Calificación automática y generación instantánea de planillas de evaluación por grado, sección y colegio.  
* **Historial del Alumno:** Ficha consolidada para padres y directores con asistencia, temas desarrollados, resolución de ejercicios y rendimiento competitivo.  
* **Torneos Escolares Internos e Intercolegiales:** Capacidad de estructurar torneos exclusivos por colegio y grado bajo el mismo motor de emparejamiento.

##### **2.5. Personalización, Marca Blanca (Whitelabel) y Facturación**

* **Identidad Institucional (Whitelabeling):**  
  * Despliegue con dominio/subdominio propio y visualización exclusiva de la marca **Ferlonichess** en el portal público y panel administrativo, omitiendo referencias a "Mi Cancha".  
* **Gestión Comercial y Financiera:**  
  * Configuración de aranceles diferenciados por categoría y cuotas de matrícula.  
  * Venta e inventario de indumentaria y materiales de ajedrez (remeras, camperas, mochilas, tableros, relojes).  
  * Configuración de descuentos por grupos familiares (hermanos) y emisión de **factura electrónica integrada**.  
  * 

##### **2.6. Soporte en Campañas Digitales (Meta Business)**

* **Capacitación Operativa:** Coordinar una sesión de instrucción técnica con el personal encargado para optimizar la segmentación en Facebook/Instagram Ads y el uso de formatos dinámicos/video.

#### **3\. PLAN DE ACCIÓN Y PRIORIDADES TÉCNICAS**

| Prioridad | Tarea Técnica / Requerimiento | Alcance Inmediato |
| :---- | :---- | :---- |
| **P0 (Urgente)** | Sincronización de torneos de Lichess e importación de jugadores por URL.  | Habilitar visualización de partidas y tabla de posiciones para la ronda activa.  |
| **P0 (Urgente)** | Reenvío de credenciales y parametrización del usuario administrador para Ferlonichess.  | Garantizar el acceso autónomo al panel de control.  |
| **P1 (Alta)** | Módulo de formulario de inscripción público con almacenamiento directo en BD.  | Descartar el uso manual de Google Forms y hojas de cálculo externas.  |
| **P1 (Alta)** | Implementación de banderas y alertas de integridad (doble cuenta / hardware ID).  | Panel de alertas para verificación de partidas sospechosas.  |
| **P2 (Media)** | Personalización de marca blanca (subdominio y branding Ferlonichess).  | Ajuste visual y de rutas para el portal del cliente.  |
| **P3 (Fase 2\)** | Módulo Académico Escolar (ejercicios tácticos, calificaciones, historial del alumno y clases online).  | Desarrollo del entorno pedagógico y curricular para el ciclo lectivo siguiente. |

