import asyncio
import os
import sys
import uuid
import random
from datetime import date, timedelta
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv('backend/.env')
DB_URL = os.getenv('DATABASE_URL')
engine = create_async_engine(DB_URL, echo=False)

NOMBRES_HOMBRES = [
    "Lucas", "Mateo", "Diego", "Alejandro", "Gabriel", "Carlos", "Esteban", "Santiago",
    "Maximiliano", "Rodrigo", "Fernando", "Joaquin", "Valentin", "Bruno", "Ignacio"
]
NOMBRES_MUJERES = [
    "Valentina", "Camila", "Sofia", "Mariana", "Lucia", "Florencia", "Antonella", "Martina",
    "Elena", "Daniela", "Paula", "Julieta", "Renata", "Constanza", "Agustina"
]
APELLIDOS = [
    "Salgado", "Gimenez", "Benitez", "Gonzalez", "Rodriguez", "Fernandez", "Lopez", "Martinez",
    "Perez", "Gomez", "Sanchez", "Romero", "Alvarez", "Torres", "Ramirez", "Silva", "Nuñez",
    "Morinigo", "Villalba", "Aquino", "Caceres", "Galeano", "Ortiz", "Ayala", "Bogado"
]

DOJOS = [
    "Dojo Bushido",
    "Kenshinkan Dojo",
    "Shito-Ryu Central",
    "Shotokan Ryu",
    "Academia Samurai",
    "Dojo Seigokan"
]

CATEGORIAS_KUMITE = [
    ("Kumite Senior Masculino -67kg", "Masculino", 67.0, "Senior"),
    ("Kumite Senior Masculino -75kg", "Masculino", 75.0, "Senior"),
    ("Kumite Senior Masculino -84kg", "Masculino", 84.0, "Senior"),
    ("Kumite Senior Femenino -55kg", "Femenino", 55.0, "Senior"),
    ("Kumite Senior Femenino -61kg", "Femenino", 61.0, "Senior"),
    ("Kumite Senior Femenino -68kg", "Femenino", 68.0, "Senior"),
    ("Kumite Junior Masculino -68kg", "Masculino", 68.0, "Junior"),
    ("Kumite Cadete Femenino -54kg", "Femenino", 54.0, "Cadete"),
]

