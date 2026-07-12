# **Especificación Integral para Sistema de Gestión de Torneos de Fútbol Multi-Tenant y Regional**

Este documento establece los requerimientos técnicos, funcionales y arquitectónicos para el desarrollo de una plataforma avanzada de gestión de ligas y torneos de fútbol amateur y profesional. El sistema adopta un modelo multi-tenant escalable con un enfoque particular en estructuras organizativas jerárquicas complejas (regiones, ciudades y etapas interciudades).

## **1\. Glosario y Diferenciación de Dominios**

Para evitar conflictos semánticos en el desarrollo del software, se definen estrictamente dos conceptos primarios:

* **Torneo:** Representa la integración total del ecosistema administrativo, logístico y financiero. Incluye la configuración del tenant, gestión de cobros, administración de complejos/canchas, reservas en línea, asignación de veedores, configuración de páginas web públicas (CMS) y reportes contables globales.  
* **Campeonato:** Constituye exclusivamente la dimensión deportiva y competitiva dentro de un torneo. Abarca las categorías (juvenil, senior, ejecutivo), divisiones, fixtures de partidos, tablas de posiciones, cruces de eliminación directa y estadísticas individuales (goleadores, vallas menos vencidas, tarjetas).

## **2\. Arquitectura Base de Datos: Diseño de Schemas (PostgreSQL)**

El sistema se organiza en dos schemas principales para garantizar la modularidad y separación de responsabilidades:

### **2.1. Schema: cancha**

Contiene la información paramétrica global y las configuraciones de infraestructura física que sirven de catálogo de referencia para toda la plataforma.

| Tabla | Descripción General | Campos Clave Recomendados   |
| :---- | :---- | :---- |
| **deportes** | Catálogo maestro de disciplinas soportadas. | id (UUID), codigo (VARCHAR), nombre (VARCHAR), activo (BOOLEAN) |
| **formatos** | Modelos competitivos aplicables. | id (UUID), codigo (LIGA, PLAYOFF, MIXTO, SUIZO), nombre (VARCHAR) |
| **deporte\_formatos** | Tabla intermedia para restringir qué formatos son válidos por deporte. | deporte\_id (FK), formato\_id (FK), parametrizacion\_default (JSONB) |
| **complejos\_deportivos** | Registro de complejos/predios de los organizadores (Tenants). | id (UUID), nombre (VARCHAR), direccion (TEXT), geo\_loc (POINT) |
| **canchas\_fisicas** | Canchas individuales que pertenecen a un complejo deportivo. | id (UUID), complejo\_id (FK), nombre (VARCHAR), tipo\_superficie (VARCHAR) |

 

### **2.2. Schema: torneos\_futbol**

Encapsula toda la lógica dinámica de las competencias, inscripciones, control financiero y registro estadístico minucioso.

| Tabla | Descripción General | Relaciones Críticas   |
| :---- | :---- | :---- |
| **torneos** | Instancia madre administrativa ligada al tenant. | FK a cancha.complejos\_deportivos (Tenant) |
| **regiones** | Estructura para departamentos regionales geográficos. | FK a torneos |
| **ciudades** | Subdivisiones urbanas dentro de una región. | FK a regiones |
| **campeonatos** | Contenedor de la fase deportiva (por ciudad o regional). | FK a ciudades (opcional), FK a cancha.formatos |
| **divisiones\_categorias** | Instancia específica que une torneo, categoría y formato. | FK a campeonatos, FK a categorias (Lookup) |
| **equipos** | Entidades competitivas inscritas en un campeonato específico. | FK a divisiones\_categorias |
| **jugadores** | Lista de Buena Fe y registros individuales. | FK a equipos |
| **partidos** | Encuentros individuales programados en el fixture. | FK a divisiones\_categorias, FK a cancha.canchas\_fisicas |
| **eventos\_partido** | Línea de tiempo atómica del juego (Goles, Tarjetas). | FK a partidos, FK a jugadores, FK a equipos |

 

## **3\. Lógica Multitenant Jerárquica y Campeonato Regional Interciudades**

El sistema soporta aislamiento absoluto mediante identificadores únicos de organización (UUID), permitiendo que múltiples ligas operen de manera independiente. No obstante, para federaciones o departamentos regionales, implementa una jerarquía multinivel:

### **3.1. Flujo de Trabajo en Subcampeonatos por Ciudad**

