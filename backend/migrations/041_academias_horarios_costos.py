"""
Migration 041: Horarios de Oficina, Horarios de Práctica por Categoría y Tarifas/Costos con Vigencia (SAD-M)
==========================================================================================================
Agrega:
1. Column 'horarios_oficina' (JSONB) en academias.academias.
2. Tabla 'academias.horarios_practica' para días, horarios, categoría, cancha/sucursal y vigencia.
3. Tabla 'academias.tarifas_costos' para matrículas, cuotas por categoría, indumentaria y otros gastos con vigencia.

Timestamp: 2026-07-23
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida en .env")
    sys.exit(1)

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")


statements = [
    """
    ALTER TABLE academias.academias
        ADD COLUMN IF NOT EXISTS horarios_oficina JSONB DEFAULT '[]'::jsonb;
    """,
    """
    CREATE TABLE IF NOT EXISTS academias.horarios_practica (
        id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id           UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        categoria_id          UUID         REFERENCES academias.categorias(id) ON DELETE CASCADE,
        sub_categoria         VARCHAR(100),
        sucursal_id           UUID         REFERENCES academias.sucursales(id) ON DELETE SET NULL,
        cancha_nombre         VARCHAR(150),
        dia_semana            VARCHAR(20)  NOT NULL CHECK (dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')),
        hora_inicio           VARCHAR(20)  NOT NULL,
        hora_fin              VARCHAR(20)  NOT NULL,
        fecha_inicio_vigencia DATE,
        fecha_fin_vigencia    DATE,
        mes_inicio_vigencia   SMALLINT     CHECK (mes_inicio_vigencia BETWEEN 1 AND 12),
        anio_inicio_vigencia  INTEGER      DEFAULT 2026,
        mes_fin_vigencia      SMALLINT     CHECK (mes_fin_vigencia BETWEEN 1 AND 12),
        anio_fin_vigencia     INTEGER      DEFAULT 2026,
        periodo_vigencia      VARCHAR(60)  DEFAULT '2026',
        activo                BOOLEAN      NOT NULL DEFAULT TRUE,
        creado_en             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_horarios_practica_acad ON academias.horarios_practica(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_horarios_practica_cat  ON academias.horarios_practica(categoria_id);",
    "CREATE INDEX IF NOT EXISTS idx_horarios_practica_periodo ON academias.horarios_practica(periodo_vigencia);",
    """
    CREATE TABLE IF NOT EXISTS academias.tarifas_costos (
        id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id           UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        concepto              VARCHAR(200)  NOT NULL,
        tipo_costo            VARCHAR(50)   NOT NULL CHECK (tipo_costo IN ('matricula', 'cuota_mensual', 'indumentaria', 'otro')),
        categoria_id          UUID          REFERENCES academias.categorias(id) ON DELETE SET NULL,
        monto                 NUMERIC(12,0) NOT NULL,
        moneda                VARCHAR(10)   NOT NULL DEFAULT 'GS',
        descripcion           TEXT,
        fecha_inicio_vigencia DATE,
        fecha_fin_vigencia    DATE,
        mes_inicio_vigencia   SMALLINT     CHECK (mes_inicio_vigencia BETWEEN 1 AND 12),
        anio_inicio_vigencia  INTEGER      DEFAULT 2026,
        mes_fin_vigencia      SMALLINT     CHECK (mes_fin_vigencia BETWEEN 1 AND 12),
        anio_fin_vigencia     INTEGER      DEFAULT 2026,
        periodo_vigencia      VARCHAR(60)  DEFAULT '2026',
        activo                BOOLEAN       NOT NULL DEFAULT TRUE,
        creado_en             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_tarifas_costos_acad ON academias.tarifas_costos(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_tarifas_costos_tipo ON academias.tarifas_costos(tipo_costo);",
    "CREATE INDEX IF NOT EXISTS idx_tarifas_costos_periodo ON academias.tarifas_costos(periodo_vigencia);",
]

migration_down_statements = [
    "DROP TABLE IF EXISTS academias.tarifas_costos CASCADE;",
    "DROP TABLE IF EXISTS academias.horarios_practica CASCADE;",
    "ALTER TABLE academias.academias DROP COLUMN IF EXISTS horarios_oficina;",
]


async def run_migration(direction: str = "up"):
    engine = create_async_engine(DATABASE_URL, echo=False)
    stmts = statements if direction != "down" else migration_down_statements

    print("=" * 65)
    print(f"Migracion 041: Horarios y Tarifas Academias -- {direction.upper()}")
    print("=" * 65)

    ok = fail = 0
    async with engine.connect() as conn:
        for stmt in stmts:
            stmt = stmt.strip()
            if not stmt:
                continue
            try:
                async with conn.begin():
                    await conn.execute(text(stmt))
                preview = stmt[:80].replace("\n", " ")
                print(f"  OK {preview}")
                ok += 1
            except Exception as e:
                preview = stmt[:80].replace("\n", " ")
                print(f"  WARN {preview}")
                print(f"       -> {str(e)[:140]}")
                fail += 1

    await engine.dispose()
    print("=" * 65)
    print(f"Migracion 041 completada: {ok} OK | {fail} WARN/ERR")
    print("=" * 65)


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    asyncio.run(run_migration(direction))