async def main():
    target_torneo_id = "2ed2f229-6e67-400b-adc4-b6a7371ebcf3"
    target_torneo_nombre = "45° del Torneo de Karate Do"

    async with engine.begin() as conn:
        print(f"=== CARGANDO 30 ATLETAS EN '{target_torneo_nombre}' (ID: {target_torneo_id}) ===")

        # 1. Dojos / Equipos
        dojo_map = {}
        for dojo_name in DOJOS:
            res_d = await conn.execute(text("SELECT id FROM torneos.equipos WHERE torneo_id = CAST(:tid AS UUID) AND nombre = :nom"), {"tid": target_torneo_id, "nom": dojo_name})
            r_d = res_d.fetchone()
            if r_d:
                dojo_map[dojo_name] = r_d[0]
            else:
                d_id = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO torneos.equipos (id, torneo_id, nombre, nombre_academia, creado_en)
                    VALUES (CAST(:id AS UUID), CAST(:tid AS UUID), :nom, :nom, NOW())
                """), {"id": d_id, "tid": target_torneo_id, "nom": dojo_name})
                dojo_map[dojo_name] = d_id

        # 2. Categorías
        cat_map = {}
        for cat_nom, _, peso_lim, edad_cat in CATEGORIAS_KUMITE:
            res_c = await conn.execute(text("SELECT id FROM torneos.categorias WHERE torneo_id = CAST(:tid AS UUID) AND nombre = :nom"), {"tid": target_torneo_id, "nom": cat_nom})
            r_c = res_c.fetchone()
            if r_c:
                cat_map[cat_nom] = r_c[0]
            else:
                c_id = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
                    VALUES (CAST(:id AS UUID), CAST(:tid AS UUID), :nom, :desc)
                """), {"id": c_id, "tid": target_torneo_id, "nom": cat_nom, "desc": f"Categoría Oficial WKF {cat_nom}"})
                cat_map[cat_nom] = c_id

        for extra_cat in ["Kata Individual Senior Masculino", "Kata Individual Senior Femenino", "Para-Karate K10 Silla de Ruedas", "Para-Karate K21 Discapacidad Intelectual"]:
            res_c = await conn.execute(text("SELECT id FROM torneos.categorias WHERE torneo_id = CAST(:tid AS UUID) AND nombre = :nom"), {"tid": target_torneo_id, "nom": extra_cat})
            r_c = res_c.fetchone()
            if r_c:
                cat_map[extra_cat] = r_c[0]
            else:
                c_id = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
                    VALUES (CAST(:id AS UUID), CAST(:tid AS UUID), :nom, :desc)
                """), {"id": c_id, "tid": target_torneo_id, "nom": extra_cat, "desc": f"Categoría Oficial WKF {extra_cat}"})
                cat_map[extra_cat] = c_id

        # 3. Limpiar previos
        await conn.execute(text("""
            DELETE FROM torneos.tournament_players 
            WHERE torneo_equipo_id IN (SELECT id FROM torneos.equipos WHERE torneo_id = CAST(:tid AS UUID))
        """), {"tid": target_torneo_id})
        try:
            await conn.execute(text("DELETE FROM torneos_generales.participantes WHERE torneo_id = CAST(:tid AS UUID)"), {"tid": target_torneo_id})
        except Exception:
            pass

        # 4. Insertar los 30 atletas
        random.seed(42)
        for i in range(1, 31):
            genero = "Masculino" if i % 2 != 0 else "Femenino"
            nombre = random.choice(NOMBRES_HOMBRES if genero == "Masculino" else NOMBRES_MUJERES)
            apellido = random.choice(APELLIDOS)
            nombre_completo = f"{nombre} {apellido}"
            dni = f"{random.randint(2000000, 5999999)}"
            email = f"atleta{i}.{nombre.lower()}.{apellido.lower()}@karatedo.com"
            telefono = f"+595 981 {random.randint(100000, 999999)}"
            dojo_nombre = DOJOS[(i - 1) % len(DOJOS)]
            equipo_id = dojo_map[dojo_nombre]

            if i <= 20:
                modalidad = "Kumite"
                cat_data = CATEGORIAS_KUMITE[(i - 1) % len(CATEGORIAS_KUMITE)]
                categoria_nombre = cat_data[0]
                genero = cat_data[1]
                peso_base = cat_data[2]
                categoria_edad = cat_data[3]
                clase_deportiva = None
                extra_score = 0.0
                peso_declarado = round(peso_base - random.uniform(0.5, 2.5), 1)
                peso_verificado = round(peso_declarado + random.uniform(-0.3, 0.8), 1)
                if i == 18:
                    peso_verificado = round(peso_base + 1.8, 1)
                    estado = "Descalificado_Pesaje"
                else:
                    estado = "Habilitado"
            elif i <= 26:
                modalidad = "Kata"
                categoria_nombre = "Kata Individual Senior " + genero
                peso_declarado = 65.0 if genero == "Masculino" else 55.0
                peso_verificado = peso_declarado
                categoria_edad = "Senior"
                clase_deportiva = None
                extra_score = 0.0
                estado = "Habilitado"
            else:
                modalidad = "Para-Karate"
                clase_deportiva = "K10" if i % 2 == 0 else "K21"
                categoria_nombre = "Para-Karate " + clase_deportiva
                peso_declarado = 70.0
                peso_verificado = 70.0
                categoria_edad = "Senior"
                extra_score = 1.0 if clase_deportiva == "K10" else 0.0
                estado = "Habilitado"

            categoria_id = cat_map.get(categoria_nombre)
            estatura = round(random.uniform(160, 188), 1) if genero == "Masculino" else round(random.uniform(150, 175), 1)
            nacimiento = date(2000, 1, 1) - timedelta(days=random.randint(1000, 7000))
            jugador_id = str(uuid.uuid4())

            # Insertar en torneos.tournament_players
            await conn.execute(text("""
                INSERT INTO torneos.tournament_players 
                (id, torneo_equipo_id, nombre, dni, fecha_nacimiento, numero_camiseta, posicion, 
                 peso_verificado, estatura_verificada, pago_confirmado, estado, modalidad, nivel_experiencia, 
                 genero, email, telefono, categoria_id, creado_en)
                VALUES 
                (CAST(:id AS UUID), CAST(:eid AS UUID), :nom, :dni, :fn, :dorsal, :pos, 
                 :pv, :ev, true, :est_atleta, :mod, 'Cinturón Negro / Avanzado', 
                 :gen, :mail, :tel, CAST(:cid AS UUID), NOW())
            """), {
                "id": jugador_id,
                "eid": equipo_id,
                "nom": nombre_completo,
                "dni": dni,
                "fn": nacimiento,
                "dorsal": i,
                "pos": modalidad,
                "pv": peso_verificado,
                "ev": estatura,
                "est_atleta": estado,
                "mod": modalidad,
                "gen": genero,
                "mail": email,
                "tel": telefono,
                "cid": str(categoria_id) if categoria_id else None
            })

            # Insertar en torneos_generales.participantes
            try:
                await conn.execute(text("""
                    INSERT INTO torneos_generales.participantes
                    (id, torneo_id, nombre, apellido, documento, fecha_nacimiento, genero, email, telefono,
                     modalidad, nivel_experiencia, peso_declarado, estatura_declarada, peso_verificado, estatura_verificada,
                     categoria_edad, clase_deportiva, extra_score, estado, creado_en)
                    VALUES
                    (CAST(:id AS UUID), CAST(:tid AS UUID), :nom, :ape, :doc, :fn, :gen, :mail, :tel,
                     :mod, 'Cinturón Negro / Avanzado', :pd, :ed, :pv, :ev,
                     :ce, :cd, :xs, :est, NOW())
                """), {
                    "id": jugador_id,
                    "tid": target_torneo_id,
                    "nom": nombre,
                    "ape": apellido,
                    "doc": dni,
                    "fn": nacimiento,
                    "gen": genero,
                    "mail": email,
                    "tel": telefono,
                    "mod": modalidad,
                    "pd": peso_declarado,
                    "ed": estatura,
                    "pv": peso_verificado,
                    "ev": estatura,
                    "ce": categoria_edad,
                    "cd": clase_deportiva,
                    "xs": extra_score,
                    "est": estado
                })
            except Exception as e:
                pass

            print(f"[{i}/30] Insertado: {nombre_completo} | {dojo_nombre} | {modalidad} | {categoria_nombre}")

    # Verificar inserción final
    async with engine.connect() as conn:
        res_check = await conn.execute(text("""
            SELECT count(*) FROM torneos.tournament_players tp
            JOIN torneos.equipos e ON tp.torneo_equipo_id = e.id
            WHERE e.torneo_id = CAST(:tid AS UUID)
        """), {"tid": target_torneo_id})
        total_p = res_check.scalar()

        res_tg = await conn.execute(text("SELECT count(*) FROM torneos_generales.participantes WHERE torneo_id = CAST(:tid AS UUID)"), {"tid": target_torneo_id})
        total_tg = res_tg.scalar()

        print("\n=======================================================")
        print(f"CONFIRMACION EN BD: torneos.tournament_players = {total_p} | torneos_generales.participantes = {total_tg}")
        print("=======================================================")

if __name__ == '__main__':
    asyncio.run(main())
