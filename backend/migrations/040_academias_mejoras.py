"""
Migration 040: Mejoras Schema Academias Deportivas (SAD-M)
====================================================
Agrega las tablas faltantes y las columnas requeridas para
cubrir la configuración de moras, historial de asociación,
asistencia de tutores y el módulo de noticias públicas.

Tablas creadas:
  academias.historial_asociacion
  academias.asistencia_tutor
  academias.noticias_publicas

Columnas agregadas:
  academias.config_cuotas: cobro_retraso_activo, monto_por_retraso, dias_gracia_retraso
  academias.cuotas: monto_penalizacion
  academias.academias: canal_comunicacion_habilitado

Timestamp: 2026-07-20
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


migration_up = """
-- ============================================================
-- 1. HISTORIAL DE ASOCIACION (Altas y bajas)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.historial_asociacion (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id      UUID         NOT NULL REFERENCES academias.alumnos(id) ON DELETE CASCADE,
    fecha_inicio   DATE         NOT NULL,
    fecha_fin      DATE,
    motivo_baja    TEXT,
    registrado_por INTEGER      REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_alumno ON academias.historial_asociacion(alumno_id);

-- ============================================================
-- 2. ASISTENCIA DE TUTORES
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.asistencia_tutor (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id            UUID         NOT NULL REFERENCES academias.tutores(id) ON DELETE CASCADE,
    academia_id         UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    fecha               DATE         NOT NULL,
    descripcion_reunion VARCHAR(255) NOT NULL,
    presente            BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asist_tutor_tutor ON academias.asistencia_tutor(tutor_id);
CREATE INDEX IF NOT EXISTS idx_asist_tutor_acad  ON academias.asistencia_tutor(academia_id);

-- ============================================================
-- 3. NOTICIAS PUBLICAS
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.noticias_publicas (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id       UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    titulo            VARCHAR(255) NOT NULL,
    contenido         TEXT         NOT NULL,
    imagen_url        VARCHAR(500),
    fecha_publicacion DATE         NOT NULL DEFAULT CURRENT_DATE,
    activa            BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_noticias_academia ON academias.noticias_publicas(academia_id);

CREATE OR REPLACE TRIGGER trg_noticias_updated
    BEFORE UPDATE ON academias.noticias_publicas
    FOR EACH ROW EXECUTE FUNCTION academias.set_updated_at();

-- ============================================================
-- 3b. FEEDBACK Y ENCUESTAS DE SOCIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.feedback_socios (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id       UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    tutor_id          UUID         REFERENCES academias.tutores(id) ON DELETE SET NULL,
    alumno_id         UUID         REFERENCES academias.alumnos(id) ON DELETE SET NULL,
    tipo              VARCHAR(50)  NOT NULL CHECK (tipo IN ('encuesta', 'buzon', 'conversacion')),
    asunto            VARCHAR(255) NOT NULL,
    mensaje           TEXT         NOT NULL,
    leido             BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_academia ON academias.feedback_socios(academia_id);

-- ============================================================
-- 4. ALTER CONFIG_CUOTAS Y ACADEMIAS (Moras y Bot)
-- ============================================================
ALTER TABLE academias.config_cuotas
    ADD COLUMN IF NOT EXISTS cobro_retraso_activo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS monto_por_retraso NUMERIC(12,0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dias_gracia_retraso SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE academias.academias
    ADD COLUMN IF NOT EXISTS canal_comunicacion_habilitado BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 5. ALTER CUOTAS (Monto penalizacion)
-- ============================================================
ALTER TABLE academias.cuotas
    ADD COLUMN IF NOT EXISTS monto_penalizacion NUMERIC(12,0) NOT NULL DEFAULT 0;
"""

migration_down = """
ALTER TABLE academias.cuotas DROP COLUMN IF EXISTS monto_penalizacion;
ALTER TABLE academias.academias DROP COLUMN IF EXISTS canal_comunicacion_habilitado;
ALTER TABLE academias.config_cuotas DROP COLUMN IF EXISTS cobro_retraso_activo;
ALTER TABLE academias.config_cuotas DROP COLUMN IF EXISTS monto_por_retraso;
ALTER TABLE academias.config_cuotas DROP COLUMN IF EXISTS dias_gracia_retraso;
DROP TABLE IF EXISTS academias.feedback_socios CASCADE;
DROP TABLE IF EXISTS academias.noticias_publicas CASCADE;
DROP TABLE IF EXISTS academias.asistencia_tutor CASCADE;
DROP TABLE IF EXISTS academias.historial_asociacion CASCADE;
"""


async def run_migration(direction: str = "up"):
    engine = create_async_engine(DATABASE_URL, echo=False)
    sql_block = migration_up if direction != "down" else migration_down

    print("=" * 65)
    print(f"Migracion 040: Mejoras Academias (SAD-M) -- {direction.upper()}")
    print("=" * 65)

    if direction == "up":
        statements = []
        buf = []
        in_block = False
        for line in sql_block.splitlines():
            stripped = line.strip()
            if "$$" in stripped and not in_block:
                in_block = True
            buf.append(line)
            if in_block and stripped.endswith("$$;"):
                statements.append("\n".join(buf))
                buf = []
                in_block = False
            elif not in_block and stripped.endswith(";") and not stripped.startswith("--"):
                stmt = "\n".join(buf).strip()
                if stmt and stmt != ";":
                    statements.append(stmt)
                buf = []
    else:
        statements = [s.strip() for s in sql_block.split(";") if s.strip()]

    ok = fail = 0

    async with engine.connect() as conn:
        for i, stmt in enumerate(statements, 1):
            stmt = stmt.strip()
            if not stmt or stmt.startswith("--"):
                continue
            try:
                async with conn.begin():
                    await conn.execute(text(stmt))
                preview = stmt[:80].replace("\\n", " ")
                print(f"  OK [{i:02d}] {preview}")
                ok += 1
            except Exception as e:
                preview = stmt[:80].replace("\\n", " ")
                print(f"  WARN [{i:02d}] {preview}")
                print(f"       -> {str(e)[:140]}")
                fail += 1

    await engine.dispose()
    print("=" * 65)
    print(f"Migracion 040 completada: {ok} OK | {fail} WARN/ERR")
    print("=" * 65)


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    asyncio.run(run_migration(direction))
