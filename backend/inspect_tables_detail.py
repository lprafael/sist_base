import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import DATABASE_URL

async def inspect_details():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        for table in ['torneos', 'equipos', 'grupos', 'partidos', 'posiciones', 'tournament_players', 'eventos_partido', 'tarjetas']:
            res = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='torneos' AND table_name='{table}'"))
            cols = [f"{r[0]} ({r[1]})" for r in res.fetchall()]
            print(f"\n--- torneos.{table} ---")
            print(", ".join(cols))

asyncio.run(inspect_details())
