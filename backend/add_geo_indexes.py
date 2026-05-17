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
        print("Adding indexes to electoral.padrones...")
        # Index for territory-based counts and filters
        await s.execute(text("CREATE INDEX IF NOT EXISTS idx_padrones_territorio ON electoral.padrones (departamento_id, distrito_id, local_id)"))
        await s.execute(text("CREATE INDEX IF NOT EXISTS idx_padrones_cedula ON electoral.padrones (cedula)"))
        
        print("Adding spatial index to cartografia.barrios if missing...")
        await s.execute(text("CREATE INDEX IF NOT EXISTS idx_barrios_geom ON cartografia.barrios USING GIST (geometry)"))
        
        print("Adding spatial index to cartografia.distritos if missing...")
        await s.execute(text("CREATE INDEX IF NOT EXISTS idx_distritos_geom ON cartografia.distritos USING GIST (geometry)"))

        await s.commit()
        print("Indexes created successfully.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
