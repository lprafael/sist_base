import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha')

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text(
            "SELECT id, email, rol, activo, nombre_completo FROM sistema.usuarios LIMIT 10"
        ))
        rows = result.fetchall()
        print("Users in sistema.usuarios:")
        for r in rows:
            print("-", dict(r._mapping))
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
