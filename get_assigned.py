import asyncio
import json
from sqlalchemy import text
from backend.database import get_session

async def main():
    async for s in get_session():
        res = await s.execute(text("SELECT id, nombre, genero, fecha_nacimiento, modalidad, fase_asignada FROM torneos.tournament_players WHERE fase_asignada IS NOT NULL"))
        rows = [dict(r._mapping) for r in res.fetchall()]
        print(json.dumps(rows, indent=2, default=str))
        break

if __name__ == '__main__':
    import sys, os
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    asyncio.run(main())
