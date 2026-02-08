# 🔄 Guía de Migración: Referencias (4 tablas → 1 tabla unificada)

## 📋 Origen: SQL Server
Existen 4 tablas separadas que deben unificarse en `playa.referencias`:

1.  **`ClientecliRefPer`**: Referencias Personales del Cliente.
2.  **`Clienteclireflab`**: Referencias Laborales del Cliente.
3.  **`Clientecgrefper`**: Referencias Personales del Garante.
4.  **`Clientecgarefla`**: Referencias Laborales del Garante.

---

## 🗺️ MAPEO UNIFICADO

### TABLA: `playa.referencias` (Nueva)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id_referencia` | `SERIAL` | Clave Primaria |
| `id_cliente` | `INTEGER` | FK a `playa.clientes` |
| `tipo_entidad` | `VARCHAR(20)` | `'CLIENTE'` o `'GARANTE'` |
| `tipo_referencia` | `VARCHAR(20)` | `'PERSONAL'` o `'LABORAL'` |
| `nombre` | `VARCHAR(100)` | Nombre de la referencia |
| `telefono` | `VARCHAR(50)` | Teléfono de contacto |
| `parentesco_cargo` | `VARCHAR(100)` | Relación o cargo (si existe) |
| `observaciones` | `TEXT` | Observaciones o verificación |
| `fecha_registro` | `TIMESTAMP` | Fecha de creación |

---

## 🛠️ PASO 1: CREAR TABLA EN POSTGRESQL

```sql
CREATE TABLE IF NOT EXISTS playa.referencias (
    id_referencia SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES playa.clientes(id_cliente),
    tipo_entidad VARCHAR(20) NOT NULL, -- CLIENTE, GARANTE
    tipo_referencia VARCHAR(20) NOT NULL, -- PERSONAL, LABORAL
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(50),
    parentesco_cargo VARCHAR(100),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);
```

---

## 🔄 PASO 2: ESTRATEGIA DE CARGA (ETL)

### 1. Referencias Personales del Cliente (`ClientecliRefPer`)
*   **Mapeo**: `cliruc` -> `id_cliente` (vía map), `'CLIENTE'`, `'PERSONAL'`, `clirefper`, `clirefpert`, `clirefperv`.

### 2. Referencias Laborales del Cliente (`Clienteclireflab`)
*   **Mapeo**: `cliruc` -> `id_cliente`, `'CLIENTE'`, `'LABORAL'`, `clirefnom`, `clireftel`, `clirefver`.

### 3. Referencias Personales del Garante (`Clientecgrefper`)
*   **Mapeo**: `cliruc` -> `id_cliente`, `'GARANTE'`, `'PERSONAL'`, `cgrepen`, `cgrepet`, `cgrepep`.

### 4. Referencias Laborales del Garante (`Clientecgarefla`)
*   **Mapeo**: `cliruc` -> `id_cliente`, `'GARANTE'`, `'LABORAL'`, `grelabn`, `grelabt`, `grelabo`.

---

## 📝 ACCIONES INMEDIATAS
1.  Actualizar `initBD.sql` y `models_playa.py` con la nueva tabla.
2.  Crear tablas staging para estas 4 tablas en SQL Server.
3.  Actualizar `migration_setup.sql` y `migration_execute.sql`.
4.  Ejecutar `run_migration.py`.
