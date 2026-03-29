import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    # Try connecting to the specified database first
    database_url = os.getenv("DATABASE_URL")
    print(f"Probando conexión a: {database_url}")
    
    # Try with a fresh engine to the postgres database to see if it's a DB issue
    # Replacing the database name in the URL with 'postgres'
    base_url = "/".join(database_url.split("/")[:-1])
    test_db_url = f"{base_url}/postgres"
    print(f"Probando conexión alternativa a: {test_db_url}")

    urls_to_test = [database_url, test_db_url]
    
    for url in urls_to_test:
        engine = create_async_engine(url)
        try:
            print(f"\nIntentando conectar a {url}...")
            async with engine.connect() as conn:
                result = await conn.execute(text("SELECT CURRENT_DATABASE(), version()"))
                db_name, version = result.fetchone()
                print(f"¡CONEXIÓN EXITOSA!")
                print(f"- Base de datos: {db_name}")
                print(f"- Versión: {version}")
                break # If successful, stop
        except Exception as e:
            print(f"Falla al conectar a {url}:")
            print(f"- Tipo de error: {type(e).__name__}")
            print(f"- Mensaje: {e}")
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
