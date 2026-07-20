import asyncio
import json
from sqlalchemy import text
from backend.database import get_session

async def main():
    async for s in get_session():
        res = await s.execute(text("SELECT deporte FROM torneos.torneos WHERE id = (SELECT torneo_id FROM torneos.equipos WHERE id = '78fc772d-b19d-4739-9cc2-019cc8af7274')"))
        print("Deporte:", res.scalar())
        break

if __name__ == '__main__':
    import sys, os
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    asyncio.run(main())
