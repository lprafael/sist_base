import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    async with async_session() as s:
        print("Adding eleccion_id column...")
        await s.execute(text("ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS eleccion_id INTEGER"))
        print("Adding foreign key constraint...")
        try:
            await s.execute(text("ALTER TABLE electoral.posibles_votantes ADD CONSTRAINT fk_eleccion FOREIGN KEY (eleccion_id) REFERENCES electoral.elecciones(id)"))
        except Exception:
            pass # Constraint might already exist
        
        print("Setting default eleccion_id...")
        await s.execute(text("UPDATE electoral.posibles_votantes SET eleccion_id = 1 WHERE eleccion_id IS NULL"))
        await s.commit()
        print("Database updated successfully.")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
