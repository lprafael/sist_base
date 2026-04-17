
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario
from dotenv import load_dotenv

load_dotenv()

async def check_users():
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as session:
        result = await session.execute(select(Usuario))
        users = result.scalars().all()
        
        print(f"Total users: {len(users)}")
        for u in users:
            print(f"User: {u.username}, Role: '{u.rol}', Active: {u.activo}")

if __name__ == "__main__":
    asyncio.run(check_users())
