import asyncio
import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migration():
    try:
        async with engine.begin() as conn:
            logger.info("Agregando nuevos campos a torneos.torneos...")
            
            await conn.execute(text("ALTER TABLE torneos.torneos ADD COLUMN IF NOT EXISTS subtitulo VARCHAR;"))
            await conn.execute(text("ALTER TABLE torneos.torneos ADD COLUMN IF NOT EXISTS descripcion TEXT;"))
            await conn.execute(text("ALTER TABLE torneos.torneos ADD COLUMN IF NOT EXISTS imagen_portada VARCHAR;"))
            await conn.execute(text("ALTER TABLE torneos.torneos ADD COLUMN IF NOT EXISTS tipo_ubicacion VARCHAR DEFAULT 'persona';"))
            await conn.execute(text("ALTER TABLE torneos.torneos ADD COLUMN IF NOT EXISTS privacidad VARCHAR DEFAULT 'publico';"))
            
            logger.info("Migración completada exitosamente.")
    except Exception as e:
        logger.error(f"Error durante la migración: {e}")
        import sys
        sys.exit(1)

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
