
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def check_creado_por():
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, username, creado_por FROM sistema.usuarios"))
        print("Users and their creators:")
        for r in res.fetchall():
            print(f" - ID={r[0]}, Username='{r[1]}', Creado_por={r[2]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_creado_por())
