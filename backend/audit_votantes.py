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
        res = await s.execute(text("SELECT id_referente, count(*) FROM electoral.posibles_votantes GROUP BY id_referente"))
        print("POSIBLES VOTANTES PER REFERENTE:")
        for r in res.fetchall():
            print(f"Referente ID {r[0]}: {r[1]} votantes")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
