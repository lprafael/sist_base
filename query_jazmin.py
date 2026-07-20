import asyncio
import json
from sqlalchemy import text
from backend.database import get_session

async def main():
    async for s in get_session():
        res = await s.execute(text("SELECT id, nombre, genero, fecha_nacimiento, modalidad, fase_asignada, torneo_equipo_id FROM torneos.tournament_players WHERE nombre ILIKE '%jazmin%'"))
        rows = [dict(r._mapping) for r in res.fetchall()]
        print(json.dumps(rows, indent=2, default=str))
        
        # also get the categories for this tournament
        if rows:
            tid_res = await s.execute(text("SELECT torneo_id FROM torneos.equipos WHERE id = :eid"), {"eid": rows[0]['torneo_equipo_id']})
            tid = tid_res.scalar()
            cat_res = await s.execute(text("SELECT id, nombre FROM torneos.categorias WHERE torneo_id = :tid"), {"tid": tid})
            print("Categorias:")
            print(json.dumps([dict(r._mapping) for r in cat_res.fetchall()], indent=2, default=str))
        break

if __name__ == '__main__':
    import sys, os
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    asyncio.run(main())
