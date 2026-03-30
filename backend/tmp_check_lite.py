import asyncio
import os
from sqlalchemy import text
from database import engine

async def simple_check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM playa.productos"))
        print(f"Productos: {res.scalar()}")
        
        # Check column existence
        res_cols = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'productos' AND column_name = 'id_usuario'"))
        print(f"id_usuario column: {res_cols.scalar()}")

if __name__ == "__main__":
    asyncio.run(simple_check())
