import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, nombre, torneo_id FROM torneos.equipos WHERE nombre IN ('Cobra Kai Dojo', 'Miyagi-Do Karate', 'Eagle Fang Karate', 'Team Alpha Male', 'Gracie Barra Asunción', 'Chute Boxe', 'Alliance Jiu-Jitsu', 'American Top Team', 'Nova União')"))
        equipos = res.fetchall()
        print("Equipos MMA:")
        for r in equipos:
            print(r)
            
        print("\nJugadores en estos equipos:")
        for eq in equipos:
            res2 = await conn.execute(text("SELECT count(*) FROM torneos.tournament_players WHERE torneo_equipo_id = :eq_id"), {"eq_id": eq[0]})
            count = res2.scalar()
            print(f"Equipo {eq[1]} tiene {count} jugadores.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
