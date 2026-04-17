
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario
from dotenv import load_dotenv

load_dotenv()

async def check_admin_territory():
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as session:
        result = await session.execute(select(Usuario).where(Usuario.username == "admin"))
        admin = result.scalar_one()
        print(f"Admin: {admin.username}, Dept: {admin.departamento_id}, Dist: {admin.distrito_id}")

if __name__ == "__main__":
    asyncio.run(check_admin_territory())
