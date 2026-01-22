# create_admin.py
# Script para crear el primer usuario administrador

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from models import Usuario
from security import get_password_hash
from dotenv import load_dotenv

load_dotenv()

async def create_admin_user():
    """Crea el primer usuario administrador"""
    
    # Configuración de la base de datos
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("Error: DATABASE_URL no está configurada en el archivo .env")
        return
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as session:
        # Verificar si ya existe un usuario administrador
        from sqlalchemy.future import select
        result = await session.execute(select(Usuario).where(Usuario.rol == "admin"))
        admin_exists = result.scalar_one_or_none()
        
        if admin_exists:
            print("Ya existe un usuario administrador en el sistema.")
            return
        
        # Crear usuario administrador
        admin_password = "Admin123!"  # Contraseña por defecto
        hashed_password = get_password_hash(admin_password)
        
        admin_user = Usuario(
            username="admin",
            email="admin@vmt-cid.com",
            hashed_password=hashed_password,
            nombre_completo="Administrador del Sistema",
            rol="admin",
            activo=True
        )
        
        session.add(admin_user)
        await session.commit()
        
        print("Usuario administrador creado exitosamente!")
        print(f"Usuario: admin")
        print(f"Contraseña: {admin_password}")
        print("IMPORTANTE: Cambia la contraseña después del primer inicio de sesión.")

if __name__ == "__main__":
    asyncio.run(create_admin_user()) 