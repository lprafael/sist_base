# Guia Tecnica: Instalacion, Despliegue y Mantenimiento
# Sistema Mi Cancha -- Gestion de Torneos y Academias Deportivas

Ultima actualizacion: 2026-07-20 -- Modulo SAD-M: Academias Deportivas + PKF Karate

---

## Indice

1. Requisitos Previos
2. Instalacion Inicial (PC Cliente o Servidor)
3. Configuracion del Entorno (.env)
4. Despliegue de Actualizaciones (Mantenimiento)
5. Migraciones de Base de Datos
6. Arquitectura, Schemas y Puertos
7. Endpoints del Sistema -- Referencia por Modulo
8. Instrucciones para Agente IA (Prompt de Despliegue)
9. Solucion de Problemas (Troubleshooting)

---

## 1. Requisitos Previos

- Docker Desktop (Windows/Mac) o Docker Engine + Compose (Linux)
- Git (Opcional, recomendado)
- Conexion a Internet (primera vez)

> No es necesario instalar Node.js, Python ni PostgreSQL directamente.

---

## 2. Instalacion Inicial

### Paso 1: Obtener el Codigo
```bash
git clone <URL_DEL_REPOSITORIO> mi_cancha
cd mi_cancha
```

### Paso 2: Configurar Variables de Entorno (Web)
Archivo: `web/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8002
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-google-client-id
```

### Paso 3: Configurar Variables de Entorno (Backend)
Archivo: `backend/.env`
```env
DATABASE_URL=postgresql+asyncpg://postgres:admin@host.docker.internal:5432/BBDD_micancha
SECRET_KEY=cambiar_esta_clave_por_una_segura_en_produccion
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
GOOGLE_CLIENT_ID=tu-google-client-id
GEMINI_API_KEY=tu-gemini-api-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=tu@gmail.com
EMAIL_PASSWORD=app-password
EMAIL_FROM=tu@gmail.com
```

### Paso 4: Construir y Levantar
```bash
docker-compose build
docker-compose up -d
```

Verificar instalacion:
- Backend (Health): http://localhost:8002/health
- Web (Next.js): http://localhost:3000

---

## 3. Configuracion del Entorno (.env)

### Backend (`backend/.env`)

| Variable | Descripcion | Ejemplo |
|---|---|---|
| DATABASE_URL | String de conexion a PostgreSQL | postgresql+asyncpg://u:p@host:5432/db |
| SECRET_KEY | Clave JWT | super_secret_key_123 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Duracion token (default 480 = 8h) | 480 |
| GOOGLE_CLIENT_ID | Client ID de Google OAuth | 584709...apps.googleusercontent.com |
| GEMINI_API_KEY | API Key de Google Gemini (noticias IA) | AIzaSy... |
| EMAIL_HOST | Servidor SMTP | smtp.gmail.com |

---

## 4. Despliegue de Actualizaciones

```bash
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker exec micancha-backend py run_migrations.py
```

---

## 5. Migraciones de Base de Datos

### Ejecutar todas las migraciones (UP)
```bash
docker exec micancha-backend py run_migrations.py
```

### Ejecutar una migracion especifica
```bash
docker exec micancha-backend py migrations/038_academias_schema.py up
```

### Revertir una migracion (DOWN)
```bash
docker exec micancha-backend py migrations/038_academias_schema.py down
```

### Historial de Migraciones

