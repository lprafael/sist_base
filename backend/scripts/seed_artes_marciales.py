import asyncio
import os
import sys
import uuid
import json
from datetime import datetime, date, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import DATABASE_URL
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def seed_artes_marciales():
    print("=" * 60)
    print("SEMBRANDO DATOS DE PRUEBA: V° Campeonato Regional de Artes Marciales")
    print("=" * 60)

    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as session:
        try:
            # 1. Obtener un complejo existente o usar el por defecto
            res_comp = await session.execute(text("SELECT id, nombre FROM cancha.complejos LIMIT 1"))
            comp_row = res_comp.fetchone()
            if not comp_row:
                print("No se encontró ningún complejo en la base de datos para asociar el torneo.")
                return
            complejo_id, complejo_nombre = comp_row[0], comp_row[1]
            print(f"Asociando torneo al complejo: '{complejo_nombre}' (ID: {complejo_id})")

            # 2. Crear Evento Padre de Torneo
            evento_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos.eventos (id, complejo_id, nombre, descripcion, fecha_inicio, fecha_fin, estado)
                VALUES (:id, :cid, :nombre, :desc, :f_ini, :f_fin, 'en_curso')
            """), {
                "id": evento_id, "cid": complejo_id, 
                "nombre": "V° Campeonato Regional de Artes Marciales",
                "desc": "El campeonato regional de artes marciales mixtas más importante de la temporada.",
                "f_ini": date.today() - timedelta(days=5), "f_fin": date.today() + timedelta(days=15)
            })

            # 3. Crear Torneo / Categoría
            torneo_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos.torneos (
                    id, evento_id, complejo_id, categoria, nombre, descripcion, deporte, formato,
                    fecha_inicio, max_equipos, costo_inscripcion, premio_1, premio_2, estado, configuracion
                ) VALUES (
                    :id, :ev_id, :cid, 'Cinturones Negros Abierto', :nombre, :desc, 'Artes Marciales', 'eliminacion_simple',
                    :f_ini, 16, 150000.0, 'Medalla de Oro + Gs. 1.000.000', 'Medalla de Plata + Equipamiento', 'en_curso', :config
                )
            """), {
                "id": torneo_id, "ev_id": evento_id, "cid": complejo_id,
                "nombre": "V° Campeonato Regional - Cinturones Negros Abierto",
                "desc": "Categoría abierta para los mejores luchadores.",
                "f_ini": date.today() - timedelta(days=5),
                "config": json.dumps({"tipo_llave": "eliminacion_directa"})
            })
            print(f"Torneo creado: 'V° Campeonato Regional - Cinturones Negros Abierto' (ID: {torneo_id})")

            # 4. Crear Academias (Equipos) - 10 academias
            academias_data = [
                {"nombre": "Cobra Kai Dojo", "color": "#000000"},
                {"nombre": "Miyagi-Do Karate", "color": "#ffffff"},
                {"nombre": "Eagle Fang Karate", "color": "#ef4444"},
                {"nombre": "Team Alpha Male", "color": "#3b82f6"},
                {"nombre": "Gracie Barra Asunción", "color": "#10b981"},
                {"nombre": "Chute Boxe", "color": "#f59e0b"},
                {"nombre": "American Top Team", "color": "#6366f1"},
                {"nombre": "Nova União", "color": "#ec4899"},
                {"nombre": "Alliance Jiu-Jitsu", "color": "#8b5cf6"},
                {"nombre": "Tiger Muay Thai", "color": "#f97316"},
            ]

            equipos_creados = []
            for eq in academias_data:
                eq_id = str(uuid.uuid4())
                await session.execute(text("""
                    INSERT INTO torneos.equipos (id, torneo_id, nombre, color_principal, color_secundario, estado_inscripcion)
                    VALUES (:id, :tid, :nombre, :col, :sec, 'confirmado')
                """), {"id": eq_id, "tid": torneo_id, "nombre": eq["nombre"], "col": eq["color"], "sec": "#cccccc"})
                equipos_creados.append({"id": eq_id, "nombre": eq["nombre"]})
                print(f"  Academia inscrita: {eq['nombre']} (ID: {eq_id})")

            # 5. Crear Luchadores (3 por academia = 30 luchadores)
            nombres_luchadores = [
                "Johnny Lawrence", "Daniel LaRusso", "Miguel Diaz",
                "Robby Keene", "Samantha LaRusso", "Eli Moskowitz",
                "Conor McGregor", "Khabib Nurmagomedov", "Jon Jones",
                "Georges St-Pierre", "Anderson Silva", "Fedor Emelianenko",
                "Amanda Nunes", "Ronda Rousey", "Valentina Shevchenko",
                "Israel Adesanya", "Kamaru Usman", "Francis Ngannou",
                "Charles Oliveira", "Dustin Poirier", "Justin Gaethje",
                "Max Holloway", "Alexander Volkanovski", "Jose Aldo",
                "Demetrious Johnson", "Henry Cejudo", "Deiveson Figueiredo",
                "Aljamain Sterling", "Petr Yan", "T.J. Dillashaw"
            ]

            luchadores_count = 0
            for i, equipo in enumerate(equipos_creados):
                # Tomar 3 nombres por equipo
                nombres_equipo = nombres_luchadores[i*3:(i+1)*3]
                for pos, nombre in enumerate(nombres_equipo):
                    p_id = str(uuid.uuid4())
                    dni_mock = f"100{i}{pos}555"
                    
                    await session.execute(text("""
                        INSERT INTO cancha.tournament_players (id, tournament_team_id, nombre, dni, numero_camiseta, posicion, estado)
                        VALUES (:id, :teid, :nombre, :dni, :num, :pos, 'habilitado')
                    """), {
                        "id": p_id, "teid": equipo["id"], "nombre": nombre, 
                        "dni": dni_mock, "num": pos+1, "pos": "Luchador"
                    })
                    luchadores_count += 1
            
            print(f"  {luchadores_count} Luchadores registrados exitosamente.")

            await session.commit()
            print("=" * 60)
            print("DATOS DE PRUEBA GENERADOS CORRECTAMENTE")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"Error durante el seeding: {e}")

if __name__ == "__main__":
    asyncio.run(seed_artes_marciales())
