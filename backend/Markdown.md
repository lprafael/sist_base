# 🔄 Guía Definitiva de Migración: SQL Server → PostgreSQL
## Tabla `dbo.Cliente` → `clientes` + `garantes`

---

## 📋 Respuestas a Preguntas Clave

1. ✅ **Tipo de documento**: Puede ser CI, RUC o Pasaporte
2. ✅ **Formato nombre**: `clinombre` trae "Nombre Apellido" junto
3. ✅ **Calificación**: `clicalif` representa grado de morosidad (numérico)
4. ✅ **Campos laborales**: Ya agregados en PostgreSQL (`antiguedad_laboral`, `direccion_laboral`)

---

## 🗺️ MAPEO COMPLETO DE CAMPOS

### TABLA: `clientes`

#### Identificación y Datos Personales

| SQL Server | PostgreSQL | Transformación SQL |
|------------|------------|-------------------|
| `cliruc` (PK) | `numero_documento` | `NULLIF(TRIM(cliruc), '')` |
| - | `tipo_documento` | **Detectar automáticamente** (ver función más abajo) |
| - | `id_cliente` | `SERIAL` (autogenerado) |
| `clinombre` | `nombre` + `apellido` | **Separar** por último espacio (ver función) |
| `clifenac` | `fecha_nacimiento` | `clifenac::DATE` |
| `clidirecc` | `direccion` | `NULLIF(TRIM(clidirecc), '')` |
| `clitelef` | `telefono` | `NULLIF(TRIM(clitelef), '')` |
| - | `celular` | `NULL` (no existe en SQL Server) |
| `cliemail` | `email` | `NULLIF(LOWER(TRIM(cliemail)), '')` |
| - | `ciudad` | `NULL` (no existe en SQL Server) |
| - | `departamento` | `NULL` (no existe en SQL Server) |
| - | `codigo_postal` | `NULL` (no existe en SQL Server) |
| `cliasaco` | `estado_civil` | **Mapear** (ver tabla de equivalencias) |
| - | `profesion` | `NULL` (no existe en SQL Server) |

#### Datos Laborales

| SQL Server | PostgreSQL | Transformación SQL |
|------------|------------|-------------------|
| `clilulab` | `lugar_trabajo` | `NULLIF(TRIM(clilulab), '')` |
| `clitellab` | `telefono_trabajo` | `NULLIF(TRIM(clitellab), '')` |
| `cliantlab` | `antiguedad_laboral` | `NULLIF(TRIM(cliantlab), '')` |
| `clidirlab` | `direccion_laboral` | `NULLIF(TRIM(clidirlab), '')` |
| - | `ingreso_mensual` | `NULL` (no existe en SQL Server) |

#### Calificación y Mora

| SQL Server | PostgreSQL | Transformación SQL |
|------------|------------|-------------------|
| `clicalif` | `calificacion_actual` | **Mapear** a texto (ver función) |
| `climora` | *(agregar campo)* | `climora::DECIMAL(15,2)` |
| `clifecal` | *(agregar campo)* | `clifecal::DATE` |

#### Observaciones y Control

| SQL Server | PostgreSQL | Transformación SQL |
|------------|------------|-------------------|
| `cliobs` | `observaciones` | `NULLIF(TRIM(cliobs), '')` |
| `cliusuf` | `fecha_registro` | `COALESCE(cliusuf, CURRENT_TIMESTAMP)` |
| - | `activo` | `TRUE` (por defecto) |

#### Campos de Auditoría (Concatenar en observaciones o tabla aparte)

| SQL Server | Destino | Notas |
|------------|---------|-------|
| `cliusui`, `cliusuf`, `cliush` | Tabla `auditoria` o concatenar | Usuario/Fecha/Hora inserción |
| `cliusum`, `cliusfm`, `cliushm` | Tabla `auditoria` o concatenar | Usuario/Fecha/Hora modificación |

#### Campos Contadores (NO MIGRAR a tabla clientes)

