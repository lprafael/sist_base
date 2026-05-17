
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT count(*) FROM electoral.personas"))
            print(f"Personas count: {res.scalar()}")
        except:
            print("Table personas not ready yet")
            
        try:
            res = await conn.execute(text("SELECT count(*) FROM electoral.padrones"))
            print(f"Padrones count: {res.scalar()}")
        except:
            print("Table padrones not ready yet")

if __name__ == "__main__":
    asyncio.run(check())
