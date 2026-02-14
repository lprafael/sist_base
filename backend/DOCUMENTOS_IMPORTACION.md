# Documentos de Importación (Playa de Vehículos)

Funcionalidad para registrar y vincular documentos aduaneros de importación de vehículos: **Documento de Despacho** y **Certificados de Nacionalización**, asociándolos a los vehículos en inventario por número de chasis.

---

## 1. Descripción general

Cada registro de importación se identifica por un **número de despacho** y almacena dos PDFs:

- **Documento de Despacho**: fecha, número de despacho, números de chasis despachados, cantidad de vehículos, monto pagado, etc.
- **Certificados de Nacionalización**: certificado(s) de nacionalización de los vehículos.

Los vehículos en `playa.productos` se vinculan mediante:

- **nro_despacho**: referencia al documento de importación (tabla `documentos_importacion`).
- **nro_cert_nac**: número del certificado de nacionalización del vehículo.

---

## 2. Base de datos

### Tabla `playa.documentos_importacion`

| Columna             | Tipo           | Descripción                          |
|---------------------|----------------|--------------------------------------|
| `nro_despacho`      | VARCHAR(100)   | **PK**. Número de despacho.          |
| `fecha_despacho`    | DATE           | Fecha del despacho.                  |
| `cantidad_vehiculos`| INTEGER        | Cantidad de vehículos.               |
| `monto_pagado`      | DECIMAL(15,2)  | Monto pagado.                        |
| `pdf_despacho`      | BYTEA          | PDF del documento de despacho.      |
| `pdf_certificados`   | BYTEA          | PDF de certificados de nacionalización. |
| `observaciones`     | TEXT           | Observaciones.                       |
| `fecha_registro`    | TIMESTAMP      | Alta del registro.                   |

### Campos en `playa.productos`

| Columna       | Tipo         | Descripción                                      |
|---------------|--------------|--------------------------------------------------|
| `nro_despacho`| VARCHAR(100) | FK a `documentos_importacion(nro_despacho)`.     |
| `nro_cert_nac`| VARCHAR(100) | Número del certificado de nacionalización.       |

La tabla y los campos se crean en **initBD.sql** (carga desde cero). No hay migración independiente.

---

## 3. Flujo en la aplicación

1. **Menú**: Playa de Vehículos → **Documentos Importación**.
2. **Cargar documentos**: botón que abre un modal con dos zonas de arrastrar/soltar:
   - Documento de Despacho (PDF).
   - Certificados de Nacionalización (PDF).
3. **Analizar**: el sistema extrae texto de ambos PDFs (PyMuPDF y, si aplica, EasyOCR), obtiene:
   - Número de despacho.
   - Lista de números de chasis del despacho.
   - Mapeo chasis → número de certificado (del PDF de certificados).
4. **Validación**: si el número de despacho ya existe en `documentos_importacion`, se informa y no se permite guardar.
5. **Vincular**: si el despacho es nuevo, se muestra un listado de vehículos que:
   - Están en el despacho (por chasis), y
   - Existen en `playa.productos`.
   Para cada uno se puede marcar **Vincular** y opcionalmente indicar/editar el **Nº Cert. Nacionalización**.
6. **Guardar**: se crea el registro en `documentos_importacion` (con los dos PDFs) y se actualizan los productos marcados (`nro_despacho` y `nro_cert_nac`).

---

## 4. API (backend)

