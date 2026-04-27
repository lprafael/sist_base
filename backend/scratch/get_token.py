
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from database import engine

async def get_token():
    async with engine.connect() as conn:
        # Buscar el token de la sesión más reciente
        result = await conn.execute(text("SELECT token FROM sistema.sesiones_usuarios WHERE activa = True ORDER BY fecha_inicio DESC LIMIT 1"))
        token = result.scalar()
        print(f"Token: {token}")

if __name__ == "__main__":
    asyncio.run(get_token())
