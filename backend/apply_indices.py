import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

async def apply_optimization():
    # Detectar entorno
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dotenv_path = os.path.join(backend_dir, '.env')
    load_dotenv(dotenv_path)
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: No se encontró DATABASE_URL en el .env")
        return

    # Ajuste para asyncpg y localhost si estamos fuera de docker
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    if "db:5432" in db_url and not os.path.exists('/.dockerenv'):
        db_url = db_url.replace("db:5432", "localhost:5434")

    print(f"Conectando a la base de datos para optimización...")
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        print("1. Habilitando extensiones y funciones auxiliares...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent;"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        
        # Crear función wrapper IMMUTABLE para unaccent (necesaria para índices)
        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION public.f_unaccent(text)
              RETURNS text AS
            $func$
            SELECT public.unaccent('public.unaccent', $1)
            $func$  LANGUAGE sql IMMUTABLE;
        """))
        
        print("2. Creando índices GIN Trigram para búsquedas rápidas (ANR)...")
        # Índices para ANR utilizando f_unaccent
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_anr_nombres_trgm 
            ON electoral.anr_padron_2026 USING gin (public.f_unaccent(lower(nombres)) gin_trgm_ops);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_anr_apellidos_trgm 
            ON electoral.anr_padron_2026 USING gin (public.f_unaccent(lower(apellidos)) gin_trgm_ops);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_anr_cedula_trgm 
            ON electoral.anr_padron_2026 USING gin (cedula gin_trgm_ops);
        """))

        print("3. Creando índices GIN Trigram para búsquedas rápidas (PLRA)...")
        # Índices para PLRA utilizando f_unaccent
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_plra_nombre_trgm 
            ON electoral.plra_padron USING gin (public.f_unaccent(lower(nombre)) gin_trgm_ops);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_plra_apellido_trgm 
            ON electoral.plra_padron USING gin (public.f_unaccent(lower(apellido)) gin_trgm_ops);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_plra_cedula_trgm 
            ON electoral.plra_padron USING gin (cedula gin_trgm_ops);
        """))

        print("4. Reforzando índices geográficos...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_anr_geografia 
            ON electoral.anr_padron_2026 (departamento, distrito, seccional, local);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ref_distritos_dpto 
            ON electoral.ref_distritos (departamento_id);
        """))

    await engine.dispose()
    print("¡Base de datos optimizada con éxito!")

if __name__ == "__main__":
    asyncio.run(apply_optimization())
