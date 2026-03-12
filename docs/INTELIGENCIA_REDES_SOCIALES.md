# Alimentar Inteligencia Territorial desde redes sociales

El módulo **Inteligencia Territorial** ya está preparado para recibir datos de múltiples fuentes. Los insights se guardan en `electoral.territorial_insights` y el frontend los muestra automáticamente. Solo falta **quién** recolecta los posts y **quién** llama al backend.

---

## Cómo funciona hoy

1. **Backend** (`/api/inteligencia/analizar`):
   - Recibe: `texto`, `departamento_id`, `distrito_id`, `zona` (opcional), `fuente` (ej. `"twitter"`, `"facebook"`, `"manual"`).
   - Con ese texto llama a **OpenAI** (categoría, sentimiento, urgencia, temas clave, resumen).
   - Guarda el resultado en la BD como un insight.
2. **Frontend** (`InteligenciaTerritorial.jsx`):
   - Lee estadísticas e insights desde `/api/inteligencia/estadisticas` y `/api/inteligencia/insights`.
   - No necesita cambios: todo lo que entre a la BD por territorio y período ya se muestra en el dashboard, análisis de sentimientos y guiones.

Por tanto, **alimentar desde redes** = hacer que algo (N8N, un cron, otro servicio) **recolecte posts** y **llame a** `POST /api/inteligencia/analizar` (o al endpoint de ingestión por API key que se describe más abajo).

---

## Opción 1: Con N8N (recomendada para integrar muchas fuentes)

**Ventaja:** Conectar Twitter/X, Facebook, Instagram, RSS, etc. con nodos visuales y enviar todo al mismo backend.

**Flujo típico:**

1. **Trigger:** Cron (cada X horas) o webhook si la red lo permite.
2. **Nodos de redes:** Por ejemplo:
   - **Twitter:** nodo “Twitter” (API v2) con búsqueda por hashtags o palabras (ej. nombre del distrito, “Asunción”, “bache”, “corte luz”).
   - **RSS:** para medios locales o páginas que publiquen quejas/noticias.
   - **Facebook/Instagram:** según conectores disponibles en N8N.
3. **Procesar cada item:** Extraer el texto del post (y si hay, ubicación).
4. **Asignar territorio:**  
   - Si el post trae geolocalización → mapear a `departamento_id` y `distrito_id` (por ejemplo con una tabla o API interna).  
   - Si no → usar un departamento/distrito por defecto o por keywords (ej. “Asunción” → id de Central/Asunción).
5. **Llamar al backend:**  
   - **Recomendado:** endpoint de ingestión por API key (no expira como el JWT):  
     - URL: `POST https://tu-dominio-sigel.com/api/inteligencia/ingest`  
     - Headers: `X-API-Key: <tu_clave>`, `Content-Type: application/json`  
     - Body (JSON):
       ```json
       {
         "texto": "Texto del post de red social...",
         "departamento_id": 1,
         "distrito_id": 5,
         "zona": "Centro",
         "fuente": "twitter"
       }
       ```
   - **Alternativa:** `POST /api/inteligencia/analizar` con `Authorization: Bearer <JWT>` (mismo body). El JWT es de un usuario de SIGEL; hay que renovarlo cuando expire.

**Análisis de sentimientos:** No hace falta hacerlo en N8N. El backend ya hace el análisis con OpenAI al recibir el texto en `/api/inteligencia/analizar`.

**Resumen:** N8N se encarga de **recolectar** y **enviar**; SIGEL de **analizar** y **guardar**. El frontend no se toca.

---

## Opción 2: Sin N8N (cron o servicio en el backend)

Si preferís no usar N8N:

- **Script/cron en el servidor:** Un job (Python con `requests` o `httpx`) que:
  1. Use las APIs de Twitter/Facebook/RSS (con sus tokens).
  2. Para cada post obtenido, asigne departamento/distrito (por geolocalización o reglas).
  3. Llame a `POST /api/inteligencia/analizar` con el texto y territorio (usando un token de servicio o API key).
- **Herramientas tipo Zapier/Make:** Igual idea: trigger “nuevo tweet/post” → acción “HTTP POST” a la URL de SIGEL con el mismo JSON.

En todos los casos el backend ya hace el análisis de sentimientos y el guardado; el frontend sigue igual.

---

## Autenticación: usuario vs API key

- **Usuario (JWT):** Podés usar `POST /api/inteligencia/analizar` con `Authorization: Bearer <JWT>`. Creá un usuario “bot” o “social-listening”, hacé login, copiá el JWT y usalo en N8N (renovándolo cuando expire).
- **API key (recomendado para N8N/servicios):** El backend ya expone **`POST /api/inteligencia/ingest`**, que acepta:
  - **Header** `X-API-Key`: si coincide con la variable de entorno del backend, se considera autenticado.
  - Mismo body que `/analizar`; hace el análisis con IA y guarda el insight.
  - Opcionalmente, el insight se asocia a un usuario de sistema mediante `INTELIGENCIA_INGEST_USER_ID`.

**Variables de entorno en el backend (.env):**

| Variable | Descripción |
|----------|-------------|
| `INTELIGENCIA_INGEST_API_KEY` | Clave secreta para el header `X-API-Key` (ej. una contraseña larga aleatoria). |
| `INTELIGENCIA_INGEST_USER_ID` | (Opcional) ID del usuario en `sistema.usuarios` que figurará como `creado_por`. Por defecto `1`. |

Ejemplo en N8N: en el nodo HTTP Request, header `X-API-Key` = valor de `INTELIGENCIA_INGEST_API_KEY`. No hace falta login ni JWT.

---

## Qué falta definir en tu caso

1. **Fuentes:** Qué redes querés (Twitter/X, Facebook, RSS, etc.) y con qué criterios (hashtags, palabras, geolocalización).
2. **Territorio:** Cómo mapear cada post a `departamento_id` y `distrito_id` (geolocalización, palabras clave, o valor por defecto).
3. **Autenticación:** Usar JWT de usuario de servicio o agregar endpoint con API key para ingestión.

Con eso se puede armar el flujo en N8N o el cron y el frontend de Inteligencia Territorial se alimentará solo con los nuevos insights.
