# Especificación Técnica y Funcional del Sistema Mi Cancha
## Plataforma Integral para Gestión de Torneos Multideporte, Academias, Arbitraje Digital y Complejos Deportivos

**Versión:** 2.5 — Ecosistema Unificado  
**Fecha de actualización:** Septiembre 2026  
**Público objetivo:** Organizadores de torneos, federaciones deportivas, directores de academias y administradores de complejos deportivos.

---

## 1. Resumen Ejecutivo y Propuesta de Valor

**Mi Cancha** es una plataforma tecnológica integral diseñada para resolver de punta a punta las necesidades operativas, reglamentarias, financieras y de difusión de organizaciones deportivas. 

A diferencia de planillas manuales o herramientas fragmentadas, Mi Cancha centraliza en un único entorno:
- La creación y administración de **competencias deportivas multidisciplinarias** (fútbol, artes marciales, ajedrez, básquetbol).
- El **arbitraje digital en tiempo real** con pantallas gigantes para el público y estaciones de repetición instantánea (**Video Review**).
- La gestión formativa y administrativa de **academias y escuelas de entrenamiento** (SAD-M).
- El **control financiero integral**: pasarelas de pago online, cuentas corrientes, cajas de sede y facturación electrónica.
- La **seguridad e integridad deportiva** mediante reconocimiento biométrico facial para eliminar la suplantación de identidad.
- La **difusión automatizada**: redacción de noticias con Inteligencia Artificial y portales web personalizados con marca propia para cada organizador.

### Modalidades de Despliegue

| Modalidad | Descripción | Escenario de Uso |
|---|---|---|
| **Nube (Cloud SaaS)** | Acceso instantáneo desde cualquier navegador web moderno (`https://micancha.com.py`) sin instalaciones locales. Alta disponibilidad y copias de seguridad continuas. | Gestión diaria de ligas, academias, inscripciones online y portales públicos. |
| **Servidor Local (On-Premise / LAN)** | Operación autónoma en una laptop servidora conectada a un router Wi-Fi local en el recinto deportivo, **sin requerir conexión a Internet**. | Jornadas de torneos en estadios, polideportivos cerrados o zonas con conectividad deficiente. |

---

## 2. Catálogo de Módulos y Capacidades del Sistema

```
                                 SISTEMA MI CANCHA
  ┌──────────────────────────────────────┬──────────────────────────────────────┐
  │         COMPETICIONES & TORNEOS      │         ADMINISTRACIÓN & GESTIÓN     │
  ├──────────────────────────────────────┼──────────────────────────────────────┤
  │ 1. Torneos Multideporte & Fixture    │ 4. SAD-M: Academias Deportivas       │
  │ 2. Arbitraje Digital & Video Review  │ 5. Control Financiero & Facturación  │
  │ 3. Ajedrez Suizo & Lichess Sync      │ 6. Reconocimiento Facial Biométrico  │
  ├──────────────────────────────────────┼──────────────────────────────────────┤
  │         DIFUSIÓN & COMUNICACIÓN      │         EXPERIENCIA DIGITAL          │
  ├──────────────────────────────────────┼──────────────────────────────────────┤
  │ 7. Noticias Deportivas con IA        │ 9. Portales Web con Marca Propia     │
  │ 8. Mensajería WhatsApp Automatizada  │ 10. Streaming & Transmisión en Vivo  │
  └──────────────────────────────────────┴──────────────────────────────────────┘
```

---

### Módulo 1: Motor de Torneos y Competencias Multideporte

Gestión integral de ligas y campeonatos de fútbol (campo, 7, futsal), básquetbol, pádel y deportes colectivos.

