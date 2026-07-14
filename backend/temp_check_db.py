import asyncio
import os
import sys

# Configurar PYTHONPATH para importar módulos locales
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, nombre, torneo_id FROM torneos.equipos LIMIT 10"))
        print("Equipos:")
        for r in res.fetchall():
            print(r)
            
        res2 = await conn.execute(text("SELECT id, nombre, torneo_equipo_id FROM torneos.tournament_players LIMIT 5"))
        print("Jugadores:")
        for r in res2.fetchall():
            print(r)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
