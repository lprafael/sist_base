import asyncio
import random
import os
import sys
from datetime import date, timedelta
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Buscando torneo 'V° Campeonato Regional de Artes Marciales'...")
        res = await conn.execute(text("SELECT id FROM torneos.torneos WHERE nombre ILIKE '%Artes Marciales%' LIMIT 1"))
        row = res.fetchone()
        
        if not row:
            print("No se encontró el torneo.")
            return
            
        torneo_id = row[0]
        print(f"Torneo ID: {torneo_id}")
        
        res = await conn.execute(text("SELECT id FROM torneos.equipos WHERE torneo_id = :tid"), {"tid": torneo_id})
        equipos = res.fetchall()
        equipo_ids = [e[0] for e in equipos]
        
        if not equipo_ids:
            print("No hay equipos en este torneo.")
            return
            
        print(f"Se encontraron {len(equipo_ids)} equipos.")
        
        generos = ['M', 'F']
        start_date = date(2020, 1, 1)
        end_date = date(2022, 12, 31)
        delta = end_date - start_date
        
        for eq_id in equipo_ids:
            res_jugadores = await conn.execute(text("SELECT id FROM torneos.tournament_players WHERE torneo_equipo_id = :eq_id"), {"eq_id": eq_id})
            jugador_ids = [j[0] for j in res_jugadores.fetchall()]
            
            for j_id in jugador_ids:
                rand_days = random.randrange(delta.days + 1)
                rand_date = start_date + timedelta(days=rand_days)
                rand_gen = random.choice(generos)
                
                await conn.execute(text("""
                    UPDATE torneos.tournament_players 
                    SET fecha_nacimiento = :f, genero = :g 
                    WHERE id = :jid
                """), {"f": rand_date, "g": rand_gen, "jid": j_id})
                
        await conn.commit()
        print("Actualizados todos los jugadores con fecha_nacimiento y genero aleatorios entre 2020 y 2022.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