- **Generación Automatizada de Fixtures:**
  - **Formato Liga (Todos contra Todos):** Algoritmo circular de Berger con jornadas de ida y vuelta equilibradas y gestión automática de fechas libres para equipos impares.
  - **Eliminación Directa (Playoffs):** Cuadros de llaves cruzadas (Octavos, Cuartos, Semifinales y Finales) con avance automático de ganadores.
  - **Formato Mixto (Fase de Grupos + Eliminatorias):** Asignación por zonas y clasificación automática cruzada (ej. 1º del Grupo A vs 2º del Grupo B).
  - **Playoff Regional Interciudades:** Convocatoria de los mejores equipos de campeonatos locales para una gran final de campeones, clonando automáticamente equipos, planteles e identidades sin recarga manual.
- **Control de Listas de Buena Fe y Delegados:**
  - Portal de autogestión para delegados: carga de jugadores, fotos de perfil, números de camiseta y documentación oficial.
  - Validación algorítmica de reglas: camisetas únicas por equipo, DNI único (prohibición de doble fichaje simultáneo), cupo máximo de refuerzos externos y rangos de edad según categoría.
- **Mesa de Control y Actas Digitales en Tiempo Real:**
  - Registro minuto a minuto de todos los incidentes: goles, autogoles, penales, amonestaciones, expulsiones, lesiones y sustituciones.
  - Registro de cambios con identificación biométrica del jugador entrante y saliente.
  - Control de asistencia de jugadores por encuentro.
- **Tablas Estadísticas de Actualización Inmediata:**
  - Tabla General de Posiciones con criterios oficiales de desempate (Puntos, DG, GF, Resultado directo).
  - Tabla de Goleadores del Torneo.
  - Valla Menos Vencida (Arqueros destacados).
  - Tabla de Fair Play (Juego Limpio ponderado por tarjetas recibidas).
- **Herramientas de Productividad para Organizadores:**
  - **Clonación de Torneos:** Duplicación en 1 clic de estructuras completas para nuevas temporadas.
  - **Exportación Oficial a Excel (.xlsx):** Descarga inmediata con hojas temáticas (Equipos, Planteles, Fixture, Posiciones y Fair Play).

---

### Módulo 2: Arbitraje Digital y Video Review (VR) para Artes Marciales

Solución especializada para competencias de combate (Karate WKF y ASAM) con soporte oficial para **Kumite** (combate por puntos) y **Kata** (formas con calificación decimal).

- **Puntuación Reglamentaria WKF 2024:**
  - Puntuación táctil instantánea: **Yuko** (1 punto), **Waza-Ari** (2 puntos), **Ippon** (3 puntos).
  - Asignación y desempate automático por **Senshu** (primer punto no disputado).
  - Control de advertencias y penalizaciones en tiempo real (C1, C2, C3, Hansoku) y contador de salidas del área (**Jogai**) con descalificación reglamentaria automática.
  - Control de tiempo con cronómetro oficial y modo prórroga (**Enchosen**) con muerte súbita.
- **Sistema de Video Review Digital (Artículo 9 WKF):**
  - Gestión de **Tarjeta de Apelación (VR Card)** por esquina (Aka / Ao).
  - **Replay Instantáneo en menos de 1 segundo:** Al solicitarse una apelación, el video se envía de forma inmediata a la tablet del Juez VR y el cronómetro se detiene automáticamente.
  - **Controles de Alta Precisión:** Reproducción a cámara superlenta (0.25×, 0.5×), avance y retroceso cuadro por cuadro (30 fps) y botón de salto instantáneo al intercambio (`⏮ −6s`).
  - **Timer Reglamentario de Deliberación:** Cuenta regresiva oficial de 30 segundos con alertas visuales verde/ámbar/rojo.
  - **Veredictos Oficiales:**
    - *Aceptado:* Suma puntos al marcador y el entrenador **conserva** su tarjeta de apelación.
    - *Rechazado:* Marcador intacto y el entrenador **pierde** su tarjeta para el resto del combate.
    - *Mienai (No Visible):* Marcador intacto y el entrenador **conserva** su tarjeta.
