import asyncio
import os
import sys
import uuid
import json
from datetime import datetime, date, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import DATABASE_URL

async def seed_mock_asam():
    print("=" * 60)
    print("SEMBRANDO DATOS DE PRUEBA: TORNEO DE ARTES MARCIALES ASAM")
    print("=" * 60)

    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as session:
        try:
            # 0. Asegurar que las tablas existan
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS torneos_generales.categorias_marciales (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    torneo_id UUID NOT NULL REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
                    nombre VARCHAR(255) NOT NULL,
                    modalidad VARCHAR(50) NOT NULL,
                    edad_min INT,
                    edad_max INT,
                    cinturon_min VARCHAR(50),
                    cinturon_max VARCHAR(50),
                    peso_min DECIMAL(5,2),
                    peso_max DECIMAL(5,2),
                    genero VARCHAR(20),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
                
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS torneos_generales.asam_combates (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    encuentro_id UUID NOT NULL REFERENCES torneos_generales.encuentros(id) ON DELETE CASCADE,
                    blanco_id UUID REFERENCES torneos_generales.participantes(id),
                    rojo_id UUID REFERENCES torneos_generales.participantes(id),
                    puntos_blanco INT DEFAULT 0,
                    salidas_blanco INT DEFAULT 0,
                    faltas_blanco INT DEFAULT 0,
                    puntos_rojo INT DEFAULT 0,
                    salidas_rojo INT DEFAULT 0,
                    faltas_rojo INT DEFAULT 0,
                    ganador_id UUID REFERENCES torneos_generales.participantes(id),
                    metodo_victoria VARCHAR(100),
                    estado VARCHAR(50) DEFAULT 'pendiente',
                    tiempo_restante_segundos INT DEFAULT 90,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))

            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS torneos_generales.asam_formas (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    categoria_id UUID NOT NULL REFERENCES torneos_generales.categorias_marciales(id) ON DELETE CASCADE,
                    participante_id UUID NOT NULL REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
                    juez_1 DECIMAL(3,1),
                    juez_2 DECIMAL(3,1),
                    juez_3 DECIMAL(3,1),
                    juez_4 DECIMAL(3,1),
                    juez_5 DECIMAL(3,1),
                    puntaje_descartado_alto DECIMAL(3,1),
                    puntaje_descartado_bajo DECIMAL(3,1),
                    puntaje_final DECIMAL(4,1),
                    posicion_final INT,
                    estado VARCHAR(50) DEFAULT 'evaluando',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            torneo_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos_generales.torneos (id, nombre, fecha_inicio, fecha_fin, lugar, estado)
                VALUES (:id, 'Copa Nacional ASAM 2026', :f_ini, :f_fin, 'Estadio de la Federación', 'en_curso')
            """), {
                "id": torneo_id,
                "f_ini": date.today(),
                "f_fin": date.today() + timedelta(days=2)
            })
            print(f"🏆 Torneo creado: 'Copa Nacional ASAM 2026' (ID: {torneo_id})")

            # 2. Crear Categorías Marciales (Una para Combate, una para Formas)
            cat_combate_id = str(uuid.uuid4())
            cat_formas_id = str(uuid.uuid4())
            
            await session.execute(text("""
                INSERT INTO torneos_generales.categorias_marciales (id, torneo_id, nombre, modalidad, edad_min, edad_max, cinturon_min, cinturon_max, genero)
                VALUES 
                (:id_c, :tid, 'Combate Kyu A Adultos', 'combate', 18, 35, 'Verde', 'Rojo', 'M'),
                (:id_f, :tid, 'Formas Tradicionales', 'formas', 15, 99, 'Blanco', 'Negro', 'Mixto')
            """), {
                "id_c": cat_combate_id, "id_f": cat_formas_id, "tid": torneo_id
            })
            print(f"🥋 Categorías creadas: 'Combate Kyu A Adultos' y 'Formas Tradicionales'")

            # 3. Crear Participantes (2 para Combate, 2 para Formas)
            p_blanco_id = str(uuid.uuid4())
            p_rojo_id = str(uuid.uuid4())
            p_forma1_id = str(uuid.uuid4())
            p_forma2_id = str(uuid.uuid4())
            
            await session.execute(text("""
                INSERT INTO torneos_generales.participantes (id, torneo_id, nombre, apellido, documento, fecha_nacimiento, genero, modalidad, nivel_experiencia, estado)
                VALUES 
                (:p1, :tid, 'Juan', 'Perez', '1111111', '2000-01-01', 'M', 'Combate', 'Kyu A', 'Confirmado'),
                (:p2, :tid, 'Carlos', 'Gomez', '2222222', '1999-05-15', 'M', 'Combate', 'Kyu A', 'Confirmado'),
                (:p3, :tid, 'Maria', 'Gonzalez', '3333333', '2005-08-20', 'F', 'Formas', 'Cinturon Negro', 'Confirmado'),
                (:p4, :tid, 'Ana', 'Lopez', '4444444', '2008-11-10', 'F', 'Formas', 'Cinturon Verde', 'Confirmado')
            """), {
                "p1": p_blanco_id, "p2": p_rojo_id, "p3": p_forma1_id, "p4": p_forma2_id, "tid": torneo_id
            })
            print(f"👥 Participantes registrados: 4 competidores.")

            # 4. Crear un Grupo y Encuentro para el Combate
            grupo_combate_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos_generales.grupos (id, torneo_id, nombre_categoria, formato_competicion, modalidad)
                VALUES (:id, :tid, 'Llave Principal Combate', 'Eliminatorias', 'Combate')
            """), {"id": grupo_combate_id, "tid": torneo_id})

            encuentro_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos_generales.encuentros (id, grupo_id, participante1_id, participante2_id, ronda, estado)
                VALUES (:id, :gid, :p1, :p2, 'Final', 'Programado')
            """), {"id": encuentro_id, "gid": grupo_combate_id, "p1": p_blanco_id, "p2": p_rojo_id})

            # 5. Inicializar ASAM Combate
            asam_combate_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos_generales.asam_combates (id, encuentro_id, blanco_id, rojo_id, estado)
                VALUES (:id, :eid, :b_id, :r_id, 'pendiente')
            """), {"id": asam_combate_id, "eid": encuentro_id, "b_id": p_blanco_id, "r_id": p_rojo_id})
            print(f"⚔️  Combate ASAM inicializado (ID: {asam_combate_id})")

            # 6. Inicializar ASAM Formas para los competidores
            asam_forma1_id = str(uuid.uuid4())
            asam_forma2_id = str(uuid.uuid4())
            
            await session.execute(text("""
                INSERT INTO torneos_generales.asam_formas (id, categoria_id, participante_id, estado)
                VALUES 
                (:id1, :cid, :p1, 'evaluando'),
                (:id2, :cid, :p2, 'evaluando')
            """), {
                "id1": asam_forma1_id, "id2": asam_forma2_id, 
                "cid": cat_formas_id, "p1": p_forma1_id, "p2": p_forma2_id
            })
            print(f"🥋 Evaluaciones de Formas ASAM inicializadas (IDs: {asam_forma1_id}, {asam_forma2_id})")

            await session.commit()
            print("=" * 60)
            print("🚀 MOCK DE ARTES MARCIALES COMPLETADO CON EXITO")
            print(f"👉 Torneo ID: {torneo_id}")
            print("Puedes usar estos IDs para probar las pantallas:")
            print(f"Combate ID: {asam_combate_id}")
            print(f"Formas ID 1: {asam_forma1_id} (Maria Gonzalez)")
            print(f"Formas ID 2: {asam_forma2_id} (Ana Lopez)")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"❌ Error al sembrar los datos: {str(e)}")
            raise e

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_mock_asam())