| N | Archivo | Descripcion |
|---|---|---|
| 001 | add_payments_and_tournaments | Pagos y torneos base |
| 002 | torneo_completo | Schema completo de torneo |
| 003 | reva_features | Features de REVA |
| 004 | torneo_reglas_premios | Reglas y premios |
| 005 | add_rules_fields | Campos adicionales de reglas |
| 006 | eventos_categorias | Eventos y categorias |
| 007 | multitenancy_catalogos | Multitenancy + catalogos modalidades/categorias |
| 008 | gaps_logica_negocio | tipos_evento, player_out_id, creado_por |
| 009 | organizadores_independientes | Tabla cancha.organizadores |
| 010 | documentacion_delegados | URLs de documentos de jugadores |
| 011 | email_jugadores | Email de bienvenida a jugadores |
| 012 | cuenta_corriente_equipos | Modulo financiero equipos |
| 013 | noticias_torneo | Tabla de noticias/cronicas del torneo |
| 014 | jugador_activos | Campo estado activo en jugadores |
| 015 | torneos_generales | Schema torneos_generales para deportes individuales |
| 016 | schema_torneos | Migracion de tablas al schema torneos |
| 017 | organizador_tipo_torneo | Campo tipo_torneo en cancha.organizadores |
| 018 | catalogos | Catalogos de deportes y modalidades |
| 019 | torneos_futbol_catalogos | Catalogos especificos de futbol |
| 020 | normalizar_tipos_deporte | Normalizacion de tipos de deporte |
| 021 | descripciones_tipos_deporte | Descripciones en catalogos de deporte |
| 022 | mover_eventos_partido | Movimiento de eventos_partido al schema torneos |
| 023 | roles | Tabla de roles en sistema |
| 024 | mover_formatos_torneo | Migracion de formatos de torneo |
| 025 | schema_torneos_futbol | Schema torneos futbol completo |
| 026 | fix_schema_torneos_futbol | Correcciones al schema torneos futbol |
| 027 | organizador_deporte | Relacion organizador-deporte |
| 028 | torneos_ubicacion | Campos de ubicacion en torneos |
| 029 | asistencia_torneo | Control de asistencia en torneos |
| 030 | asam_y_multas | Sistema ASAM (karate) + multas en payments |
| 031 | futbol_ecosistema | sistema.perfil_organizador, categorias, divisiones, cuerpo tecnico, biometria |
| 032 | jerarquia_regional | torneos.regiones, torneos.ciudades, jerarquia interciudades |
| 033 | campos_torneo_config | Campos de configuracion adicionales en torneos |
| 034 | marciales_fields | Campos adicionales para artes marciales |
| 035 | partidos_individuales | Soporte de partidos individuales (marciales) |
| 036 | arbitraje_clasificacion | torneos.arbitros, campos de clasificacion en categorias |
| 037 | imagen_banner_torneos | Campo banner_url en torneos |
| 038 | academias_schema | Schema academias completo (SAD-M) -- 11 tablas |
| 039 | karate_pkf | Sistema PKF Kumite (pkf_combates) y Kata (pkf_formas_enfrentamientos) |

> NOTA: El runner run_migrations.py ejecuta hasta migracion 030. Las migraciones 031-039 tienen runner interno propio y se ejecutan individualmente con: py migrations/03X_nombre.py up

---

## 6. Arquitectura, Schemas y Puertos

### Contenedores Docker

| Servicio | Nombre Contenedor | Puerto Interno | Puerto Externo | Descripcion |
|---|---|---|---|---|
| Backend | micancha-backend | 8001 | 8002 | API FastAPI + Python |
| Frontend Admin | micancha-admin | 80 | 3001 | Panel de Administracion React |
| Web Publico | micancha-web | 3000 | 3000 | Next.js (web publica + paginas organizador/academia) |
| Frontend Publico | micancha-public | 80 | 3002 | Landing publica de torneos React |

