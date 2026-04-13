#!/usr/bin/env python3
"""
init_mejoras.py
Crea la tabla sistema.mejoras en la base de datos.
Ejecutar: docker exec -it sist-catalogos-backend python init_mejoras.py
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db")

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS sistema.mejoras (
        id                        SERIAL PRIMARY KEY,
        titulo                    VARCHAR(200) NOT NULL,
        modulo_afectado           VARCHAR(100),
        funcionamiento_actual     TEXT,
        mejora_sugerida           TEXT NOT NULL,
        prioridad                 VARCHAR(20) NOT NULL DEFAULT 'media'
                                  CHECK (prioridad IN ('baja','media','alta','critica')),
        estado                    VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                                  CHECK (estado IN ('pendiente','en_analisis','implementada','rechazada','diferida')),
        solicitado_por            INTEGER NOT NULL REFERENCES sistema.usuarios(id),
        fecha_solicitud           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        implementada_por          INTEGER REFERENCES sistema.usuarios(id),
        fecha_implementacion      TIMESTAMPTZ,
        descripcion_implementacion TEXT,
        version_implementacion    VARCHAR(100),
        motivo_rechazo            TEXT,
        comentarios               TEXT
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_mejoras_estado ON sistema.mejoras(estado);",
    "CREATE INDEX IF NOT EXISTS idx_mejoras_solicitado_por ON sistema.mejoras(solicitado_por);",
    "CREATE INDEX IF NOT EXISTS idx_mejoras_fecha ON sistema.mejoras(fecha_solicitud DESC);",
    "COMMENT ON TABLE sistema.mejoras IS 'Solicitudes de mejora al sistema — trazabilidad completa de quién pidió, cuándo y qué se implementó';",
    "COMMENT ON COLUMN sistema.mejoras.funcionamiento_actual IS 'Descripción de cómo funciona el sistema actualmente (antes de la mejora)';",
    "COMMENT ON COLUMN sistema.mejoras.mejora_sugerida IS 'Descripción de la mejora solicitada por el usuario';",
    "COMMENT ON COLUMN sistema.mejoras.descripcion_implementacion IS 'Descripción técnica de los cambios realizados al implementar la mejora';",
    "COMMENT ON COLUMN sistema.mejoras.version_implementacion IS 'Número de versión, commit hash o tag al momento de implementar';"
]

async def main():
    print("🔧 Iniciando creación de tabla sistema.mejoras ...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        for stmt in DDL_STATEMENTS:
            await conn.execute(text(stmt))
    await engine.dispose()
    print("✅  sistema.mejoras lista.")

if __name__ == "__main__":
    asyncio.run(main())
