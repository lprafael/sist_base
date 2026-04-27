import asyncio
from database import engine, Base
from sqlalchemy import text
from models import Usuario, Rol, Permiso, LogAuditoria, LogAcceso, SesionUsuario
# Importar otros modelos si es necesario para que Base.metadata los reconozca

async def init_db():
    print("Conectando a la base de datos...")
    async with engine.begin() as conn:
        print("Creando esquemas 'sistema' y 'playa'...")
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS sistema;"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS playa;"))
        
        print("Creando todas las tablas...")
        # Esto usará las definiciones en models.py
        await conn.run_sync(Base.metadata.create_all)
        
    print("¡Base de datos inicializada correctamente!")

if __name__ == "__main__":
    asyncio.run(init_db())
