# Migraciones y borrado de datos

## Cómo borrar todos los datos y dejar la BD lista de nuevo

### Opción 1: Reset total (borrar esquemas sistema + playa y reinicializar)

Borra **todo** (sistema y playa) y vuelve a crear estructura y datos iniciales (admin, categorías, etc.):

```bash
# Dentro del contenedor backend, o con Python local + .env
python revert_init_database.py
python init_database.py
```

Con Docker:

```powershell
cd C:\dev\sist_base
docker compose exec backend python revert_init_database.py
docker compose exec backend python init_database.py
```

El **init** ya ejecuta automáticamente:

- `initBD.sql` (schema playa base)
- `update_ventas_mora.sql`
- `update_ventas_gracia.sql`
- `update_vendedores.sql`
- `update_productos_entrega.sql`
- `migration_add_precio_financiado_sugerido.sql`

---

## Archivos de migración verificados

### Estructura (se aplican en `init_database.py`)

| Archivo | Qué hace |
|--------|-----------|
| `update_ventas_mora.sql` | Columnas `periodo_int_mora`, `monto_int_mora` en `playa.ventas` |
| `update_ventas_gracia.sql` | Columna `dias_gracia` en `playa.ventas` |
| `update_vendedores.sql` | Tabla `playa.vendedores` y FK `id_vendedor` en `playa.ventas` |
| `update_productos_entrega.sql` | Columna `entrega_inicial_sugerida` en `playa.productos` |
| `migration_add_precio_financiado_sugerido.sql` | Columna `precio_financiado_sugerido` en `playa.productos` |

### Índices (aplicar a mano sobre BD existente)

Para **mejorar rendimiento** sin tocar datos ni estructura, aplicar solo los índices nuevos:

| Archivo | Qué hace |
|--------|-----------|
| **migration_add_indexes.sql** | Crea índices adicionales en `playa`: clientes(activo), productos(categoria, estado+activo), ventas(fecha_registro, estado_venta), detalle_venta(id_venta), pagares(estado+fecha_vencimiento), pagos(id_venta), garantes/referencias(id_cliente), config_calificaciones, gastos, imagenes_productos. |

Aplicar una sola vez (es idempotente: `IF NOT EXISTS`):

```bash
# Con Docker (el contenedor backend no tiene psql; usar el script Python)
docker compose exec backend python run_migration_indexes.py

# O desde tu PC (con .env en backend/)
cd backend
python run_migration_indexes.py

# Si tienes psql instalado localmente
psql "postgresql://user:pass@host:5432/nombre_bd" -f backend/migration_add_indexes.sql
```

### Migración de datos desde otro sistema (SQL Server / staging)

Para **traer datos desde un sistema legacy** (carga en tablas staging y luego a playa):

| Archivo | Qué hace |
|--------|-----------|
| **migration_setup.sql** | Crea schema `migracion`, funciones auxiliares, tablas staging (`staging_cliente`, `st_productos`, `st_ventas`, etc.), tabla `cliente_map`. **Trunca** las tablas de `playa` (clientes, garantes, productos, ventas, pagares, pagos, referencias, imagenes_productos) para poder volver a migrar. |
| **migration_execute.sql** | Copia datos desde las tablas de staging (`migracion.staging_*`) hacia `playa.*` (clientes, garantes, referencias, productos, ventas, pagares, pagos). Debe ejecutarse **después** de cargar los datos en las tablas staging. |

Orden típico para una migración de datos:

1. BD con estructura lista (por ejemplo tras `init_database.py`).
2. Ejecutar **migration_setup.sql** (prepara `migracion` y trunca datos de playa).
3. Cargar datos en las tablas staging (por ejemplo desde SQL Server, CSV, o scripts propios).
4. Ejecutar **migration_execute.sql** (staging → playa).

Para ejecutar los SQL a mano (por ejemplo con `psql` o desde el backend con psycopg2):

