import asyncio
import os
import ssl
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_ssl(ip, port, user, password, db):
    # Try connecting with SSL enabled
    url = f"postgresql+asyncpg://{user}:{password}@{ip}:{port}/{db}?ssl=require"
    print(f"Probando conexión con SSL (ssl=require)...")
    
    engine = create_async_engine(url)
    try:
        async with asyncio.timeout(10):
            async with engine.connect() as conn:
                print(f"  --> ¡ÉXITO! Conectado usando SSL.")
                return True
    except Exception as e:
        print(f"  --> FALLA con SSL: {e}")
    finally:
        await engine.dispose()
    return False

async def main():
    ip = "170.51.29.84"
    port = 5432
    user = "postgres"
    password = "adminperalta"
    db = "BBDD_playa"
    
    await test_ssl(ip, port, user, password, db)

if __name__ == "__main__":
    asyncio.run(main())
