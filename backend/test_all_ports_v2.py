import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_port(ip, port, user, password, database, file):
    url = f"postgresql+asyncpg://{user}:{password}@{ip}:{port}/{database}"
    file.write(f"\n[PUERTO {port}] Probando: {url}\n")
    print(f"Probando puerto {port}...")
    
    engine = create_async_engine(url)
    try:
        async with asyncio.timeout(5):
            async with engine.connect() as conn:
                result = await conn.execute(text("SELECT version()"))
                version = result.scalar()
                file.write(f"  --> ¡ÉXITO! Versión: {version}\n")
                return True
    except asyncio.TimeoutError:
        file.write(f"  --> ERROR: Tiempo de espera agotado (Timeout).\n")
    except Exception as e:
        file.write(f"  --> ERROR: {e}\n")
    finally:
        await engine.dispose()
    return False

async def main():
    ip = "170.51.29.84"
    user = "postgres"
    password = "adminperalta"
    database = "BBDD_playa"
    ports = [5432, 5433, 5434]
    
    with open("resultado_puertos.txt", "w", encoding="utf-8") as file:
        file.write(f"RESULTADOS DE PRUEBA DE CONEXIÓN A {ip}\n")
        file.write("="*40 + "\n")
        for port in ports:
            await test_port(ip, port, user, password, database, file)

if __name__ == "__main__":
    asyncio.run(main())
