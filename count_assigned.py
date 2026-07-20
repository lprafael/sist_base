import asyncio
import json
from sqlalchemy import text
from backend.database import get_session

async def main():
    async for s in get_session():
        res = await s.execute(text("SELECT COUNT(*) FROM torneos.tournament_players WHERE fase_asignada IS NOT NULL"))
        print('Total assigned:', res.scalar())
        break

if __name__ == '__main__':
    import sys, os
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    asyncio.run(main())
