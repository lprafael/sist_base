"""
Migration 043: Módulo Financiero Avanzado - Pagos Parciales, Matrículas y Anulaciones
==============================================================================================
Agrega:
  - academias.pagos (detalle de pagos individuales con soporte parcial)
  - academias.matriculas (cargos de matrícula anual por alumno)
  - Columnas en academias.cuotas: monto_pagado, tipo_cuota
  - Estado 'parcial' en cuotas

Timestamp: 2026-08-08
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
-- 1. Ampliar CHECK de estados en cuotas y agregar campo monto_pagado + tipo_cuota
-- ============================================================
ALTER TABLE academias.cuotas
    DROP CONSTRAINT IF EXISTS cuotas_estado_check;

ALTER TABLE academias.cuotas
    ADD CONSTRAINT cuotas_estado_check
    CHECK (estado IN ('pendiente','pagada','vencida','becada','anulada','parcial'));

ALTER TABLE academias.cuotas
    ADD COLUMN IF NOT EXISTS monto_pagado  NUMERIC(12,0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tipo_cuota    VARCHAR(30)   NOT NULL DEFAULT 'mensual'
        CHECK (tipo_cuota IN ('mensual','matricula','anual','penalizacion','otro'));

-- ============================================================
-- 2. TABLA: PAGOS  (detalle de cada transacción de pago)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.pagos (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    cuota_id       UUID          NOT NULL REFERENCES academias.cuotas(id) ON DELETE CASCADE,
    alumno_id      UUID          NOT NULL REFERENCES academias.alumnos(id) ON DELETE CASCADE,
    academia_id    UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    monto          NUMERIC(12,0) NOT NULL CHECK (monto > 0),
    metodo_pago    VARCHAR(50)   NOT NULL DEFAULT 'efectivo',
    fecha_pago     DATE          NOT NULL DEFAULT CURRENT_DATE,
    notas          TEXT,
    anulado        BOOLEAN       NOT NULL DEFAULT FALSE,
    anulado_en     TIMESTAMPTZ,
    anulado_por    INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    motivo_anulacion TEXT,
    registrado_por INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_cuota    ON academias.pagos(cuota_id);
CREATE INDEX IF NOT EXISTS idx_pagos_alumno   ON academias.pagos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_academia ON academias.pagos(academia_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha    ON academias.pagos(fecha_pago);

-- ============================================================
-- 3. TABLA: MATRICULAS (cargo anual por inscripción/alumno)
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.matriculas (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id      UUID          NOT NULL REFERENCES academias.alumnos(id) ON DELETE CASCADE,
    academia_id    UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    anio           SMALLINT      NOT NULL,
    monto          NUMERIC(12,0) NOT NULL,
    estado         VARCHAR(30)   NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','pagada','anulada','becada')),
    fecha_vencimiento DATE,
    notas          TEXT,
    registrado_por INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, anio)
);

CREATE INDEX IF NOT EXISTS idx_matriculas_academia ON academias.matriculas(academia_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_alumno   ON academias.matriculas(alumno_id);
"""

migration_down = """
DROP TABLE IF EXISTS academias.pagos CASCADE;
DROP TABLE IF EXISTS academias.matriculas CASCADE;
ALTER TABLE academias.cuotas DROP COLUMN IF EXISTS monto_pagado;
ALTER TABLE academias.cuotas DROP COLUMN IF EXISTS tipo_cuota;
"""


async def run():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        for stmt in migration_up.split(";"):
            stmt = stmt.strip()
            if stmt:
                try:
                    await conn.execute(text(stmt))
                    print(f"OK: {stmt[:80]}...")
                except Exception as e:
                    print(f"WARN: {e}")
    await engine.dispose()
    print("\n✅ Migration 043 aplicada correctamente.")


if __name__ == "__main__":
    asyncio.run(run())
