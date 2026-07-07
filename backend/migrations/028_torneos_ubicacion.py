"""
Migration 028: Agregar ubicacion_lat y ubicacion_lng a torneos_generales.torneos
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
ALTER TABLE torneos_generales.torneos 
ADD COLUMN IF NOT EXISTS ubicacion_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS ubicacion_lng DOUBLE PRECISION;
"""

migration_down = """
ALTER TABLE torneos_generales.torneos 
DROP COLUMN IF EXISTS ubicacion_lat,
DROP COLUMN IF EXISTS ubicacion_lng;
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
        print(f"Ejecutando migracion 028: ubicacion_lat y lng ({direction.upper()})...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        statements = [s.strip() for s in sql_block.split(";") if s.strip()]
        ok = 0
        async with engine.begin() as conn:
            for i, stmt in enumerate(statements, 1):
                try:
                    await conn.execute(text(stmt))
                    print(f"  OK [{i}/{len(statements)}]: {stmt[:70].replace(chr(10), ' ')}")
                    ok += 1
                except Exception as e:
                    print(f"  WARN [{i}/{len(statements)}]: {str(e)[:120]}")
        await engine.dispose()
        print(f"\nMigracion completada: {ok}/{len(statements)} sentencias OK.")

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
