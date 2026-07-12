import asyncio
from database import engine
from sqlalchemy import text

async def run():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("ALTER TABLE torneos.tournament_players ALTER COLUMN foto_url TYPE TEXT;"))
            await conn.commit()
            print("Successfully changed foto_url to TEXT in torneos.tournament_players")
    except Exception as e:
        print(f"Exception: {type(e).__name__}: {str(e)}")

asyncio.run(run())
