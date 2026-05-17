
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def refactor_electoral():
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("--- Iniciando Refactorización Logica de DB ---")
        
        # 1. Crear nuevas tablas
        print("Creando nuevas tablas...")
        
        await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS electoral.personas (
            cedula VARCHAR(20) PRIMARY KEY,
            nombres VARCHAR(255),
            apellidos VARCHAR(255),
            fecha_nacimiento DATE,
            genero CHAR(1),
            telefono VARCHAR(20),
            email VARCHAR(100),
            direccion_residencia TEXT,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS electoral.elecciones (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            tipo VARCHAR(50), -- Internas, Generales, Municipales
            fecha DATE,
            partido VARCHAR(100), -- ANR, PLRA, etc
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS electoral.padrones (
            id SERIAL PRIMARY KEY,
            eleccion_id INT REFERENCES electoral.elecciones(id) ON DELETE CASCADE,
            cedula VARCHAR(20) REFERENCES electoral.personas(cedula) ON DELETE CASCADE,
            local_id INT REFERENCES electoral.locales_votacion(id),
            mesa INT,
            orden INT,
            seccional_id INT,
            comite_id INT,
            distrito_id INT,
            departamento_id INT,
            UNIQUE(eleccion_id, cedula)
        );
        """))
        
        print("Tablas creadas.")

        # 2. Migrar Datos a Personas
        print("Migrando datos a la tabla personas...")
        
        # Desde ANR
        await conn.execute(text("""
        INSERT INTO electoral.personas (cedula, nombres, apellidos, fecha_nacimiento, direccion_residencia)
        SELECT DISTINCT cedula, nombres, apellidos, nacimiento, direccion 
        FROM electoral.anr_padron_2026
        ON CONFLICT (cedula) DO UPDATE SET
            nombres = EXCLUDED.nombres,
            apellidos = EXCLUDED.apellidos,
            fecha_nacimiento = COALESCE(electoral.personas.fecha_nacimiento, EXCLUDED.fecha_nacimiento),
            direccion_residencia = COALESCE(electoral.personas.direccion_residencia, EXCLUDED.direccion_residencia);
        """))
        
        # Desde PLRA (si hay nuevos)
        await conn.execute(text("""
        INSERT INTO electoral.personas (cedula, nombres, apellidos, fecha_nacimiento, genero, direccion_residencia)
        SELECT DISTINCT cedula, nombre, apellido, fec_nac, 
               CASE WHEN sexo = 'M' THEN 'M' WHEN sexo = 'F' THEN 'F' ELSE NULL END, 
               direcc 
        FROM electoral.plra_padron
        ON CONFLICT (cedula) DO NOTHING;
        """))
        
        # Desde padron general (si hay)
        await conn.execute(text("""
        INSERT INTO electoral.personas (cedula, nombres, apellidos, fecha_nacimiento, genero, direccion_residencia)
        SELECT DISTINCT cedula, nombre, (apellido_paterno || ' ' || apellido_materno), fecha_nacimiento, genero, direccion_padron 
        FROM electoral.padron
        ON CONFLICT (cedula) DO NOTHING;
        """))
        
        print("Migración a personas completada.")

        # 3. Crear Elecciones Iniciales
        print("Creando registros de elecciones...")
        
        # ANR 2026
        await conn.execute(text("""
        INSERT INTO electoral.elecciones (nombre, tipo, partido, activo) 
        VALUES ('Internas Municipales ANR 2026', 'Internas', 'ANR', TRUE)
        ON CONFLICT DO NOTHING;
        """))
        
        # PLRA 2025 (o lo que corresponda)
        await conn.execute(text("""
        INSERT INTO electoral.elecciones (nombre, tipo, partido, activo) 
        VALUES ('Internas PLRA 2025', 'Internas', 'PLRA', TRUE)
        ON CONFLICT DO NOTHING;
        """))

        # 4. Migrar Datos a Padrones
        print("Migrando datos a la tabla padrones (vinculación)...")
        
        # Obtener IDs de elecciones
        res = await conn.execute(text("SELECT id FROM electoral.elecciones WHERE partido = 'ANR' LIMIT 1;"))
        anr_eleccion_id = res.scalar()
        
        res = await conn.execute(text("SELECT id FROM electoral.elecciones WHERE partido = 'PLRA' LIMIT 1;"))
        plra_eleccion_id = res.scalar()

        if anr_eleccion_id:
            print(f"Migrando padrón ANR (ID Elección: {anr_eleccion_id})...")
            # Nota: Necesitamos vincular con locales_votacion si es posible, 
            # pero anr_padron_2026 usa IDs numéricos locales. 
            # Por ahora migramos mesa y orden directamente.
            await conn.execute(text(f"""
            INSERT INTO electoral.padrones (eleccion_id, cedula, mesa, orden, seccional_id, distrito_id, departamento_id)
            SELECT {anr_eleccion_id}, cedula, mesa, orden, seccional, distrito, departamento
            FROM electoral.anr_padron_2026
            ON CONFLICT (eleccion_id, cedula) DO NOTHING;
            """))

        if plra_eleccion_id:
            print(f"Migrando padrón PLRA (ID Elección: {plra_eleccion_id})...")
            await conn.execute(text(f"""
            INSERT INTO electoral.padrones (eleccion_id, cedula)
            SELECT {plra_eleccion_id}, cedula
            FROM electoral.plra_padron
            ON CONFLICT (eleccion_id, cedula) DO NOTHING;
            """))

        # 5. Actualizar Foreign Keys en otras tablas
        print("Actualizando dependencias (posibles_votantes)...")
        
        # Primero quitamos el constraint anterior si existe
        try:
            await conn.execute(text("ALTER TABLE electoral.posibles_votantes DROP CONSTRAINT IF EXISTS posibles_votantes_cedula_votante_fkey;"))
            # Añadimos el nuevo constraint a personas
            await conn.execute(text("ALTER TABLE electoral.posibles_votantes ADD CONSTRAINT posibles_votantes_cedula_votante_fkey FOREIGN KEY (cedula_votante) REFERENCES electoral.personas(cedula);"))
        except Exception as e:
            print(f"Aviso al actualizar constraints: {str(e)}")

        print("--- Refactorización de DB Finalizada con Éxito ---")

if __name__ == "__main__":
    asyncio.run(refactor_electoral())
