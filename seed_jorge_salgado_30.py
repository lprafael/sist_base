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
if not DB_URL:
    raise ValueError("DATABASE_URL no configurado")

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
    async with engine.connect() as conn:
        print("=== Búsqueda de Torneos ===")
        res_torneo = await conn.execute(text("""
            SELECT id, nombre, deporte, formato, estado, organizador_id
            FROM torneos.torneos
            WHERE nombre ILIKE '%45%' OR nombre ILIKE '%Karate%'
        """))
        torneos_list = res_torneo.fetchall()
        for t in torneos_list:
            print(f"Torneo: ID={t.id} | Nombre='{t.nombre}' | Deporte='{t.deporte}' | OrgID='{t.organizador_id}'")

        target_torneo_id = None
        target_torneo_nombre = None

        for t in torneos_list:
            if "45" in t.nombre or "Karate" in t.nombre:
                target_torneo_id = str(t.id)
                target_torneo_nombre = t.nombre
                break

        if not target_torneo_id and len(torneos_list) > 0:
            target_torneo_id = str(torneos_list[0].id)
            target_torneo_nombre = torneos_list[0].nombre

        if not target_torneo_id:
            target_torneo_id = str(uuid.uuid4())
            target_torneo_nombre = "45° del Torneo de Karate Do"
            print(f"Creando nuevo torneo: {target_torneo_nombre} ({target_torneo_id})")
            await conn.execute(text("""
                INSERT INTO torneos.torneos (id, nombre, deporte, formato, estado, creado_en)
                VALUES (:id, :nom, 'Karate', 'eliminatoria_directa', 'abierto', NOW())
            """), {"id": target_torneo_id, "nom": target_torneo_nombre})
            await conn.commit()

        print(f"\nTorneo Target: {target_torneo_nombre} (ID: {target_torneo_id})")

        # 2. Registrar Dojos
        dojo_map = {}
        for dojo_name in DOJOS:
            res_d = await conn.execute(text("SELECT id FROM torneos.equipos WHERE torneo_id = :tid AND nombre = :nom"), {"tid": target_torneo_id, "nom": dojo_name})
            r_d = res_d.fetchone()
            if r_d:
                dojo_map[dojo_name] = r_d[0]
            else:
                d_id = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO torneos.equipos (id, torneo_id, nombre, nombre_academia, creado_en)
                    VALUES (:id, :tid, :nom, :nom, NOW())
                """), {"id": d_id, "tid": target_torneo_id, "nom": dojo_name})
                await conn.commit()
                dojo_map[dojo_name] = d_id

        # 3. Categorías
        cat_map = {}
        for cat_nom, _, peso_lim, edad_cat in CATEGORIAS_KUMITE:
            res_c = await conn.execute(text("SELECT id FROM torneos.categorias WHERE torneo_id = :tid AND nombre = :nom"), {"tid": target_torneo_id, "nom": cat_nom})
            r_c = res_c.fetchone()
            if r_c:
                cat_map[cat_nom] = r_c[0]
            else:
                c_id = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
                    VALUES (:id, :tid, :nom, :desc)
                """), {"id": c_id, "tid": target_torneo_id, "nom": cat_nom, "desc": f"Categoría Oficial WKF {cat_nom}"})
                await conn.commit()
                cat_map[cat_nom] = c_id

        # Extra categorías
        for extra_cat in ["Kata Individual Senior Masculino", "Kata Individual Senior Femenino", "Para-Karate K10 Silla de Ruedas", "Para-Karate K21 Discapacidad Intelectual"]:
            res_c = await conn.execute(text("SELECT id FROM torneos.categorias WHERE torneo_id = :tid AND nombre = :nom"), {"tid": target_torneo_id, "nom": extra_cat})
            r_c = res_c.fetchone()
            if r_c:
                cat_map[extra_cat] = r_c[0]
            else:
                c_id = str(uuid.uuid4())
                await conn.execute(text("""
                    INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
                    VALUES (:id, :tid, :nom, :desc)
                """), {"id": c_id, "tid": target_torneo_id, "nom": extra_cat, "desc": f"Categoría Oficial WKF {extra_cat}"})
                await conn.commit()
                cat_map[extra_cat] = c_id

        # 4. Insertar 30 Atletas
        random.seed(42)
        inserted_count = 0

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

            # Insertar en futbol.jugadores
            try:
                await conn.execute(text("""
                    INSERT INTO futbol.jugadores 
                    (id, equipo_id, nombre, dni, dorsal, posicion, categoria_id, peso, estatura, peso_verificado, estatura_verificada, checkin, estado, creado_en)
                    VALUES 
                    (:id, :eid, :nom, :dni, :dorsal, :pos, :cid, :peso, :est, :peso_v, :est_v, true, :est_atleta, NOW())
                    ON CONFLICT (id) DO NOTHING
                """), {
                    "id": jugador_id,
                    "eid": equipo_id,
                    "nom": nombre_completo,
                    "dni": dni,
                    "dorsal": i,
                    "pos": modalidad,
                    "cid": categoria_id,
                    "peso": peso_declarado,
                    "est": estatura,
                    "peso_v": peso_verificado,
                    "est_v": estatura,
                    "est_atleta": estado
                })
            except Exception as e:
                print(f"Error futbol.jugadores: {e}")

            # Insertar en torneos_generales.participantes
            try:
                await conn.execute(text("""
                    INSERT INTO torneos_generales.participantes
                    (id, torneo_id, nombre, apellido, documento, fecha_nacimiento, genero, email, telefono,
                     modalidad, nivel_experiencia, peso_declarado, estatura_declarada, peso_verificado, estatura_verificada,
                     categoria_edad, clase_deportiva, extra_score, estado, creado_en)
                    VALUES
                    (:id, :tid, :nom, :ape, :doc, :fn, :gen, :mail, :tel,
                     :mod, 'Cinturón Negro / Avanzado', :pd, :ed, :pv, :ev,
                     :ce, :cd, :xs, :est, NOW())
                    ON CONFLICT (id) DO NOTHING
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
                print(f"Error torneos_generales.participantes: {e}")

            await conn.commit()
            inserted_count += 1
            print(f"[{inserted_count}/30] {nombre_completo} | {dojo_nombre} | {modalidad} | {categoria_nombre} | {peso_verificado}kg ({estado})")

        print(f"\nExito: Se cargaron {inserted_count} atletas de prueba en '{target_torneo_nombre}' (ID: {target_torneo_id})")

if __name__ == '__main__':
    asyncio.run(main())
