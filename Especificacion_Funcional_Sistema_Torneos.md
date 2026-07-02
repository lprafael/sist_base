# Especificación de Requerimientos Funcionales y de Implementación: Sistema de Gestión de Torneos Deportivos

Este documento detalla exhaustivamente el conjunto de funcionalidades integradas a partir de las guías de usuario, especificaciones técnicas y modelos entidad-relación provistos. Se estructuran las especificaciones funcionales ("¿Qué hace?") y las pautas técnicas avanzadas de implementación ("¿Cómo se construye?") para guiar a un Agente de IA o equipo de ingeniería en el desarrollo de la plataforma.

---

## 1. Arquitectura Base y Modelo Multi-Tenant

### Especificación Funcional
El sistema opera bajo un esquema SaaS (Software as a Service) Multi-Tenant. Cada predio deportivo, club o liga independiente se registra como una **Organización (Complejo)** autónoma.
- **Aislamiento absoluto**: Los datos de usuarios administradores, configuraciones de sedes, árbitros, planteles y reportes financieros pertenecen a un inquilino específico y no son accesibles por otros.
- **Configuración Global Reutilizable**: A nivel Organización se configuran las sedes, canchas, árbitros disponibles, parámetros por defecto de multas y reglamentos generales, los cuales se heredan automáticamente al crear torneos individuales.

### Pautas de Implementación Técnica
1. **Identificación de Inquilinos (Tenant Isolation)**:
   - Uso de identificadores UUID (`id`) para la tabla `complejos`.
   - Cada consulta a nivel de negocio (`torneos`, `usuarios`, `equipos`, `sedes`) debe incluir un filtro obligatorio por `complejo_id` o resolverse mediante esquemas compartidos con políticas de seguridad a nivel de fila (Row Level Security - RLS si se usa PostgreSQL).
2. **Estructura de Base de Datos Base**:
   - `complejos`: Contiene `id (UUID)`, `nombre`, `direccion`, `activo (BOOLEAN)`.
   - `usuarios`: Tabla global federada mediante roles dentro de cada tenant usando un mapeo intermedio (`usuarios_complejos`).

---

## 2. Módulo de Dashboard y Gestión Operativa Central

### Especificación Funcional
El panel principal actúa como la torre de control del organizador ni bien inicia sesión.
- **Métricas e Indicadores en Tiempo Real (KPIs)**: Muestra torneos activos, próximos partidos de la jornada, equipos en espera de validación de inscripción y notificaciones de deudas/pagos pendientes.
- **Acceso Rápido y Menú Colapsable**: El menú se divide en:
  - Directos permanentes: *Dashboard*, *Landing*, *Campeonatos*.
  - Grupo 🏢 *Mi Organización*: Sedes y canchas, Árbitros, Reglamento marco, Parámetros generales.
  - Grupo 👤 *Mi Cuenta*: Compra de créditos/partidos y analítica de visitas.
  - Atajos dinámicos: Acceso directo a cada torneo marcado como "Activo".

### Pautas de Implementación Técnica
1. **Pipeline de Datos**: Implementar agregaciones rápidas o caching (Redis) para los KPIs del Dashboard (`COUNT` de partidos con `estado = 'programado'` para las próximas 24-48 horas) para evitar la degradación del rendimiento por consultas pesadas sobre las tablas de eventos.
2. **Diseño Adaptativo**: Interfaz limpia, optimizada para escritorio para los operarios y móvil responsiva para veedores en campo.

---

## 3. Módulo de Torneos (Campeonatos) y Ciclo de Vida

### Especificación Funcional
Permite la administración de las ligas subdivididas por formatos y categorías.
- **Estados del Torneo**: `borrador`, `abierto` (en inscripción), `en_curso`, `finalizado`, `archivado`.
- **Clonación / Duplicación Inteligente**: Posibilidad de duplicar un torneo pasado (copiando configuraciones de categorías, reglamentos, premios y parámetros de tarjetas) para la nueva temporada, vaciando opcionalmente el fixture y las estadísticas pero manteniendo los equipos base si se desea.
- **Exportación Total Multicuaderno**: Descarga instantánea de un archivo `.xlsx` con hojas dedicadas: Equipos, Planteles (Jugadores), Fixture completo y Tabla acumulada de Fair Play.

