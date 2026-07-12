import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def add_columns():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set")
        return
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(database_url, echo=False)
    
    async with engine.connect() as conn:
        print("Adding nombre_abreviado...")
        try:
            await conn.execute(text("ALTER TABLE torneos.tournament_players ADD COLUMN nombre_abreviado VARCHAR(100);"))
        except Exception as e:
            print(f"Error (maybe already exists): {e}")

        print("Adding telefono...")
        try:
            await conn.execute(text("ALTER TABLE torneos.tournament_players ADD COLUMN telefono VARCHAR(50);"))
        except Exception as e:
            print(f"Error (maybe already exists): {e}")
            
        await conn.commit()
    
    await engine.dispose()
    print("Done")

if __name__ == "__main__":
    asyncio.run(add_columns())