1. El Administrador Regional crea un **Torneo** global (Módulo Administrativo Multi-Tenant).  
2. Se da de alta una **Región** (ej. "Departamento Central") y se listan las **Ciudades** participantes (ej. "San Lorenzo", "Fernando de la Mora", "Luque").  
3. En cada ciudad se ejecuta un **Campeonato Local** independiente (ej. Campeonato San Lorenzo \- Apertura 2026), subdividido en sus respectivas categorías (Juvenil, Senior, Ejecutivo).

### **3.2. Mecanismo de Playoff Regional (Interciudades)**

A nivel de la configuración estructural de la Región, se añade un flag booleano crucial en la interfaz y base de datos: determinar\_campeon\_regional (BOOLEAN).

* Si está desactivado (false), cada campeonato de ciudad concluye de manera independiente coronando a su respectivo monarca local.  
* Si está activado (true), el motor del sistema habilita dinámicamente un módulo de **Fase de Campeones Regionales** al finalizar los fixtures locales.

**Reglas de Negocio para el Playoff Regional:**

* **Configuración del Desborde Competitivo:** El organizador parametriza cuántos cupos otorga cada ciudad (ej. Solo el 1° lugar, o el 1° y 2° de cada localidad).  
* **Migración Automatizada de Rosters:** El sistema clona automáticamente las identidades de los equipos clasificados y sus correspondientes listas de buena fe hacia una nueva instancia deportiva denominada "Campeonato de Campeones Regionales".  
* **Asignación de Canchas Neutrales:** Los partidos de esta fase interciudades utilizan el catálogo de cancha.canchas\_fisicas de cualquiera de los complejos asociados al tenant regional, facilitando la designación de sedes neutrales mediante geolocalización.

## **4\. Registro de Equipos y Control Biométrico de Jugadores**

La recolección de información para las listas de buena fe sigue un enfoque incremental de dos pasos para optimizar la experiencia de usuario:

### **4.1. Registro Rápido (Alta Inicial)**

Permite al delegado o administrador inscribir al equipo en minutos recolectando únicamente los nombres y datos esenciales sin bloquear la carga inicial:

* Nombre del Equipo  
* Nombre del Entrenador Principal  
* Nómina de Jugadores (Nombres y Apellidos rápidos)  
* Nómina de Equipo Técnico

### **4.2. Completado Detallado de Perfiles**

Antes del inicio de la primera jornada, se exige rellenar el perfil completo de cada integrante con los siguientes campos obligatorios:

* Fecha de nacimiento (Validación automática de rangos de edad para Senior, Ejecutivo, Juvenil).  
* Documento de Identidad / Pasaporte (Bloqueo por duplicidad en la base de datos dentro del mismo campeonato).  
* Número de camiseta y Posición en el campo de juego.  
* Fotografía oficial de perfil y Logo del equipo en alta resolución.

### **4.3. Flujo Técnico de Reconocimiento Facial Biométrico**

Para mitigar la suplantación de identidad (inclusión de jugadores no inscritos en la lista de buena fe), el sistema incorpora inteligencia artificial nativa:

1. **Enrolamiento:** Al cargar la fotografía oficial detallada del jugador, un microservicio analiza el rostro mediante librerías avanzadas (como face\_recognition) y extrae un vector bidimensional de características únicas (un vector numérico de 128 o 1280 dimensiones). Este vector se almacena de forma indexada en la base de datos PostgreSQL utilizando la extensión pgvector.  
2. **Verificación en Mesa de Control:** Minutos antes de cada partido, el veedor de la cancha utiliza la aplicación móvil del sistema para capturar una fotografía en vivo del jugador durante la firma de planilla. El sistema realiza una consulta de similitud de cosenos entre la foto capturada en vivo y los vectores guardados en la base de datos.  
3. **Aprobación o Rechazo:** Si la similitud supera el umbral parametrizado (ej. \> 92%), el sistema marca al jugador como "Presente y Verificado". Caso contrario, lanza una alerta visual crítica bloqueando al jugador en la planilla digital del partido.

## **5\. Motor de Fixtures, Planilla Digital y Eventos Atómicos**

### **5.1. Algoritmos de Emparejamiento Soportados**

El motor automatizado genera calendarios libres de colisiones de horarios o duplicación de canchas utilizando tres esquemas matemáticos principales:

