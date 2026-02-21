"""
Script para corregir los triggers de PostgreSQL.

Problemas corregidos:
1. Las funciones referenciaban tablas sin el prefijo playa. (causa original)
2. La función actualizar_estado_pagare usaba SET estado='PAGADO' 
   pero la columna 'estado' VARCHAR YA NO EXISTE en playa.pagares.
   Ahora usa id_estado (FK a playa.estados) y cancelado (boolean).
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:adminperalta@localhost:5432/BBDD_playa"

# ── Función 1: obtener_calificacion ──────────────────────────────────────────
SQL_FUNC_OBTENER_CALIFICACION = """
CREATE OR REPLACE FUNCTION playa.obtener_calificacion(dias_atraso_int INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    calificacion_resultado VARCHAR(50);
BEGIN
    SELECT calificacion INTO calificacion_resultado
    FROM playa.config_calificaciones
    WHERE dias_atraso_int BETWEEN dias_atraso_desde AND COALESCE(dias_atraso_hasta, 999999)
    AND activo = TRUE
    ORDER BY dias_atraso_desde
    LIMIT 1;
    RETURN COALESCE(calificacion_resultado, 'SIN CALIFICAR');
END;
$$ LANGUAGE plpgsql;
"""

# ── Función 2: actualizar_estado_pagare ──────────────────────────────────────
# CORRECCIÓN CLAVE: usa id_estado (INTEGER FK) y cancelado (BOOLEAN),
# NO el campo 'estado' VARCHAR que ya fue eliminado de la tabla pagares.
SQL_FUNC_ESTADO_PAGARE = """
CREATE OR REPLACE FUNCTION playa.actualizar_estado_pagare()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado_monto  DECIMAL(15,2);
    monto_pagare_monto  DECIMAL(15,2);
    id_pagado_estado    INTEGER;
    id_parcial_estado   INTEGER;
BEGIN
    -- Obtener IDs de estados dinámicamente
    SELECT id_estado INTO id_pagado_estado
    FROM playa.estados WHERE nombre = 'PAGADO' LIMIT 1;

    SELECT id_estado INTO id_parcial_estado
    FROM playa.estados WHERE nombre = 'PARCIAL' LIMIT 1;

    -- Monto de la cuota del pagaré
    SELECT monto_cuota INTO monto_pagare_monto
    FROM playa.pagares
    WHERE id_pagare = NEW.id_pagare;

    -- Suma total ya pagada para este pagaré
    SELECT COALESCE(SUM(monto_pagado), 0) INTO total_pagado_monto
    FROM playa.pagos
    WHERE id_pagare = NEW.id_pagare;

    IF total_pagado_monto >= monto_pagare_monto THEN
        -- Pagado completamente
        UPDATE playa.pagares
        SET id_estado       = id_pagado_estado,
            saldo_pendiente = 0,
            cancelado       = TRUE
        WHERE id_pagare = NEW.id_pagare;
    ELSE
        -- Pago parcial
        UPDATE playa.pagares
        SET id_estado       = id_parcial_estado,
            saldo_pendiente = monto_pagare_monto - total_pagado_monto,
            cancelado       = FALSE
        WHERE id_pagare = NEW.id_pagare;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

# ── Función 3: actualizar_calificacion_cliente ───────────────────────────────
SQL_FUNC_CALIFICACION_CLIENTE = """
CREATE OR REPLACE FUNCTION playa.actualizar_calificacion_cliente()
RETURNS TRIGGER AS $$
DECLARE
    nueva_calif  VARCHAR(50);
    calif_anterior VARCHAR(50);
    id_cli_actual  INTEGER;
    id_venta_actual INTEGER;
BEGIN
    -- Obtener el cliente y su calificación actual a partir del pagaré
    SELECT v.id_cliente, c.calificacion_actual, v.id_venta
    INTO id_cli_actual, calif_anterior, id_venta_actual
    FROM playa.ventas v
    INNER JOIN playa.clientes c  ON v.id_cliente = c.id_cliente
    INNER JOIN playa.pagares pg  ON v.id_venta   = pg.id_venta
    WHERE pg.id_pagare = NEW.id_pagare
    LIMIT 1;

    -- Si no se encontró cliente, salir sin hacer nada
    IF id_cli_actual IS NULL THEN
        RETURN NEW;
    END IF;

    nueva_calif := playa.obtener_calificacion(NEW.dias_atraso);

    IF nueva_calif IS DISTINCT FROM calif_anterior THEN
        UPDATE playa.clientes
        SET calificacion_actual = nueva_calif
        WHERE id_cliente = id_cli_actual;

        INSERT INTO playa.historial_calificaciones
            (id_cliente, id_venta, id_pago, calificacion_anterior, calificacion_nueva, motivo)
        VALUES
            (id_cli_actual,
             id_venta_actual,
             NEW.id_pago,
             calif_anterior,
             nueva_calif,
             'Pago registrado con ' || NEW.dias_atraso || ' días de atraso');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

# ── Triggers ─────────────────────────────────────────────────────────────────
SQL_CREATE_TRIGGER_ESTADO = """
CREATE TRIGGER trg_actualizar_estado_pagare
AFTER INSERT ON playa.pagos
FOR EACH ROW
EXECUTE FUNCTION playa.actualizar_estado_pagare();
"""

SQL_CREATE_TRIGGER_CALIFICACION = """
CREATE TRIGGER trg_actualizar_calificacion_cliente
AFTER INSERT ON playa.pagos
FOR EACH ROW
EXECUTE FUNCTION playa.actualizar_calificacion_cliente();
"""

SQL_VERIFY = """
SELECT
    t.tgname         AS trigger_name,
    p.proname        AS function_name,
    n2.nspname       AS function_schema,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
    END AS status
FROM pg_trigger t
JOIN pg_class     c  ON t.tgrelid       = c.oid
JOIN pg_namespace n  ON c.relnamespace  = n.oid
LEFT JOIN pg_proc p  ON t.tgfoid        = p.oid
LEFT JOIN pg_namespace n2 ON p.pronamespace = n2.oid
WHERE n.nspname = 'playa'
  AND c.relname = 'pagos'
  AND NOT t.tgisinternal;
"""

SQL_CHECK_ESTADOS = """
SELECT id_estado, nombre FROM playa.estados ORDER BY id_estado;
"""

SQL_CHECK_COLUMNAS_PAGARES = """
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'playa' AND table_name = 'pagares'
ORDER BY ordinal_position;
"""


async def fix_triggers():
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        print("✅ Conectado a la base de datos")

        # Verificar columnas actuales de pagares
        print("\n📋 Columnas actuales de playa.pagares:")
        result = await conn.execute(text(SQL_CHECK_COLUMNAS_PAGARES))
        for row in result.mappings().all():
            print(f"   - {row['column_name']} ({row['data_type']})")

        # Verificar estados disponibles
        print("\n📋 Estados disponibles en playa.estados:")
        result = await conn.execute(text(SQL_CHECK_ESTADOS))
        estados = result.mappings().all()
        for row in estados:
            print(f"   - id={row['id_estado']} → {row['nombre']}")

        if not any(r['nombre'] == 'PAGADO' for r in estados):
            print("\n❌ ERROR: No existe el estado 'PAGADO' en playa.estados!")
            print("   Asegúrese de que la tabla estados tenga los registros correctos.")
            return

        # Eliminar triggers
        print("\n🔄 Eliminando triggers existentes...")
        await conn.execute(text("DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON playa.pagos;"))
        await conn.execute(text("DROP TRIGGER IF EXISTS trg_actualizar_calificacion_cliente ON playa.pagos;"))
        print("   ✓ Triggers eliminados")

        # Función obtener_calificacion
        print("\n🔄 Recreando playa.obtener_calificacion...")
        await conn.execute(text(SQL_FUNC_OBTENER_CALIFICACION))
        print("   ✓ Creada")

        # Función actualizar_estado_pagare (usa id_estado, NO estado varchar)
        print("\n🔄 Recreando playa.actualizar_estado_pagare (usa id_estado + cancelado)...")
        await conn.execute(text(SQL_FUNC_ESTADO_PAGARE))
        print("   ✓ Creada")

        # Función actualizar_calificacion_cliente
        print("\n🔄 Recreando playa.actualizar_calificacion_cliente...")
        await conn.execute(text(SQL_FUNC_CALIFICACION_CLIENTE))
        print("   ✓ Creada")

        # Triggers
        print("\n🔄 Creando triggers...")
        await conn.execute(text(SQL_CREATE_TRIGGER_ESTADO))
        print("   ✓ trg_actualizar_estado_pagare")

        await conn.execute(text(SQL_CREATE_TRIGGER_CALIFICACION))
        print("   ✓ trg_actualizar_calificacion_cliente")

        # Verificar
        print("\n📋 Triggers activos en playa.pagos:")
        result = await conn.execute(text(SQL_VERIFY))
        rows = result.mappings().all()
        for row in rows:
            print(f"   - {row['trigger_name']} → {row['function_schema']}.{row['function_name']} [{row['status']}]")

    await engine.dispose()
    print("\n✅ Corrección completada exitosamente!")
    print("   Los triggers ahora usan id_estado (INTEGER FK) y cancelado (BOOLEAN)")
    print("   en lugar del campo 'estado' VARCHAR que ya no existe en pagares.")


if __name__ == "__main__":
    asyncio.run(fix_triggers())
