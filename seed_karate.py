import asyncio
import uuid
import random
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv('backend/.env')
DB_URL = os.getenv('DATABASE_URL')
engine = create_async_engine(DB_URL, echo=False)

async def main():
    torneo_id = '2ed2f229-6e67-400b-adc4-b6a7371ebcf3'
    categoria_id = 'c4eff775-ecd9-45b7-938a-284d48a944d6'
    
    nombres = ['Juan', 'Pedro', 'Maria', 'Ana', 'Luis', 'Carlos', 'Jose', 'Diego', 'Lucia', 'Laura', 'Miguel', 'Jorge', 'Sofia', 'Marta', 'Elena']
    apellidos = ['Gomez', 'Perez', 'Gonzalez', 'Rodriguez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Romero', 'Sosa']
    
    async with engine.begin() as conn:
        # Create an academy (team)
        equipo_id = str(uuid.uuid4())
        await conn.execute(text("""
            INSERT INTO torneos.equipos (id, torneo_id, nombre, nombre_academia, estado_inscripcion, categoria_id, creado_en)
            VALUES (:id, :tid, :nom, :nom_acad, 'confirmado', :cid, CURRENT_TIMESTAMP)
        """), {
            "id": equipo_id, "tid": torneo_id, "nom": "Academia Central Dojo", "nom_acad": "Academia Central Dojo", "cid": categoria_id
        })
        
        print(f"Academia creada con ID {equipo_id}")
        
        # Insert 30 players
        for i in range(30):
            p_id = str(uuid.uuid4())
            nombre_completo = f"{random.choice(nombres)} {random.choice(apellidos)}"
            genero = random.choice(['M', 'F'])
            modalidad = random.choice(['Kumite', 'Kata'])
            peso = round(random.uniform(50.0, 90.0), 2)
            f_nac = date(random.randint(1990, 2010), random.randint(1, 12), random.randint(1, 28))
            dni = f"{random.randint(2000000, 9999999)}"
            
            await conn.execute(text("""
                INSERT INTO torneos.tournament_players (
                    id, torneo_equipo_id, nombre, dni, fecha_nacimiento, genero, 
                    modalidad, peso_verificado, categoria_id, estado, activo, creado_en, actualizado_en
                ) VALUES (
                    :id, :eq_id, :nom, :dni, :fnac, :gen, 
                    :mod, :peso, :cid, 'Aprobado', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """), {
                "id": p_id, "eq_id": equipo_id, "nom": nombre_completo, "dni": dni,
                "fnac": f_nac, "gen": genero, "mod": modalidad, "peso": peso, "cid": categoria_id
            })
            
        print("30 competidores insertados correctamente.")

if __name__ == '__main__':
    asyncio.run(main())
