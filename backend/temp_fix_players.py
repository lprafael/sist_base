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
        print("Migrating players from cancha.tournament_players to torneos.tournament_players...")
        
        # Copiar solo los jugadores cuyos equipos existan en torneos.equipos
        res = await conn.execute(text("""
            INSERT INTO torneos.tournament_players (
                id, torneo_equipo_id, nombre, dni, numero_camiseta, posicion, estado
            )
            SELECT 
                id, tournament_team_id, nombre, dni, numero_camiseta, posicion, estado
            FROM cancha.tournament_players
            WHERE id NOT IN (SELECT id FROM torneos.tournament_players)
            AND tournament_team_id IN (SELECT id FROM torneos.equipos)
        """))
        
        await conn.commit()
        print(f"Migrated {res.rowcount} players.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
