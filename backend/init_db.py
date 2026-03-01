
import asyncio
from database import engine
from sqlalchemy import text
from models import Base

async def init_db():
    async with engine.begin() as conn:
        def sync_wrap(sync_conn):
            sync_conn.execute(text("CREATE SCHEMA IF NOT EXISTS sistema"))
            sync_conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral"))
            Base.metadata.create_all(sync_conn)
            
        await conn.run_sync(sync_wrap)
        print("Esquemas y tablas verificados.")

    # Datos iniciales para pruebas
    async with engine.begin() as conn:
        # Verificar Candidato
        res = await conn.execute(text("SELECT COUNT(*) FROM electoral.candidatos"))
        if res.scalar() == 0:
            await conn.execute(text("""
                INSERT INTO electoral.candidatos (nombre_candidato, partido_movimiento, municipio)
                VALUES ('Candidato Demo', 'Partido Poliverso', 'Asunción')
            """))
            print("Candidato demo insertado.")
            
        # Verificar Padron (al menos uno)
        res = await conn.execute(text("SELECT COUNT(*) FROM electoral.padron"))
        if res.scalar() == 0:
            await conn.execute(text("""
                INSERT INTO electoral.padron (cedula, nombre, apellido_paterno, apellido_materno, direccion_padron)
                VALUES ('1234567', 'JUAN', 'PEREZ', 'GOMEZ', 'Calle Falsa 123')
            """))
            print("Votante inicial insertado en padrón.")

if __name__ == "__main__":
    asyncio.run(init_db())
