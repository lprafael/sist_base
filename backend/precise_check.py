import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def check():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    async with async_session() as s:
        res = await s.execute(text("SELECT username, rol FROM sistema.usuarios WHERE username = 'intendente_test'"))
        row = res.fetchone()
        if row:
            print(f"USER: {row.username}, ROLE: '{row.rol}'")
        else:
            print("User not found")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
