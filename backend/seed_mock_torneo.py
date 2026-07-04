import asyncio
import os
import sys
import uuid
import json
from datetime import datetime, date, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Configurar PYTHONPATH para importar módulos locales del backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DATABASE_URL
from routers.torneos import _recalcular_posiciones

async def seed_mock_data():
    print("=" * 60)
    print("SEMBRANDO UN TORNEO DE MUESTRA REALISTA Y COMPLETO")
    print("=" * 60)

    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as session:
        try:
            # 1. Obtener un complejo existente o usar el por defecto
            res_comp = await session.execute(text("SELECT id, nombre FROM cancha.complejos LIMIT 1"))
            comp_row = res_comp.fetchone()
            if not comp_row:
                print("❌ No se encontró ningún complejo en la base de datos para asociar el torneo.")
                return
            complejo_id, complejo_nombre = comp_row[0], comp_row[1]
            print(f"🏟️  Asociando torneo al complejo: '{complejo_nombre}' (ID: {complejo_id})")

            # 2. Obtener categorías y modalidades de los catálogos
            res_cat = await session.execute(text("SELECT id, codigo FROM cancha.categorias WHERE codigo = 'PRIMERA' LIMIT 1"))
            cat_row = res_cat.fetchone()
            categoria_id = cat_row[0] if cat_row else 1

            res_mod = await session.execute(text("SELECT id, codigo FROM cancha.modalidades WHERE codigo = 'LIGA' LIMIT 1"))
            mod_row = res_mod.fetchone()
            modalidad_id = mod_row[0] if mod_row else 1

            # 3. Obtener el mapa de tipos de evento
            res_tipos = await session.execute(text("SELECT id, codigo FROM cancha.tipos_evento"))
            tipos_evento_map = {r[1]: r[0] for r in res_tipos.fetchall()}
            print(f"📋 Catálogo de tipos de eventos cargado: {len(tipos_evento_map)} tipos.")

            # 4. Crear Evento Padre de Torneo
            evento_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos.eventos (id, complejo_id, nombre, descripcion, fecha_inicio, fecha_fin, estado)
                VALUES (:id, :cid, :nombre, :desc, :f_ini, :f_fin, 'en_curso')
            """), {
                "id": evento_id, "cid": complejo_id, "nombre": "Copa de Campeones Apertura 2026",
                "desc": "El campeonato definitivo de fútbol 5 amateur con los mejores equipos de la ciudad.",
                "f_ini": date.today() - timedelta(days=10), "f_fin": date.today() + timedelta(days=20)
            })

            # 5. Crear Torneo / Categoría
            torneo_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos.torneos (
                    id, evento_id, complejo_id, nombre, descripcion, deporte, formato,
                    fecha_inicio, max_equipos, costo_inscripcion, estado, categoria_id, modalidad_id,
                    puntos_victoria, puntos_empate, puntos_derrota, reglas, premios, categoria, configuracion
                ) VALUES (
                    :id, :ev_id, :cid, :nombre, :desc, 'Fútbol 5', 'liga',
                    :f_ini, 4, 350000.0, 'en_curso', :cat_id, :mod_id,
                    3, 1, 0, :reglas, :premios, 'Primera', :config
                )
            """), {
                "id": torneo_id, "ev_id": evento_id, "cid": complejo_id,
                "nombre": "Copa de Campeones Apertura 2026 - Primera",
                "desc": "División de honor de la Copa de Campeones.",
                "f_ini": date.today() - timedelta(days=10),
                "cat_id": categoria_id, "mod_id": modalidad_id,
                "reglas": json.dumps(["Zapatos de fútbol de goma o sintéticos únicamente.", "Partidos de 2 tiempos de 25 minutos.", "Se permiten hasta 3 sustituciones por partido."]),
                "premios": json.dumps([{"puesto": 1, "premio": "Copa + Gs. 2.000.000 + Equipamiento deportivo"}, {"puesto": 2, "premio": "Gs. 500.000 + Medallas"}]),
                "config": json.dumps({})
            })
            print(f"🏆 Torneo creado: 'Copa de Campeones Apertura 2026 - Primera' (ID: {torneo_id})")

            # 6. Crear Equipos de muestra (4 equipos)
            equipos_data = [
                {"id": str(uuid.uuid4()), "nombre": "Galácticos FC", "color": "#3b82f6", "sec": "#ffffff"},
                {"id": str(uuid.uuid4()), "nombre": "Furia Roja", "color": "#ef4444", "sec": "#000000"},
                {"id": str(uuid.uuid4()), "nombre": "Catenaccio ASD", "color": "#06b6d4", "sec": "#64748b"},
                {"id": str(uuid.uuid4()), "nombre": "Mburicao Pibes", "color": "#10b981", "sec": "#f59e0b"}
            ]

            for eq in equipos_data:
                await session.execute(text("""
                    INSERT INTO torneos.equipos (id, torneo_id, nombre, color_principal, color_secundario, estado_inscripcion)
                    VALUES (:id, :tid, :nombre, :col, :sec, 'confirmado')
                """), {"id": eq["id"], "tid": torneo_id, "nombre": eq["nombre"], "col": eq["color"], "sec": eq["sec"]})
                print(f"  👕 Equipo inscrito: {eq['nombre']} (ID: {eq['id']})")

            # 7. Crear Jugadores para los equipos (6 por equipo)
            jugadores_equipo = {
                equipos_data[0]["id"]: [
                    {"nombre": "Rodrigo Ortiz", "dni": "1234561", "cam": 10, "pos": "Delantero"},
                    {"nombre": "Santiago Giménez", "dni": "1234562", "cam": 9, "pos": "Delantero"},
                    {"nombre": "Enzo Pérez", "dni": "1234563", "cam": 5, "pos": "Mediocampista"},
                    {"nombre": "Nicolás Otamendi", "dni": "1234564", "cam": 2, "pos": "Defensor"},
                    {"nombre": "Emiliano Martínez", "dni": "1234565", "cam": 1, "pos": "Arquero"},
                    {"nombre": "Lionel Messi", "dni": "1234566", "cam": 30, "pos": "Mediocampista"}
                ],
                equipos_data[1]["id"]: [
                    {"nombre": "Marcos Rojo", "dni": "2234561", "cam": 6, "pos": "Defensor"},
                    {"nombre": "Darío Benedetto", "dni": "2234562", "cam": 9, "pos": "Delantero"},
                    {"nombre": "Nicolás De La Cruz", "dni": "2234563", "cam": 11, "pos": "Mediocampista"},
                    {"nombre": "Franco Armani", "dni": "2234564", "cam": 1, "pos": "Arquero"},
                    {"nombre": "Julián Álvarez", "dni": "2234565", "cam": 19, "pos": "Delantero"},
                    {"nombre": "Paulo Díaz", "dni": "2234566", "cam": 17, "pos": "Defensor"}
                ],
                equipos_data[2]["id"]: [
                    {"nombre": "Federico Gatti", "dni": "3234561", "cam": 4, "pos": "Defensor"},
                    {"nombre": "Giorgio Chiellini", "dni": "3234562", "cam": 3, "pos": "Defensor"},
                    {"nombre": "Leonardo Bonucci", "dni": "3234563", "cam": 19, "pos": "Defensor"},
                    {"nombre": "Gianluigi Buffon", "dni": "3234564", "cam": 1, "pos": "Arquero"},
                    {"nombre": "Andrea Pirlo", "dni": "3234565", "cam": 21, "pos": "Mediocampista"},
                    {"nombre": "Alessandro Del Piero", "dni": "3234566", "cam": 10, "pos": "Delantero"}
                ],
                equipos_data[3]["id"]: [
                    {"nombre": "Óscar Romero", "dni": "4234561", "cam": 11, "pos": "Mediocampista"},
                    {"nombre": "Ángel Romero", "dni": "4234562", "cam": 10, "pos": "Delantero"},
                    {"nombre": "Derlis González", "dni": "4234563", "cam": 23, "pos": "Delantero"},
                    {"nombre": "Antony Silva", "dni": "4234564", "cam": 12, "pos": "Arquero"},
                    {"nombre": "Gustavo Gómez", "dni": "4234565", "cam": 15, "pos": "Defensor"},
                    {"nombre": "Junior Alonso", "dni": "4234566", "cam": 6, "pos": "Defensor"}
                ]
            }

            players_map = {} # (equipo_id, cam) -> player_id
            players_by_dni = {} # DNI -> player_id
            for eq_id, players in jugadores_equipo.items():
                for p in players:
                    p_id = str(uuid.uuid4())
                    await session.execute(text("""
                        INSERT INTO cancha.tournament_players (id, tournament_team_id, nombre, dni, numero_camiseta, posicion, estado)
                        VALUES (:id, :teid, :nombre, :dni, :num, :pos, 'habilitado')
                    """), {"id": p_id, "teid": eq_id, "nombre": p["nombre"], "dni": p["dni"], "num": p["cam"], "pos": p["pos"]})
                    players_map[(eq_id, p["cam"])] = p_id
                    players_by_dni[p["dni"]] = p_id

            print("  👥 24 Jugadores de muestra registrados exitosamente.")

            # 8. Obtener Cancha Habilitada
            res_cancha = await session.execute(text("SELECT id FROM cancha.canchas WHERE complejo_id = :cid LIMIT 1"), {"cid": complejo_id})
            c_row = res_cancha.fetchone()
            cancha_id = c_row[0] if c_row else None
            if not cancha_id:
                # Crear cancha de muestra temporal para que el fixture funcione
                cancha_id = str(uuid.uuid4())
                await session.execute(text("""
                    INSERT INTO cancha.canchas (id, complejo_id, nombre, deporte, superficie, precio_hora, precio_hora_nocturna, activa)
                    VALUES (:id, :cid, 'Cancha Principal (F5)', 'Fútbol 5', 'Sintético', 120000.0, 150000.0, true)
                """), {"id": cancha_id, "cid": complejo_id})
                print(f"  ⚽ Cancha temporal creada: Cancha Principal (F5) (ID: {cancha_id})")

            # 9. Crear Partidos de Fixture (3 Jornadas, 2 partidos por jornada)
            partidos_data = [
                # Jornada 1
                {"jornada": 1, "local": equipos_data[0]["id"], "visitante": equipos_data[1]["id"], "g_l": 3, "g_v": 2, "estado": "finalizado", "offset_d": -8},
                {"jornada": 1, "local": equipos_data[2]["id"], "visitante": equipos_data[3]["id"], "g_l": 1, "g_v": 1, "estado": "finalizado", "offset_d": -8},
                # Jornada 2
                {"jornada": 2, "local": equipos_data[0]["id"], "visitante": equipos_data[2]["id"], "g_l": 2, "g_v": 0, "estado": "finalizado", "offset_d": -3},
                {"jornada": 2, "local": equipos_data[1]["id"], "visitante": equipos_data[3]["id"], "g_l": 1, "g_v": 3, "estado": "finalizado", "offset_d": -3},
                # Jornada 3 (Pendientes / Programados)
                {"jornada": 3, "local": equipos_data[3]["id"], "visitante": equipos_data[0]["id"], "g_l": None, "g_v": None, "estado": "programado", "offset_d": 4},
                {"jornada": 3, "local": equipos_data[1]["id"], "visitante": equipos_data[2]["id"], "g_l": None, "g_v": None, "estado": "programado", "offset_d": 4}
            ]

            partidos_ids = []
            for p in partidos_data:
                p_id = str(uuid.uuid4())
                p_date = datetime.now() + timedelta(days=p["offset_d"])
                await session.execute(text("""
                    INSERT INTO torneos.partidos (id, torneo_id, cancha_id, equipo_local_id, equipo_visitante_id, fecha_hora, goles_local, goles_visitante, jornada, fase, estado)
                    VALUES (:id, :tid, :cid, :elid, :evid, :dt, :gl, :gv, :jornada, 'Ronda Regular', :estado)
                """), {
                    "id": p_id, "tid": torneo_id, "cid": cancha_id, "elid": p["local"], "evid": p["visitante"],
                    "dt": p_date, "gl": p["g_l"], "gv": p["g_v"], "jornada": p["jornada"], "estado": p["estado"]
                })
                p["db_id"] = p_id
                partidos_ids.append(p)
                print(f"  📅 Partido programado (Jornada {p['jornada']}): {p['local'][:5]} vs {p['visitante'][:5]} (ID: {p_id})")

            # 10. Agregar Eventos Detallados a Partidos Realistas

            # --- PARTIDO 1: Galácticos FC (3) vs Furia Roja (2) ---
            p1_id = partidos_data[0]["db_id"]
            p1_loc = partidos_data[0]["local"]
            p1_vis = partidos_data[0]["visitante"]

            # Eventos del partido 1
            eventos_p1 = [
                # Furia Roja abre el marcador
                {"tipo": "GOL", "eq": p1_vis, "p_dni": "2234561", "min": 8}, # Marcos Rojo
                # Empata Galácticos
                {"tipo": "GOL", "eq": p1_loc, "p_dni": "1234561", "min": 12}, # Rodrigo Ortiz
                # Tarjeta Amarilla para Enzo Pérez (Galácticos)
                {"tipo": "AMARILLA", "eq": p1_loc, "p_dni": "1234563", "min": 33}, # Enzo Pérez
                # Gol Galácticos
                {"tipo": "GOL", "eq": p1_loc, "p_dni": "1234562", "min": 35}, # Santiago Giménez
                # Gol de penal Furia Roja
                {"tipo": "GOL_PENAL", "eq": p1_vis, "p_dni": "2234562", "min": 39}, # Darío Benedetto
                # Sustitución Galácticos (Sale Enzo Pérez (5), Entra Lionel Messi (30))
                {"tipo": "SUSTITUCION", "eq": p1_loc, "p_dni": "1234566", "p_out_dni": "1234563", "min": 40},
                # Tarjeta Amarilla para Marcos Rojo (Furia Roja)
                {"tipo": "AMARILLA", "eq": p1_vis, "p_dni": "2234561", "min": 41}, # Marcos Rojo
                # Gol de la victoria Galácticos
                {"tipo": "GOL", "eq": p1_loc, "p_dni": "1234561", "min": 45}, # Rodrigo Ortiz
                # Roja Directa por falta grave en el final
                {"tipo": "ROJA_DIRECTA", "eq": p1_vis, "p_dni": "2234563", "min": 48} # Nicolás De La Cruz
            ]

            for ev in eventos_p1:
                ev_id = str(uuid.uuid4())
                player_id = players_by_dni.get(ev["p_dni"])
                player_out_id = players_by_dni.get(ev.get("p_out_dni")) if ev.get("p_out_dni") else None
                tipo_ev_id = tipos_evento_map.get(ev["tipo"])

                # Insertar en cancha.eventos_partido
                await session.execute(text("""
                    INSERT INTO cancha.eventos_partido (id, partido_id, tipo_evento_id, player_id, player_out_id, equipo_id, tipo, minuto, periodo, es_tiempo_adicional)
                    VALUES (:id, :pid, :teid, :plid, :ploutid, :eqid, :tipo, :min, 1, false)
                """), {
                    "id": ev_id, "pid": p1_id, "teid": tipo_ev_id, "plid": player_id, "ploutid": player_out_id,
                    "eqid": ev["eq"], "tipo": ev["tipo"], "min": ev["min"]
                })

                # Si es amarilla o roja, alimentar torneos.tarjetas para Fair Play
                tarjeta_id = str(uuid.uuid4())
                if ev["tipo"] in ("AMARILLA", "ROJA", "ROJA_DIRECTA", "DOBLE_AMARILLA"):
                    pts_fp = 1 if ev["tipo"] == "AMARILLA" else 3
                    await session.execute(text("""
                        INSERT INTO torneos.tarjetas (id, partido_id, player_id, equipo_id, tipo, minuto, pts_fair_play)
                        VALUES (:id, :pid, :plid, :eqid, :tipo, :min, :pts)
                    """), {
                        "id": tarjeta_id, "pid": p1_id, "plid": player_id, "eqid": ev["eq"],
                        "tipo": "amarilla" if ev["tipo"] == "AMARILLA" else "roja", "min": ev["min"], "pts": pts_fp
                    })

                # Si es roja_directa, también creamos una sanción asociada a esa tarjeta_id
                if ev["tipo"] == "ROJA_DIRECTA":
                    await session.execute(text("""
                        INSERT INTO torneos.sanciones (id, torneo_id, player_id, tarjeta_id, partidos_suspension, tipo, descripcion, estado)
                        VALUES (:id, :tid, :plid, :tarid, 2, 'Expulsión', 'Conducta antideportiva y juego brusco grave', 'pendiente')
                    """), {
                        "id": str(uuid.uuid4()), "tid": torneo_id, "plid": player_id, "tarid": tarjeta_id
                    })

            print("  🔥 Cargados 9 eventos detallados y 1 sanción en el Partido 1 (Galácticos vs Furia Roja).")


            # --- PARTIDO 2: Catenaccio ASD (1) vs Mburicao Pibes (1) ---
            p2_id = partidos_data[1]["db_id"]
            p2_loc = partidos_data[1]["local"]
            p2_vis = partidos_data[1]["visitante"]

            eventos_p2 = [
                # Tarjeta Amarilla de control
                {"tipo": "AMARILLA", "eq": p2_loc, "p_dni": "3234562", "min": 15}, # Giorgio Chiellini
                # Catenaccio gol de corner
                {"tipo": "GOL", "eq": p2_loc, "p_dni": "3234561", "min": 21}, # Federico Gatti
                # Tarjeta Amarilla
                {"tipo": "AMARILLA", "eq": p2_vis, "p_dni": "4234561", "min": 30}, # Óscar Romero
                # Mburicao empata sobre el final
                {"tipo": "GOL", "eq": p2_vis, "p_dni": "4234563", "min": 49} # Derlis González
            ]

            for ev in eventos_p2:
                ev_id = str(uuid.uuid4())
                player_id = players_by_dni.get(ev["p_dni"])
                tipo_ev_id = tipos_evento_map.get(ev["tipo"])

                await session.execute(text("""
                    INSERT INTO cancha.eventos_partido (id, partido_id, tipo_evento_id, player_id, equipo_id, tipo, minuto, periodo, es_tiempo_adicional)
                    VALUES (:id, :pid, :teid, :plid, :eqid, :tipo, :min, 1, false)
                """), {
                    "id": ev_id, "pid": p2_id, "teid": tipo_ev_id, "plid": player_id, "eqid": ev["eq"], "tipo": ev["tipo"], "min": ev["min"]
                })

                if ev["tipo"] == "AMARILLA":
                    await session.execute(text("""
                        INSERT INTO torneos.tarjetas (id, partido_id, player_id, equipo_id, tipo, minuto, pts_fair_play)
                        VALUES (:id, :pid, :plid, :eqid, 'amarilla', :min, 1)
                    """), {
                        "id": str(uuid.uuid4()), "pid": p2_id, "plid": player_id, "eqid": ev["eq"], "min": ev["min"]
                    })

            print("  ⚽ Cargados 4 eventos en el Partido 2 (Catenaccio vs Mburicao Pibes).")


            # --- PARTIDO 3: Galácticos FC (2) vs Catenaccio ASD (0) ---
            p3_id = partidos_data[2]["db_id"]
            p3_loc = partidos_data[2]["local"]
            p3_vis = partidos_data[2]["visitante"]

            eventos_p3 = [
                {"tipo": "GOL", "eq": p3_loc, "p_dni": "1234561", "min": 5}, # Rodrigo Ortiz
                {"tipo": "GOL", "eq": p3_loc, "p_dni": "1234562", "min": 42} # Santiago Giménez
            ]

            for ev in eventos_p3:
                ev_id = str(uuid.uuid4())
                player_id = players_by_dni.get(ev["p_dni"])
                tipo_ev_id = tipos_evento_map.get(ev["tipo"])

                await session.execute(text("""
                    INSERT INTO cancha.eventos_partido (id, partido_id, tipo_evento_id, player_id, equipo_id, tipo, minuto, periodo, es_tiempo_adicional)
                    VALUES (:id, :pid, :teid, :plid, :eqid, :tipo, :min, 2, false)
                """), {
                    "id": ev_id, "pid": p3_id, "teid": tipo_ev_id, "plid": player_id, "eqid": ev["eq"], "tipo": ev["tipo"], "min": ev["min"]
                })

            print("  ⚽ Cargados 2 eventos en el Partido 3 (Galácticos vs Catenaccio).")


            # --- PARTIDO 4: Furia Roja (1) vs Mburicao Pibes (3) ---
            p4_id = partidos_data[3]["db_id"]
            p4_loc = partidos_data[3]["local"]
            p4_vis = partidos_data[3]["visitante"]

            eventos_p4 = [
                # Gol Mburicao
                {"tipo": "GOL", "eq": p4_vis, "p_dni": "4234563", "min": 10}, # Derlis González
                # Gol Furia Roja
                {"tipo": "GOL", "eq": p4_loc, "p_dni": "2234562", "min": 18}, # Darío Benedetto
                # Gol Mburicao
                {"tipo": "GOL", "eq": p4_vis, "p_dni": "4234563", "min": 33}, # Derlis González
                # Tarjeta Amarilla
                {"tipo": "AMARILLA", "eq": p4_loc, "p_dni": "2234562", "min": 44}, # Darío Benedetto
                # Gol sentencia Mburicao
                {"tipo": "GOL", "eq": p4_vis, "p_dni": "4234562", "min": 47} # Ángel Romero
            ]

            for ev in eventos_p4:
                ev_id = str(uuid.uuid4())
                player_id = players_by_dni.get(ev["p_dni"])
                tipo_ev_id = tipos_evento_map.get(ev["tipo"])

                await session.execute(text("""
                    INSERT INTO cancha.eventos_partido (id, partido_id, tipo_evento_id, player_id, equipo_id, tipo, minuto, periodo, es_tiempo_adicional)
                    VALUES (:id, :pid, :teid, :plid, :eqid, :tipo, :min, 2, false)
                """), {
                    "id": ev_id, "pid": p4_id, "teid": tipo_ev_id, "plid": player_id, "eqid": ev["eq"], "tipo": ev["tipo"], "min": ev["min"]
                })

                if ev["tipo"] == "AMARILLA":
                    await session.execute(text("""
                        INSERT INTO torneos.tarjetas (id, partido_id, player_id, equipo_id, tipo, minuto, pts_fair_play)
                        VALUES (:id, :pid, :plid, :eqid, 'amarilla', :min, 1)
                    """), {
                        "id": str(uuid.uuid4()), "pid": p4_id, "plid": player_id, "eqid": ev["eq"], "min": ev["min"]
                    })

            print("  ⚽ Cargados 5 eventos en el Partido 4 (Furia Roja vs Mburicao Pibes).")

            # 11. Recalcular Posiciones y Tabla
            await session.commit()
            print("💾 Cambios guardados con éxito. Recalculando posiciones...")
            await _recalcular_posiciones(torneo_id, session)
            await session.commit()

            print("=" * 60)
            print("🚀 MOCK TORNEO COMPLETADO DE MANERA EXITOSA")
            print(f"👉 Torneo ID: {torneo_id}")
            print(f"👉 Complejo ID: {complejo_id}")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"❌ Error al sembrar los datos: {str(e)}")
            raise e

if __name__ == "__main__":
    asyncio.run(seed_mock_data())
