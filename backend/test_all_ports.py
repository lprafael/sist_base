import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_port(ip, port, user, password, database):
    # DATABASE_URL=postgresql+asyncpg://postgres:adminperalta@170.51.29.84:5432/BBDD_playa
    url = f"postgresql+asyncpg://{user}:{password}@{ip}:{port}/{database}"
    
    print(f"\n[PORT {port}] Intentando conectar a: {url}")
    
    engine = create_async_engine(url)
    try:
        # We use a short timeout (5 seconds)
        async with asyncio.timeout(5):
            async with engine.connect() as conn:
                result = await conn.execute(text("SELECT version()"))
                version = result.scalar()
                print(f"¡CONEXIÓN EXITOSA EN PUERTO {port}!")
                print(f"Versión: {version}")
                return True
    except asyncio.TimeoutError:
        print(f"Tiempo de espera agotado en puerto {port}.")
    except Exception as e:
        print(f"Error en puerto {port}: {e}")
    finally:
        await engine.dispose()
    return False

async def main():
    ip = "170.51.29.84"
    user = "postgres"
    password = "adminperalta"
    database = "BBDD_playa"
    ports = [5432, 5433, 5434]
    
    for port in ports:
        await test_port(ip, port, user, password, database)

if __name__ == "__main__":
    asyncio.run(main())
