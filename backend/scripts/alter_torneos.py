import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        # Fallback just in case
        DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"
        
    print("Executing ALTER TABLE to add torneo_id to categorias and deporte_id to torneos...")
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        try:
            print("Adding deporte_id to torneos_generales.torneos...")
            await conn.execute(text("""
                ALTER TABLE torneos_generales.torneos 
                ADD COLUMN IF NOT EXISTS deporte_id INTEGER REFERENCES cancha.deportes(id) ON DELETE SET NULL;
            """))
            print("OK.")
        except Exception as e:
            print(f"Error: {e}")

        try:
            print("Adding torneo_id to torneos_generales.categorias...")
            await conn.execute(text("""
                ALTER TABLE torneos_generales.categorias 
                ADD COLUMN IF NOT EXISTS torneo_id UUID REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE;
            """))
            print("OK.")
        except Exception as e:
            print(f"Error: {e}")

    await engine.dispose()
    print("Done.")

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(run())