* **Todos contra Todos (Round Robin / Algoritmo de Rotación de Berger):** Garantiza que cada equipo se enfrente una (ida) o dos veces (ida y vuelta) contra todos sus rivales, asegurando alternancia equitativa de localías y descansos balanceados.  
* **Eliminación Directa (Knock-out):** Estructuras clásicas de llaves de playoffs (Octavos, Cuartos, Semifinal y Final). Incluye de forma automatizada la definición del 3° y 4° puesto entre los perdedores de las semifinales.  
* **Sistema Suizo:** Ideal para torneos relámpago con un gran volumen de equipos donde no hay tiempo para una liga completa. Empareja en cada ronda a equipos con historiales de puntuación similares en el torneo en curso, asegurando que nadie quede eliminado prematuramente y evitando estrictamente la repetición de enfrentamientos.

### **5.2. Captura de Eventos Cronometrados Atómicos**

La planilla digital sustituye por completo los reportes en papel. Durante el desarrollo del encuentro, el veedor o árbitro registra sucesos en tiempo real correlacionados con un minuto exacto:

* **Goles:** Goles regulares, de tiro penal y autogoles (afectando dinámicamente la tabla de goleadores y acumulados del equipo).  
* **Sanciones en cancha:** Tarjetas Amarillas y Tarjetas Rojas (Directas o por doble amonestación).  
* **Sustituciones:** Registro estricto del jugador saliente y entrante para el cálculo exacto de minutos jugados.

Cada vez que un partido pasa al estado "Finalizado", un proceso en segundo plano (Background Worker) recalculá instantáneamente las estadísticas de la tabla de posiciones (Puntos, Partidos Jugados, Ganados, Empatados, Perdidos, Goles a Favor, Goles en Contra y Diferencia de Goles).

## **6\. Módulo Disciplinario, Financiero y Disparadores de Bloqueo (Locks)**

### **6.1. Automatización de Sanciones Disciplinarias**

El sistema cuenta con un motor de reglas parametrizables por categoría para la aplicación inmediata de penas:

* **Expulsión Directa (Tarjeta Roja):** Desencadena la suspensión automática del jugador para el partido subsiguiente del calendario y genera una multa económica configurable en la cuenta corriente de su equipo.  
* **Acumulación de Tarjetas Amarillas:** El sistema suspende automáticamente por una fecha al jugador que alcance el límite establecido (ej. 3 o 5 tarjetas amarillas acumuladas en jornadas consecutivas o alternas).

### **6.2. Módulo Financiero y Triggers de Base de Datos (Locks)**

El sistema opera una cuenta corriente contable por cada equipo inscrito, registrando débitos por conceptos de inscripción, aranceles por derechos de partido, tasas de arbitraje y multas disciplinarias.  
Para asegurar la viabilidad económica del torneo, se implementan disparadores automáticos (BEFORE INSERT OR UPDATE a nivel de base de datos):

* **Bloqueo de Planilla por Deuda Excesiva:** Si un equipo acumula un saldo deudor superior al límite permitido configurado en el torneo, el trigger bloquea automáticamente la generación o impresión de su planilla de juego para la fecha actual, asignando una derrota administrativa por Walkover (W.O.) con marcador adverso estandarizado (ej. 3-0) y aplicando los puntos correspondientes al rival.

## **7\. Portal CMS Público y Analítica Basada en Inteligencia Artificial**

Cada torneo cuenta con una Landing Page autogenerada y configurable de manera intuitiva mediante bloques interactivos (Drag & Drop):

* **Actualizaciones en Tiempo Real:** Publicación instantánea de fixtures, horarios de partidos, tablas de posiciones de todas las divisiones y clasificaciones individuales.  
* **Generación Automática de Crónicas Periodísticas con IA:** Al finalizar un partido, el sistema recopila los eventos atómicos guardados (ej. "Minuto 14: Gol de Juan Pérez; Minuto 88: Tarjeta Roja a Carlos Gómez; Marcador Final: 2-1"). Estos datos se envían a un modelo de lenguaje que redacta automáticamente una noticia estructurada con estilo periodístico sobre el encuentro, ahorrando horas de redacción a los organizadores y potenciando la tracción en redes sociales.  
* **Analítica Nativa:** Cuadros de mando para el administrador que reflejan métricas de visitas al portal, efectividad en la recaudación de cuotas, tendencias de amonestaciones por ciudad y estadísticas de retención de equipos en el tiempo.