import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
engine = create_async_engine(os.getenv('DATABASE_URL'))

async def test():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='torneos' AND table_name='tournament_players'"))
        rows = res.fetchall()
        for r in rows:
            print(r)
    await engine.dispose()

asyncio.run(test())
