import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text

async def drop_cancha_roles():
    print("Conectando a la base de datos para eliminar cancha.roles...")
    try:
        async with SessionLocal() as session:
            await session.execute(text("DROP TABLE IF EXISTS cancha.roles CASCADE;"))
            await session.commit()
            print("Tabla cancha.roles eliminada exitosamente (CASCADE).")
    except Exception as e:
        print(f"Error eliminando la tabla: {e}")

if __name__ == "__main__":
    asyncio.run(drop_cancha_roles())