```bash
# Ejemplo con psql (ajusta DATABASE_URL)
psql "$DATABASE_URL" -f migration_setup.sql
# ... cargar staging ...
psql "$DATABASE_URL" -f migration_execute.sql
```

---

## Ejecutar la migración directo desde SQL Server (`run_migration.py`)

El script **run_migration.py** conecta a **SQL Server** y a **PostgreSQL**, copia los datos de las tablas de SQL Server a las tablas staging en PostgreSQL y luego ejecuta **migration_execute.sql** para transformar staging → playa.

### Requisitos

1. **PostgreSQL** con el schema playa ya creado (ejecutar antes `init_database.py`).
2. **SQL Server** accesible desde la máquina donde corres el script (típicamente Windows, en la misma red que el servidor).
3. **Python** con `pyodbc` y `psycopg2` (el script los instala si faltan).

### Variables de entorno (`.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de PostgreSQL (obligatoria) | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SQL_SERVER` | Instancia de SQL Server | `DELL_RL\SQLEXPRESS` o `host\INSTANCIA` |
| `SQL_DATABASE` | Base de datos en SQL Server | `Automotores` |
| `SQL_TRUSTED_CONNECTION` | Usar autenticación Windows | `yes` (por defecto) |
| `SQL_USER` | Usuario SQL Server (si no usas Trusted) | `sa` |
| `SQL_PASSWORD` | Contraseña SQL Server (si no usas Trusted) | `***` |
| `SQL_ODBC_DRIVER` | Nombre del driver ODBC (en Docker ya viene 18) | `ODBC Driver 18 for SQL Server` |

Si usas autenticación de SQL Server (usuario/contraseña), pon `SQL_TRUSTED_CONNECTION=no` y define `SQL_USER` y `SQL_PASSWORD`.

**Si ejecutas desde Docker:**  
- Pon `SQL_SERVER=host.docker.internal` (o `host.docker.internal\\SQLEXPRESS`) si SQL Server está en la misma PC.  
- Usa autenticación de SQL Server (`SQL_TRUSTED_CONNECTION=no`, `SQL_USER` y `SQL_PASSWORD`), porque la autenticación Windows no funciona desde el contenedor Linux.

### Tablas de SQL Server que lee el script

Todas en esquema **dbo**:

- `dbo.Cliente` → staging_cliente  
- `dbo.ClientecliRefPer`, `dbo.Clienteclireflab`, `dbo.Clientecgrefper`, `dbo.Clientecgarefla` → referencias  
- `dbo.Productos` → st_productos  
- `dbo.Ventas` → st_ventas  
- `dbo.VentasDetalle` → st_ventas_detalle  
- `dbo.cuotero`, `dbo.cuoterodet`, `dbo.Pagoparcial` → st_cuotero, st_cuoterodet, st_pagoparcial  

### Cómo ejecutarlo

Desde la carpeta **backend** (o con `PYTHONPATH`/entorno correcto), en una máquina que vea SQL Server y PostgreSQL:

```powershell
cd C:\dev\sist_base\backend
python run_migration.py
```

El script hace en orden:

1. Conecta a PostgreSQL y ejecuta **migration_setup.sql** (crea schema migracion, trunca playa).
2. Conecta a SQL Server.
3. Copia cada tabla de SQL Server → tablas staging en PostgreSQL.
4. Ejecuta **migration_execute.sql** (staging → playa).

---

## Resumen rápido

- **Solo quiero borrar todo y empezar de cero:**  
  `revert_init_database.py` → `init_database.py` (con Docker: `docker compose exec backend python ...`).

- **Quiero re-migrar datos desde staging:**  
  Ejecutar `migration_setup.sql`, cargar staging, luego `migration_execute.sql`.

- Las migraciones de **estructura** (`update_*.sql` y `migration_add_precio_financiado_sugerido.sql`) se aplican solas al correr `init_database.py` (modo `all` o `--playa`).