Base: `/playa` (prefijo del router).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/documentos-importacion` | Lista todos los documentos de importación. |
| GET    | `/documentos-importacion/{nro_despacho}` | Obtiene un documento por número de despacho. |
| POST   | `/documentos-importacion/analizar` | Analiza dos PDFs (multipart: `file_despacho`, `file_certificados`). Devuelve número de despacho, chasis, certificados y si el despacho ya existe. |
| POST   | `/documentos-importacion` | Crea el documento y vincula productos (multipart: archivos + `nro_despacho` + `vinculaciones` JSON). |

Respuesta típica de **analizar**:

- `nro_despacho`: string o null.
- `chasis_despacho`: lista de chasis extraídos del documento de despacho.
- `certificados_por_chasis`: objeto `{ "CHASIS": "nro_cert" }`.
- `ya_existe`: boolean.
- `vehiculos_en_playa`: lista de productos que coinciden por chasis (id_producto, chasis, marca, modelo, nro_cert_nac).

---

## 5. Extracción de texto y OCR

### PyMuPDF (por defecto)

Se usa para extraer texto de los PDFs. Si el PDF es digital, suele ser suficiente.

### EasyOCR (PDFs escaneados)

Si el texto extraído por PyMuPDF es muy escaso (p. ej. PDF solo con imágenes), se usa **EasyOCR** sobre cada página convertida a imagen:

- Idiomas: español e inglés.
- El reader se instancia una vez y se reutiliza.
- Dependencias: `easyocr`, `numpy`.

No requiere configuración; se activa automáticamente cuando el texto es insuficiente.

### Patrones de extracción (regex)

Sin LLM, se usan expresiones regulares para:

- **Número de despacho**: p. ej. `DESPACHO NUMERO: 26003IC04000802H`, `NRO DE PEDIDO`, etc.
- **Chasis**: `NRO CHASIS = NCP100-0058263`, `NRO CHASIS = XZU414-1011371`, etc.
- **Certificados**: bloques con `INFORMACION ADICIONAL`, `NRO CHASIS = ...` y número de certificado.

---

## 6. Extracción opcional con LLM (IA)

Si se configuran las variables de entorno, el análisis puede usar un modelo de lenguaje para extraer los datos de forma estructurada (más flexible que solo regex).

### OpenAI

En `.env`:

```env
OPENAI_API_KEY=sk-...
DOCUMENTOS_LLM_MODEL=gpt-4o-mini
```

### Ollama (local)

En `.env`:

```env
DOCUMENTOS_LLM_URL=http://localhost:11434
DOCUMENTOS_LLM_MODEL=llama3.2
```

El LLM recibe el texto de ambos PDFs y debe devolver un JSON con:

- `nro_despacho`
- `chasis_despacho` (lista)
- `certificados_por_chasis` (objeto)

Si la llamada al LLM tiene éxito, se usa ese resultado; si no está configurado o falla, se usa la extracción por regex.

---

## 7. Dependencias (Python)

En `requirements.txt`:

- `pymupdf`: lectura de PDF y extracción de texto.
- `easyocr`, `numpy`: OCR para PDFs escaneados.
- `openai`: solo si se usa extracción con OpenAI (opcional si solo se usa Ollama).

Instalación:

```bash
pip install pymupdf easyocr numpy openai
```

---

## 8. Límite de tamaño de subida (413)

Para PDFs grandes, el servidor o el proxy (p. ej. nginx) puede devolver **413 Request Entity Too Large**.

- **Nginx**: en el `location /api/` se recomienda:
  - `client_max_body_size 100M;`
  - `proxy_request_buffering off;`
- En el frontend, las peticiones de analizar y guardar usan `maxContentLength` / `maxBodyLength` de 100 MB y se muestra un mensaje orientativo si la respuesta es 413.

---

## 9. Archivos implicados

| Ubicación | Archivo | Rol |
|-----------|---------|-----|
| Backend   | `initBD.sql` | Tabla `documentos_importacion` y columnas en `productos`. |
| Backend   | `models_playa.py` | Modelo `DocumentoImportacion` y campos en `Producto`. |
| Backend   | `schemas_playa.py` | Schemas de respuesta y analizar. |
| Backend   | `routers_playa.py` | Rutas, extracción de texto, OCR (EasyOCR), LLM opcional y regex. |
| Frontend  | `DocumentosImportacion.jsx` / `.css` | Pantalla, modal de carga, analizar y vincular. |
| Frontend  | `App.jsx` | Ítem de menú y ruta. |
| Frontend  | `nginx.conf` | `client_max_body_size` para `/api/`. |

---

## 10. Resumen

- Un **documento de importación** se identifica por **número de despacho** y guarda los PDFs de despacho y certificados.
- Los **productos** se vinculan con **nro_despacho** y **nro_cert_nac**.
- La extracción de datos usa **PyMuPDF** (y **EasyOCR** si el PDF es escaneado) y, opcionalmente, un **LLM** (OpenAI u Ollama) para mayor flexibilidad.
- Toda la definición de BD está en **initBD.sql** para entornos que se cargan desde cero.
