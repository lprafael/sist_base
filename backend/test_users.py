import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_user(ip, port, user, password, db):
    url = f"postgresql+asyncpg://{user}:{password}@{ip}:{port}/{db}"
    print(f"Probando usuario '{user}'...")
    
    engine = create_async_engine(url)
    try:
        async with asyncio.timeout(5):
            async with engine.connect() as conn:
                print(f"  --> ¡ÉXITO! Conectado con usuario '{user}'")
                return True
    except Exception as e:
        print(f"  --> FALLA: {e}")
    finally:
        await engine.dispose()
    return False

async def main():
    ip = "170.51.29.84"
    port = 5432
    db = "BBDD_playa"
    password = "adminperalta"
    
    # Probando nombres de usuario comunes
    users = ["postgres", "admin", "peralta", "adminperalta", "playa"]
    
    for user in users:
        await test_user(ip, port, user, password, db)

if __name__ == "__main__":
    asyncio.run(main())
