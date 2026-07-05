"""
Migration 019: Mover catálogos de fútbol al esquema torneos_futbol
- Mueve cancha.tipos_evento a torneos_futbol.tipos_eventos
- Mueve cancha.modalidades a torneos_futbol.modalidades
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
CREATE SCHEMA IF NOT EXISTS torneos_futbol;

-- 1. Mover y renombrar tipos_evento
ALTER TABLE cancha.tipos_evento SET SCHEMA torneos_futbol;
ALTER TABLE torneos_futbol.tipos_evento RENAME TO tipos_eventos;

-- 2. Mover modalidades
ALTER TABLE cancha.modalidades SET SCHEMA torneos_futbol;
"""

migration_down = """
-- 1. Revertir modalidades
ALTER TABLE torneos_futbol.modalidades SET SCHEMA cancha;

-- 2. Revertir tipos_eventos
ALTER TABLE torneos_futbol.tipos_eventos RENAME TO tipos_evento;
ALTER TABLE torneos_futbol.tipos_evento SET SCHEMA cancha;

DROP SCHEMA IF EXISTS torneos_futbol;
"""

if __name__ == "__main__":
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)

    if "host.docker.internal" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    sql_block = migration_up if direction != "down" else migration_down

    async def run():
        print(f"Ejecutando migracion 019: Catalogos Futbol ({direction.upper()})...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        statements = [s.strip() for s in sql_block.split(";") if s.strip()]
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

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