| SQL Server | Acción |
|------------|--------|
| `ultnref`, `ultnrla`, `ultrefg`, `ultrelg`, `ultnroi` | ❌ **No migrar** (son contadores de procesos) |
| `clifechaa` | ❌ **No migrar** (propósito desconocido) |

---

### TABLA: `garantes`

Se crean **hasta 3 filas** por cliente (una por cada garante que tenga datos).

#### Garante #0 (sin sufijo)

| SQL Server | PostgreSQL | Transformación SQL |
|------------|------------|-------------------|
| `cigarante` | `numero_documento` | `NULLIF(TRIM(cigarante), '')` |
| - | `tipo_documento` | **Detectar automáticamente** |
| `clinomga` | `nombre` + `apellido` | **Separar** por último espacio |
| `cligfecn` | `fecha_nacimiento` | `cligfecn::DATE` |
| `cligadirec` | `direccion` | `NULLIF(TRIM(cligadirec), '')` |
| `cligatel` | `telefono` | `NULLIF(TRIM(cligatel), '')` |
| - | `celular` | `NULL` |
| - | `email` | `NULL` |
| `cligaasc` | `estado_civil` | **Mapear** |
| `cligallab` | `lugar_trabajo` | `NULLIF(TRIM(cligallab), '')` |
| `cligart` | `telefono_trabajo` | `NULLIF(TRIM(cligart), '')` |
| `cligaant` | `antiguedad_laboral` | `NULLIF(TRIM(cligaant), '')` |
| `cligadlab` | `direccion_laboral` | `NULLIF(TRIM(cligadlab), '')` |
| - | `relacion_cliente` | `'GARANTE'` (fijo) |
| - | `observaciones` | `NULL` |
| - | `activo` | `TRUE` |

#### Garante #1 (sufijo `1`)

Mismos campos con sufijo `1`:
- `cigarante1`, `clinomga1`, `cligfecn1`, `cligadirec1`, `cligatel1`, `cligaasc1` (si existe)
- `cligallab1`, `cligaant1`, `cligadlab1`, `cligart1`

#### Garante #2 (sufijo `2`)

⚠️ **ATENCIÓN**: En tu script hay inconsistencias de nombres:
- `cigarante2`, `clinomga2`, `cligadirec2`, `cligatel2`, `cligaasc2`
- `cligallab2`, `digaant2` (debería ser `cligaant2`), `cligadlab2`, `digart2` (debería ser `cligart2`)
- `digfecn2` (debería ser `cligfecn2`)

**Solución**: Usar los nombres reales de tu base SQL Server (aunque sean inconsistentes).

---

## 🛠️ FUNCIONES AUXILIARES PARA MIGRACIÓN

### 1. Función: Detectar tipo de documento

```sql
CREATE OR REPLACE FUNCTION detectar_tipo_documento(doc TEXT)
RETURNS VARCHAR(20) AS $$
BEGIN
    doc := TRIM(doc);
    
    -- Si está vacío
    IF doc IS NULL OR doc = '' THEN
        RETURN NULL;
    END IF;
    
    -- Si tiene solo dígitos
    IF doc ~ '^[0-9]+$' THEN
        -- CI: 6-8 dígitos
        IF LENGTH(doc) BETWEEN 6 AND 8 THEN
            RETURN 'CI';
        -- RUC: 9-11 dígitos (Paraguay usa 8-9 típicamente)
        ELSIF LENGTH(doc) BETWEEN 8 AND 11 THEN
            RETURN 'RUC';
        END IF;
    END IF;
    
    -- Si tiene letras y números (pasaporte)
    IF doc ~ '[A-Za-z]' THEN
        RETURN 'PASAPORTE';
    END IF;
    
    -- Por defecto, asumir RUC
    RETURN 'RUC';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 2. Función: Separar nombre y apellido

```sql
CREATE OR REPLACE FUNCTION separar_nombre_apellido(nombre_completo TEXT, parte VARCHAR(10))
RETURNS TEXT AS $$
DECLARE
    ultimo_espacio INT;
    nombre_parte TEXT;
    apellido_parte TEXT;