- **Arquitectura Dual de Captura de Video:**
  - **Modo Cámara Nativa Web (Zero-Install / Bajo Costo):** Permite usar cualquier smartphone (Android o iPhone) o webcam USB montada en trípode. Graba en un búfer continuo en memoria RAM y transfiere el clip automáticamente sin necesidad de instalar programas adicionales ni gastar en PCs de streaming.
  - **Modo Broadcast Pro (OBS Studio):** Compatibilidad con cámaras profesionales broadcast a 60/120 fps y tarjetas capturadoras HDMI/SDI para finales televisadas.
- **Pantalla Gigante de Tatami (TV Display):**
  - Marcador a pantalla completa optimizado para Smart TVs de 43" a 65" sin barras de navegador.
  - Banner animado gigante *"VIDEO REVIEW"* durante las deliberaciones.
- **Mesa Central del Jefe de Árbitros:**
  - Supervisión panorámica simultánea de todos los tatamis del recinto.
  - Bloqueo de seguridad de mesas durante recesos.
  - Validación final de resultados e **impresión inmediata de Actas Oficiales de Combate**.
  - **Generador de Fichas QR:** Tarjetas listas para recortar y colocar en cada mesa para abrir las estaciones en 10 segundos escaneando con la cámara.

---

### Módulo 3: Plataforma de Ajedrez y Deportes Mentales

Motor avanzado de gestión de torneos de ajedrez para clubes, colegios, academias y federaciones.

- **Sistemas de Competencia Oficiales:**
  - **Sistema Suizo:** Algoritmo matemático de emparejamiento que empareja jugadores con puntajes similares, garantizando que nunca se repita un enfrentamiento y alternando colores (blancas y negras).
  - **Round Robin (Todos contra Todos):** Tablas cruzadas con cuadros Berger.
- **Integración y Sincronización con Lichess:**
  - Importación automática de torneos y participantes desde la plataforma global Lichess.
  - Sincronización en vivo de resultados y movimientos de partidas online.
- **Gestión de Partidas y Notación PGN:**
  - Registro de jugadas y visor interactivo de tablero con exportación de archivos PGN estándar.
- **Cálculo de Rendimiento y ELO FIDE:**
  - Variación de puntaje ELO calculada automáticamente al registrar cada victoria, empate o derrota.

---

### Módulo 4: SAD-M — Sistema de Administración de Academias Deportivas

Ecosistema de gestión administrativa, deportiva y formativa para escuelas de fútbol, artes marciales, básquetbol, natación y clubes deportivos.

- **Ficha Médica y Deportiva del Alumno:**
  - Registro de datos personales, historial médico, categorías, niveles, cinturones o grados.
  - Vinculación con tutores o responsables legales (padre/madre/encargado) para autorizaciones y pagos.
- **Control Móvil de Asistencias:**
  - Registro rápido de asistencia desde el celular del profesor al inicio de cada sesión de entrenamiento.
  - Reportes estadísticos de presentismo, ausencias y alertas de inasistencias prolongadas.
- **Estructura Multi-Sucursal y Horarios:**
  - Configuración de múltiples sedes, canchas, salas y turnos por edad y nivel.
- **Roles y Permisos de Personal (RBAC):**
  - Perfiles independientes: *Dueño*, *Administrador*, *Tesorero* y *Profesor*.

---

### Módulo 5: Ecosistema Financiero, Tesorería y Facturación

Control total de los ingresos, saldos pendientes y obligaciones impositivas de organizadores y complejos.

- **Cuenta Corriente de Equipos y Alumnos:**
  - Historial pormenorizado de cargos generados (arancel de inscripción, cuotas mensuales, uniformes, exámenes de grado) y pagos acreditados.
  - Cálculo instantáneo del saldo adeudado.
- **Multas y Sanciones Disciplinarias Automáticas:**
  - Generación automática de cargos en cuenta corriente al emitirse tarjetas amarillas, rojas o incomparecencias (W.O.).
  - Opción de rehabilitación automática: la suspensión del jugador se levanta automáticamente en el sistema una vez saldada la multa correspondiente.
