import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:

        print("1. Creating torneos_generales.categorias...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos_generales.categorias (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organizador_id INTEGER NOT NULL REFERENCES cancha.organizadores(id) ON DELETE CASCADE,
                nombre         VARCHAR(100) NOT NULL,
                edad_min       INTEGER,
                edad_max       INTEGER,
                genero         VARCHAR(20),
                descripcion    TEXT,
                creado_en      TIMESTAMP DEFAULT NOW()
            )
        """))

        print("2. Creating torneos_generales.divisiones...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos_generales.divisiones (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                torneo_id    UUID NOT NULL REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
                nombre       VARCHAR(100) NOT NULL,
                categoria_id UUID REFERENCES torneos_generales.categorias(id) ON DELETE SET NULL,
                formato_id   INTEGER REFERENCES cancha.formatos_torneo(id) ON DELETE SET NULL,
                estado       VARCHAR(30) DEFAULT 'activa',
                creado_en    TIMESTAMP DEFAULT NOW()
            )
        """))

        print("3. Creating torneos_generales.divisiones_participantes...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos_generales.divisiones_participantes (
                division_id     UUID NOT NULL REFERENCES torneos_generales.divisiones(id) ON DELETE CASCADE,
                participante_id UUID NOT NULL REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
                PRIMARY KEY (division_id, participante_id)
            )
        """))

        print("4. Adding organizador_id to torneos_generales.torneos...")
        await conn.execute(text("""
            ALTER TABLE torneos_generales.torneos 
                ADD COLUMN IF NOT EXISTS organizador_id INTEGER REFERENCES cancha.organizadores(id) ON DELETE SET NULL
        """))

        print("5. Dropping old tables...")
        await conn.execute(text("DROP TABLE IF EXISTS torneos_generales.grupo_participantes CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS torneos_generales.grupos CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS cancha.categorias CASCADE"))

        print("Migration completed successfully!")

asyncio.run(migrate())
