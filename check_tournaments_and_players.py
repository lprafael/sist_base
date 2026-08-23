import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv('backend/.env')
DB_URL = os.getenv('DATABASE_URL')
engine = create_async_engine(DB_URL, echo=False)

async def main():
    async with engine.connect() as conn:
        print("=== TODOS LOS TORNEOS ===")
        res = await conn.execute(text("""
            SELECT id, nombre, deporte, organizador_id, creado_en
            FROM torneos.torneos
            WHERE nombre ILIKE '%45%' OR nombre ILIKE '%Karate%'
            ORDER BY creado_en DESC
        """))
        torneos = res.fetchall()
        for t in torneos:
            print(f"Torneo ID: {t.id} | Nombre: '{t.nombre}' | Deporte: {t.deporte} | OrgID: {t.organizador_id} | Creado: {t.creado_en}")

            # Contar jugadores en tournament_players
            res_p = await conn.execute(text("""
                SELECT count(*) FROM torneos.tournament_players tp
                JOIN torneos.equipos e ON tp.torneo_equipo_id = e.id
                WHERE e.torneo_id = CAST(:tid AS UUID)
            """), {"tid": t.id})
            cnt_p = res_p.scalar()

            # Contar participantes en torneos_generales
            try:
                res_tg = await conn.execute(text("SELECT count(*) FROM torneos_generales.participantes WHERE torneo_id = CAST(:tid AS UUID)"), {"tid": t.id})
                cnt_tg = res_tg.scalar()
            except Exception:
                cnt_tg = 0

            print(f"  -> tournament_players: {cnt_p} | torneos_generales: {cnt_tg}")

if __name__ == '__main__':
    asyncio.run(main())