### Pautas de Implementación Técnica
1. **Lógica de Duplicación (Deep Copy)**:
   - Rutina a nivel de base de datos o servicio backend que realice un `INSERT INTO torneos ... SELECT` duplicando los parámetros de la tabla origen pero generando un nuevo `id (UUID)` y modificando el prefijo del `nombre` (Ej: "Torneo Clausura [COPIA]").
2. **Generación Excel Dinámica**:
   - Uso de librerías tipo `openpyxl` en Python o herramientas nativas en Node.js que mapeen directamente los DataFrames de consulta de la base de datos a hojas de un único libro de trabajo, con estilos profesionales automáticos.

---

## 4. Gestión de Inscripción de Equipos y Lista de Buena Fe

### Especificación Funcional
Control riguroso sobre la conformación de los planteles de jugadores para garantizar la transparencia y evitar reclamos administrativos.
- **Inscripción y Vinculación Dinámica**: Los equipos se registran globalmente en la base de datos de la organización, pero participan en los torneos mediante una tabla intermedia de inscripciones (`torneos_equipos`). Esto previene la duplicación de datos históricos.
- **Lista de Buena Fe Estricta**: Cada equipo debe cargar su nómina de jugadores. Los campos requeridos son obligatorios (Nombre, Apellido, Cédula de Identidad, Fecha de Nacimiento, Foto Biométrica). La ausencia de datos inhabilita al jugador y genera causales de protesta automática por el rival si el jugador es incluido en una planilla.
- **Validación de Altas Posteriores**: Se permiten incorporaciones enviando una nota formal a la secretaría del torneo en días hábiles. El sistema bloquea las altas realizadas el mismo día del encuentro en la cancha para evitar fraudes de última hora.

### Pautas de Implementación Técnica
1. **Regla de Integridad de Roster**:
   - Restricción unique compuesta en la base de datos para impedir que un jugador se inscriba en dos equipos diferentes dentro de la misma categoría en el mismo torneo.
2. **Validación del Estado de Datos**:
   - Función disparadora en el backend que evalúe si algún campo de la Lista de Buena Fe contiene cadenas vacías o valores comodín (`'NO TIENE'`). Si se detecta, el flag `jugador_habilitado` se computará automáticamente como `FALSE`.

---

## 5. Control Biométrico por Reconocimiento Facial

### Especificación Funcional
Automatización del proceso de control de identidad en los partidos para erradicar la suplantación de jugadores ("inclusión indebida").
- **Fase 1: Registro (Enrollment)**: Al cargar el perfil del jugador en la Lista de Buena Fe, se procesa su fotografía frontal y se extraen los vectores biométricos.
- **Fase 2: Verificación en Cancha (Check-in)**: El veedor o árbitro, utilizando una tablet o smartphone en la mesa de control antes del partido, toma una fotografía instantánea del jugador. El sistema compara la imagen en tiempo real con los datos biométricos almacenados para autorizar su ingreso a la cancha.

### Pautas de Implementación Técnica
1. **Procesamiento de Encodings**:
   - Uso de bibliotecas como `face_recognition` o servicios en la nube. Al registrar, se ejecuta:
     ```python
     import face_recognition
     image = face_recognition.load_image_file("foto_perfil.jpg")
     face_encodings = face_recognition.face_encodings(image)[0]
     # Guardar face_encodings serializado como un array de FLOAT o tipo vector en PostgreSQL (pgvector)
     ```
2. **Algoritmo de Comparación**:
   - En cancha, la nueva captura se transforma en vectores y se invoca `face_recognition.compare_faces([encoding_guardado], encoding_nuevo, tolerance=0.6)` o una consulta de similitud de cosenos por base de datos:
     ```sql
     SELECT id FROM tournament_players WHERE embedding <=> new_embedding < 0.6;
     ```

---

## 6. Motor Automatizado de Fixtures (Planificación de Calendarios)

