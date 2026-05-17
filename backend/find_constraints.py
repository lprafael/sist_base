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
        res = await s.execute(text("SELECT constraint_name FROM information_schema.key_column_usage WHERE table_name = 'padrones' AND table_schema = 'electoral' AND column_name = 'local_id'"))
        rows = res.fetchall()
        print("CONSTRAINTS on padrones.local_id:")
        for r in rows:
            print(f"- {r[0]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
