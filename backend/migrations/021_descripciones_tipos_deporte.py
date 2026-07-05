"""
Migration 021: Agregar descripciones a cancha.tipos_deporte
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
UPDATE cancha.tipos_deporte SET descripcion = 'Deportes de equipo donde varios jugadores colaboran para un objetivo común.' WHERE nombre = 'Colectivo';
UPDATE cancha.tipos_deporte SET descripcion = 'Deportes que utilizan raquetas, paletas o palas para golpear una pelota o plumilla.' WHERE nombre = 'Raqueta';
UPDATE cancha.tipos_deporte SET descripcion = 'Deportes que implican combate o contacto físico directo, como artes marciales.' WHERE nombre = 'Contacto';
UPDATE cancha.tipos_deporte SET descripcion = 'Disciplinas en las que el deportista compite de manera individual.' WHERE nombre = 'Individual';
UPDATE cancha.tipos_deporte SET descripcion = 'Deportes de competición que involucran el uso de vehículos motorizados.' WHERE nombre = 'Motor';
UPDATE cancha.tipos_deporte SET descripcion = 'Otras disciplinas deportivas que no encajan en categorías convencionales.' WHERE nombre = 'Otro';
"""

migration_down = """
UPDATE cancha.tipos_deporte SET descripcion = NULL;
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
        print(f"Ejecutando migracion 021: Descripciones tipos_deporte ({direction.upper()})...")
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