BEGIN
    nombre_completo := TRIM(nombre_completo);
    
    -- Si está vacío
    IF nombre_completo IS NULL OR nombre_completo = '' THEN
        RETURN NULL;
    END IF;
    
    -- Buscar último espacio
    ultimo_espacio := LENGTH(nombre_completo) - LENGTH(REPLACE(nombre_completo, ' ', '')) + 1;
    
    -- Si no hay espacios, todo es nombre
    IF POSITION(' ' IN nombre_completo) = 0 THEN
        IF parte = 'nombre' THEN
            RETURN nombre_completo;
        ELSE
            RETURN NULL;
        END IF;
    END IF;
    
    -- Separar por último espacio
    -- Ejemplo: "Juan Carlos Pérez" → nombre="Juan Carlos", apellido="Pérez"
    nombre_parte := TRIM(SUBSTRING(nombre_completo FROM 1 FOR LENGTH(nombre_completo) - LENGTH(SPLIT_PART(nombre_completo, ' ', ARRAY_LENGTH(STRING_TO_ARRAY(nombre_completo, ' '), 1))) - 1));
    apellido_parte := TRIM(SPLIT_PART(nombre_completo, ' ', ARRAY_LENGTH(STRING_TO_ARRAY(nombre_completo, ' '), 1)));
    
    IF parte = 'nombre' THEN
        RETURN nombre_parte;
    ELSE
        RETURN apellido_parte;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Versión simplificada (más confiable):**

```sql
CREATE OR REPLACE FUNCTION separar_nombre(nombre_completo TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Retorna todo excepto la última palabra
    RETURN TRIM(REGEXP_REPLACE(nombre_completo, '\s+\S+$', ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION separar_apellido(nombre_completo TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Retorna solo la última palabra
    RETURN TRIM(REGEXP_REPLACE(nombre_completo, '^.*\s+', ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 3. Función: Mapear estado civil

```sql
CREATE OR REPLACE FUNCTION mapear_estado_civil(codigo CHAR(1))
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN CASE TRIM(codigo)
        WHEN 'S' THEN 'SOLTERO'
        WHEN 'C' THEN 'CASADO'
        WHEN 'D' THEN 'DIVORCIADO'
        WHEN 'V' THEN 'VIUDO'
        WHEN 'U' THEN 'UNION LIBRE'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 4. Función: Mapear calificación (morosidad)

```sql
CREATE OR REPLACE FUNCTION mapear_calificacion(calificacion_numerica SMALLINT)
RETURNS VARCHAR(20) AS $$
BEGIN
    -- Ajustar según tu escala real
    RETURN CASE
        WHEN calificacion_numerica = 0 THEN 'NUEVO'
        WHEN calificacion_numerica = 1 THEN 'EXCELENTE'
        WHEN calificacion_numerica = 2 THEN 'BUENO'
        WHEN calificacion_numerica = 3 THEN 'REGULAR'
        WHEN calificacion_numerica >= 4 THEN 'MALO'
        ELSE 'SIN CALIFICAR'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 📦 PASO 1: CREAR TABLA STAGING

```sql
-- Crear esquema temporal para migración
CREATE SCHEMA IF NOT EXISTS migracion;

