import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test():
    db_url = os.getenv("DATABASE_URL")
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        print("Counts for historico_itinerario:")
        
        try:
            res_geom = await conn.execute(text("SELECT count(*) FROM geometria.historico_itinerario"))
            print("geometria.historico_itinerario count:", res_geom.scalar())
        except Exception as e:
            print("geometria.historico_itinerario error:", e)

        try:
            res_pub = await conn.execute(text("SELECT count(*) FROM public.historico_itinerario"))
            print("public.historico_itinerario count:", res_pub.scalar())
        except Exception as e:
            print("public.historico_itinerario error:", e)

if __name__ == "__main__":
    asyncio.run(test())
