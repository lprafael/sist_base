
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
        result = await session.execute(select(Usuario).where(Usuario.username == "admin"))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"Admin found: ID={user.id}, Username='{user.username}', Role='{user.rol}'")
            print(f"Role length: {len(user.rol)}")
            print(f"Role exact matches 'admin': {user.rol == 'admin'}")
        else:
            print("Admin user not found!")

if __name__ == "__main__":
    asyncio.run(check_users())
