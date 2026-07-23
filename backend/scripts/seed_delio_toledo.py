"""
Script de Seed para la Escuela de Fútbol Delio Toledo 2011
=========================================================
Pobla los datos reales mostrados en los volantes:
- Horarios de oficina
- Categorías (2020/21, 2018/19, 2016/17, 2014/15, 2012/13)
- Locales / Canchas (Cancha María Auxiliadora, Complejo Dos Toques)
- Programación de prácticas 2026 por día, categoría y cancha
- Tabla de costos 2026 (Matrícula, Cuotas por categoría, Indumentaria)
- Vigencia: Enero 2026 - Diciembre 2026 ('2026')
"""

import asyncio
import os
import sys
import json
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida")
    sys.exit(1)

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")


async def seed_delio_toledo():
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.connect() as conn:
        print("=== SEEDING DELIO TOLEDO 2011 ===")

        # 1. Buscar o crear usuario delio_toledo
        pwd_hash = '$2b$12$kRONdmzp4JTHIutTgCEMHO4kysnf6kvN.jGCC/8sU/Ua0xjs6lrW.'
        res_usr = await conn.execute(text("SELECT id FROM sistema.usuarios WHERE username = 'delio_toledo'"))
        row_usr = res_usr.fetchone()
        if row_usr:
            user_id = row_usr[0]
            await conn.execute(text("""
                UPDATE sistema.usuarios
                SET hashed_password = :h, activo = true
                WHERE id = :uid
            """), {"h": pwd_hash, "uid": user_id})
        else:
            res_ins_usr = await conn.execute(text("""
                INSERT INTO sistema.usuarios (username, email, hashed_password, nombre_completo, rol, activo)
                VALUES ('delio_toledo', 'delio_toledo@micancha.com.py', :h, 'Escuela de Fútbol Delio Toledo', 'academia', true)
                RETURNING id
            """), {"h": pwd_hash})
            user_id = res_ins_usr.fetchone()[0]

        # 2. Horarios de oficina JSON
        horarios_oficina = [
            {"dia": "Lunes", "hora_inicio": "18:00", "hora_fin": "20:00"},
            {"dia": "Martes", "hora_inicio": "17:00", "hora_fin": "20:00"},
            {"dia": "Miércoles", "hora_inicio": "17:30", "hora_fin": "19:00"},
            {"dia": "Jueves", "hora_inicio": "17:00", "hora_fin": "20:00"},
        ]

        # 3. Insert / Update Academia
        res_acad = await conn.execute(text("SELECT id FROM academias.academias WHERE enlace_sitio = 'delio-toledo' OR usuario_id = :uid"), {"uid": user_id})
        row_acad = res_acad.fetchone()
        if row_acad:
            academia_id = str(row_acad[0])
            await conn.execute(text("""
                UPDATE academias.academias SET
                    nombre = 'Escuela de Fútbol Delio Toledo',
                    descripcion = 'Formación deportiva integral para niños y jóvenes.',
                    enlace_sitio = 'delio-toledo',
                    color_primario = '#0ea5e9',
                    acerca_de = 'Escuela de Fútbol Delio Toledo 2011 - Fernando de la Mora, Zona Norte. Entrenamientos en Complejo Dos Toques y Cancha María Auxiliadora.',
                    telefono = '0984872265',
                    whatsapp = '595984872265',
                    instagram = '@edfdeliotoledo',
                    ciudad = 'Fernando de la Mora',
                    departamento = 'Central',
                    pais = 'Paraguay',
                    horarios_oficina = CAST(:hof AS JSONB),
                    habilitada = true
                WHERE id = :aid
            """), {"aid": academia_id, "hof": json.dumps(horarios_oficina)})
        else:
            res_ins_acad = await conn.execute(text("""
                INSERT INTO academias.academias (
                    usuario_id, nombre, descripcion, enlace_sitio, color_primario,
                    acerca_de, telefono, whatsapp, instagram, ciudad, departamento, pais,
                    horarios_oficina, habilitada
                ) VALUES (
                    :uid, 'Escuela de Fútbol Delio Toledo', 'Formación deportiva integral para niños y jóvenes.',
                    'delio-toledo', '#0ea5e9',
                    'Escuela de Fútbol Delio Toledo 2011 - Fernando de la Mora, Zona Norte. Entrenamientos en Complejo Dos Toques y Cancha María Auxiliadora.',
                    '0984872265', '595984872265', '@edfdeliotoledo', 'Fernando de la Mora', 'Central', 'Paraguay',
                    CAST(:hof AS JSONB), true
                ) RETURNING id
            """), {"uid": user_id, "hof": json.dumps(horarios_oficina)})
            academia_id = str(res_ins_acad.fetchone()[0])

        # 4. Sucursales / Sedes (Canchas)
        await conn.execute(text("DELETE FROM academias.sucursales WHERE academia_id = :aid"), {"aid": academia_id})
        res_suc1 = await conn.execute(text("""
            INSERT INTO academias.sucursales (academia_id, nombre, deporte, ciudad, departamento, direccion, telefono, activa)
            VALUES (:aid, 'Complejo Dos Toques', 'Fútbol', 'Fernando de la Mora', 'Central', 'Zona Norte', '0985880082', true)
            RETURNING id
        """), {"aid": academia_id})
        suc1_id = str(res_suc1.fetchone()[0])

        res_suc2 = await conn.execute(text("""
            INSERT INTO academias.sucursales (academia_id, nombre, deporte, ciudad, departamento, direccion, telefono, activa)
            VALUES (:aid, 'Cancha María Auxiliadora', 'Fútbol', 'Fernando de la Mora', 'Central', 'Zona Norte', '0984872265', true)
            RETURNING id
        """), {"aid": academia_id})
        suc2_id = str(res_suc2.fetchone()[0])

        # 5. Categorías
        await conn.execute(text("DELETE FROM academias.categorias WHERE sucursal_id IN (:s1, :s2)"), {"s1": suc1_id, "s2": suc2_id})
        cats_data = [
            ("Categoría 2020 y 2021", 5, 6, "#06b6d4"),
            ("Categoría 2018 y 2019", 7, 8, "#3b82f6"),
            ("Categoría 2016 y 2017", 9, 10, "#6366f1"),
            ("Categoría 2014 y 2015", 11, 12, "#8b5cf6"),
            ("Categoría 2013 y 2012", 13, 14, "#ec4899"),
        ]
        cat_ids = {}
        for cname, min_e, max_e, color in cats_data:
            r = await conn.execute(text("""
                INSERT INTO academias.categorias (sucursal_id, nombre, edad_min, edad_max, color, activa)
                VALUES (:sid, :nom, :min_e, :max_e, :col, true)
                RETURNING id
            """), {"sid": suc1_id, "nom": cname, "min_e": min_e, "max_e": max_e, "col": color})
            cat_ids[cname] = str(r.fetchone()[0])

        # 6. Limpiar y Cargar Horarios de Práctica 2026
        await conn.execute(text("DELETE FROM academias.horarios_practica WHERE academia_id = :aid"), {"aid": academia_id})
        practicas = [
            # Cat 2020 y 2021
            (cat_ids["Categoría 2020 y 2021"], None, suc1_id, "Complejo Dos Toques", "Martes", "17:00", "18:15"),
            (cat_ids["Categoría 2020 y 2021"], None, suc1_id, "Complejo Dos Toques", "Jueves", "17:00", "18:15"),

            # Cat 2018 y 2019
            (cat_ids["Categoría 2018 y 2019"], None, suc2_id, "Cancha María Auxiliadora", "Lunes", "17:00", "18:00"),
            (cat_ids["Categoría 2018 y 2019"], None, suc1_id, "Complejo Dos Toques", "Miércoles", "17:30", "18:45"),
            (cat_ids["Categoría 2018 y 2019"], None, suc1_id, "Complejo Dos Toques", "Jueves", "17:30", "18:30"),

            # Cat 2016 y 2017
            (cat_ids["Categoría 2016 y 2017"], "2017", suc2_id, "Cancha María Auxiliadora", "Lunes", "18:00", "19:00"),
            (cat_ids["Categoría 2016 y 2017"], "2016", suc2_id, "Cancha María Auxiliadora", "Lunes", "19:00", "20:00"),
            (cat_ids["Categoría 2016 y 2017"], None, suc1_id, "Cancha Dos Toques", "Martes", "18:15", "20:00"),
            (cat_ids["Categoría 2016 y 2017"], "2017", suc2_id, "Cancha María Auxiliadora", "Jueves", "17:30", "18:15"),
            (cat_ids["Categoría 2016 y 2017"], "2016", suc2_id, "Cancha María Auxiliadora", "Jueves", "18:15", "19:00"),

            # Cat 2014 y 2015
            (cat_ids["Categoría 2014 y 2015"], "2015", suc1_id, "Cancha Dos Toques", "Lunes", "18:00", "19:00"),
            (cat_ids["Categoría 2014 y 2015"], "2014", suc1_id, "Cancha Dos Toques", "Lunes", "19:00", "20:00"),
            (cat_ids["Categoría 2014 y 2015"], None, suc2_id, "Cancha María Auxiliadora", "Miércoles", "19:00", "20:00"),
            (cat_ids["Categoría 2014 y 2015"], None, suc2_id, "Cancha María Auxiliadora", "Jueves", "19:00", "20:00"),

            # Cat 2013 y 2012
            (cat_ids["Categoría 2013 y 2012"], None, suc1_id, "Cancha Dos Toques", "Lunes", "18:15", "20:00"),
            (cat_ids["Categoría 2013 y 2012"], None, suc2_id, "Cancha María Auxiliadora", "Martes", "18:00", "19:30"),
            (cat_ids["Categoría 2013 y 2012"], None, suc2_id, "Cancha María Auxiliadora", "Miércoles", "17:30", "19:00"),
            (cat_ids["Categoría 2013 y 2012"], None, suc1_id, "Cancha Dos Toques", "Jueves", "18:15", "19:45"),
        ]

        for cid, subc, sid, cname, dia, ini, fin in practicas:
            await conn.execute(text("""
                INSERT INTO academias.horarios_practica (
                    academia_id, categoria_id, sub_categoria, sucursal_id, cancha_nombre,
                    dia_semana, hora_inicio, hora_fin,
                    mes_inicio_vigencia, anio_inicio_vigencia, mes_fin_vigencia, anio_fin_vigencia,
                    periodo_vigencia, activo
                ) VALUES (
                    :aid, :cid, :subc, :sid, :cname, :dia, :ini, :fin,
                    1, 2026, 12, 2026, '2026', true
                )
            """), {"aid": academia_id, "cid": cid, "subc": subc, "sid": sid, "cname": cname, "dia": dia, "ini": ini, "fin": fin})

        # 7. Limpiar y Cargar Tarifas/Costos 2026
        await conn.execute(text("DELETE FROM academias.tarifas_costos WHERE academia_id = :aid"), {"aid": academia_id})
        tarifas = [
            ("Matrícula Inicial", "matricula", None, 200000, "Pago único de inscripción anual"),
            ("Cat. 2020 y 2021", "cuota_mensual", cat_ids["Categoría 2020 y 2021"], 150000, "Cuota mensual"),
            ("Cat. 2019 al 2014", "cuota_mensual", cat_ids["Categoría 2018 y 2019"], 180000, "Cuota mensual (Cat. 2019 a 2014)"),
            ("Cat. 2012 y 2013", "cuota_mensual", cat_ids["Categoría 2013 y 2012"], 200000, "Cuota mensual"),
            ("Indumentaria", "indumentaria", None, 155000, "Kit oficial de indumentaria deportiva"),
        ]

        for conc, tipo, cid, monto, desc in tarifas:
            await conn.execute(text("""
                INSERT INTO academias.tarifas_costos (
                    academia_id, concepto, tipo_costo, categoria_id, monto, moneda, descripcion,
                    mes_inicio_vigencia, anio_inicio_vigencia, mes_fin_vigencia, anio_fin_vigencia,
                    periodo_vigencia, activo
                ) VALUES (
                    :aid, :conc, :tipo, :cid, :monto, 'GS', :desc,
                    1, 2026, 12, 2026, '2026', true
                )
            """), {"aid": academia_id, "conc": conc, "tipo": tipo, "cid": cid, "monto": monto, "desc": desc})

        await conn.commit()
        print("SEED COMPLETADO: Escuela de Fútbol Delio Toledo 2011 lista!")
        print("URL pública: https://micancha.com.py/academia/delio-toledo")

    await engine.dispose()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_delio_toledo())
