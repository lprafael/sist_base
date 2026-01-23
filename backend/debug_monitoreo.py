import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test():
    # Use the second one explicitly if we can, but load_dotenv overrides.
    # Actually, let's manually parse the .env to get both if they have the same name, 
    # or just use the one we think it is.
    
    # Based on the file, the last one wins. 
    # Let's try to get the prod one first.
    monitoreo_url = "postgresql+asyncpg://jefe-CID:vmtdmt@monitoreo.vmt.gov.py:5432/bbdd-monitoreo-prod"
    # Note: I'll use the one from .env if possible but here I'm debugging.
    
    engine = create_async_engine(monitoreo_url)
    try:
        async with engine.connect() as conn:
            print("Connected to Monitoreo DB")
            res = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'app_monitoreo_mensajeoperativo'
                ORDER BY ordinal_position
            """))
            cols = res.all()
            for col in cols:
                print(f"Col: {col[0]} ({col[1]})")
            
            print("\nSampling 1 row:")
            sample = await conn.execute(text("SELECT * FROM app_monitoreo_mensajeoperativo LIMIT 1"))
            row = sample.mappings().first()
            if row:
                for k, v in row.items():
                    print(f"{k}: {v}")
            else:
                print("No data found in table")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
