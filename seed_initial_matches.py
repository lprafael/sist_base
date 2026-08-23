import asyncio
import os
import sys
import uuid
import json
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv('backend/.env')
DB_URL = os.getenv('DATABASE_URL')
engine = create_async_engine(DB_URL, echo=False)

async def main():
    target_torneo_id = "2ed2f229-6e67-400b-adc4-b6a7371ebcf3"

    async with engine.begin() as conn:
        print("1. Obteniendo atletas cargados...")
        res_p = await conn.execute(text("""
            SELECT tp.id, tp.nombre, tp.modalidad, tp.categoria_id, tp.torneo_equipo_id, e.nombre as dojo_nombre
            FROM torneos.tournament_players tp
            JOIN torneos.equipos e ON tp.torneo_equipo_id = e.id
            WHERE e.torneo_id = CAST(:tid AS UUID)
            ORDER BY tp.modalidad, tp.creado_en
        """), {"tid": target_torneo_id})
        atletas = [dict(r._mapping) for r in res_p.fetchall()]
        print(f"Total atletas encontrados: {len(atletas)}")

        # Limpiar partidos previos del torneo
        await conn.execute(text("DELETE FROM torneos.partidos WHERE torneo_id = CAST(:tid AS UUID)"), {"tid": target_torneo_id})

        # Agrupar atletas por parejas para crear combates de Ronda 1
        kumite_atletas = [a for a in atletas if a["modalidad"] == "Kumite"]
        kata_atletas = [a for a in atletas if a["modalidad"] == "Kata"]

        combates_creados = 0

        # A. Combates de Kumite
        for idx in range(0, len(kumite_atletas) - 1, 2):
            p1 = kumite_atletas[idx]
            p2 = kumite_atletas[idx + 1]
            match_id = str(uuid.uuid4())
            jornada = (combates_creados + 1)

            stats = {
                "tipo_reglamento": "WKF",
                "ronda": f"Ronda 1 - Combate {jornada}",
                "orden_combate": jornada,
                "local": {"color": "AKA", "puntos": 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False, "penalizaciones": 0, "jogai": 0, "video_review": "ACTIVE"},
                "visitante": {"color": "AO", "puntos": 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False, "penalizaciones": 0, "jogai": 0, "video_review": "ACTIVE"}
            }

            await conn.execute(text("""
                INSERT INTO torneos.partidos 
                (id, torneo_id, equipo_local_id, equipo_visitante_id,
                 jugador_local_id, jugador_visitante_id, goles_local, goles_visitante, estado, fase, jornada, estadisticas)
                VALUES 
                (CAST(:id AS UUID), CAST(:tid AS UUID), CAST(:el_id AS UUID), CAST(:ev_id AS UUID),
                 CAST(:jl_id AS UUID), CAST(:jv_id AS UUID), 0, 0, 'programado', 'Fase 1', :jornada, :stats)
            """), {
                "id": match_id,
                "tid": target_torneo_id,
                "el_id": p1['torneo_equipo_id'],
                "ev_id": p2['torneo_equipo_id'],
                "jl_id": p1['id'],
                "jv_id": p2['id'],
                "jornada": jornada,
                "stats": json.dumps(stats)
            })
            combates_creados += 1

        # B. Combates de Kata (Banderas)
        for idx in range(0, len(kata_atletas) - 1, 2):
            p1 = kata_atletas[idx]
            p2 = kata_atletas[idx + 1]
            match_id = str(uuid.uuid4())
            jornada = (combates_creados + 1)

            stats = {
                "tipo_reglamento": "WKF",
                "modalidad_kata": "banderas",
                "ronda": f"Kata Ronda 1 - Match {jornada}",
                "orden_combate": jornada,
                "num_jueces": 5,
                "votos_jueces": ["aka", "aka", "aka", "ao", "ao"]
            }

            await conn.execute(text("""
                INSERT INTO torneos.partidos 
                (id, torneo_id, equipo_local_id, equipo_visitante_id,
                 jugador_local_id, jugador_visitante_id, goles_local, goles_visitante, estado, fase, jornada, estadisticas)
                VALUES 
                (CAST(:id AS UUID), CAST(:tid AS UUID), CAST(:el_id AS UUID), CAST(:ev_id AS UUID),
                 CAST(:jl_id AS UUID), CAST(:jv_id AS UUID), 0, 0, 'programado', 'Fase 1', :jornada, :stats)
            """), {
                "id": match_id,
                "tid": target_torneo_id,
                "el_id": p1['torneo_equipo_id'],
                "ev_id": p2['torneo_equipo_id'],
                "jl_id": p1['id'],
                "jv_id": p2['id'],
                "jornada": jornada,
                "stats": json.dumps(stats)
            })
            combates_creados += 1

        print(f"\nExito: Se crearon {combates_creados} combates iniciales de prueba en 'Partidos y Llaves'.")

    async with engine.connect() as conn:
        res_cnt = await conn.execute(text("SELECT count(*) FROM torneos.partidos WHERE torneo_id = CAST(:tid AS UUID)"), {"tid": target_torneo_id})
        print(f"CONFIRMACION PARTIDOS EN BD: {res_cnt.scalar()}")

if __name__ == '__main__':
    asyncio.run(main())
