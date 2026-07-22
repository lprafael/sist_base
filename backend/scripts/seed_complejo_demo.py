"""
Script de Seed Demo para Complejos Deportivos y Canchas (SAD-Canchas)
======================================================================
Crea/actualiza el usuario demo 'complejo_demo', el complejo 'Complejo Deportivo Mburicao',
sus 4 canchas (Fútbol y Pádel) y reservas vivas en tiempo real alrededor de la hora actual
para probar el Sistema de Altavoz / Locución por Voz.

Ejecución:
  .\backend\venv\Scripts\python.exe backend\scripts\seed_complejo_demo.py
"""

import asyncio
import os
import sys
from datetime import datetime, date, time, timedelta
import json
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL no encontrada en .env")
    sys.exit(1)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    print("=" * 70)
    print(" INICIANDO SEED COMPLEJO DEPORTIVO & CANCHAS (SAD-Canchas)")
    print("=" * 70)
    
    async with engine.connect() as conn:
        async with conn.begin():
            # -------------------------------------------------------------
            # 1. USUARIO COMPLEJO DEMO
            # -------------------------------------------------------------
            username = "complejo_demo"
            password = "Password123"
            email = "complejo_demo@micancha.com.py"
            hashed_pwd = pwd_context.hash(password)
            
            res_u = await conn.execute(
                text("SELECT id FROM sistema.usuarios WHERE username = :usr"),
                {"usr": username}
            )
            r_u = res_u.fetchone()
            if not r_u:
                res_in = await conn.execute(
                    text("""
                        INSERT INTO sistema.usuarios (username, email, hashed_password, nombre_completo, rol, activo)
                        VALUES (:usr, :em, :pwd, 'Manager Complejo Mburicao', 'complejo', true)
                        RETURNING id
                    """),
                    {"usr": username, "em": email, "pwd": hashed_pwd}
                )
                user_id = res_in.scalar()
            else:
                user_id = r_u[0]
                await conn.execute(
                    text("UPDATE sistema.usuarios SET hashed_password = :pwd, rol = 'complejo', activo = true WHERE id = :uid"),
                    {"pwd": hashed_pwd, "uid": user_id}
                )

            print(f"[OK] Usuario Complejo Demo ID: {user_id}")

            # -------------------------------------------------------------
            # 2. COMPLEJO DEPORTIVO MBURICAO
            # -------------------------------------------------------------
            complejo_id = "11111111-1111-1111-1111-111111111111"
            cfg = {
                "slug": "mburicao-sports",
                "color_primario": "#10B981",
                "anuncios_altavoz": True
            }
            
            await conn.execute(
                text("""
                    INSERT INTO cancha.complejos (
                        id, nombre, descripcion, telefono, email, direccion, ciudad, departamento,
                        foto_portada, horario_apertura, horario_cierre, es_publico, configuracion, activo
                    ) VALUES (
                        :cid, 'Complejo Deportivo Mburicao',
                        'El complejo deportivo premium de Asunción. Canchas sintéticas profesionales y canchas de pádel de cristal panorámicas.',
                        '0981 123 456', 'mburicao@micancha.com.py', 'Av. Mariscal López c/ Perú', 'Asunción', 'Central',
                        'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
                        CAST('07:00:00' AS time), CAST('23:30:00' AS time), true, CAST(:cfg AS jsonb), true
                    ) ON CONFLICT (id) DO UPDATE SET
                        nombre = EXCLUDED.nombre,
                        descripcion = EXCLUDED.descripcion,
                        telefono = EXCLUDED.telefono,
                        email = EXCLUDED.email,
                        direccion = EXCLUDED.direccion,
                        ciudad = EXCLUDED.ciudad,
                        foto_portada = EXCLUDED.foto_portada,
                        configuracion = EXCLUDED.configuracion,
                        activo = true

                """),
                {"cid": complejo_id, "cfg": json.dumps(cfg)}
            )
            
            # Vinculación Admin Complejo
            await conn.execute(
                text("""
                    INSERT INTO cancha.admins_complejo (id, complejo_id, usuario_id, rol, activo)
                    VALUES (:id, :cid, :uid, 'dueno', true)
                    ON CONFLICT DO NOTHING
                """),
                {"id": "a1111111-1111-1111-1111-111111111111", "cid": complejo_id, "uid": user_id}
            )
            
            print(f"[OK] Complejo Deportivo Mburicao configurado (ID: {complejo_id})")

            # -------------------------------------------------------------
            # 3. CANCHAS
            # -------------------------------------------------------------
            # Limpiar canchas y reservas anteriores del complejo demo
            await conn.execute(text("DELETE FROM cancha.reservas WHERE complejo_id = :cid"), {"cid": complejo_id})
            await conn.execute(text("DELETE FROM cancha.canchas WHERE complejo_id = :cid"), {"cid": complejo_id})

            canchas_data = [
                {
                    "id": "c1111111-1111-1111-1111-111111111111",
                    "nombre": "Cancha 1 (Fútbol 5)",
                    "deporte": "Fútbol 5",
                    "superficie": "Césped Sintético 50mm",
                    "dimensiones": "20x40m",
                    "capacidad": 10,
                    "precio": 120000,
                    "precio_noc": 150000,
                    "color": "#10B981",
                    "orden": 1
                },
                {
                    "id": "c2222222-2222-2222-2222-222222222222",
                    "nombre": "Cancha 2 (Fútbol 7)",
                    "deporte": "Fútbol 7",
                    "superficie": "Césped Sintético Premium",
                    "dimensiones": "30x50m",
                    "capacidad": 14,
                    "precio": 180000,
                    "precio_noc": 220000,
                    "color": "#3B82F6",
                    "orden": 2
                },
                {
                    "id": "c3333333-3333-3333-3333-333333333333",
                    "nombre": "Cancha Cristal A (Pádel)",
                    "deporte": "Pádel",
                    "superficie": "Cristal Panorámico & Césped Azul",
                    "dimensiones": "10x20m",
                    "capacidad": 4,
                    "precio": 100000,
                    "precio_noc": 130000,
                    "color": "#EC4899",
                    "orden": 3
                },
                {
                    "id": "c4444444-4444-4444-4444-444444444444",
                    "nombre": "Cancha Cristal B (Pádel)",
                    "deporte": "Pádel",
                    "superficie": "Cristal Panorámico & Césped Azul",
                    "dimensiones": "10x20m",
                    "capacidad": 4,
                    "precio": 100000,
                    "precio_noc": 130000,
                    "color": "#8B5CF6",
                    "orden": 4
                }
            ]

            for c in canchas_data:
                await conn.execute(
                    text("""
                        INSERT INTO cancha.canchas (
                            id, complejo_id, nombre, deporte, superficie, dimensiones, capacidad_jugadores,
                            precio_hora, precio_hora_nocturna, hora_inicio_nocturna, color, numero_orden, activo
                        ) VALUES (
                            :id, :cid, :nom, :dep, :sup, :dim, :cap,
                            :pr, :pr_noc, CAST('18:00:00' AS time), :col, :ord, true
                        )

                    """),
                    {
                        "id": c["id"], "cid": complejo_id, "nom": c["nombre"],
                        "dep": c["deporte"], "sup": c["superficie"], "dim": c["dimensiones"],
                        "cap": c["capacidad"], "pr": c["precio"], "pr_noc": c["precio_noc"],
                        "col": c["color"], "ord": c["orden"]
                    }
                )

            print(f"[OK] {len(canchas_data)} Canchas registradas.")

            # -------------------------------------------------------------
            # 4. RESERVAS EN TIEMPO REAL ALREDEDOR DE LA HORA ACTUAL
            # -------------------------------------------------------------
            now = datetime.now()
            
            # Redondear hora actual a minutos exactos
            now_base = datetime(now.year, now.month, now.day, now.hour, now.minute)
            reservas_envivo = [

                # --- TURNOS EN VIVO ALREDEDOR DE AHORA (ALTAVOZ) ---
                {
                    "cancha_id": "c1111111-1111-1111-1111-111111111111", # Cancha 1 Fútbol 5
                    "cliente": "Juan Carlos Benítez",
                    "tel": "0981 111 222",
                    "inicio": now_base - timedelta(minutes=1),
                    "fin": now_base + timedelta(minutes=59),
                    "estado": "confirmada",
                    "pago": "pagado",
                    "sena": 120000,
                    "notif_inicio": False,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Inicio de turno en vivo (Disparará altavoz)"
                },
                {
                    "cancha_id": "c3333333-3333-3333-3333-333333333333", # Cancha Cristal A Pádel
                    "cliente": "Mateo Villalba & Pareja",
                    "tel": "0971 444 555",
                    "inicio": now_base - timedelta(minutes=55),
                    "fin": now_base + timedelta(minutes=5),
                    "estado": "en_curso",
                    "pago": "pagado",
                    "sena": 100000,
                    "notif_inicio": True,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Quedan 5 minutos (Disparará altavoz 5min)"
                },
                {
                    "cancha_id": "c2222222-2222-2222-2222-222222222222", # Cancha 2 Fútbol 7
                    "cliente": "Los Dragones F.C.",
                    "tel": "0982 999 000",
                    "inicio": now_base + timedelta(minutes=10),
                    "fin": now_base + timedelta(minutes=70),
                    "estado": "confirmada",
                    "pago": "seña_pagada",
                    "sena": 100000,
                    "notif_inicio": False,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Se acerca turno (Disparará altavoz próx turno)"
                },
                {
                    "cancha_id": "c4444444-4444-4444-4444-444444444444", # Cancha Cristal B Pádel
                    "cliente": "Lucía Fernández & Grupo",
                    "tel": "0983 777 666",
                    "inicio": now_base - timedelta(minutes=61),
                    "fin": now_base - timedelta(minutes=1),
                    "estado": "en_curso",
                    "pago": "pagado",
                    "sena": 100000,
                    "notif_inicio": True,
                    "notif_5m": True,
                    "notif_fin": False,
                    "notas": "Turno recién finalizado (Disparará altavoz fin)"
                },
                # --- OTROS TURNOS DEL DÍA (HISTORIAL Y GRILLA) ---
                {
                    "cancha_id": "c1111111-1111-1111-1111-111111111111",
                    "cliente": "Roberto Cardozo",
                    "tel": "0991 333 222",
                    "inicio": now_base - timedelta(hours=5),
                    "fin": now_base - timedelta(hours=4),
                    "estado": "finalizada",
                    "pago": "pagado",
                    "sena": 120000,
                    "notif_inicio": True,
                    "notif_5m": True,
                    "notif_fin": True,
                    "notas": "Turno jugado por la mañana"
                },
                {
                    "cancha_id": "c2222222-2222-2222-2222-222222222222",
                    "cliente": "Deportivo Mariscal",
                    "tel": "0984 112 334",
                    "inicio": now_base - timedelta(hours=4),
                    "fin": now_base - timedelta(hours=3),
                    "estado": "finalizada",
                    "pago": "pagado",
                    "sena": 180000,
                    "notif_inicio": True,
                    "notif_5m": True,
                    "notif_fin": True,
                    "notas": "Turno corporativo amistoso"
                },
                {
                    "cancha_id": "c3333333-3333-3333-3333-333333333333",
                    "cliente": "Martín Silva",
                    "tel": "0972 888 777",
                    "inicio": now_base - timedelta(hours=3),
                    "fin": now_base - timedelta(hours=2),
                    "estado": "finalizada",
                    "pago": "pagado",
                    "sena": 100000,
                    "notif_inicio": True,
                    "notif_5m": True,
                    "notif_fin": True,
                    "notas": "Clase particular de Pádel"
                },
                {
                    "cancha_id": "c1111111-1111-1111-1111-111111111111",
                    "cliente": "Exalumnos San José",
                    "tel": "0981 555 444",
                    "inicio": now_base + timedelta(hours=2),
                    "fin": now_base + timedelta(hours=3),
                    "estado": "confirmada",
                    "pago": "seña_pagada",
                    "sena": 60000,
                    "notif_inicio": False,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Reserva de tarde"
                },
                {
                    "cancha_id": "c2222222-2222-2222-2222-222222222222",
                    "cliente": "Club de Amigos F.C.",
                    "tel": "0985 666 777",
                    "inicio": now_base + timedelta(hours=3),
                    "fin": now_base + timedelta(hours=4),
                    "estado": "confirmada",
                    "pago": "pagado",
                    "sena": 220000,
                    "notif_inicio": False,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Desafío nocturno Fútbol 7"
                },
                {
                    "cancha_id": "c3333333-3333-3333-3333-333333333333",
                    "cliente": "Fernando Mendoza & Pareja",
                    "tel": "0992 555 111",
                    "inicio": now_base + timedelta(hours=2),
                    "fin": now_base + timedelta(hours=3),
                    "estado": "confirmada",
                    "pago": "seña_pagada",
                    "sena": 50000,
                    "notif_inicio": False,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Torneo exprés de Pádel"
                },
                {
                    "cancha_id": "c4444444-4444-4444-4444-444444444444",
                    "cliente": "Camila Ovelar",
                    "tel": "0981 777 888",
                    "inicio": now_base + timedelta(hours=3),
                    "fin": now_base + timedelta(hours=4),
                    "estado": "confirmada",
                    "pago": "pendiente",
                    "sena": 0,
                    "notif_inicio": False,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Reserva online pendiente de seña"
                },
                {
                    "cancha_id": "c1111111-1111-1111-1111-111111111111",
                    "cliente": "Los Implacables F.5",
                    "tel": "0983 222 111",
                    "inicio": now_base + timedelta(hours=4),
                    "fin": now_base + timedelta(hours=5),
                    "estado": "confirmada",
                    "pago": "pagado",
                    "sena": 150000,
                    "notif_inicio": False,
                    "notif_5m": False,
                    "notif_fin": False,
                    "notas": "Turno nocturno bajo reflectores"
                }
            ]


            for r in reservas_envivo:

                dur = int((r["fin"] - r["inicio"]).total_seconds() / 60)
                await conn.execute(
                    text("""
                        INSERT INTO cancha.reservas (
                            cancha_id, complejo_id, cliente_nombre, cliente_telefono,
                            inicio, fin, precio_hora, precio_total, seña_pagada,
                            estado, estado_pago, origen, notas,
                            notif_inicio_enviada, notif_5min_enviada, notif_fin_enviada
                        ) VALUES (
                            :chid, :cid, :cnom, :ctel,
                            :ini, :fin, 120000, 120000, :sena,
                            :est, :estp, 'admin', :notas,
                            :n_ini, :n_5m, :n_fin
                        )


                    """),
                    {
                        "chid": r["cancha_id"], "cid": complejo_id,
                        "cnom": r["cliente"], "ctel": r["tel"],
                        "ini": r["inicio"], "fin": r["fin"], "dur": dur,
                        "sena": r["sena"], "est": r["estado"], "estp": r["pago"],
                        "notas": r["notas"], "n_ini": r["notif_inicio"],
                        "n_5m": r["notif_5m"], "n_fin": r["notif_fin"]
                    }
                )

            print(f"[OK] {len(reservas_envivo)} Reservas en tiempo real programadas alrededor de {now.strftime('%H:%M:%S')}.")

    await engine.dispose()
    print("=" * 70)
    print(" ¡SEED DE COMPLEJO DEPORTIVO CONCLUIDO CON ÉXITO!")
    print("=" * 70)
    print("Credenciales de Acceso:")
    print(f"  - Usuario Administrador: {username}")
    print(f"  - Contraseña: {password}")
    print("  - URL Panel Administrador: http://localhost:3000/complejo-panel")
    print("  - URL Página Web Pública: http://localhost:3000/complejo/mburicao-sports")
    print("=" * 70)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
