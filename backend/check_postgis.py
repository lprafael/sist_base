import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

async def check_postgis():
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    if not os.path.exists(dotenv_path):
        dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(dotenv_path)
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("No DATABASE_URL found")
        return
        
    if "asyncpg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(db_url)
    try:
        async with engine.connect() as conn:
            # Intentar activar postgis si no lo está
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            await conn.commit()
            
            res = await conn.execute(text("SELECT postgis_full_version();"))
            row = res.scalar()
            print(f"PostGIS version: {row}")
    except Exception as e:
        print(f"Error checking PostGIS: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_postgis())