### Especificación Funcional
El sistema genera automáticamente el calendario de partidos basándose en los parámetros provistos por el administrador, gestionando eficientemente las limitaciones físicas del predio.
- **Modalidades de Competición Soportadas**:
  1. *Todos contra Todos (Round Robin / Sistema de Liga)*: Partidos de ida o de ida y vuelta.
  2. *Eliminación Directa (Knock-out)*: Llaves con emparejamientos automáticos (Octavos, Cuartos, Semifinal, Final).
  3. *Modo Mixto (Combinado)*: Fase de grupos en Round Robin que clasifica automáticamente a los mejores `X` equipos a una fase de llaves de eliminación directa.
  4. *Sistema Suizo*: Adaptado de los eSports y el ajedrez. Rondas dinámicas basadas en puntuaciones acumuladas idénticas o similares, prohibiendo que dos equipos se enfrenten dos veces en el mismo torneo.
- **Asignación Eficiente de Recursos**: Distribución equitativa de localías y cruces automáticos cruzando la disponibilidad de canchas configuradas (`sedes_canchas`), los días hábiles de la semana y las franjas horarias parametrizadas. Manejo automatizado de equipos "Libres" en jornadas con número impar de participantes.

### Pautas de Implementación Técnica
1. **Algoritmo de Rotación de Berger para Round Robin**:
   - Implementar el algoritmo cíclico clásico para asegurar que todos jueguen contra todos en un número óptimo de jornadas ($N-1$ jornadas para $N$ equipos).
2. **Estructura del Generador**:
   - Crear una matriz de combinaciones. Iterar sobre las canchas y horarios disponibles.
   - En caso de equipos con restricciones especiales de localía compartida, el backend ejecutará una resolución de restricciones (Constraint Satisfaction Problem - CSP) antes de confirmar la inserción física en la tabla `partidos`.

---

## 7. Módulo Financiero, Pagos y Disparadores de Bloqueo (Locks)

### Especificación Funcional
Sistema de contabilidad embebido para controlar los flujos de dinero del torneo e inyectar disciplina comercial.
- **Tipos de Aranceles Parametrizables**:
  - *Derecho de Inscripción*: Pago único obligatorio por equipo para ser incluido en el sorteo del torneo.
  - *Derecho de Partido (Veeduría/Arbitraje)*: Pago fijo por cada fecha disputada. Puede configurarse para ser abonado antes de ingresar a la cancha o acumularse en cuenta corriente.
- **Disparadores de Bloqueo Comercial (Locks)**: Si un equipo presenta deudas vencidas que excedan el límite financiero permitido configurado en la organización (Ej: saldo negativo mayor al costo de 1 partido), el sistema activa un bloqueo lógico automático.
  - El bloqueo inhabilita la generación o impresión de la Planilla Digital de Partido, forzando la pérdida del encuentro por W.O. (Walk Over) administrativo si no se regulariza la deuda antes del pitazo inicial.

### Pautas de Implementación Técnica
1. **Automatización Mediante Triggers en Base de Datos**:
   - Crear un trigger en PostgreSQL que evalúe el estado financiero antes del cambio de estado de un partido a "Listo para Jugar":
     ```sql
     CREATE OR REPLACE FUNCTION verificar_limite_credito() 
     RETURNS TRIGGER AS $$
     DECLARE
         saldo_pendiente NUMERIC;
     BEGIN
         SELECT COALESCE(SUM(monto_pendiente), 0) INTO saldo_pendiente 
         FROM cuenta_corriente_equipos 
         WHERE equipo_id = NEW.equipo_local_id;
         
         IF saldo_pendiente > (SELECT limite_maximo FROM parametros_torneo WHERE torneo_id = NEW.torneo_id) THEN
             RAISE EXCEPTION 'Planilla bloqueada: El equipo local posee deudas vencidas.';
         END IF;
         RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;
     ```

---

## 8. Planilla Digital, Eventos en Vivo y Estadísticas Automatizadas

### Especificación Funcional
Sustitución de las planillas de papel por un sistema de captura de eventos atómicos en tiempo real administrado por el veedor.
- **Captura Atómica de Eventos**: Durante el partido se registran cronológicamente: Goles (normal, penal, en contra), Tarjetas (Amarilla, Roja directa, Doble Amarilla) con indicación del minuto y el jugador exacto.
- **Cálculo Estadístico Dinámico**: No se utilizan tablas estáticas de goles o tarjetas acumuladas. Las tablas de clasificación, goleadores, la valla menos vencida y el ranking de Fair Play se calculan en tiempo real mediante agregaciones de la tabla de eventos.
- **Reglas del Torneo y Participación Mínima**: Validación automática del porcentaje o cantidad de partidos jugados por un futbolista en la fase de grupos para habilitarlo a disputar las llaves de eliminación directa. Si no cumple la cuota, el sistema bloquea su inclusión en la planilla de playoffs.