Red Docker: micancha-network (Bridge)
Proxy Inverso: Nginx redirige peticiones /api hacia el backend (http://backend:8001)

### Schemas de PostgreSQL

| Schema | Descripcion |
|---|---|
| sistema | Usuarios, roles, permisos, auditoria, perfil_organizador |
| cancha | Complejos deportivos, canchas, reservas, organizadores |
| torneos | Torneos futbol por equipos (LIGA, PLAYOFF, MIXTO) |
| torneos_generales | Torneos individuales (artes marciales: ASAM, PKF) |
| academias | Sistema de Gestion de Academias Deportivas (SAD-M) |

---

## 7. Endpoints del Sistema -- Referencia por Modulo

### Modulo A -- Torneos Futbol (Core)

**Clonacion de Torneos**
- POST /cancha/torneos/{torneo_id}/clonar
- Payload: { "nuevo_nombre": "string (opcional)", "incluir_equipos": true/false }
- Respuesta: { "status": "ok", "torneo_id": "uuid", "nombre": "...", "equipos_copiados": 0 }

**Exportacion Excel (.xlsx)**
- GET /cancha/torneos/{torneo_id}/exportar/xlsx
- Hojas: Equipos, Planteles, Fixture, Posiciones, Fair Play

---

### Modulo B -- Cuenta Corriente de Equipos

- GET  /cancha/torneos/equipos/{equipo_id}/cuenta_corriente
- POST /cancha/torneos/equipos/{equipo_id}/cuenta_corriente/cargos
- POST /cancha/torneos/equipos/{equipo_id}/cuenta_corriente/{cargo_id}/pagar
- POST /cancha/torneos/sanciones/{sancion_id}/levantar-por-multa

---

### Modulo C -- Dashboard KPIs

- GET /api/analytics/dashboard
- Respuesta: torneos_activos, partidos_hoy, equipos_pendientes_validacion, equipos_con_deuda, proximos_partidos

---

### Modulo D -- Noticias IA (Gemini)

- POST /api/noticias/generar-ia          -- Generar noticia con IA
- POST /api/noticias                     -- Crear noticia
- GET  /api/noticias/torneo/{torneo_id}  -- Listar noticias del torneo

---

### Modulo E -- Jerarquia Regional Interciudades

- POST /cancha/torneos/eventos/{evento_id}/regiones
- GET  /cancha/torneos/eventos/{evento_id}/regiones
- POST /cancha/torneos/regiones/{region_id}/ciudades
- GET  /cancha/torneos/regiones/{region_id}/ciudades
- POST /cancha/torneos/regiones/{region_id}/generar-playoff-regional
  Payload: { "cupos_por_ciudad": 2 }

---

### Modulo F -- Paginas Web Publicas (Organizador + Academia)

#### Organizador -- Perfil Publico
Tabla: sistema.perfil_organizador
Campo clave: enlace_sitio (slug unico, ej: miliga2026)

| Endpoint | Metodo | Descripcion |
|---|---|---|
| /organizador/perfil | GET | Obtener configuracion del perfil (autenticado) |
| /organizador/perfil | POST | Guardar/actualizar configuracion |
| /organizador/perfil/logo | POST | Subir logo |
| /organizador/perfil/banner | POST | Subir banner |
| /api/organizadores | GET | Listado publico de organizadores |
| /organizador/{slug} | GET | PAGINA PUBLICA del organizador (sin autenticacion) |

Campos configurables: logo, banner, color institucional, titulo, descripcion, ubicacion, redes sociales, chat, publicidad.

#### Academia -- Perfil Publico
Tabla: academias.academias
Campo clave: enlace_sitio (slug unico, ej: academiafc)

| Endpoint | Metodo | Descripcion |
|---|---|---|
| /academia/perfil | GET | Obtener configuracion del perfil (autenticado) |
| /academia/perfil | POST | Guardar/actualizar configuracion |
| /academia/perfil/logo | POST | Subir logo de la academia |
| /academia/perfil/banner | POST | Subir banner de la academia |
| /academia/{slug} | GET | PAGINA PUBLICA de la academia (sin autenticacion) |

Campos configurables: nombre, descripcion, logo, banner, color primario, enlace_sitio, redes sociales, email, telefono, ciudad, acerca_de.

---

### Modulo G -- Artes Marciales

#### Sistema ASAM (Karate Combat)

- GET  /torneos-generales/{torneo_id}/categorias-marciales
- POST /torneos-generales/{torneo_id}/categorias-marciales
- GET  /torneos-generales/asam/combates/{encuentro_id}
- POST /torneos-generales/asam/combates/{encuentro_id}/puntos
- POST /torneos-generales/asam/formas/{categoria_id}/{participante_id}
- GET  /torneos-generales/asam/resultados/{categoria_id}

#### Sistema PKF (WKF Olimpico)

- GET  /torneos-generales/pkf/combates/{encuentro_id}
- POST /torneos-generales/pkf/combates/{encuentro_id}/puntos
- POST /torneos-generales/pkf/combates/{encuentro_id}/senshu
- POST /torneos-generales/pkf/combates/{encuentro_id}/jogai
- POST /torneos-generales/pkf/formas/{encuentro_id}/voto
- GET  /torneos-generales/pkf/formas/{encuentro_id}

---

### Modulo H -- Sistema de Academias Deportivas (SAD-M)

RBAC con 4 roles internos: dueno, administrador, tesorero, profesor.
Resolucion de rol: dueno via academias.academias.usuario_id, staff via academias.miembros.

#### Perfil y Configuracion

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/perfil | GET | todos | Obtener perfil de la academia |
| /academia/perfil | POST | dueno, administrador | Actualizar perfil / configurar pagina publica |
| /academia/config-cuotas | GET | dueno, administrador, tesorero | Configuracion financiera |
| /academia/config-cuotas | POST | dueno, administrador | Guardar configuracion de cuotas |

#### Sucursales

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/sucursales | GET | todos | Listar sucursales |
| /academia/sucursales | POST | dueno, administrador | Crear sucursal |
| /academia/sucursales/{id} | PUT | dueno, administrador | Actualizar sucursal |
| /academia/sucursales/{id} | DELETE | dueno | Eliminar sucursal |

#### Miembros (Staff)

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/miembros | GET | dueno, administrador | Listar staff |
| /academia/miembros | POST | dueno | Invitar nuevo miembro |
| /academia/miembros/{id} | PUT | dueno | Actualizar rol de miembro |
| /academia/miembros/{id} | DELETE | dueno | Revocar acceso |

#### Alumnos

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/alumnos | GET | todos | Listar alumnos |
| /academia/alumnos | POST | dueno, administrador | Crear alumno |
| /academia/alumnos/{id} | GET | todos | Ver ficha |
| /academia/alumnos/{id} | PUT | dueno, administrador | Actualizar ficha |
| /academia/alumnos/{id}/tutores | GET/POST | todos | Ver/agregar tutores |

#### Categorias

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/categorias | GET | todos | Listar categorias |
| /academia/categorias | POST | dueno, administrador | Crear categoria |
| /academia/categorias/{id} | PUT | dueno, administrador | Actualizar categoria |

#### Inscripciones

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/inscripciones | GET | todos | Listar inscripciones |
| /academia/inscripciones | POST | dueno, administrador | Crear inscripcion |
| /academia/inscripciones/{id} | PUT | dueno, administrador | Actualizar inscripcion |
| /academia/inscripciones/{id}/suspender | POST | dueno, administrador | Suspender inscripcion |

#### Cuotas y Pagos

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/cuotas | GET | dueno, administrador, tesorero | Listar cuotas con filtros |
| /academia/cuotas/generar | POST | dueno, administrador, tesorero | Generar cuotas del periodo |
| /academia/cuotas/{id}/pagar | POST | dueno, administrador, tesorero | Registrar pago |
| /academia/cuotas/{id}/anular | POST | dueno, administrador | Anular cuota |
| /academia/dashboard | GET | dueno, administrador, tesorero | KPIs financieros y de alumnos |

#### Asistencias

| Endpoint | Metodo | Roles | Descripcion |
|---|---|---|---|
| /academia/asistencias | GET | todos | Consultar asistencias |
| /academia/asistencias | POST | todos (solo su sucursal) | Registrar asistencia de sesion |
| /academia/asistencias/reporte | GET | dueno, administrador | Reporte por periodo |

---

## 8. Instrucciones para Agente IA (Prompt de Despliegue)

```text
Actua como un ingeniero DevOps experto en Docker y FastAPI. Necesito desplegar una actualizacion de este sistema.

Contexto:
- Backend: FastAPI (Python) en contenedor `micancha-backend`, puerto 8002
- Frontend: Next.js en contenedor `micancha-web`, puerto 3000
- Base de datos: PostgreSQL en el HOST, accesible via host.docker.internal
- Rama principal: main

Tu Tarea:
1. Verifica que estemos en la raiz del proyecto (debe existir docker-compose.yml)
2. Ejecuta: git pull origin main
3. Verifica que exista backend/.env. Si no, crear con los valores del .env.example
4. Ejecuta la secuencia de reinicio:
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
5. Verifica que los contenedores micancha-backend y micancha-web esten corriendo: docker ps
6. Si hay migraciones nuevas, ejecuta: docker exec micancha-backend py run_migrations.py
7. Reporta cualquier error y sugiere solucion.
```

---

## 9. Solucion de Problemas (Troubleshooting)

### Error: "Network Error" o "Connection Refused"
- Verifica `web/.env.local` -> NEXT_PUBLIC_API_URL=http://localhost:8002
- Si cambiaste el .env, reconstruye: docker-compose build --no-cache web
- Limpia cache del navegador (Ctrl + Shift + R)

### Error: Backend no conecta a la Base de Datos
- Si la BD esta en Windows, usa host.docker.internal en DATABASE_URL
- Verifica que PostgreSQL este corriendo en el host
- Revisa logs: docker-compose logs micancha-backend

### Error: Cambios de codigo no se ven reflejados
- Siempre usa docker-compose build --no-cache cuando actualices codigo

### Error en migraciones: "relation already exists"
- Las migraciones usan CREATE TABLE IF NOT EXISTS -- es un warning seguro, no error bloqueante

### Modulo Academias -- "No tenes acceso a ninguna academia"
- El usuario con rol='academia' no tiene registro en academias.academias
- Crear el registro manualmente o via endpoint de creacion de usuario administrador
