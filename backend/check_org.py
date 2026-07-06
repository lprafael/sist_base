import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import json

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def inspect():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='sistema' AND table_name='usuarios'"))
        print("usuarios columns:", [dict(r._mapping) for r in res.fetchall()])
        
        res2 = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='cancha' AND table_name='organizadores'"))
        print("organizadores columns:", [dict(r._mapping) for r in res2.fetchall()])

asyncio.run(inspect())
