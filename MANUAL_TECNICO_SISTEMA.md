# 📘 Guía Técnica: Instalación, Despliegue y Mantenimiento
# Sistema Mi Cancha — Gestión de Torneos Deportivos

Este documento unifica las instrucciones técnicas para instalar, desplegar actualizaciones y mantener el sistema, tanto en entornos locales (PC Cliente) como en servidores.

*Última actualización: 2026-07-02 — Módulo C & D: Dashboards y Noticias IA*

---

## 📋 Índice

1.  [Requisitos Previos](#1-requisitos-previos)
2.  [Instalación Inicial (PC Cliente o Servidor)](#2-instalación-inicial-pc-cliente-o-servidor)
3.  [Configuración del Entorno (.env)](#3-configuración-del-entorno-env)
4.  [Despliegue de Actualizaciones (Mantenimiento)](#4-despliegue-de-actualizaciones-mantenimiento)
5.  [Migraciones de Base de Datos](#5-migraciones-de-base-de-datos)
6.  [Instrucciones para Agente IA (Prompt de Despliegue)](#6-instrucciones-para-agente-ia-prompt-de-despliegue)
7.  [Arquitectura y Puertos](#7-arquitectura-y-puertos)
8.  [Solución de Problemas (Troubleshooting)](#8-solución-de-problemas-troubleshooting)

---

## 1. Requisitos Previos

Para ejecutar el sistema, el equipo destino solo necesita:

*   **Docker Desktop** (Windows/Mac) o **Docker Engine + Compose** (Linux).
*   **Git** (Opcional, pero recomendado para descargar actualizaciones fácilmente).
*   **Conexión a Internet** (para descargar las imágenes base de Docker la primera vez).

> **Nota**: No es necesario instalar Node.js, Python ni PostgreSQL directamente en el sistema operativo, ya que todo corre dentro de contenedores Docker.

---

## 2. Instalación Inicial (PC Cliente o Servidor)

Sigue estos pasos si estás instalando el sistema **por primera vez** en una máquina.

### Paso 1: Obtener el Código
Abre una terminal (PowerShell o CMD) y clona el repositorio (o copia la carpeta del proyecto si no usas Git):

```bash
git clone <URL_DEL_REPOSITORIO> sist_playa
cd sist_playa
```

### Paso 2: Configurar Variables de Entorno (Frontend)
El frontend necesita saber la URL de la API. Crea o edita el archivo `frontend/.env`:

**Archivo:** `frontend/.env`
```env
# URL de la API (Relative path para que funcione con el proxy de Nginx)
VITE_REACT_APP_API_URL=/api

# (Opcional) Google Client ID si usas login social
VITE_GOOGLE_CLIENT_ID=tu-google-client-id
```

### Paso 3: Configurar Variables de Entorno (Backend)
Crea el archivo `backend/.env` con los datos sensibles (Base de datos, claves, etc.). **Este archivo no se descarga con Git por seguridad.**

**Archivo:** `backend/.env`
```env
# Conexión a Base de Datos
# Opción A: Base de datos en la misma red de Docker (si tuvieras un contenedor de DB)
# DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/dbname

# Opción B: Base de datos en el HOST (Windows/Linux local)
# Usa 'host.docker.internal' para acceder al localhost de la máquina anfitriona
DATABASE_URL=postgresql+asyncpg://postgres:admin@host.docker.internal:5432/BBDD_playa

# Seguridad
SECRET_KEY=cambiar_esta_clave_por_una_segura_en_produccion
ALGORITHM=HS256

# Email (Opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=tu@gmail.com
EMAIL_PASSWORD=app-password
EMAIL_FROM=tu@gmail.com
```

### Paso 4: Construir y Levantar
Ejecuta el script de instalación automática (si existe) o los comandos manuales:

**Opción A (Comandos Manuales - Recomendado):**
```bash
docker-compose build
docker-compose up -d
```

**Verificar instalación:**
*   **Frontend:** http://localhost:3002
*   **Backend (Health):** http://localhost:8002/health

---

## 3. Configuración del Entorno (.env)

### Backend (`backend/.env`)
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexión a PostgreSQL | `postgresql+asyncpg://u:p@host:5432/db` |
| `SECRET_KEY` | Clave para firmar tokens JWT | `super_secret_key_123` |
| `PORT` | Puerto interno del backend | `8001` (No cambiar usualmente) |

### Frontend (`frontend/.env`)
| Variable | Descripción | Valor Recomendado |
| :--- | :--- | :--- |
| `VITE_REACT_APP_API_URL` | URL base de la API | `/api` (para usar proxy Nginx) |

---

## 4. Despliegue de Actualizaciones (Mantenimiento)

Cuando hayas hecho cambios en tu PC de desarrollo y quieras pasarlos a la PC del Cliente:

### Paso 1: Descargar Cambios
En la PC del cliente, navega a la carpeta del proyecto y actualiza el código:

```bash
git pull origin playa
```
*(Si no usas Git, copia y reemplaza manualmente los archivos modificados)*.

### Paso 2: Reconstruir Contenedores
Es **CRUCIAL** reconstruir los contenedores para que los cambios (especialmente en el frontend) surtan efecto.

```bash
# 1. Detener contenedores actuales
docker-compose down

# 2. Reconstruir forzando la actualización (importante para React/Vite)
docker-compose build --no-cache frontend
docker-compose build backend

# 3. Levantar nuevamente
docker-compose up -d
```

---

## 5. Migraciones de Base de Datos

El sistema usa un runner de migraciones propio (`run_migrations.py`) con scripts en `backend/migrations/`.

### Ejecutar todas las migraciones (UP)
```bash
docker exec micancha-backend python run_migrations.py
```

### Ejecutar una migración específica
```bash
docker exec micancha-backend python migrations/008_gaps_logica_negocio.py up
```

### Revertir una migración (DOWN)
```bash
docker exec micancha-backend python migrations/008_gaps_logica_negocio.py down
```

### Historial de Migraciones

| Nº | Nombre | Descripción |
|---|---|---|
| 001 | add_payments_and_tournaments | Pagos y torneos base |
| 002 | torneo_completo | Schema completo de torneo |
| 003 | reva_features | Features de REVA |
| 004 | torneo_reglas_premios | Reglas y premios |
| 005 | add_rules_fields | Campos adicionales de reglas |
| 006 | eventos_categorias | Eventos y categorías |
| 007 | multitenancy_catalogos | Multitenancy + catálogos modalidades/categorías |
| 008 | gaps_logica_negocio | `tipos_evento`, `player_out_id`, `creado_por` |
| 009 | organizadores_independientes | Tabla `organizadores` |
| 010 | documentacion_delegados | URLs de documentos de jugadores |
| 011 | email_jugadores | Email de bienvenida a jugadores |

---

## 7. Nuevos Endpoints — Módulo A

### Clonación de Torneos

**Endpoint:** `POST /cancha/torneos/{torneo_id}/clonar`

| Parámetro (Body) | Tipo | Descripción |
|---|---|---|
| `nuevo_nombre` | string (opcional) | Nombre del torneo clonado. Si no se envía, usa `[original] [COPIA]` |
| `incluir_equipos` | boolean | Si `true`, copia los equipos (sin jugadores ni pagos) en estado `pendiente` |

**Respuesta:** `{ "status": "ok", "torneo_id": "uuid", "nombre": "...", "equipos_copiados": 0 }`

**Lo que se copia:** nombre, modalidad, categoría, puntos, max_equipos, costo_inscripción, reglas, premios, configuración.

**Lo que NO se copia:** fixture, partidos, goles, tarjetas, sanciones, pagos, posiciones.

---

### Exportación Excel (.xlsx)

**Endpoint:** `GET /cancha/torneos/{torneo_id}/exportar/xlsx`

Devuelve una descarga directa del archivo `Torneo_[nombre].xlsx` con 5 hojas:

| Hoja | Columnas |
|---|---|
| Equipos | #, Equipo, Capitán, Teléfono, Estado Inscripción, Estado Pago, Promoción |
| Planteles | #, Equipo, Jugador, DNI, Camiseta, Posición, Estado, Año Egreso |
| Fixture | Jornada, Fase, Fecha/Hora, Local, Goles L, Goles V, Visitante, Estado |
| Posiciones | Pos, Equipo, PJ, PG, PE, PP, GF, GC, DG, PTS |
| Fair Play | #, Equipo, Amarillas, Rojas, Doble Amarilla, Pts Disciplina |

**Dependencia necesaria:** `openpyxl==3.1.2` (ya incluida en `requirements.txt`)

**Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

## 8. Nuevos Endpoints - Módulo B (Cuenta Corriente)

### Obtener Estado Financiero
**Endpoint:** `GET /cancha/torneos/equipos/{equipo_id}/cuenta_corriente`
Devuelve el total adeudado, los límites configurados, si el equipo está bloqueado y el historial de cargos/pagos (`movimientos`).

### Registrar Cargo Manual (Deuda)
**Endpoint:** `POST /cancha/torneos/equipos/{equipo_id}/cuenta_corriente/cargos`
Crea un nuevo cargo manual (ej. Multa, Inscripción).
**Payload:**
```json
{
  "torneo_id": "uuid",
  "concepto": "Multa por llegada tarde",
  "monto": 5000.0,
  "partido_id": null
}
```

### Registrar Pago Manual
**Endpoint:** `POST /cancha/torneos/equipos/{equipo_id}/cuenta_corriente/{cargo_id}/pagar`
Marca un cargo específico como "pagado" actualizando el estado de cuenta.

### Levantar Sanción por Multa
**Endpoint:** `POST /cancha/torneos/sanciones/{sancion_id}/levantar-por-multa`
Cambia el estado de una sanción deportiva (ej. suspensión por roja) a `levantada_por_pago` e inserta automáticamente el registro de cobro en cuenta corriente.
**Payload:**
```json
{
  "monto": 25000.0,
  "metodo_pago": "Efectivo"
}
```

---

## 9. Nuevos Endpoints - Módulo C (Dashboard KPIs)

### Ampliación de Dashboard Global
**Endpoint:** `GET /api/analytics/dashboard`
Se agregaron indicadores de negocio a nivel torneos a los ya existentes.
**Respuesta:**
```json
{
  "torneos_activos": 3,
  "partidos_hoy": 8,
  "equipos_pendientes_validacion": 5,
  "equipos_con_deuda": 2,
  "proximos_partidos": [
    { "hora": "18:00", "local": "Lazio", "visitante": "Milan", "cancha": "Cancha 1" }
  ]
}
```

---

## 10. Nuevos Endpoints - Módulo D (Noticias IA)

### Generador de IA (Gemini)
**Endpoint:** `POST /api/noticias/generar-ia`
Recibe el contexto de un partido y retorna una noticia redactada por IA.
**Payload:**
```json
{
  "torneo_id": "uuid",
  "contexto": "El partido terminó 3-2 en un encuentro muy reñido..."
}
```

### Crear Noticia
**Endpoint:** `POST /api/noticias`
Guarda una noticia generada (manual o por IA) en la base de datos.

### Obtener Noticias de Torneo
**Endpoint:** `GET /api/noticias/torneo/{torneo_id}`
Retorna el historial de noticias ordenadas por fecha.

---

## 11. Nuevos Endpoints - Módulo E (Jerarquía Regional)

### Gestión de Regiones y Ciudades
- **Crear Región:** `POST /cancha/torneos/eventos/{evento_id}/regiones` (Incluye flag `determinar_campeon_regional`)
- **Listar Regiones:** `GET /cancha/torneos/eventos/{evento_id}/regiones`
- **Crear Ciudad:** `POST /cancha/torneos/regiones/{region_id}/ciudades`
- **Listar Ciudades:** `GET /cancha/torneos/regiones/{region_id}/ciudades`

### Generador de Playoff Regional Interciudades
**Endpoint:** `POST /cancha/torneos/regiones/{region_id}/generar-playoff-regional`
Busca a los mejores equipos de todos los torneos finalizados en las ciudades de la región, y clona sus equipos y planteles completos (incluyendo biometría) hacia un nuevo Campeonato "Playoff Regional" de eliminación directa.
**Payload:**
```json
{
  "cupos_por_ciudad": 2
}
```

---
## 6. Instrucciones para Agente IA (Prompt de Despliegue)

Si utilizas un asistente de IA (como ChatGPT, Claude, o un agente en la terminal) para realizar el despliegue en la máquina del cliente, copia y pega el siguiente prompt. Este prompt contiene todas las instrucciones necesarias para que la IA entienda el contexto y ejecute los pasos correctos de forma segura.

### 🤖 Prompt para Copiar y Pegar a la IA:

```text
Actúa como un ingeniero DevOps experto en Docker y React. Necesito desplegar una actualización de este sistema en la máquina actual (PC del Cliente).

Contexto:
- El proyecto es un sistema con Backend (FastAPI) y Frontend (React + Vite + Nginx) orquestado con Docker Compose.
- El repositorio remoto ya tiene los últimos cambios en la rama 'playa'.
- Es crítico que el frontend se reconstruya sin caché para tomar las nuevas variables de entorno.

Tu Tarea:
1.  Verifica que estemos en la raíz del proyecto.
2.  Ejecuta 'git pull origin playa' para bajar los últimos cambios.
3.  Verifica que exista el archivo 'frontend/.env'. Si no existe, créalo con el contenido:
    VITE_REACT_APP_API_URL=/api
    VITE_GOOGLE_CLIENT_ID=584709457333-pc1r7el5ic8ap3539dqvuj5v5bqs203r.apps.googleusercontent.com
4.  Si el archivo 'frontend/.env' ya existe, asegúrate de que 'VITE_REACT_APP_API_URL' esté configurado exactamente como '/api'.
5.  Ejecuta la secuencia de reinicio limpia de Docker:
    - docker-compose down
    - docker-compose build --no-cache frontend
    - docker-compose up -d
6.  Confirma que los contenedores 'sist-playa-frontend' y 'sist-playa-backend' estén corriendo ('docker ps').

Por favor, ejecuta estos pasos secuencialmente y avísame si ocurre algún error.
```

---

## 6. Arquitectura y Puertos

El sistema utiliza Docker Compose para orquestar los servicios:

| Servicio | Nombre Contenedor | Puerto Interno | Puerto Externo (Host) | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | `micancha-backend` | 8001 | **8002** | API FastAPI + Python |
| **Frontend (Admin)** | `micancha-admin` | 80 | **3001** | Panel de Administración React |
| **Frontend (Público)** | `micancha-public` | 80 | **3000** | Landing pública de torneos React |
| **Frontend (Web)** | `micancha-web` | 80 | **3002** | Web general React |

*   **Red Docker:** `sist-playa-network` (Bridge)
*   **Proxy Inverso:** El contenedor Frontend usa Nginx para redirigir peticiones que empiezan con `/api` hacia el contenedor Backend (`http://backend:8001`).

---

## 7. Solución de Problemas (Troubleshooting)

### Error: "Network Error" o "Connection Refused" en el navegador
*   **Causa:** El frontend está intentando conectar a una URL incorrecta o el backend está caído.
*   **Solución:**
    1. Verifica que `frontend/.env` tenga `VITE_REACT_APP_API_URL=/api`.
    2. Si cambiaste el `.env`, ejecuta `docker-compose build --no-cache frontend` y reinicia.
    3. Limpia la caché del navegador (`Ctrl + Shift + R`).

### Error: Backend no conecta a la Base de Datos
*   **Causa:** Credenciales incorrectas o `localhost` no apunta a donde crees dentro de Docker.
*   **Solución:**
    1. Si la BD está en Windows, usa `host.docker.internal` en lugar de `localhost` en `DATABASE_URL`.
    2. Verifica que el servicio de PostgreSQL esté corriendo en el host.
    3. Revisa logs: `docker-compose logs backend`.

### Error: Cambios de código no se ven reflejados
*   **Causa:** Docker está usando una imagen en caché.
*   **Solución:** Siempre usa `docker-compose build --no-cache` cuando actualices código del frontend.
