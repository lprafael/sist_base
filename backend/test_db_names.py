import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_db_name(ip, port, user, password, db_name):
    url = f"postgresql+asyncpg://{user}:{password}@{ip}:{port}/{db_name}"
    print(f"Probando DB '{db_name}' en puerto {port}...")
    
    engine = create_async_engine(url)
    try:
        async with asyncio.timeout(5):
            async with engine.connect() as conn:
                result = await conn.execute(text("SELECT CURRENT_DATABASE()"))
                print(f"  --> ¡ÉXITO! Conectado a: {result.scalar()}")
                return True
    except Exception as e:
        print(f"  --> FALLA: {e}")
    finally:
        await engine.dispose()
    return False

async def main():
    ip = "170.51.29.84"
    user = "postgres"
    password = "adminperalta"
    port = 5432
    
    # Probando nombres de DB comunes
    db_names = ["BBDD_playa", "postgres", "sist_playa", "playa"]
    
    for db in db_names:
        await test_db_name(ip, port, user, password, db)

if __name__ == "__main__":
    asyncio.run(main())