-- Tabla staging (espejo de SQL Server)
CREATE TABLE migracion.staging_cliente (
    cliruc VARCHAR(20),
    clinombre VARCHAR(80),
    clidirecc VARCHAR(100),
    cliemail VARCHAR(100),
    clitelef VARCHAR(20),
    cliobs TEXT,
    cliasaco CHAR(1),
    clilulab VARCHAR(100),
    cliantlab VARCHAR(20),
    clidirlab VARCHAR(100),
    clitellab VARCHAR(20),
    
    -- Garante 0
    cigarante VARCHAR(20),
    clinomga VARCHAR(80),
    cligadirec VARCHAR(100),
    cligatel VARCHAR(20),
    cligaasc CHAR(1),
    cligallab VARCHAR(100),
    cligaant VARCHAR(20),
    cligadlab VARCHAR(100),
    cligart VARCHAR(20),
    cligfecn DATE,
    
    -- Garante 1
    cigarante1 VARCHAR(20),
    clinomga1 VARCHAR(80),
    cligadirec1 VARCHAR(100),
    cligatel1 VARCHAR(20),
    cligaas1 CHAR(1),
    cligallab1 VARCHAR(100),
    cligaant1 VARCHAR(20),
    cligadlab1 VARCHAR(100),
    cligart1 VARCHAR(20),
    cligfecn1 DATE,
    
    -- Garante 2
    cigarante2 VARCHAR(20),
    clinomga2 VARCHAR(80),
    cligadirec2 VARCHAR(100),
    cligatel2 VARCHAR(20),
    cligaasc2 CHAR(1),
    cligallab2 VARCHAR(100),
    digaant2 VARCHAR(20),
    cligadlab2 VARCHAR(100),
    digart2 VARCHAR(20),
    digfecn2 DATE,
    
    -- Calificación y mora
    clicalif SMALLINT,
    clifecal DATE,
    climora DECIMAL(10,0),
    
    -- Fechas
    clifenac DATE,
    clifechaa DATE,
    
    -- Auditoría
    cliusui VARCHAR(10),
    cliusuf TIMESTAMP,
    cliush VARCHAR(10),
    cliusum VARCHAR(10),
    cliusfm TIMESTAMP,
    cliushm VARCHAR(10),
    
    -- Contadores (no se migrarán)
    ultnref INT,
    ultnrla INT,
    ultrefg INT,
    ultrelg INT,
    ultnroi INT
);
```

---

## 📥 PASO 2: IMPORTAR DATOS A STAGING

### Opción A: Desde CSV

```bash
# Exportar desde SQL Server a CSV
bcp "SELECT * FROM Automotores.dbo.Cliente" queryout cliente_export.csv -c -t"," -S servidor -U usuario -P password

