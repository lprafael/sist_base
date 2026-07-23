import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import DATABASE_URL

async def get_check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("""
            SELECT pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conname = 'torneos_formato_check'
        """))
        print("Constraint def:", res.scalar())

asyncio.run(get_check())
