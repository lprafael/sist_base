import asyncio
import os
import sys
import uuid
import json
from datetime import datetime, date, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import DATABASE_URL

async def seed_data():
    print("=" * 70)
    print("SEMBRANDO TORNEO COMPLETO 'GRUPO + ELIMINATORIA' PARA ORGANIZACION GENERAL")
    print("=" * 70)

    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        try:
            # 1. Obtener Organizacion General (id = 5)
            res_org = await conn.execute(text("SELECT id, usuario_id, nombre FROM cancha.organizadores WHERE id = 5 OR nombre ILIKE '%Organizacion General%' LIMIT 1"))
            org_row = res_org.fetchone()
            if not org_row:
                print("No se encontro el organizador 'Organizacion General'.")
                return

            org_id, usuario_id, org_nombre = org_row[0], org_row[1], org_row[2]
            print(f"Organizador seleccionado: '{org_nombre}' (ID: {org_id}, Usuario ID: {usuario_id})")

            # 2. Obtener un complejo por defecto
            res_comp = await conn.execute(text("SELECT id, nombre FROM cancha.complejos LIMIT 1"))
            comp_row = res_comp.fetchone()
            complejo_id = comp_row[0] if comp_row else None
            complejo_nombre = comp_row[1] if comp_row else "Complejo Central"

            # 3. Crear el Evento Padre
            evento_id = str(uuid.uuid4())
            await conn.execute(text("""
                INSERT INTO torneos.eventos (id, complejo_id, organizador_id, nombre, descripcion, fecha_inicio, fecha_fin, estado)
                VALUES (:id, :cid, :oid, 'Copa de Campeones 2026 - Fase de Grupos y Eliminatoria', 'Torneo oficial de prueba completo con 8 clubes en 2 grupos y fase final.', :f_ini, :f_fin, 'en_curso')
            """), {
                "id": evento_id, "cid": complejo_id, "oid": org_id,
                "f_ini": date.today() - timedelta(days=14),
                "f_fin": date.today() + timedelta(days=21)
            })

            # 4. Crear el Torneo Principal (Formato: grupos_eliminatoria)
            torneo_id = str(uuid.uuid4())
            await conn.execute(text("""
                INSERT INTO torneos.torneos (
                    id, evento_id, complejo_id, organizador_id, nombre, descripcion, deporte, formato, tipo_campeonato,
                    fecha_inicio, max_equipos, costo_inscripcion, premio_1, premio_2, premio_3, estado, configuracion,
                    puntos_victoria, puntos_empate, puntos_derrota, amarillas_suspension, es_publico, creado_por
                ) VALUES (
                    :id, :ev_id, :cid, :oid, :nombre, :desc, 'Fútbol 7', 'mixto', 'mixto',
                    :f_ini, 8, 500000.0, 'Trofeo de Campeón + Gs. 5.000.000 + Medallas de Oro', 'Gs. 2.000.000 + Medallas de Plata', 'Gs. 1.000.000 + Medallas de Bronce', 'en_curso', :config,
                    3, 1, 0, 3, true, :uid
                )
            """), {
                "id": torneo_id, "ev_id": evento_id, "cid": complejo_id, "oid": org_id, "uid": usuario_id,
                "nombre": "Copa de Campeones 2026 (Grupo + Eliminatoria)",
                "desc": "Fase de grupos (2 grupos de 4) seguida de eliminatoria directa (Cuartos, Semifinal y Final).",
                "f_ini": date.today() - timedelta(days=14),
                "config": json.dumps({"fase_actual": "Grupos", "cant_grupos": 2, "clasifican_por_grupo": 2})
            })
            print(f"Torneo Creado: 'Copa de Campeones 2026 (Grupo + Eliminatoria)' (ID: {torneo_id})")

            # 5. Crear los 2 Grupos en torneos.grupos
            grupo_a_id = str(uuid.uuid4())
            grupo_b_id = str(uuid.uuid4())

            await conn.execute(text("INSERT INTO torneos.grupos (id, torneo_id, nombre, estado) VALUES (:id, :tid, 'Grupo A', 'activo')"), {"id": grupo_a_id, "tid": torneo_id})
            await conn.execute(text("INSERT INTO torneos.grupos (id, torneo_id, nombre, estado) VALUES (:id, :tid, 'Grupo B', 'activo')"), {"id": grupo_b_id, "tid": torneo_id})
            print("Grupos creados: 'Grupo A' y 'Grupo B'")

            # 6. Crear los 8 Equipos (4 en Grupo A, 4 en Grupo B)
            equipos_raw = [
                # Grupo A
                {"nombre": "Galácticos FC", "grupo": "A", "grupo_id": grupo_a_id, "color": "#3b82f6", "sec": "#ffffff"},
                {"nombre": "Furia Roja", "grupo": "A", "grupo_id": grupo_a_id, "color": "#ef4444", "sec": "#000000"},
                {"nombre": "Atlético Mburicao", "grupo": "A", "grupo_id": grupo_a_id, "color": "#10b981", "sec": "#f59e0b"},
                {"nombre": "Deportivo Recoleta F7", "grupo": "A", "grupo_id": grupo_a_id, "color": "#f59e0b", "sec": "#1e293b"},
                # Grupo B
                {"nombre": "Catenaccio ASD", "grupo": "B", "grupo_id": grupo_b_id, "color": "#06b6d4", "sec": "#64748b"},
                {"nombre": "Luqueño F7 Amateur", "grupo": "B", "grupo_id": grupo_b_id, "color": "#eab308", "sec": "#1e40af"},
                {"nombre": "Olimpia Amateurs", "grupo": "B", "grupo_id": grupo_b_id, "color": "#000000", "sec": "#ffffff"},
                {"nombre": "Cerro Porteño F7", "grupo": "B", "grupo_id": grupo_b_id, "color": "#dc2626", "sec": "#2563eb"}
            ]

            equipos = []
            for eq in equipos_raw:
                eq_id = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO torneos.equipos (id, torneo_id, nombre, color_principal, color_secundario, estado_inscripcion, grupo, inscripcion_confirmada)
                    VALUES (:id, :tid, :nombre, :col, :sec, 'confirmado', :grupo, true)
                """), {"id": eq_id, "tid": torneo_id, "nombre": eq["nombre"], "col": eq["color"], "sec": eq["sec"], "grupo": eq["grupo"]})
                
                eq_obj = {**eq, "id": eq_id}
                equipos.append(eq_obj)
                print(f"  [{eq['grupo']}] Equipo Registrado: {eq['nombre']}")

            # Indexar equipos por nombre para acceso fácil
            eq_by_name = {e["nombre"]: e for e in equipos}

            # 7. Crear Jugadores de muestra (6 jugadores por equipo = 48 jugadores)
            jugadores_plantilla = [
                ("Rodrigo Ortiz", "Defensor", 2),
                ("Santiago Giménez", "Delantero", 9),
                ("Enzo Pérez", "Mediocampista", 5),
                ("Nicolás Otamendi", "Defensor", 4),
                ("Emiliano Martínez", "Arquero", 1),
                ("Lionel Messi", "Delantero", 10),

                ("Marcos Rojo", "Defensor", 6),
                ("Darío Benedetto", "Delantero", 9),
                ("Nicolás De La Cruz", "Mediocampista", 11),
                ("Franco Armani", "Arquero", 1),
                ("Julián Álvarez", "Delantero", 19),
                ("Paulo Díaz", "Defensor", 17),

                ("Federico Gatti", "Defensor", 4),
                ("Giorgio Chiellini", "Defensor", 3),
                ("Leonardo Bonucci", "Defensor", 19),
                ("Gianluigi Buffon", "Arquero", 1),
                ("Andrea Pirlo", "Mediocampista", 21),
                ("Alessandro Del Piero", "Delantero", 10),

                ("Óscar Romero", "Mediocampista", 11),
                ("Ángel Romero", "Delantero", 10),
                ("Derlis González", "Delantero", 23),
                ("Antony Silva", "Arquero", 12),
                ("Gustavo Gómez", "Defensor", 15),
                ("Junior Alonso", "Defensor", 6),

                ("Gabriel Barbosa", "Delantero", 9),
                ("Giorgian de Arrascaeta", "Mediocampista", 14),
                ("Everton Ribeiro", "Mediocampista", 7),
                ("Filipe Luís", "Defensor", 16),
                ("Diego Alves", "Arquero", 1),
                ("David Luiz", "Defensor", 23),

                ("Richard Sánchez", "Mediocampista", 20),
                ("Iván Torres", "Defensor", 11),
                ("Alejandro Silva", "Mediocampista", 3),
                ("Alfredo Aguilar", "Arquero", 1),
                ("Brian Montenegro", "Delantero", 9),
                ("Saúl Salcedo", "Defensor", 5),

                ("Mathías Villasanti", "Mediocampista", 23),
                ("Diego Churín", "Delantero", 19),
                ("Claudio Aquino", "Mediocampista", 22),
                ("Jean Fernandes", "Arquero", 13),
                ("Alexis Duarte", "Defensor", 4),
                ("Alberto Espínola", "Defensor", 2),

                ("Roque Santa Cruz", "Delantero", 24),
                ("Tacuara Cardozo", "Delantero", 7),
                ("Lorenzo Melgarejo", "Mediocampista", 17),
                ("Martín Silva", "Arquero", 1),
                ("Alexander Barboza", "Defensor", 22),
                ("Hernesto Caballero", "Mediocampista", 14)
            ]

            player_id_by_dni = {}
            for i, eq in enumerate(equipos):
                sub_plantilla = jugadores_plantilla[i*6 : (i+1)*6]
                for p_idx, (p_nom, p_pos, p_cam) in enumerate(sub_plantilla):
                    p_id = str(uuid.uuid4())
                    dni = f"4000{i}{p_idx}"
                    await conn.execute(text("""
                        INSERT INTO torneos.tournament_players (id, torneo_equipo_id, nombre, dni, numero_camiseta, posicion, estado, activo)
                        VALUES (:id, :teid, :nombre, :dni, :num, :pos, 'habilitado', true)
                    """), {"id": p_id, "teid": eq["id"], "nombre": p_nom, "dni": dni, "num": p_cam, "pos": p_pos})
                    player_id_by_dni[dni] = p_id

            print("48 Jugadores de muestra distribuidos en los 8 equipos.")

            # 8. Obtener tipos de eventos
            res_tipos = await conn.execute(text("SELECT id, codigo FROM cancha.tipos_evento"))
            tipos_map = {r[1]: r[0] for r in res_tipos.fetchall()}

            # 9. Crear Partidos de FASE DE GRUPOS (6 en Grupo A, 6 en Grupo B)
            partidos_grupos = [
                # --- GRUPO A ---
                # Jornada 1
                {"grupo_id": grupo_a_id, "fase": "Fase de Grupos", "jornada": 1, "loc": "Galácticos FC", "vis": "Furia Roja", "gl": 3, "gv": 1, "est": "finalizado", "offset": -10},
                {"grupo_id": grupo_a_id, "fase": "Fase de Grupos", "jornada": 1, "loc": "Deportivo Recoleta F7", "vis": "Atlético Mburicao", "gl": 2, "gv": 2, "est": "finalizado", "offset": -10},
                # Jornada 2
                {"grupo_id": grupo_a_id, "fase": "Fase de Grupos", "jornada": 2, "loc": "Galácticos FC", "vis": "Deportivo Recoleta F7", "gl": 2, "gv": 0, "est": "finalizado", "offset": -5},
                {"grupo_id": grupo_a_id, "fase": "Fase de Grupos", "jornada": 2, "loc": "Furia Roja", "vis": "Atlético Mburicao", "gl": 4, "gv": 2, "est": "finalizado", "offset": -5},
                # Jornada 3
                {"grupo_id": grupo_a_id, "fase": "Fase de Grupos", "jornada": 3, "loc": "Atlético Mburicao", "vis": "Galácticos FC", "gl": 1, "gv": 3, "est": "finalizado", "offset": -1},
                {"grupo_id": grupo_a_id, "fase": "Fase de Grupos", "jornada": 3, "loc": "Furia Roja", "vis": "Deportivo Recoleta F7", "gl": 2, "gv": 1, "est": "finalizado", "offset": -1},

                # --- GRUPO B ---
                # Jornada 1
                {"grupo_id": grupo_b_id, "fase": "Fase de Grupos", "jornada": 1, "loc": "Catenaccio ASD", "vis": "Luqueño F7 Amateur", "gl": 2, "gv": 0, "est": "finalizado", "offset": -10},
                {"grupo_id": grupo_b_id, "fase": "Fase de Grupos", "jornada": 1, "loc": "Olimpia Amateurs", "vis": "Cerro Porteño F7", "gl": 3, "gv": 3, "est": "finalizado", "offset": -10},
                # Jornada 2
                {"grupo_id": grupo_b_id, "fase": "Fase de Grupos", "jornada": 2, "loc": "Catenaccio ASD", "vis": "Olimpia Amateurs", "gl": 1, "gv": 1, "est": "finalizado", "offset": -5},
                {"grupo_id": grupo_b_id, "fase": "Fase de Grupos", "jornada": 2, "loc": "Luqueño F7 Amateur", "vis": "Cerro Porteño F7", "gl": 1, "gv": 4, "est": "finalizado", "offset": -5},
                # Jornada 3
                {"grupo_id": grupo_b_id, "fase": "Fase de Grupos", "jornada": 3, "loc": "Cerro Porteño F7", "vis": "Catenaccio ASD", "gl": 2, "gv": 3, "est": "finalizado", "offset": -1},
                {"grupo_id": grupo_b_id, "fase": "Fase de Grupos", "jornada": 3, "loc": "Luqueño F7 Amateur", "vis": "Olimpia Amateurs", "gl": 0, "gv": 2, "est": "finalizado", "offset": -1}
            ]

            for p in partidos_grupos:
                p_id = str(uuid.uuid4())
                el = eq_by_name[p["loc"]]
                ev = eq_by_name[p["vis"]]
                ganador_id = el["id"] if p["gl"] > p["gv"] else (ev["id"] if p["gv"] > p["gl"] else None)

                await conn.execute(text("""
                    INSERT INTO torneos.partidos (
                        id, torneo_id, equipo_local_id, equipo_visitante_id, fecha_hora, fase, fase_nombre, jornada, estado,
                        goles_local, goles_visitante, ganador_id, grupo_id
                    ) VALUES (
                        :id, :tid, :elid, :evid, :dt, :fase, :fase_nom, :jornada, :estado,
                        :gl, :gv, :gid, :grpid
                    )
                """), {
                    "id": p_id, "tid": torneo_id, "elid": el["id"], "evid": ev["id"],
                    "dt": datetime.now() + timedelta(days=p["offset"]),
                    "fase": p["fase"], "fase_nom": p["fase"], "jornada": p["jornada"],
                    "estado": p["est"], "gl": p["gl"], "gv": p["gv"], "gid": ganador_id, "grpid": p["grupo_id"]
                })

            print("12 Partidos de Fase de Grupos creados y finalizados.")

            # 10. Crear Partidos de FASE ELIMINATORIA (Cuartos de Final, Semifinales, Final)
            partidos_eliminatorios = [
                # Cuartos de Final (Programados para los próximos días)
                {"fase": "Cuartos de Final", "fase_nom": "Cuartos de Final", "jornada": 4, "loc": "Galácticos FC", "vis": "Cerro Porteño F7", "gl": None, "gv": None, "est": "programado", "offset": 3},
                {"fase": "Cuartos de Final", "fase_nom": "Cuartos de Final", "jornada": 4, "loc": "Furia Roja", "vis": "Olimpia Amateurs", "gl": None, "gv": None, "est": "programado", "offset": 3},
                {"fase": "Cuartos de Final", "fase_nom": "Cuartos de Final", "jornada": 4, "loc": "Catenaccio ASD", "vis": "Deportivo Recoleta F7", "gl": None, "gv": None, "est": "programado", "offset": 4},
                {"fase": "Cuartos de Final", "fase_nom": "Cuartos de Final", "jornada": 4, "loc": "Luqueño F7 Amateur", "vis": "Atlético Mburicao", "gl": None, "gv": None, "est": "programado", "offset": 4},

                # Semifinales (Por definir)
                {"fase": "Semifinales", "fase_nom": "Semifinales", "jornada": 5, "loc": "Galácticos FC", "vis": "Furia Roja", "gl": None, "gv": None, "est": "programado", "offset": 10},
                {"fase": "Semifinales", "fase_nom": "Semifinales", "jornada": 5, "loc": "Catenaccio ASD", "vis": "Luqueño F7 Amateur", "gl": None, "gv": None, "est": "programado", "offset": 10},

                # Gran Final
                {"fase": "Final", "fase_nom": "Gran Final", "jornada": 6, "loc": "Galácticos FC", "vis": "Catenaccio ASD", "gl": None, "gv": None, "est": "programado", "offset": 17}
            ]

            for p in partidos_eliminatorios:
                p_id = str(uuid.uuid4())
                el = eq_by_name[p["loc"]]
                ev = eq_by_name[p["vis"]]

                await conn.execute(text("""
                    INSERT INTO torneos.partidos (
                        id, torneo_id, equipo_local_id, equipo_visitante_id, fecha_hora, fase, fase_nombre, jornada, estado
                    ) VALUES (
                        :id, :tid, :elid, :evid, :dt, :fase, :fase_nom, :jornada, :estado
                    )
                """), {
                    "id": p_id, "tid": torneo_id, "elid": el["id"], "evid": ev["id"],
                    "dt": datetime.now() + timedelta(days=p["offset"]),
                    "fase": p["fase"], "fase_nom": p["fase_nom"], "jornada": p["jornada"],
                    "estado": p["est"]
                })

            print("7 Partidos de Fase Eliminatoria (Cuartos, Semifinales y Final) programados.")

            # 11. Cargar Tabla de Posiciones para los Grupos
            posiciones_grupo_a = [
                {"eq": "Galácticos FC", "pj": 3, "pg": 3, "pe": 0, "pp": 0, "gf": 8, "gc": 2, "pts": 9, "grp_id": grupo_a_id},
                {"eq": "Furia Roja", "pj": 3, "pg": 2, "pe": 0, "pp": 1, "gf": 7, "gc": 6, "pts": 6, "grp_id": grupo_a_id},
                {"eq": "Deportivo Recoleta F7", "pj": 3, "pg": 0, "pe": 1, "pp": 2, "gf": 3, "gc": 6, "pts": 1, "grp_id": grupo_a_id},
                {"eq": "Atlético Mburicao", "pj": 3, "pg": 0, "pe": 1, "pp": 2, "gf": 5, "gc": 9, "pts": 1, "grp_id": grupo_a_id}
            ]

            posiciones_grupo_b = [
                {"eq": "Catenaccio ASD", "pj": 3, "pg": 2, "pe": 1, "pp": 0, "gf": 6, "gc": 3, "pts": 7, "grp_id": grupo_b_id},
                {"eq": "Olimpia Amateurs", "pj": 3, "pg": 1, "pe": 2, "pp": 0, "gf": 6, "gc": 4, "pts": 5, "grp_id": grupo_b_id},
                {"eq": "Cerro Porteño F7", "pj": 3, "pg": 1, "pe": 1, "pp": 1, "gf": 9, "gc": 6, "pts": 4, "grp_id": grupo_b_id},
                {"eq": "Luqueño F7 Amateur", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 1, "gc": 8, "pts": 0, "grp_id": grupo_b_id}
            ]

            for pos in posiciones_grupo_a + posiciones_grupo_b:
                eq_id = eq_by_name[pos["eq"]]["id"]
                await conn.execute(text("""
                    INSERT INTO torneos.posiciones (id, torneo_id, equipo_id, grupo_id, pj, pg, pe, pp, gf, gc, pts)
                    VALUES (:id, :tid, :eqid, :grpid, :pj, :pg, :pe, :pp, :gf, :gc, :pts)
                """), {
                    "id": str(uuid.uuid4()), "tid": torneo_id, "eqid": eq_id, "grpid": pos["grp_id"],
                    "pj": pos["pj"], "pg": pos["pg"], "pe": pos["pe"], "pp": pos["pp"],
                    "gf": pos["gf"], "gc": pos["gc"], "pts": pos["pts"]
                })

            print("Tablas de posiciones de Grupo A y Grupo B generadas e insertadas correctamente.")
            print("=" * 70)
            print("PROCESO COMPLETADO EXITOSAMENTE PARA ORGANIZACION GENERAL!")
            print(f"Torneo ID: {torneo_id}")
            print("=" * 70)

        except Exception as e:
            print(f"Error al cargar datos: {str(e)}")
            raise e

if __name__ == "__main__":
    asyncio.run(seed_data())