# Importar a PostgreSQL
psql -U usuario -d tu_base -c "\COPY migracion.staging_cliente FROM 'cliente_export.csv' WITH CSV HEADER DELIMITER ',';"
```

### Opción B: Con herramienta ETL (DBeaver, pgAdmin, etc.)

1. Conectar a ambas bases
2. Exportar `dbo.Cliente` a CSV
3. Importar CSV a `migracion.staging_cliente`

---

## 🔄 PASO 3: MIGRAR A TABLA `clientes`

### 3.1. Agregar campos faltantes a `clientes`

```sql
-- Si no los tenés ya
ALTER TABLE playa.clientes ADD COLUMN IF NOT EXISTS mora_acumulada DECIMAL(15,2) DEFAULT 0;
ALTER TABLE playa.clientes ADD COLUMN IF NOT EXISTS fecha_calificacion DATE;
```

### 3.2. Crear tabla de mapeo

```sql
CREATE TABLE migracion.cliente_map (
    cliruc_original VARCHAR(20) PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES playa.clientes(id_cliente)
);
```

### 3.3. Insertar clientes

```sql
WITH ins AS (
    INSERT INTO playa.clientes (
        tipo_documento,
        numero_documento,
        nombre,
        apellido,
        fecha_nacimiento,
        telefono,
        celular,
        email,
        direccion,
        ciudad,
        departamento,
        codigo_postal,
        estado_civil,
        profesion,
        lugar_trabajo,
        telefono_trabajo,
        antiguedad_laboral,
        direccion_laboral,
        ingreso_mensual,
        calificacion_actual,
        mora_acumulada,
        fecha_calificacion,
        observaciones,
        fecha_registro,
        activo
    )
    SELECT
        detectar_tipo_documento(s.cliruc),
        NULLIF(TRIM(s.cliruc), ''),
        separar_nombre(NULLIF(TRIM(s.clinombre), '')),
        separar_apellido(NULLIF(TRIM(s.clinombre), '')),
        s.clifenac,
        NULLIF(TRIM(s.clitelef), ''),
        NULL, -- celular no existe
        NULLIF(LOWER(TRIM(s.cliemail)), ''),
        NULLIF(TRIM(s.clidirecc), ''),
        NULL, -- ciudad no existe
        NULL, -- departamento no existe
        NULL, -- codigo_postal no existe
        mapear_estado_civil(s.cliasaco),
        NULL, -- profesion no existe
        NULLIF(TRIM(s.clilulab), ''),
        NULLIF(TRIM(s.clitellab), ''),
        NULLIF(TRIM(s.cliantlab), ''),
        NULLIF(TRIM(s.clidirlab), ''),
        NULL, -- ingreso_mensual no existe
        mapear_calificacion(s.clicalif),
        s.climora,
        s.clifecal,
        NULLIF(TRIM(s.cliobs), ''),
        COALESCE(s.cliusuf, CURRENT_TIMESTAMP),
        TRUE
    FROM migracion.staging_cliente s
    WHERE NULLIF(TRIM(s.cliruc), '') IS NOT NULL
    RETURNING id_cliente, numero_documento
)
INSERT INTO migracion.cliente_map (cliruc_original, id_cliente)
SELECT numero_documento, id_cliente
FROM ins;
```

---

## 👥 PASO 4: MIGRAR A TABLA `garantes`

### 4.1. Agregar campos faltantes a `garantes`

```sql
ALTER TABLE playa.garantes ADD COLUMN IF NOT EXISTS antiguedad_laboral VARCHAR(20);
ALTER TABLE playa.garantes ADD COLUMN IF NOT EXISTS direccion_laboral TEXT;
ALTER TABLE playa.garantes ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50);
```

### 4.2. Insertar Garante #0

```sql
INSERT INTO playa.garantes (
    id_cliente,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    fecha_nacimiento,
    telefono,
    celular,
    email,
    direccion,
    ciudad,
    estado_civil,
    lugar_trabajo,
    telefono_trabajo,
    antiguedad_laboral,
    direccion_laboral,
    relacion_cliente,
    observaciones,
    activo
)
SELECT
    m.id_cliente,
    detectar_tipo_documento(s.cigarante),
    NULLIF(TRIM(s.cigarante), ''),
    separar_nombre(NULLIF(TRIM(s.clinomga), '')),
    separar_apellido(NULLIF(TRIM(s.clinomga), '')),
    s.cligfecn,
    NULLIF(TRIM(s.cligatel), ''),
    NULL,
    NULL,
    NULLIF(TRIM(s.cligadirec), ''),
    NULL,
    mapear_estado_civil(s.cligaasc),
    NULLIF(TRIM(s.cligallab), ''),
    NULLIF(TRIM(s.cligart), ''),
    NULLIF(TRIM(s.cligaant), ''),
    NULLIF(TRIM(s.cligadlab), ''),
    'GARANTE',
    NULL,
    TRUE
FROM migracion.staging_cliente s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.cigarante), '') IS NOT NULL;
```

### 4.3. Insertar Garante #1

```sql
INSERT INTO playa.garantes (
    id_cliente,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    fecha_nacimiento,
    telefono,
    celular,
    email,
    direccion,
    ciudad,
    estado_civil,
    lugar_trabajo,
    telefono_trabajo,
    antiguedad_laboral,
    direccion_laboral,
    relacion_cliente,
    observaciones,
    activo
)
SELECT
    m.id_cliente,
    detectar_tipo_documento(s.cigarante1),
    NULLIF(TRIM(s.cigarante1), ''),
    separar_nombre(NULLIF(TRIM(s.clinomga1), '')),
    separar_apellido(NULLIF(TRIM(s.clinomga1), '')),
    s.cligfecn1,
    NULLIF(TRIM(s.cligatel1), ''),
    NULL,
    NULL,
    NULLIF(TRIM(s.cligadirec1), ''),
    NULL,
    mapear_estado_civil(s.cligaas1),
    NULLIF(TRIM(s.cligallab1), ''),
    NULLIF(TRIM(s.cligart1), ''),
    NULLIF(TRIM(s.cligaant1), ''),
    NULLIF(TRIM(s.cligadlab1), ''),
    'GARANTE',
    NULL,
    TRUE
