# Pasos para implementar en N8N (SIGEL Inteligencia Territorial)

## 1. Configurar el backend de SIGEL

En el `.env` del backend (o variables de entorno del servidor) agregá:

```env
INTELIGENCIA_INGEST_API_KEY=tu_clave_secreta_larga_y_aleatoria
INTELIGENCIA_INGEST_USER_ID=1
```

- **INTELIGENCIA_INGEST_API_KEY:** Generá una clave segura (por ejemplo con `openssl rand -hex 32` o un generador de contraseñas). Esta misma clave la vas a poner en N8N.
- **INTELIGENCIA_INGEST_USER_ID:** (Opcional) ID del usuario en `sistema.usuarios` que figurará como creador del insight. Por defecto se usa `1`.

Reiniciá el backend después de cambiar el `.env`.

---

## 2. Importar el workflow en N8N

1. Abrí N8N (self-hosted o n8n Cloud).
2. **Opción A – Desde archivo:** En el menú de workflows → **Import from File** → seleccioná el archivo `docs/sigel-inteligencia-ingest.json` del repo.
3. **Opción B – Copiar y pegar:** Creá un workflow nuevo → menú (tres puntos) → **Import from Clipboard** (o **Import** / **Import from File** según tu versión). Abrí el archivo `docs/sigel-inteligencia-ingest.json`, copiá todo su contenido y pegalo en el cuadro de importación.
4. Guardá el workflow (por ejemplo con el nombre "SIGEL - Ingestión Inteligencia Territorial").

---

## 3. Configurar el nodo "Enviar a SIGEL"

En el workflow importado, abrí el nodo **"Enviar a SIGEL"** (HTTP Request):

1. **URL:**  
   - Reemplazá la URL de ejemplo por la base de tu API de SIGEL, por ejemplo:  
     `https://tu-dominio.com/api/inteligencia/ingest`  
   - Si probás en local: `http://localhost:8000/api/inteligencia/ingest` (o el puerto que use tu backend).

2. **Header X-API-Key:**  
   - En "Send Headers" / "Header Parameters", el parámetro **X-API-Key** debe tener exactamente el mismo valor que configuraste en el backend en `INTELIGENCIA_INGEST_API_KEY`.  
   - Podés guardar la clave como **Credential** en N8N (tipo "Header Auth" o variable) y referenciarla desde el nodo para no dejar la clave en texto plano en el workflow.

3. **Body:**  
   - El workflow ya manda un body en JSON con: `texto`, `departamento_id`, `distrito_id`, `zona`, `fuente`.  
   - En la versión de prueba, el nodo **"Preparar item"** (Set) genera un item de ejemplo. No hace falta cambiar nada ahí para la primera prueba.

Guardá el workflow después de editar.

---

## 4. Probar con el item de ejemplo

1. Dejá el **Manual Trigger** como primer nodo (o ejecutá desde el nodo "Preparar item" si tu N8N lo permite).
2. Hacé clic en **Execute Workflow** (o "Test workflow").
3. Revisá que el nodo **"Enviar a SIGEL"** termine en verde (status 200).
4. En SIGEL, entrá al módulo **Inteligencia Territorial**, elegí el departamento y distrito que usaste en el item (en el ejemplo: `departamento_id: 1`, `distrito_id: 1`) y verificá que aparezca el insight recién creado.

Si algo falla:

- **401:** La `X-API-Key` no coincide con `INTELIGENCIA_INGEST_API_KEY` en el backend, o el header no se está enviando.
- **404 / Connection refused:** La URL del backend es incorrecta o el servicio no está levantado.
- **502:** Error interno del backend (por ejemplo OpenAI); revisá logs del backend.

---

## 5. Conectar una fuente real (Twitter, RSS, etc.)

Cuando la prueba con el item fijo funcione:

1. **Agregar el nodo de la fuente** (por ejemplo Twitter o RSS Feed) **antes** del nodo "Preparar item".
2. **Configurar la fuente:**  
   - Twitter: búsqueda por hashtags o palabras; necesitás credenciales de Twitter/X API.  
   - RSS: URL del feed (medios locales, etc.).
3. **Ajustar "Preparar item":**  
   - En lugar de valores fijos, usá **expresiones** que tomen los datos del nodo anterior, por ejemplo:  
     - `texto` → `{{ $json.text }}` (o el campo donde venga el contenido del post/tweet).  
     - `departamento_id` / `distrito_id` → por ahora podés dejarlos fijos (ej. 1 y 1) o mapear por palabras clave/geolocalización en un nodo intermedio.  
     - `fuente` → `"twitter"` o `"rss"` según corresponda.  
     - `zona` → opcional; podés dejarlo vacío o derivarlo de algún campo.
4. **Trigger:**  
   - Para que corra solo: reemplazá el Manual Trigger por un **Schedule Trigger** (por ejemplo cada 6 horas) y conectalo al nodo de la fuente (Twitter/RSS).  
   - El flujo queda: **Schedule** → **Twitter/RSS** → **Preparar item** → **Enviar a SIGEL**.
5. Activá el workflow (toggle **Active** en N8N) para que se ejecute según el cron.

---

## 6. Resumen del flujo

```
[Manual Trigger o Schedule] → [Opcional: Twitter / RSS / etc.] → Preparar item (Set) → Enviar a SIGEL (HTTP Request)
```

- **Preparar item:** Arma un objeto con `texto`, `departamento_id`, `distrito_id`, `zona`, `fuente` (ya sea con datos de ejemplo o con expresiones desde la fuente).
- **Enviar a SIGEL:** `POST` a `/api/inteligencia/ingest` con header `X-API-Key` y body JSON. El backend hace el análisis de sentimientos con IA y guarda el insight; el frontend de Inteligencia Territorial lo muestra solo.

Si querés, en el siguiente paso podemos definir juntos el mapeo de Twitter/RSS a departamento/distrito (por ejemplo por palabras clave o geolocalización).
