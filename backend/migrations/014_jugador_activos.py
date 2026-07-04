"""
Migration 014: Jugador y Activos de Equipo
- Añade `foto_equipo_url` a `torneos_equipos` (logo_url ya existe)
- Añade `token_jugadores` a `torneos_equipos` para el link de auto-registro
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
ALTER TABLE torneos.equipos 
    ADD COLUMN IF NOT EXISTS foto_equipo_url VARCHAR(500);

ALTER TABLE torneos.equipos 
    ADD COLUMN IF NOT EXISTS token_jugadores UUID DEFAULT gen_random_uuid();

-- En caso de que ya existieran filas y la columna se añadiera como null, forzamos uuid
UPDATE torneos.equipos SET token_jugadores = gen_random_uuid() WHERE token_jugadores IS NULL;

-- Hacemos la columna NOT NULL para el futuro
ALTER TABLE torneos.equipos ALTER COLUMN token_jugadores SET NOT NULL;
"""

migration_down = """
ALTER TABLE torneos.equipos 
    DROP COLUMN IF EXISTS foto_equipo_url,
    DROP COLUMN IF EXISTS token_jugadores;
"""

if __name__ == "__main__":
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)

    async def run():
        print("Ejecutando migracion 014: Jugador y Activos de Equipo...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        statements = [s.strip() for s in migration_up.split(";") if s.strip()]
        ok = 0
        async with engine.begin() as conn:
            for i, stmt in enumerate(statements, 1):
                try:
                    await conn.execute(text(stmt))
                    print(f"  OK [{i}/{len(statements)}]: {stmt[:55].replace(chr(10), ' ')}")
                    ok += 1
                except Exception as e:
                    print(f"  WARN [{i}/{len(statements)}]: {str(e)[:100]}")
        await engine.dispose()
        print(f"\\nMigracion completada: {ok}/{len(statements)} sentencias OK.")

    asyncio.run(run())