FROM migracion.staging_cliente s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.cigarante1), '') IS NOT NULL;
```

### 4.4. Insertar Garante #2

```sql
INSERT INTO playa.garantes (
    id_cliente,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    fecha_nacimiento,
    telefono,
    celular,
    email,
    direccion,
    ciudad,
    estado_civil,
    lugar_trabajo,
    telefono_trabajo,
    antiguedad_laboral,
    direccion_laboral,
    relacion_cliente,
    observaciones,
    activo
)
SELECT
    m.id_cliente,
    detectar_tipo_documento(s.cigarante2),
    NULLIF(TRIM(s.cigarante2), ''),
    separar_nombre(NULLIF(TRIM(s.clinomga2), '')),
    separar_apellido(NULLIF(TRIM(s.clinomga2), '')),
    s.digfecn2,
    NULLIF(TRIM(s.cligatel2), ''),
    NULL,
    NULL,
    NULLIF(TRIM(s.cligadirec2), ''),
    NULL,
    mapear_estado_civil(s.cligaasc2),
    NULLIF(TRIM(s.cligallab2), ''),
    NULLIF(TRIM(s.digart2), ''),
    NULLIF(TRIM(s.digaant2), ''),
    NULLIF(TRIM(s.cligadlab2), ''),
    'GARANTE',
    NULL,
    TRUE
FROM migracion.staging_cliente s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.cigarante2), '') IS NOT NULL;
```

---

## ✅ PASO 5: VALIDACIONES POST-MIGRACIÓN

```sql
-- 1. Total de clientes migrados
SELECT COUNT(*) as total_clientes FROM playa.clientes;

-- 2. Total de garantes migrados
SELECT COUNT(*) as total_garantes FROM playa.garantes;

-- 3. Clientes sin garantes (normal)
SELECT COUNT(*) as clientes_sin_garantes
FROM playa.clientes c
LEFT JOIN playa.garantes g ON g.id_cliente = c.id_cliente
WHERE g.id_garante IS NULL;

-- 4. Distribución de tipos de documento (clientes)
SELECT tipo_documento, COUNT(*) as cantidad
FROM playa.clientes
GROUP BY tipo_documento
ORDER BY cantidad DESC;

-- 5. Distribución de calificaciones
SELECT calificacion_actual, COUNT(*) as cantidad
FROM playa.clientes
GROUP BY calificacion_actual
ORDER BY cantidad DESC;

-- 6. Clientes con múltiples garantes
SELECT c.numero_documento, c.nombre, c.apellido, COUNT(g.id_garante) as cant_garantes
FROM playa.clientes c
JOIN playa.garantes g ON g.id_cliente = c.id_cliente
GROUP BY c.id_cliente, c.numero_documento, c.nombre, c.apellido
HAVING COUNT(g.id_garante) > 1
ORDER BY cant_garantes DESC
LIMIT 20;

-- 7. Documentos duplicados en clientes (no debería haber)
SELECT numero_documento, COUNT(*) as cantidad
FROM playa.clientes
GROUP BY numero_documento
HAVING COUNT(*) > 1;

-- 8. Documentos duplicados en garantes (puede ser normal)
SELECT numero_documento, COUNT(*) as cantidad
FROM playa.garantes
GROUP BY numero_documento
HAVING COUNT(*) > 1
ORDER BY cantidad DESC
LIMIT 20;

-- 9. Clientes con mora acumulada
SELECT numero_documento, nombre, apellido, mora_acumulada, calificacion_actual
FROM playa.clientes
WHERE mora_acumulada > 0
ORDER BY mora_acumulada DESC
LIMIT 20;

-- 10. Verificar que todos los clientes de staging fueron migrados
SELECT COUNT(*) as clientes_staging
FROM migracion.staging_cliente
WHERE NULLIF(TRIM(cliruc), '') IS NOT NULL;

SELECT COUNT(*) as clientes_migrados
FROM migracion.cliente_map;

