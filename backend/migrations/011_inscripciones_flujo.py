"""
Migración 011: Flujo de inscripciones completo
- Agrega token_jugador a torneos.tournament_players
- Agrega categoria_id a torneos.tournament_players (inscripción por atleta)
- Crea tabla torneos.inscripciones_solicitudes para trackear el proceso
"""

SQL_UP = """
-- 1. Token único por jugador para auto-registro
ALTER TABLE torneos.tournament_players
    ADD COLUMN IF NOT EXISTS token_jugador UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_tp_token_jugador
    ON torneos.tournament_players(token_jugador);

-- 2. Categoria asignada al jugador (para torneos por_atleta)
ALTER TABLE torneos.tournament_players
    ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES torneos.categorias(id) ON DELETE SET NULL;

-- 3. Tabla de solicitudes de inscripción para trackeo del proceso
CREATE TABLE IF NOT EXISTS torneos.inscripciones_solicitudes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id       UUID NOT NULL REFERENCES torneos.torneos(id) ON DELETE CASCADE,
    equipo_id       UUID REFERENCES torneos.equipos(id) ON DELETE CASCADE,
    delegado_nombre VARCHAR(200),
    delegado_email  VARCHAR(200),
    delegado_telefono VARCHAR(50),
    estado          VARCHAR(30) DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_proceso','completado','rechazado')),
    notas           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Columna nombre_academia en torneos.equipos (para torneos de artes marciales)
ALTER TABLE torneos.equipos
    ADD COLUMN IF NOT EXISTS nombre_academia VARCHAR(200);

-- 5. Columna categoria_id en torneos.equipos (para inscripción de todo el equipo a una sola categoría)
ALTER TABLE torneos.equipos
    ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES torneos.categorias(id) ON DELETE SET NULL;

-- 6. Asegurar que token_jugadores exista en torneos.equipos (para generación masiva)
ALTER TABLE torneos.equipos
    ADD COLUMN IF NOT EXISTS token_jugadores UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_equipos_token_jug
    ON torneos.equipos(token_jugadores)
    WHERE token_jugadores IS NOT NULL;
"""

SQL_DOWN = """
ALTER TABLE torneos.tournament_players DROP COLUMN IF EXISTS token_jugador;
ALTER TABLE torneos.tournament_players DROP COLUMN IF EXISTS categoria_id;
ALTER TABLE torneos.equipos DROP COLUMN IF EXISTS nombre_academia;
ALTER TABLE torneos.equipos DROP COLUMN IF EXISTS categoria_id;
DROP TABLE IF EXISTS torneos.inscripciones_solicitudes;
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Ejecutando migración 011...")
        for stmt in SQL_UP.split(';'):
            stmt = stmt.strip()
            if stmt:
                try:
                    await conn.execute(text(stmt))
                    print(f"  OK: {stmt[:80]}...")
                except Exception as e:
                    print(f"  ERROR: {stmt[:80]}: {e}")
        await conn.commit()
        print("Migracion 011 completada.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
