import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Updating torneos_generales.encuentros: renaming grupo_id to division_id...")
        # Check if column exists first
        r = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema='torneos_generales' AND table_name='encuentros'
            ORDER BY ordinal_position
        """))
        cols = [row[0] for row in r.fetchall()]
        print("Current columns:", cols)
        
        if 'grupo_id' in cols and 'division_id' not in cols:
            await conn.execute(text("ALTER TABLE torneos_generales.encuentros RENAME COLUMN grupo_id TO division_id"))
            print("Renamed grupo_id -> division_id")
        elif 'division_id' in cols:
            print("division_id already exists, skipping.")
        else:
            print("grupo_id not found, adding division_id...")
            await conn.execute(text("ALTER TABLE torneos_generales.encuentros ADD COLUMN division_id UUID REFERENCES torneos_generales.divisiones(id) ON DELETE CASCADE"))
        
        print("Done!")

asyncio.run(migrate())
