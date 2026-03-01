
import asyncio
from database import engine
from sqlalchemy import text
from models import Base

async def init_electoral():
    async with engine.begin() as conn:
        # Crear schema si no existe
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral"))
        print("Schema 'electoral' verificado/creado.")
        
    # Crear tablas
    # Base.metadata.create_all es síncrono, para async usamos run_sync
    async with engine.begin() as conn:
        def create_tables(connection):
            Base.metadata.create_all(connection)
        
        await conn.run_sync(create_tables)
        print("Tablas creadas exitosamente.")

    # Insertar datos de prueba base
    async with engine.begin() as conn:
        # Verificar si hay candidatos
        res = await conn.execute(text("SELECT COUNT(*) FROM electoral.candidatos"))
        count = res.scalar()
        if count == 0:
            await conn.execute(text("""
                INSERT INTO electoral.candidatos (nombre_candidato, partido, lista, cargo)
                VALUES ('Candidato de Prueba', 'Partido Nacional', 'Lista 1', 'Intendente')
            """))
            print("Candidato de prueba insertado.")

if __name__ == "__main__":
    asyncio.run(init_electoral())
