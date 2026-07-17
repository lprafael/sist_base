import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext

# Adjust path so it can find backend modules if needed, though we just need sqlalchemy and passlib
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/poliverso_db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_academia():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    username = "academia_demo"
    password = "Password123"
    email = "academia_demo@micancha.com.py"
    hashed_password = pwd_context.hash(password)
    
    async with engine.connect() as conn:
        try:
            async with conn.begin():
                # Delete if exists to avoid conflicts
                await conn.execute(text("DELETE FROM sistema.usuarios WHERE username = :usr"), {"usr": username})
                
                # Insert usuario
                stmt_user = text("""
                    INSERT INTO sistema.usuarios (username, email, hashed_password, nombre_completo, rol, activo)
                    VALUES (:usr, :em, :pwd, 'Academia Demo', 'academia', true)
                    RETURNING id
                """)
                
                result = await conn.execute(stmt_user, {"usr": username, "em": email, "pwd": hashed_password})
                user_id = result.scalar()
                
                # Insert academia
                stmt_acad = text("""
                    INSERT INTO academias.academias (usuario_id, nombre, enlace_sitio, color_primario, acerca_de)
                    VALUES (:uid, 'Academia Elite Pro', 'elite-pro', '#10B981', 'Formando a los campeones del mañana.')
                """)
                await conn.execute(stmt_acad, {"uid": user_id})
                
                print(f"=== CREDENCIALES CREADAS ===")
                print(f"Usuario: {username}")
                print(f"Password: {password}")
                print(f"URL: micancha.com.py/academia/elite-pro")
                print(f"============================")
        except Exception as e:
            print(f"Error: {e}")
            
    await engine.dispose()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(create_test_academia())
