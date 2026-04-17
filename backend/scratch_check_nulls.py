
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario
from dotenv import load_dotenv

load_dotenv()

async def check_nulls():
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as session:
        result = await session.execute(select(Usuario))
        users = result.scalars().all()
        
        required_fields = ['id', 'username', 'email', 'nombre_completo', 'rol', 'activo', 'fecha_creacion']
        
        for u in users:
            missing = []
            for field in required_fields:
                if getattr(u, field) is None:
                    missing.append(field)
            if missing:
                print(f"User '{u.username}' (ID: {u.id}) is missing required fields: {missing}")
            else:
                pass # OK

if __name__ == "__main__":
    asyncio.run(check_nulls())
