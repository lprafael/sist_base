import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found in .env")
        return
    # Convert to asyncpg if needed
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        print("Checking tables...")
        res = await conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'historico_itinerario'"))
        print("Tables found:", res.all())
        
        for schema in ['geometria', 'public']:
            print(f"\nColumns in {schema}:")
            res_cols = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = 'historico_itinerario' AND table_schema = '{schema}'"))
            print(list(res_cols.scalars().all()))

if __name__ == "__main__":
    asyncio.run(test())
