"""
Migration 055: Evaluaciones y Boletines de Rendimiento de Atletas en Academias
=============================================================================
1. Crea tabla academias.evaluaciones para fichas técnicas, evolución de atletas,
   notas por fundamento (técnico, táctico, físico, actitudinal) y recomendaciones
   pedagógicas/deportivas.
2. Crea índices de búsqueda y rendimiento.
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
    # 1. Tabla academias.evaluaciones
    """
    CREATE TABLE IF NOT EXISTS academias.evaluaciones (
        id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id          UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        alumno_id            UUID          NOT NULL REFERENCES academias.alumnos(id) ON DELETE CASCADE,
        sucursal_id          UUID          REFERENCES academias.sucursales(id) ON DELETE SET NULL,
        categoria_id         UUID          REFERENCES academias.categorias(id) ON DELETE SET NULL,
        evaluador_id         INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
        evaluador_nombre     VARCHAR(150),
        fecha                DATE          NOT NULL DEFAULT CURRENT_DATE,
        periodo              VARCHAR(60)   NOT NULL,
        titulo               VARCHAR(150)  NOT NULL DEFAULT 'Evaluación Integral de Rendimiento',
        tipo                 VARCHAR(50)   NOT NULL DEFAULT 'trimestral',
        posicion             VARCHAR(60),
        pierna_habil         VARCHAR(30)   DEFAULT 'Diestro',
        dorsal               VARCHAR(10),
        altura_cm            NUMERIC(5,1),
        peso_kg              NUMERIC(5,1),
        promedio_general     NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
        promedio_tecnico     NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
        promedio_tactico     NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
        promedio_fisico      NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
        promedio_actitudinal NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
        nivel_global         VARCHAR(50)   NOT NULL DEFAULT 'En Desarrollo',
        fundamentos          JSONB         NOT NULL DEFAULT '[]'::jsonb,
        fortalezas           TEXT,
        areas_mejora         TEXT,
        recomendaciones      TEXT,
        observaciones        TEXT,
        estado               VARCHAR(20)   NOT NULL DEFAULT 'publicado',
        creado_en            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        actualizado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_evaluaciones_acad ON academias.evaluaciones(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_evaluaciones_alumno ON academias.evaluaciones(alumno_id);",
    "CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON academias.evaluaciones(fecha);",
    "CREATE INDEX IF NOT EXISTS idx_evaluaciones_periodo ON academias.evaluaciones(periodo);",
    "CREATE INDEX IF NOT EXISTS idx_evaluaciones_categoria ON academias.evaluaciones(categoria_id);",
]


async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        for stmt in statements:
            cleaned = stmt.strip()
            if cleaned:
                print(f"Ejecutando: {cleaned[:60]}...")
                await conn.execute(text(cleaned))
        print("MIGRATION 055 COMPLETADA CON ÉXITO")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
