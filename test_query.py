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
    torneo_id = "2ed2f229-6e67-400b-adc4-b6a7371ebcf3"
    async with engine.connect() as conn:
        print("=== 1. CHECK-IN QUERY ===")
        q_checkin = text("""
            SELECT j.id, j.nombre, j.dni, j.estado, j.peso_verificado, j.estatura_verificada, j.pago_confirmado, 
                   j.modalidad, j.nivel_experiencia, e.nombre as equipo_nombre
            FROM torneos.tournament_players j
            JOIN torneos.equipos e ON j.torneo_equipo_id = e.id
            WHERE e.torneo_id = CAST(:tid AS UUID)
            ORDER BY j.nombre ASC
        """)
        res = await conn.execute(q_checkin, {"tid": torneo_id})
        players = [dict(r._mapping) for r in res.fetchall()]
        print(f"Total en Check-in: {len(players)}")
        for p in players[:5]:
            print(f" - {p['nombre']} | {p['equipo_nombre']} | {p['modalidad']} | {p['peso_verificado']}kg | {p['estado']}")

        print("\n=== 2. PARTIDOS QUERY ===")
        q_partidos = text("""
            SELECT p.*, el.nombre as equipo_local, ev.nombre as equipo_visitante,
                   jl.nombre as jugador_local_nombre, jv.nombre as jugador_visitante_nombre
            FROM torneos.partidos p
            LEFT JOIN torneos.equipos el ON p.equipo_local_id = el.id
            LEFT JOIN torneos.equipos ev ON p.equipo_visitante_id = ev.id
            LEFT JOIN torneos.tournament_players jl ON p.jugador_local_id = jl.id
            LEFT JOIN torneos.tournament_players jv ON p.jugador_visitante_id = jv.id
            WHERE p.torneo_id = CAST(:tid AS UUID)
            ORDER BY p.jornada ASC
        """)
        res_part = await conn.execute(q_partidos, {"tid": torneo_id})
        partidos = [dict(r._mapping) for r in res_part.fetchall()]
        print(f"Total en Partidos: {len(partidos)}")
        for m in partidos[:5]:
            print(f" - Jornada {m['jornada']}: {m['jugador_local_nombre']} ({m['equipo_local']}) vs {m['jugador_visitante_nombre']} ({m['equipo_visitante']})")

if __name__ == '__main__':
    asyncio.run(main())