-- Deberían coincidir
```

---

## 🔍 PASO 6: VERIFICACIÓN DE CALIDAD DE DATOS

```sql
-- Clientes sin nombre
SELECT id_cliente, numero_documento, nombre, apellido
FROM playa.clientes
WHERE nombre IS NULL OR TRIM(nombre) = ''
LIMIT 20;

-- Clientes sin documento
SELECT id_cliente, nombre, apellido
FROM playa.clientes
WHERE numero_documento IS NULL OR TRIM(numero_documento) = ''
LIMIT 20;

-- Garantes sin documento
SELECT id_garante, id_cliente, nombre, apellido
FROM playa.garantes
WHERE numero_documento IS NULL OR TRIM(numero_documento) = ''
LIMIT 20;

-- Fechas de nacimiento inválidas (futuras o muy antiguas)
SELECT numero_documento, nombre, apellido, fecha_nacimiento
FROM playa.clientes
WHERE fecha_nacimiento > CURRENT_DATE 
   OR fecha_nacimiento < '1900-01-01'
LIMIT 20;

-- Emails inválidos (sin @)
SELECT numero_documento, nombre, apellido, email
FROM playa.clientes
WHERE email IS NOT NULL 
  AND email NOT LIKE '%@%'
LIMIT 20;
```

---

## 🧹 PASO 7: LIMPIEZA (OPCIONAL)

Una vez validado todo:

```sql
-- Eliminar esquema de migración
DROP SCHEMA migracion CASCADE;

-- O mantenerlo para auditoría
-- (recomendado por 30-60 días)
```

---

## 📊 RESUMEN DE TRANSFORMACIONES CLAVE

| Transformación | Función/Regla |
|----------------|---------------|
| **Tipo de documento** | `detectar_tipo_documento()` - Detecta CI/RUC/PASAPORTE por formato |
| **Nombre/Apellido** | `separar_nombre()` / `separar_apellido()` - Separa por último espacio |
| **Estado civil** | `mapear_estado_civil()` - Convierte S/C/D/V/U a texto |
| **Calificación** | `mapear_calificacion()` - Convierte número a EXCELENTE/BUENO/REGULAR/MALO |
| **Espacios** | `TRIM()` en todos los campos NCHAR |
| **Vacíos a NULL** | `NULLIF(campo, '')` |
| **Emails** | `LOWER()` para normalizar |

---

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Backup**: Hacer backup completo de SQL Server antes de migrar
2. **Prueba**: Ejecutar primero en ambiente de desarrollo
3. **Validación**: Revisar todas las consultas de validación
4. **Documentación**: Guardar este documento y los logs de migración
5. **Rollback**: Tener plan de rollback si algo falla
6. **Tiempo**: La migración puede tardar según cantidad de registros
7. **Índices**: Los índices en PostgreSQL se crean automáticamente (ya están en el schema)

---

## 🎯 CHECKLIST DE MIGRACIÓN

- [ ] Crear funciones auxiliares
- [ ] Crear tabla staging
- [ ] Importar datos a staging
- [ ] Agregar campos faltantes a clientes/garantes
- [ ] Crear tabla de mapeo
- [ ] Migrar clientes
- [ ] Migrar garante #0
- [ ] Migrar garante #1
- [ ] Migrar garante #2
- [ ] Ejecutar validaciones
- [ ] Verificar calidad de datos
- [ ] Revisar casos especiales
- [ ] Documentar hallazgos
- [ ] Backup de PostgreSQL post-migración
- [ ] Limpiar staging (opcional)

---

## 📞 PRÓXIMOS PASOS

Una vez migrada la tabla de clientes y garantes, continuar con:

1. ✅ Migración de **Referencias** (4 tablas → 1 tabla unificada)
2. ⏳ Migración de **Productos/Vehículos**
3. ⏳ Migración de **Ventas**
4. ⏳ Migración de **Pagarés y Pagos**
5. ⏳ Migración de **Gastos**

---

**¿Necesitás ayuda con algún paso específico o querés que continuemos con las tablas de Referencias?**