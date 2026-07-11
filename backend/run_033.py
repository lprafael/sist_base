import asyncio
import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migration():
    try:
        async with engine.begin() as conn:
            logger.info("Agregando nuevos campos al Perfil Organizador...")
            
            await conn.execute(text("""
                ALTER TABLE sistema.perfil_organizador
                ADD COLUMN IF NOT EXISTS acerca_de TEXT,
                ADD COLUMN IF NOT EXISTS idioma VARCHAR(50) DEFAULT 'Spanish',
                ADD COLUMN IF NOT EXISTS pais VARCHAR(100),
                ADD COLUMN IF NOT EXISTS departamento VARCHAR(100),
                ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
                ADD COLUMN IF NOT EXISTS ubicacion_exacta VARCHAR(255),
                ADD COLUMN IF NOT EXISTS facebook VARCHAR(255),
                ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
                ADD COLUMN IF NOT EXISTS youtube VARCHAR(255),
                ADD COLUMN IF NOT EXISTS twitch VARCHAR(255),
                ADD COLUMN IF NOT EXISTS twitter VARCHAR(255),
                ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50),
                ADD COLUMN IF NOT EXISTS email VARCHAR(100),
                ADD COLUMN IF NOT EXISTS telefono VARCHAR(50),
                ADD COLUMN IF NOT EXISTS opcion_chat BOOLEAN DEFAULT FALSE;
            """))
            
            logger.info("Migración completada exitosamente.")
    except Exception as e:
        logger.error(f"Error durante la migración: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import sys
    # Windows fix for asyncio runtime
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
