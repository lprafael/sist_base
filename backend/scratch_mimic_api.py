
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario
from dotenv import load_dotenv
from hierarchy_utils import get_visible_user_ids

load_dotenv()

async def mimic_api():
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as session:
        # Simulate admin user
        # Let's find the admin user ID
        result = await session.execute(select(Usuario).where(Usuario.username == "admin"))
        admin = result.scalar_one()
        admin_id = admin.id
        admin_role = "admin"
        
        print(f"Mimicking API call for user {admin.username} (ID: {admin_id}, Role: {admin_role})")
        
        visible_ids = await get_visible_user_ids(admin_id, admin_role, session)
        print(f"Visible IDs count: {len(visible_ids)}")
        
        if admin_role == "admin":
            stmt = select(Usuario).order_by(Usuario.rol, Usuario.nombre_completo)
        else:
            stmt = select(Usuario).where(Usuario.id.in_(visible_ids)).order_by(Usuario.rol, Usuario.nombre_completo)
            
        result = await session.execute(stmt)
        users = result.scalars().all()
        
        print(f"Users found by query: {len(users)}")
        for u in users:
            print(f"- {u.username} ({u.rol})")

if __name__ == "__main__":
    asyncio.run(mimic_api())