- **Pasarelas de Pago Digital E2E:**
  - Cobro mediante **MercadoPago** y **Stripe** con links de pago directos enviados al celular del delegado o tutor.
  - Acreditación automática y actualización de estado en tiempo real.
- **Control de Cajas de Sede y Pagos Manuales:**
  - Registro de cobros en efectivo, transferencias bancarias o cheques en la administración del complejo con emisión de comprobantes de pago.
- **Facturación Electrónica Oficial:**
  - Módulo integrado para emisión de comprobantes fiscales, timbrados y reportes impositivos conforme a normativas tributarias oficiales.

---

### Módulo 6: Seguridad y Reconocimiento Facial Biométrico

Tecnología de Inteligencia Artificial para garantizar la transparencia deportiva en el campo de juego.

- **Validación de Identidad en Mesa de Control:**
  - Antes de cada cotejo, el veedor o anotador enfoca la cámara del celular o laptop hacia el competidor.
  - El sistema extrae los rasgos biométricos faciales y los compara contra la fotografía registrada en la Lista de Buena Fe oficial.
- **Diagnóstico y Habilitación Instantánea:**
  - Verificación del umbral de coincidencia (>85% de similitud).
  - Chequeo simultáneo de sanciones disciplinarias o deudas pendientes.
  - Habilitación visual (indicador verde) para la firma digital de la planilla de juego.
  - **Eliminación absoluta de la suplantación de identidad** o alineación indebida de jugadores inhabilitados.

---

### Módulo 7: Inteligencia Artificial Deportiva (Google Gemini)

Automatización de contenidos periodísticos para potenciar la visibilidad del campeonato.

- **Redacción Automática de Crónicas:**
  - Con solo ingresar los datos del encuentro o una breve frase ("El clásico terminó 3 a 2 con gol en el último minuto"), el modelo de IA redacta artículos periodísticos completos, dinámicos y profesionales.
- **Contenido Optimizado para Redes Sociales:**
  - Textos listos para publicar en Instagram, Facebook, estados de WhatsApp o gacetillas de prensa.
- **Mediateca y Archivo:**
  - Historial de publicaciones archivado en el portal del torneo para consulta de delegados y prensa.

---

### Módulo 8: Centro de Transmisión y Streaming en Vivo

Lleva las competencias a la audiencia global sin costos de producción televisiva compleja.

- **Integración Embebida con YouTube Live:**
  - Asignación de canales de transmisión independientes por cada tatami o cancha.
  - Reproductor integrado en la página pública del torneo con selector dinámico de área deportiva.
- **Marcadores Interactivos Sobrepuestos:**
  - El tanteador oficial del partido/combate se muestra sincronizado junto a la transmisión en directo para disfrute de las familias y seguidores.

---

### Módulo 9: Comunicación Automatizada por WhatsApp

Canal directo y automatizado para mantener informada a toda la comunidad deportiva.

- **Notificaciones Automáticas del Torneo:**
  - Envío de programación de partidos, cambios de cancha y recordatorios de horarios a delegados.
  - Notificación instantánea de resultados y tablas de posiciones tras finalizar la jornada.
- **Alertas de Cobranza y Cuotas:**
  - Mensajes de vencimiento de cuotas en academias y recordatorios de saldo pendiente en cuentas corrientes de equipos.

---

### Módulo 10: Portales Web Públicos con Marca Propia (White Label)

Cada cliente dispone de su propia vitrina digital profesional para proyectar su marca y comercializar espacios publicitarios.

- **Página Web Propia del Organizador o Academia:**
  - Dirección web personalizada y fácil de recordar (ej. `micancha.com.py/organizador/miliga2026`).
  - Personalización visual: logotipo, escudo, colores institucionales, fotos de portada y textos de bienvenida.
- **Monetización con Patrocinadores:**
  - Espacios publicitarios dedicados para banners y logos de sponsors oficiales con enlaces a sus marcas.