### Pautas de Implementación Técnica
1. **Estructura del Historial de Alineaciones**:
   - Tabla `partidos_alineaciones` que vincula `partido_id`, `jugador_id`, `minutos_jugados`, `ingreso_titular`.
2. **Cálculo Dinámico de Estadísticas (Vistas Indexadas o Consultas SQL)**:
   - Tabla de Goleadores:
     ```sql
     SELECT jugador_id, COUNT(*) as goles_totales 
     FROM partidos_eventos 
     WHERE tipo_evento = 'GOL' AND torneo_id = :id_torneo 
     GROUP BY jugador_id ORDER BY goles_totales DESC;
     ```

---

## 9. Sistema Disciplinario Avanzado (Tarjetas y Multas)

### Especificación Funcional
Administración automatizada de las sanciones aplicadas a jugadores y clubes.
- **Multas Económicas Indexadas**: La asignación de tarjetas genera automáticamente un cobro en la cuenta corriente del equipo según los valores parametrizados en el sistema (Ej: Tarjeta Amarilla = $X$ PYG, Tarjeta Roja = $Y$ PYG).
- **Suspensión Automática por Tarjetas**:
  - *Roja Directa / Doble Amarilla*: Genera una suspensión mínima automática de 1 partido extra para la siguiente fecha del fixture.
  - *Acumulación de Amarillas*: El administrador parametriza el límite (Ej: 3 o 5 amarillas). Al alcanzar el umbral, el jugador queda suspendido automáticamente para la fecha inmediata posterior.
- **Bloqueo Disciplinario**: Los jugadores suspendidos aparecen tachados y deshabilitados en la interfaz de la planilla digital del veedor, impidiendo su selección para el partido en juego.

### Pautas de Implementación Técnica
1. **Lógica de Control de Elegibilidad**:
   - Al renderizar la interfaz de la planilla para el partido actual, ejecutar una subconsulta que verifique el estado del jugador en la tabla `sanciones_jugadores` donde `partido_fecha_efectiva` coincida con la fecha actual del campeonato.

---

## 10. Portal Público CMS, Generador de Noticias con IA y Analítica

### Especificación Funcional
Cada Organización dispone de un portal web público auto-gestionable para desaturar los canales de comunicación tradicionales (como grupos de WhatsApp).
- **Landing Page con Drag & Drop**: Editor visual estructurado en bloques modulares (Sección Hero, Carrusel de Torneos, Tablas de Posiciones en Tiempo Real, Galería de Fotos y Videos) configurables mediante arrastrar y soltar.
- **Generador de Noticias Asistido por IA**: El administrador introduce un prompt simple o viñetas con los datos destacados de la jornada (Ej: "Lazio le ganó el clásico a Milán con gol en el último minuto") y un motor de IA integrado genera un borrador completo, redactado con tono periodístico deportivo, listo para ser publicado en el blog del portal.
- **Analítica de Visitas**: Panel interno que rastrea el tráfico de usuarios en la plataforma. Presenta KPIs detallados (Visitas totales, Visitantes únicos, Registros de usuarios nuevos, Usuarios anónimos) y un desglose gráfico de barras para monitorear el comportamiento diario.

### Pautas de Implementación Técnica
1. **Integración del Generador de Noticias con IA (OpenAI API / Gemini API)**:
   - Endpoint en el backend (`POST /api/noticias/generar-ia`) que reciba la indicación abreviada y procese el contenido:
     ```python
     import os
     from google import genai

     client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
     response = client.models.generate_content(
         model='gemini-2.5-flash',
         contents=f"Redacta una crónica deportiva periodística y emocionante basada en los siguientes datos: {prompt_usuario}"
     )
     texto_noticia = response.text
     ```
2. **Analítica de Tráfico Privada**:
   - Tabla `visitas_log` que guarde de forma anonimizada `id`, `tenant_id`, `created_at`, `es_usuario_registrado (BOOLEAN)`. Evitar el uso de scripts de terceros pesados para garantizar el cumplimiento de normativas de privacidad y velocidad de carga móvil.
