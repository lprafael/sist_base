import asyncio
from database import engine, SessionLocal
from models import Usuario, Rol, Permiso
from security import get_password_hash
from sqlalchemy import text

async def seed_admin():
    async with engine.begin() as conn:
        # Asegurar que el rol admin existe
        await conn.execute(text("INSERT INTO sistema.roles (nombre, descripcion) VALUES ('admin', 'Administrador Total') ON CONFLICT DO NOTHING;"))
        
    async with SessionLocal() as session:
        # Crear usuario admin si no existe
        hashed_pw = get_password_hash("admin") # Contraseña por defecto: admin
        admin_user = Usuario(
            username="admin",
            email="admin@micoche.com.py",
            hashed_password=hashed_pw,
            nombre_completo="Administrador Sistema",
            rol="admin",
            activo=True
        )
        session.add(admin_user)
        try:
            await session.commit()
            print("¡Usuario 'admin' creado con éxito! Contraseña: admin")
        except Exception as e:
            await session.rollback()
            print(f"El usuario ya existía o hubo un error: {e}")

if __name__ == "__main__":
    asyncio.run(seed_admin())
