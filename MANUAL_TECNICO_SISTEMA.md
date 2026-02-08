# 📘 Guía Técnica: Instalación, Despliegue y Mantenimiento
# Sistema de Gestión - Playa de Vehículos

Este documento unifica las instrucciones técnicas para instalar, desplegar actualizaciones y mantener el sistema, tanto en entornos locales (PC Cliente) como en servidores.

---

## 📋 Índice

1.  [Requisitos Previos](#1-requisitos-previos)
2.  [Instalación Inicial (PC Cliente o Servidor)](#2-instalación-inicial-pc-cliente-o-servidor)
3.  [Configuración del Entorno (.env)](#3-configuración-del-entorno-env)
4.  [Despliegue de Actualizaciones (Mantenimiento)](#4-despliegue-de-actualizaciones-mantenimiento)
5.  [Instrucciones para Agente IA (Prompt de Despliegue)](#5-instrucciones-para-agente-ia-prompt-de-despliegue)
6.  [Arquitectura y Puertos](#6-arquitectura-y-puertos)
7.  [Solución de Problemas (Troubleshooting)](#7-solución-de-problemas-troubleshooting)

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

## 5. Instrucciones para Agente IA (Prompt de Despliegue)

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
| **Backend** | `sist-playa-backend` | 8001 | **8002** | API FastAPI + Python |
| **Frontend** | `sist-playa-frontend` | 80 | **3002** | Nginx + React App |

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
