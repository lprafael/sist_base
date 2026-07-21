"""
Script de Seed Completo para el Sistema de Academias Deportivas (SAD-M)
======================================================================
Pobla la base de datos PostgreSQL con datos de muestra ricos, realistas y coherentes
para la Academia Demo "Academia Elite Pro".

Ejecución:
  .\backend\venv\Scripts\python.exe backend\scripts\seed_academia_completa.py
"""

import asyncio
import os
import sys
from datetime import date, datetime, timedelta
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
    print(" INICIANDO SEED COMPLETO DE ACADEMIAS (SAD-M)")
    print("=" * 70)
    
    async with engine.connect() as conn:
        async with conn.begin():
            # -------------------------------------------------------------
            # 1. USUARIO PRINCIPAL DUEÑO Y ACADEMIA DEMO
            # -------------------------------------------------------------
            username = "academia_demo"
            password = "Password123"
            email = "academia_demo@micancha.com.py"
            hashed_pwd = pwd_context.hash(password)
            
            # Verificar si usuario ya existe
            res = await conn.execute(
                text("SELECT id FROM sistema.usuarios WHERE username = :usr"),
                {"usr": username}
            )
            row_u = res.fetchone()
            if not row_u:
                res_i = await conn.execute(
                    text("""
                        INSERT INTO sistema.usuarios (username, email, hashed_password, nombre_completo, rol, activo)
                        VALUES (:usr, :em, :pwd, 'Academia Elite Pro Owner', 'academia', true)
                        RETURNING id
                    """),
                    {"usr": username, "em": email, "pwd": hashed_pwd}
                )
                owner_id = res_i.scalar()
            else:
                owner_id = row_u[0]
                await conn.execute(
                    text("UPDATE sistema.usuarios SET hashed_password = :pwd, activo = true WHERE id = :uid"),
                    {"pwd": hashed_pwd, "uid": owner_id}
                )
            
            # Crear o actualizar Academia
            res_a = await conn.execute(
                text("SELECT id FROM academias.academias WHERE usuario_id = :uid"),
                {"uid": owner_id}
            )
            row_a = res_a.fetchone()
            if not row_a:
                res_ai = await conn.execute(
                    text("""
                        INSERT INTO academias.academias (
                            usuario_id, nombre, descripcion, color_primario, enlace_sitio,
                            facebook, instagram, whatsapp, email, telefono, pais, departamento, ciudad,
                            acerca_de, plan, habilitada, canal_comunicacion_habilitado
                        ) VALUES (
                            :uid, 'Academia Elite Pro', 'La academia deportiva líder en formación integral de jóvenes talentos.',
                            '#10B981', 'elite-pro', 'https://facebook.com/elitepro', 'https://instagram.com/elitepro_py',
                            '+595981123456', 'contacto@elitepro.com.py', '0981 123 456', 'Paraguay', 'Central', 'Asunción',
                            'Formando campeones en fútbol, básquetbol y pádel con metodología internacional y valores.',
                            'premium', true, true
                        ) RETURNING id
                    """),
                    {"uid": owner_id}
                )
                academia_id = res_ai.scalar()
            else:
                academia_id = row_a[0]
                await conn.execute(
                    text("""
                        UPDATE academias.academias SET
                            nombre = 'Academia Elite Pro',
                            color_primario = '#10B981',
                            descripcion = 'La academia deportiva líder en formación integral de jóvenes talentos.',
                            telefono = '0981 123 456',
                            email = 'contacto@elitepro.com.py',
                            canal_comunicacion_habilitado = true
                        WHERE id = :aid
                    """),
                    {"aid": academia_id}
                )
            print(f"[OK] Academia Principal ID: {academia_id}")
            
            # -------------------------------------------------------------
            # 2. CONFIGURACIÓN DE CUOTAS Y MORAS
            # -------------------------------------------------------------
            await conn.execute(
                text("""
                    INSERT INTO academias.config_cuotas (
                        academia_id, descuento_2_hermanos, descuento_3_hermanos,
                        permite_pago_anual, descuento_pago_anual, dia_vencimiento,
                        matricula_anual, cobro_retraso_activo, monto_por_retraso, dias_gracia_retraso
                    ) VALUES (
                        :aid, 15.0, 25.0, true, 20.0, 10, 150000, true, 5000, 5
                    ) ON CONFLICT (academia_id) DO UPDATE SET
                        descuento_2_hermanos = 15.0,
                        descuento_3_hermanos = 25.0,
                        permite_pago_anual = true,
                        descuento_pago_anual = 20.0,
                        dia_vencimiento = 10,
                        matricula_anual = 150000,
                        cobro_retraso_activo = true,
                        monto_por_retraso = 5000,
                        dias_gracia_retraso = 5
                """),
                {"aid": academia_id}
            )
            print("[OK] Configuración de Cuotas y Moras actualizada.")
            
            # Limpiar datos antiguos de la academia para un seed limpio
            await conn.execute(text("DELETE FROM academias.feedback_socios WHERE academia_id = :aid"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.noticias_publicas WHERE academia_id = :aid"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.asistencia_tutor WHERE academia_id = :aid"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.asistencias WHERE alumno_id IN (SELECT id FROM academias.alumnos WHERE academia_id = :aid)"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.cuotas WHERE academia_id = :aid"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.inscripciones WHERE alumno_id IN (SELECT id FROM academias.alumnos WHERE academia_id = :aid)"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.historial_asociacion WHERE alumno_id IN (SELECT id FROM academias.alumnos WHERE academia_id = :aid)"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.alumno_tutores WHERE alumno_id IN (SELECT id FROM academias.alumnos WHERE academia_id = :aid)"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.alumnos WHERE academia_id = :aid"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.tutores WHERE academia_id = :aid"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.categorias WHERE sucursal_id IN (SELECT id FROM academias.sucursales WHERE academia_id = :aid)"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.miembros WHERE academia_id = :aid"), {"aid": academia_id})
            await conn.execute(text("DELETE FROM academias.sucursales WHERE academia_id = :aid"), {"aid": academia_id})

            # -------------------------------------------------------------
            # 3. SUCURSALES
            # -------------------------------------------------------------
            sucursales_data = [
                {
                    "nombre": "Sede Central - Centro Deportivo Elite",
                    "deporte": "Fútbol",
                    "direccion": "Av. Mariscal López 1500",
                    "ciudad": "Asunción",
                    "departamento": "Central",
                    "telefono": "0981 123 456",
                    "email": "central@elitepro.com.py"
                },
                {
                    "nombre": "Sede Norte - Complejo Deportivo Norte",
                    "deporte": "Básquetbol",
                    "direccion": "Ruta III Km 14",
                    "ciudad": "Luque",
                    "departamento": "Central",
                    "telefono": "0981 654 321",
                    "email": "norte@elitepro.com.py"
                },
                {
                    "nombre": "Sede Costanera - Racquet Club",
                    "deporte": "Pádel",
                    "direccion": "Av. Costanera Norte",
                    "ciudad": "Asunción",
                    "departamento": "Central",
                    "telefono": "0981 999 888",
                    "email": "costanera@elitepro.com.py"
                }
            ]
            
            sucursal_ids = {}
            for s in sucursales_data:
                res_s = await conn.execute(
                    text("""
                        INSERT INTO academias.sucursales (academia_id, nombre, deporte, direccion, ciudad, departamento, telefono, email, activa)
                        VALUES (:aid, :nom, :dep, :dir, :ciu, :depa, :tel, :em, true)
                        RETURNING id
                    """),
                    {
                        "aid": academia_id, "nom": s["nombre"], "dep": s["deporte"],
                        "dir": s["direccion"], "ciu": s["ciudad"], "depa": s["departamento"],
                        "tel": s["telefono"], "em": s["email"]
                    }
                )
                sucursal_ids[s["deporte"]] = res_s.scalar()
            
            print(f"[OK] {len(sucursal_ids)} Sucursales creadas.")
            
            # -------------------------------------------------------------
            # 4. STAFF / MIEMBROS DE LA ACADEMIA
            # -------------------------------------------------------------
            staff_users = [
                {"username": "profesor_carlos", "email": "carlos.profe@micancha.com.py", "nombre": "Carlos Alberto Giménez", "rol": "profesor", "sucursal": sucursal_ids["Fútbol"]},
                {"username": "profesor_lucia", "email": "lucia.profe@micancha.com.py", "nombre": "Lucía Fernández", "rol": "profesor", "sucursal": sucursal_ids["Básquetbol"]},
                {"username": "tesorero_maria", "email": "maria.tesoreria@micancha.com.py", "nombre": "María José Torales", "rol": "tesorero", "sucursal": None},
                {"username": "admin_juan", "email": "juan.admin@micancha.com.py", "nombre": "Juan Pedro Acosta", "rol": "administrador", "sucursal": None},
            ]
            
            for su in staff_users:
                # Crear usuario en sistema.usuarios
                res_su = await conn.execute(
                    text("SELECT id FROM sistema.usuarios WHERE username = :usr"),
                    {"usr": su["username"]}
                )
                r_su = res_su.fetchone()
                if not r_su:
                    res_in = await conn.execute(
                        text("""
                            INSERT INTO sistema.usuarios (username, email, hashed_password, nombre_completo, rol, activo)
                            VALUES (:usr, :em, :pwd, :nom, 'usuario', true)
                            RETURNING id
                        """),
                        {"usr": su["username"], "em": su["email"], "pwd": hashed_pwd, "nom": su["nombre"]}
                    )
                    st_uid = res_in.scalar()
                else:
                    st_uid = r_su[0]
                
                # Crear miembro
                await conn.execute(
                    text("""
                        INSERT INTO academias.miembros (academia_id, usuario_id, rol, sucursal_id, activo)
                        VALUES (:aid, :uid, :rol, :sid, true)
                    """),
                    {"aid": academia_id, "uid": st_uid, "rol": su["rol"], "sid": su["sucursal"]}
                )
            
            print(f"[OK] {len(staff_users)} Miembros del Staff registrados.")
            
            # -------------------------------------------------------------
            # 5. CATEGORÍAS POR SUCURSAL
            # -------------------------------------------------------------
            categorias_data = [
                {"sucursal_id": sucursal_ids["Fútbol"], "nombre": "Sub-8 Iniciación", "edad_min": 5, "edad_max": 8, "desc": "Fundamentos tácticos y control de balón para principiantes.", "color": "#3B82F6"},
                {"sucursal_id": sucursal_ids["Fútbol"], "nombre": "Sub-12 Desarrollo", "edad_min": 9, "edad_max": 12, "desc": "Desarrollo de habilidades técnicas, pases y juego colectivo.", "color": "#10B981"},
                {"sucursal_id": sucursal_ids["Fútbol"], "nombre": "Sub-15 Competición", "edad_min": 13, "edad_max": 15, "desc": "Alto rendimiento, preparación física y estrategia competitiva.", "color": "#EF4444"},
                
                {"sucursal_id": sucursal_ids["Básquetbol"], "nombre": "Mini Básquet (Sub-10)", "edad_min": 6, "edad_max": 10, "desc": "Manejo de balón, drible y tiros libres.", "color": "#F59E0B"},
                {"sucursal_id": sucursal_ids["Básquetbol"], "nombre": "Juvenil Básquet (Sub-16)", "edad_min": 11, "edad_max": 16, "desc": "Sistemas ofensivos y defensivos en cancha completa.", "color": "#8B5CF6"},
                
                {"sucursal_id": sucursal_ids["Pádel"], "nombre": "Pádel Niños (Sub-14)", "edad_min": 8, "edad_max": 14, "desc": "Voleas, bandejas y paredes para niños y adolescentes.", "color": "#EC4899"},
                {"sucursal_id": sucursal_ids["Pádel"], "nombre": "Pádel Adultos Recreativo", "edad_min": 18, "edad_max": 60, "desc": "Entrenamientos grupales nocturnos y partidos amistosos.", "color": "#06B6D4"},
            ]
            
            cat_ids = {}
            for c in categorias_data:
                res_c = await conn.execute(
                    text("""
                        INSERT INTO academias.categorias (sucursal_id, nombre, edad_min, edad_max, descripcion, color, activa)
                        VALUES (:sid, :nom, :emin, :emax, :desc, :col, true)
                        RETURNING id
                    """),
                    {
                        "sid": c["sucursal_id"], "nom": c["nombre"],
                        "emin": c["edad_min"], "emax": c["edad_max"],
                        "desc": c["desc"], "col": c["color"]
                    }
                )
                cat_ids[c["nombre"]] = res_c.scalar()
                
            print(f"[OK] {len(cat_ids)} Categorías creadas.")
            
            # -------------------------------------------------------------
            # 6. TUTORES / PADRES
            # -------------------------------------------------------------
            tutores_data = [
                {"nombre": "Roberto", "apellido": "Benítez", "telefono": "0971 111 222", "email": "roberto.benitez@gmail.com", "vinculo": "Padre", "es_pagador": True},
                {"nombre": "María Elena", "apellido": "González", "telefono": "0971 333 444", "email": "maria.gonzalez@gmail.com", "vinculo": "Madre", "es_pagador": True},
                {"nombre": "Fernando", "apellido": "Villalba", "telefono": "0982 555 666", "email": "f.villalba@gmail.com", "vinculo": "Padre", "es_pagador": True},
                {"nombre": "Patricia", "apellido": "Cardozo", "telefono": "0983 777 888", "email": "p.cardozo@outlook.com", "vinculo": "Madre", "es_pagador": True},
                {"nombre": "Carlos", "apellido": "Mendoza", "telefono": "0991 222 333", "email": "cmendoza@hotmail.com", "vinculo": "Tutor Legal", "es_pagador": True},
                {"nombre": "Andrea", "apellido": "Martínez", "telefono": "0992 444 555", "email": "andrea.martinez@gmail.com", "vinculo": "Madre", "es_pagador": True},
            ]
            
            tutor_ids = {}
            for t in tutores_data:
                res_t = await conn.execute(
                    text("""
                        INSERT INTO academias.tutores (academia_id, nombre, apellido, telefono, email, vinculo, es_pagador)
                        VALUES (:aid, :nom, :ape, :tel, :em, :vinc, :pag)
                        RETURNING id
                    """),
                    {
                        "aid": academia_id, "nom": t["nombre"], "ape": t["apellido"],
                        "tel": t["telefono"], "em": t["email"], "vinc": t["vinculo"], "pag": t["es_pagador"]
                    }
                )
                t_key = f"{t['nombre']} {t['apellido']}"
                tutor_ids[t_key] = res_t.scalar()
                
            print(f"[OK] {len(tutor_ids)} Tutores creados.")
            
            # -------------------------------------------------------------
            # 7. ALUMNOS
            # -------------------------------------------------------------
            alumnos_data = [
                # Familia Benítez (2 hermanos -> desc 15%)
                {"nombre": "Lucas", "apellido": "Benítez", "fnac": date(2017, 4, 12), "sucursal": sucursal_ids["Fútbol"], "sangre": "O+", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "ASISMED", "emergencia": "0971 111 222", "estado": "activo", "notas": "Excelente coordinación motriz.", "tutor": "Roberto Benítez"},
                {"nombre": "Mateo", "apellido": "Benítez", "fnac": date(2015, 8, 20), "sucursal": sucursal_ids["Fútbol"], "sangre": "O+", "alergias": "Penicilina", "condiciones": "Asma leve (lleva inhalador)", "seguro": "ASISMED", "emergencia": "0971 111 222", "estado": "activo", "notas": "Hermano de Lucas Benítez.", "tutor": "Roberto Benítez"},
                
                # Familia Villalba (3 hermanos -> desc 25%)
                {"nombre": "Santino", "apellido": "Villalba", "fnac": date(2018, 1, 15), "sucursal": sucursal_ids["Fútbol"], "sangre": "A+", "alergias": "Polen", "condiciones": "Ninguna", "seguro": "SPS", "emergencia": "0982 555 666", "estado": "activo", "notas": "Primer año en categoría Sub-8.", "tutor": "Fernando Villalba"},
                {"nombre": "Joaquín", "apellido": "Villalba", "fnac": date(2014, 6, 10), "sucursal": sucursal_ids["Fútbol"], "sangre": "A+", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "SPS", "emergencia": "0982 555 666", "estado": "activo", "notas": "Mediocentro defensivo titular.", "tutor": "Fernando Villalba"},
                {"nombre": "Sofía", "apellido": "Villalba", "fnac": date(2012, 11, 5), "sucursal": sucursal_ids["Fútbol"], "sangre": "A+", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "SPS", "emergencia": "0982 555 666", "estado": "activo", "notas": "Capitana de equipo Sub-15.", "tutor": "Fernando Villalba"},
                
                # Otros alumnos
                {"nombre": "Bruno", "apellido": "Mendoza", "fnac": date(2016, 3, 30), "sucursal": sucursal_ids["Básquetbol"], "sangre": "B+", "alergias": "Lactosa", "condiciones": "Ninguna", "seguro": "Santa Clara", "emergencia": "0991 222 333", "estado": "activo", "notas": "Entusiasmo en básquetbol.", "tutor": "Carlos Mendoza"},
                {"nombre": "Thiago", "apellido": "González", "fnac": date(2013, 9, 14), "sucursal": sucursal_ids["Fútbol"], "sangre": "O-", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "Unimed", "emergencia": "0971 333 444", "estado": "activo", "notas": "Beca de mérito deportivo 100%.", "tutor": "María Elena González"},
                {"nombre": "Enzo", "apellido": "Martínez", "fnac": date(2015, 12, 1), "sucursal": sucursal_ids["Fútbol"], "sangre": "A-", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "Sin Seguro", "emergencia": "0992 444 555", "estado": "prueba", "notas": "Semana de clase de prueba gratuita.", "tutor": "Andrea Martínez"},
                {"nombre": "Diego", "apellido": "Rojas", "fnac": date(2011, 5, 18), "sucursal": sucursal_ids["Básquetbol"], "sangre": "O+", "alergias": "Polvo", "condiciones": "Ninguna", "seguro": "Odontos", "emergencia": "0971 111 222", "estado": "activo", "notas": "Alero con gran tiro exterior.", "tutor": "Roberto Benítez"},
                {"nombre": "Valentina", "apellido": "Cardozo", "fnac": date(2014, 2, 28), "sucursal": sucursal_ids["Pádel"], "sangre": "AB+", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "Migone", "emergencia": "0983 777 888", "estado": "activo", "notas": "Promesa en Pádel infantil.", "tutor": "Patricia Cardozo"},
                {"nombre": "Agustín", "apellido": "Duarte", "fnac": date(2017, 7, 22), "sucursal": sucursal_ids["Fútbol"], "sangre": "O+", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "ASISMED", "emergencia": "0992 444 555", "estado": "inactivo", "notas": "Licencia temporal por viaje.", "tutor": "Andrea Martínez"},
                {"nombre": "Camila", "apellido": "Torres", "fnac": date(1995, 10, 8), "sucursal": sucursal_ids["Pádel"], "sangre": "A+", "alergias": "Ninguna", "condiciones": "Ninguna", "seguro": "ASISMED", "emergencia": "0983 777 888", "estado": "activo", "notas": "Categoría Adultos Recreativo.", "tutor": "Patricia Cardozo"},
            ]
            
            alumno_ids = {}
            for a in alumnos_data:
                res_al = await conn.execute(
                    text("""
                        INSERT INTO academias.alumnos (
                            academia_id, sucursal_id, nombre, apellido, fecha_nacimiento,
                            tipo_sangre, alergias, condiciones_medicas, seguro_medico,
                            contacto_emergencia, estado, notas
                        ) VALUES (
                            :aid, :sid, :nom, :ape, :fnac, :sangre, :alerg, :cond, :seg, :emerg, :est, :notas
                        ) RETURNING id
                    """),
                    {
                        "aid": academia_id, "sid": a["sucursal"], "nom": a["nombre"], "ape": a["apellido"],
                        "fnac": a["fnac"], "sangre": a["sangre"], "alerg": a["alergias"], "cond": a["condiciones"],
                        "seg": a["seguro"], "emerg": a["emergencia"], "est": a["estado"], "notas": a["notas"]
                    }
                )
                a_id = res_al.scalar()
                a_key = f"{a['nombre']} {a['apellido']}"
                alumno_ids[a_key] = a_id
                
                # Relación Alumno ↔ Tutor
                tut_id = tutor_ids[a["tutor"]]
                await conn.execute(
                    text("""
                        INSERT INTO academias.alumno_tutores (alumno_id, tutor_id, es_tutor_principal)
                        VALUES (:alid, :tid, true)
                    """),
                    {"alid": a_id, "tid": tut_id}
                )
                
                # Historial de Asociación
                await conn.execute(
                    text("""
                        INSERT INTO academias.historial_asociacion (alumno_id, fecha_inicio, motivo_baja)
                        VALUES (:alid, '2026-01-15', NULL)
                    """),
                    {"alid": a_id}
                )

            print(f"[OK] {len(alumno_ids)} Alumnos creados con fichas médicas y tutores vinculados.")
            
            # -------------------------------------------------------------
            # 8. INSCRIPCIONES
            # -------------------------------------------------------------
            inscripciones_data = [
                {"alumno": "Lucas Benítez", "categoria": "Sub-8 Iniciación", "cuota": 250000, "desc": 15.0, "beca": False, "estado": "activa"},
                {"alumno": "Mateo Benítez", "categoria": "Sub-12 Desarrollo", "cuota": 280000, "desc": 15.0, "beca": False, "estado": "activa"},
                {"alumno": "Santino Villalba", "categoria": "Sub-8 Iniciación", "cuota": 250000, "desc": 25.0, "beca": False, "estado": "activa"},
                {"alumno": "Joaquín Villalba", "categoria": "Sub-12 Desarrollo", "cuota": 280000, "desc": 25.0, "beca": False, "estado": "activa"},
                {"alumno": "Sofía Villalba", "categoria": "Sub-15 Competición", "cuota": 300000, "desc": 25.0, "beca": False, "estado": "activa"},
                {"alumno": "Bruno Mendoza", "categoria": "Mini Básquet (Sub-10)", "cuota": 260000, "desc": 0.0, "beca": False, "estado": "activa"},
                {"alumno": "Thiago González", "categoria": "Sub-15 Competición", "cuota": 300000, "desc": 100.0, "beca": True, "estado": "activa"},
                {"alumno": "Enzo Martínez", "categoria": "Sub-12 Desarrollo", "cuota": 280000, "desc": 0.0, "beca": False, "estado": "activa"},
                {"alumno": "Diego Rojas", "categoria": "Juvenil Básquet (Sub-16)", "cuota": 280000, "desc": 0.0, "beca": False, "estado": "activa"},
                {"alumno": "Valentina Cardozo", "categoria": "Pádel Niños (Sub-14)", "cuota": 320000, "desc": 0.0, "beca": False, "estado": "activa"},
                {"alumno": "Agustín Duarte", "categoria": "Sub-8 Iniciación", "cuota": 250000, "desc": 0.0, "beca": False, "estado": "suspendida"},
                {"alumno": "Camila Torres", "categoria": "Pádel Adultos Recreativo", "cuota": 350000, "desc": 0.0, "beca": False, "estado": "activa"},
            ]
            
            inscripcion_map = {} # (alumno_id) -> (inscripcion_id, cuota_final, alumno_name)
            for i in inscripciones_data:
                al_id = alumno_ids[i["alumno"]]
                cat_id = cat_ids[i["categoria"]]
                cuota_orig = i["cuota"]
                desc = i["desc"]
                cuota_final = cuota_orig * (1 - desc / 100.0) if not i["beca"] else 0
                
                res_in = await conn.execute(
                    text("""
                        INSERT INTO academias.inscripciones (
                            alumno_id, categoria_id, fecha_inicio, dias_por_semana, cuota_mensual,
                            descuento_aplicado, beca, estado, notas
                        ) VALUES (
                            :alid, :cid, '2026-02-01', 3, :cuota, :desc, :beca, :est, :notas
                        ) RETURNING id
                    """),
                    {
                        "alid": al_id, "cid": cat_id, "cuota": cuota_orig,
                        "desc": desc, "beca": i["beca"], "est": i["estado"],
                        "notas": f"Inscripción en {i['categoria']}"
                    }
                )
                insc_id = res_in.scalar()
                inscripcion_map[al_id] = (insc_id, cuota_orig, desc, cuota_final, i["alumno"])

            print(f"[OK] {len(inscripcion_map)} Inscripciones activadas.")

            # -------------------------------------------------------------
            # 9. GENERACIÓN DE CUOTAS (Mayo 2026 a Agosto 2026)
            # -------------------------------------------------------------
            periodos = [
                {"periodo": "2026-05", "venc": date(2026, 5, 10), "default_estado": "pagada"},
                {"periodo": "2026-06", "venc": date(2026, 6, 10), "default_estado": "pagada"},
                {"periodo": "2026-07", "venc": date(2026, 7, 10), "default_estado": "pendiente"},
                {"periodo": "2026-08", "venc": date(2026, 8, 10), "default_estado": "pendiente"},
            ]
            
            count_cuotas = 0
            for al_id, (insc_id, orig, desc_pct, final, al_nombre) in inscripcion_map.items():
                for p in periodos:
                    per = p["periodo"]
                    venc = p["venc"]
                    desc_monto = orig * (desc_pct / 100.0)
                    
                    # Lógica de estados realistas para demo
                    if desc_pct == 100.0:
                        est = "becada"
                        monto_fin = 0
                        fpago = datetime(2026, int(per[-2:]), 1, 10, 0)
                        metodo = "Beca Directa"
                        penaliz = 0
                    elif per == "2026-05":
                        est = "pagada"
                        monto_fin = final
                        fpago = datetime(2026, 5, 5, 14, 30)
                        metodo = "Efectivo"
                        penaliz = 0
                    elif per == "2026-06":
                        if al_nombre in ["Bruno Mendoza", "Diego Rojas"]:
                            est = "vencida"
                            monto_fin = final
                            fpago = None
                            metodo = None
                            penaliz = 25000  # 5 días * 5000
                        else:
                            est = "pagada"
                            monto_fin = final
                            fpago = datetime(2026, 6, 8, 11, 0)
                            metodo = "Transferencia Bancaria"
                            penaliz = 0
                    elif per == "2026-07": # Mes actual
                        if al_nombre in ["Lucas Benítez", "Mateo Benítez", "Valentina Cardozo"]:
                            est = "pagada"
                            monto_fin = final
                            fpago = datetime(2026, 7, 7, 16, 20)
                            metodo = "Giros Tigo"
                            penaliz = 0
                        elif al_nombre in ["Bruno Mendoza", "Diego Rojas"]:
                            est = "vencida"
                            monto_fin = final
                            fpago = None
                            metodo = None
                            penaliz = 55000 # días de mora acumulados
                        else:
                            est = "pendiente"
                            monto_fin = final
                            fpago = None
                            metodo = None
                            penaliz = 0
                    else: # 2026-08 (futuro)
                        est = "pendiente"
                        monto_fin = final
                        fpago = None
                        metodo = None
                        penaliz = 0
                        
                    await conn.execute(
                        text("""
                            INSERT INTO academias.cuotas (
                                inscripcion_id, alumno_id, academia_id, periodo,
                                monto_original, descuento, monto_final, monto_penalizacion,
                                estado, fecha_vencimiento, fecha_pago, metodo_pago, registrado_por, notas
                            ) VALUES (
                                :iid, :alid, :aid, :per, :orig, :desc, :final, :pen, :est, :venc, :fpago, :metodo, :regby, :notas
                            ) ON CONFLICT (inscripcion_id, periodo) DO UPDATE SET
                                estado = EXCLUDED.estado,
                                monto_final = EXCLUDED.monto_final,
                                fecha_pago = EXCLUDED.fecha_pago,
                                metodo_pago = EXCLUDED.metodo_pago
                        """),
                        {
                            "iid": insc_id, "alid": al_id, "aid": academia_id, "per": per,
                            "orig": orig, "desc": desc_monto, "final": monto_fin, "pen": penaliz,
                            "est": est, "venc": venc, "fpago": fpago, "metodo": metodo,
                            "regby": owner_id, "notas": f"Cuota mensual correspondiente a {per}"
                        }
                    )
                    count_cuotas += 1
                    
            print(f"[OK] {count_cuotas} Registros de cuotas generados (Mayo-Agosto 2026).")

            # -------------------------------------------------------------
            # 10. LISTA DE ASISTENCIAS DE ALUMNOS
            # -------------------------------------------------------------
            fechas_entrenamiento = [
                date(2026, 7, 1), date(2026, 7, 3), date(2026, 7, 6),
                date(2026, 7, 8), date(2026, 7, 10), date(2026, 7, 13),
                date(2026, 7, 15), date(2026, 7, 17), date(2026, 7, 20)
            ]
            
            count_asist = 0
            for f in fechas_entrenamiento:
                for al_nombre, al_id in alumno_ids.items():
                    # Obtener categoría del alumno
                    res_c = await conn.execute(
                        text("SELECT categoria_id FROM academias.inscripciones WHERE alumno_id = :alid LIMIT 1"),
                        {"alid": al_id}
                    )
                    r_c = res_c.fetchone()
                    if not r_c:
                        continue
                    cat_id = r_c[0]
                    
                    # Variar estados
                    if al_nombre == "Lucas Benítez":
                        est = "presente"
                        obs = "Excelente participación e intensidad."
                    elif al_nombre == "Mateo Benítez" and f == date(2026, 7, 10):
                        est = "ausente_justificado"
                        obs = "Reposo por indicación médica (asma)."
                    elif al_nombre == "Sofía Villalba" and f == date(2026, 7, 15):
                        est = "lesionado"
                        obs = "Esguince leve de tobillo durante entrenamiento."
                    elif al_nombre == "Bruno Mendoza" and f in [date(2026, 7, 6), date(2026, 7, 13)]:
                        est = "tarde"
                        obs = "Llegó 15 min tarde por congestión vehicular."
                    elif al_nombre == "Diego Rojas" and f == date(2026, 7, 17):
                        est = "ausente"
                        obs = "Sin aviso previo."
                    else:
                        est = "presente"
                        obs = None
                        
                    await conn.execute(
                        text("""
                            INSERT INTO academias.asistencias (
                                alumno_id, categoria_id, fecha, estado, observaciones, registrado_por_id
                            ) VALUES (
                                :alid, :cid, :fec, :est, :obs, :regby
                            ) ON CONFLICT (alumno_id, categoria_id, fecha) DO UPDATE SET
                                estado = EXCLUDED.estado,
                                observaciones = EXCLUDED.observaciones
                        """),
                        {
                            "alid": al_id, "cid": cat_id, "fec": f,
                            "est": est, "obs": obs, "regby": owner_id
                        }
                    )
                    count_asist += 1
                    
            print(f"[OK] {count_asist} Registros de asistencia generados.")

            # -------------------------------------------------------------
            # 11. ASISTENCIA A REUNIONES DE TUTORES
            # -------------------------------------------------------------
            for t_nombre, t_id in tutor_ids.items():
                pres = t_nombre in ["Roberto Benítez", "María Elena González", "Fernando Villalba", "Patricia Cardozo"]
                await conn.execute(
                    text("""
                        INSERT INTO academias.asistencia_tutor (tutor_id, academia_id, fecha, descripcion_reunion, presente)
                        VALUES (:tid, :aid, '2026-07-05', 'Reunión Informativa: Evaluación Primer Semestre y Torneo Inter-Sucursales', :pres)
                    """),
                    {"tid": t_id, "aid": academia_id, "pres": pres}
                )
            print("[OK] Asistencia de tutores a reuniones registrada.")

            # -------------------------------------------------------------
            # 12. NOTICIAS PÚBLICAS Y COMUNICADOS
            # -------------------------------------------------------------
            noticias = [
                {
                    "titulo": "🚀 ¡Inscripciones Abiertas para la Temporada de Invierno 2026!",
                    "contenido": "Sumate a los entrenamientos de Fútbol, Básquetbol y Pádel en nuestras 3 sedes habilitadas. Contamos con entrenadores certificados y ambientes equipados.",
                    "img": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
                    "fpub": date(2026, 7, 1)
                },
                {
                    "titulo": "🏆 Gran Torneo Inter-Sucursales Elite Pro 2026",
                    "contenido": "Este fin de semana se disputará el torneo de integración entre Sede Central, Sede Norte y Sede Costanera. ¡Invitamos a todos los tutores y familias a alentar!",
                    "img": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
                    "fpub": date(2026, 7, 12)
                },
                {
                    "titulo": "🥗 Talleres de Nutrición Deportiva y Prevención de Lesiones",
                    "contenido": "El próximo sábado a las 10:00 hs contaremos con la visita del Lic. Marcos Silva para brindar una charla a nuestros atletas Sub-12 y Sub-15.",
                    "img": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
                    "fpub": date(2026, 7, 18)
                }
            ]
            
            for n in noticias:
                await conn.execute(
                    text("""
                        INSERT INTO academias.noticias_publicas (academia_id, titulo, contenido, imagen_url, fecha_publicacion, activa)
                        VALUES (:aid, :tit, :cont, :img, :fpub, true)
                    """),
                    {"aid": academia_id, "tit": n["titulo"], "cont": n["contenido"], "img": n["img"], "fpub": n["fpub"]}
                )
            print(f"[OK] {len(noticias)} Noticias públicas publicadas.")

            # -------------------------------------------------------------
            # 13. FEEDBACK Y ENCUESTAS DE SOCIOS
            # -------------------------------------------------------------
            feedback_items = [
                {
                    "tutor": tutor_ids["Roberto Benítez"], "alumno": alumno_ids["Lucas Benítez"],
                    "tipo": "conversacion", "asunto": "Consulta sobre uniformes de invierno",
                    "mensaje": "Buenas tardes, quisiera consultar cuándo estarán disponibles los abrigos oficiales de la academia.",
                    "leido": True
                },
                {
                    "tutor": tutor_ids["Fernando Villalba"], "alumno": alumno_ids["Joaquín Villalba"],
                    "tipo": "buzon", "asunto": "Excelente organización del entrenamiento del viernes",
                    "mensaje": "Felicitaciones al Profe Carlos por la dedicación con la categoría Sub-12. Muy coordinados los ejercicios.",
                    "leido": True
                },
                {
                    "tutor": tutor_ids["Patricia Cardozo"], "alumno": alumno_ids["Valentina Cardozo"],
                    "tipo": "encuesta", "asunto": "Encuesta de Satisfacción - Sede Costanera Pádel",
                    "mensaje": "Las canchas se encuentran en impecable estado. Sugerimos agregar iluminación adicional en la zona de parqueo.",
                    "leido": False
                }
            ]
            
            for fb in feedback_items:
                await conn.execute(
                    text("""
                        INSERT INTO academias.feedback_socios (academia_id, tutor_id, alumno_id, tipo, asunto, mensaje, leido)
                        VALUES (:aid, :tid, :alid, :tipo, :asu, :msg, :leido)
                    """),
                    {
                        "aid": academia_id, "tid": fb["tutor"], "alid": fb["alumno"],
                        "tipo": fb["tipo"], "asu": fb["asunto"], "msg": fb["mensaje"], "leido": fb["leido"]
                    }
                )
            print(f"[OK] {len(feedback_items)} Mensajes de Feedback registrados.")

    await engine.dispose()
    print("=" * 70)
    print(" ¡SEED COMPLETO FINALIZADO CON ÉXITO!")
    print("=" * 70)
    print("Credenciales de Acceso:")
    print(f"  - Usuario Principal (Dueño): {username}")
    print(f"  - Contraseña: {password}")
    print("  - URL Panel: http://localhost:3000/academia-panel")
    print("  - URL Pública: http://localhost:3000/academia/elite-pro")
    print("=" * 70)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
