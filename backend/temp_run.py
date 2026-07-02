import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    db_url = os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+asyncpg://')
    print("Conectando a:", db_url)
    engine = create_async_engine(db_url)
    try:
        async with engine.begin() as conn:
            with open('migration_cancha.sql', 'r', encoding='utf-8') as f:
                sql = f.read()
            await conn.execute(text(sql))
        print('Schema cancha y tablas creadas exitosamente!')
    except Exception as e:
        print("Error:", e)
    finally:
        await engine.dispose()

if __name__ == '__main__':
    asyncio.run(run())
