# 🗳️ SIGEL - Sistema de Gestión Electoral

## 💡 Lógica del Sistema y Arquitectura

SIGEL es una plataforma avanzada diseñada para la gestión estratégica de campañas electorales, optimizando la captación de votantes y proporcionando inteligencia de datos en tiempo real para candidatos y equipos de campaña.

---

## 1. Arquitectura de Datos (Modelo Relacional)

El sistema se basa en una estructura jerárquica y relacional que garantiza la integridad de los datos y la escalabilidad:

### Núcleo de Información:
*   **Padrón Electoral (`padron`):** Base de datos oficial y estática con información de todos los ciudadanos habilitados para votar (Nombres, Apellidos, Cédula, Local de Votación, Mesa).
*   **Locales de Votación (`locales_votacion`):** Catálogo geográfico de los centros de sufragio para permitir análisis zonal.

### Estructura de Campaña (Multitenancy):
*   **Candidatos (`candidatos`):** Son los "inquilinos" principales del sistema (concejales, intendentes, etc.). Cada uno tiene su propio universo de datos.
*   **Referentes (`referentes`):** Usuarios operativos vinculados a un candidato específico. Son los encargados del "trabajo de campo" y la captación.
*   **Posibles Votantes (`posibles_votantes`):** La relación dinámica entre un referente y un ciudadano del padrón. Aquí se registra el grado de compromiso, parentesco y ubicación geográfica.

---

## 2. Funcionalidades de Inteligencia Electoral

### 👪 Algoritmo de Detección de Red Familiar
Esta es la ventaja competitiva de SIGEL. Cuando un referente carga a un votante (ej. "Rafael López"), el sistema automáticamente:
1.  Busca en el **Padrón** a todas las personas con los mismos apellidos en el mismo distrito.
2.  Cruza esta información con los **Posibles Votantes** ya captados.
3.  Genera una alerta al candidato: *"Este votante tiene familiares directos (Mismo apellido/domicilio) que aún no han sido abordados"*.

### 🔍 Control de "Doble Carga" (Cross-Check de Lealtad)
El sistema permite que un **SuperAdministrador** detecte solapamientos entre candidatos.
*   Si un ciudadano figura en la lista de dos candidatos diferentes, el sistema lo marca como un "Voto en Disputa".
*   Permite sincerar las expectativas de voto al identificar qué referentes están duplicando información o qué zonas están en disputa real.

### 🗺️ Módulo Geo-Electoral (Heatmap)
Integra **PostGIS** para procesar coordenadas geográficas:
*   Cada captación puede registrar la ubicación GPS.
*   Se genera un **Mapa de Calor** que muestra las zonas de mayor influencia del candidato.
*   Permite planificar la logística de transporte para el día E basándose en la densidad de votantes por sector.

---

## 3. Niveles de Acceso y Seguridad

1.  **Nivel Referente:** Solo visualiza su propia lista de captados y progreso personal.
2.  **Nivel Candidato:** Visualiza el consolidado de todos sus referentes, estadísticas de su local de votación y alertas de parientes sugeridos.
3.  **Nivel SuperAdmin:** Gestión global, control de colisiones entre candidatos y reportes macro del sistema.

---

## 4. Stack Tecnológico Sugerido
*   **Backend:** FastAPI (Python) - Procesa búsquedas de parentesco de forma asíncrona y eficiente.
*   **Base de Datos:** PostgreSQL + PostGIS - Almacenamiento robusto y análisis geográfico.
*   **Frontend:** React (Vite) - Interfaz dinámica, premium y adaptativa.
*   **Automatización:** n8n - Reportes diarios y alertas vía WhatsApp a los referentes.