- **Información Pública en Tiempo Real:**
  - Fixtures interactivos, resultados de partidos, llaves de playoffs, tablas de goleadores, transmisiones en vivo y enlaces a redes sociales accesibles desde cualquier teléfono sin necesidad de descargar apps.

---

## 3. Especificaciones de Equipamiento Físico (Hardware Recomendado)

Mi Cancha está diseñado con un principio de **máxima optimización de hardware**, permitiendo operar con equipamiento accesible que el organizador o el personal ya posee:

| Puesto / Rol | Dispositivo Recomendado | Función Principal |
|---|---|---|
| **Mesa de Control (Anotador)** | Laptop (Windows, Mac o Linux) con Google Chrome o Edge | Manejo de puntos, cronómetro, actas digitales y solicitudes de Video Review. |
| **Juez de Video Review (VR)** | Tablet de 10" o superior (Android o iPad) | Inspección táctil del clip de video a cámara lenta y emisión del veredicto oficial. |
| **Cámara de Tatami / Cancha** | Smartphone moderno con trípode (1.5m a 1.8m) o Webcam USB Full HD | Captura continua del área deportiva con búfer rodante en RAM y subida automática. |
| **Pantalla Pública (Público y Atletas)** | Smart TV de 43" a 65" Full HD / 4K conectada por HDMI o Wi-Fi | Marcador gigante en tiempo real y avisos de Video Review o faltas. |
| **Mesa Central (Jefe de Árbitros)** | Laptop con pantalla de 15" + Impresora Wi-Fi/USB | Supervisión global de todas las áreas, validación de actas e impresión oficial. |

### Requisitos de Conectividad y Red

- **Red Wi-Fi Exclusiva:** Se recomienda un router Wi-Fi doble banda (5 GHz) con contraseña dedicada exclusivamente para los dispositivos de mesa y arbitraje (separada de la red abierta del público).
- **Velocidad de Conexión:**
  - *Operación estándar (sin streaming):* 10 a 15 Mbps de bajada garantizan sincronización en menos de 100 milisegundos.
  - *Con streaming de video en vivo (YouTube Live):* 5 a 10 Mbps de subida (upload) por cada canal de transmisión activo.
  - *Modo Offline / Intranet:* 0 Mbps de internet requeridos (comunicación directa dentro del gimnasio).

---

## 4. Seguridad, Integridad y Roles de Usuario (RBAC)

La plataforma aplica un modelo estricto de seguridad para proteger los datos institucionales, las finanzas y la confidencialidad de los atletas:

1. **Jerarquía de Roles de Acceso:**
   - **Administrador General / Organizador:** Control total del campeonato, configuración de reglas, aranceles, patrocinadores y cierre de torneos.
   - **Delegado de Equipo / Club:** Carga de lista de buena fe, pago de aranceles y consulta de cuenta corriente de su institución.
   - **Árbitro / Mesa de Control:** Registro de actas de partido, cronómetro y solicitudes de revisión.
   - **Juez de Video Review:** Acceso exclusivo a la estación de repetición y emisión de veredictos reglamentarios.
   - **Director de Academia / Staff formativo:** Fichas de alumnos, asistencias y cuotas de su propia sede.
   - **Público General:** Consulta libre de tablas, marcadores y streaming sin privilegios de edición.
2. **Aislamiento Multi-Tenant:**
   - La información de cada complejo, academia o liga deportiva se encuentra lógicamente aislada, impidiendo que un organizador acceda a los datos o finanzas de otra entidad.
3. **Auditoría y Trazabilidad Permanente:**
   - Cada punto otorgado, tarjeta emitida, pago registrado y veredicto de Video Review queda registrado con fecha, hora exacta, usuario responsable y dispositivo origen.
4. **Protección de Datos Biométricos:**
   - Los vectores de reconocimiento facial se almacenan de forma segura y se utilizan exclusivamente para la validación de identidad en el marco de la competencia deportiva.

---

*Mi Cancha — La revolución digital para torneos, academias y complejos deportivos.*
