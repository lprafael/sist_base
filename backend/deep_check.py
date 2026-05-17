import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    async with async_session() as s:
        res = await s.execute(text("SELECT * FROM electoral.padron"))
        row = res.fetchone()
        print(f"PADRON RECORD: {row}")
        
        res_pv = await s.execute(text("SELECT cedula_votante FROM electoral.posibles_votantes"))
        rows_pv = res_pv.fetchall()
        print(f"SYMPATHIZERS CEDULAS: {[r[0] for r in rows_pv]}")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
