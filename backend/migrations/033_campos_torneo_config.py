"""
Migration 033: Agregar campos de configuración a torneos.torneos
(subtitulo, descripcion, imagen_portada, tipo_ubicacion, privacidad)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

async def upgrade(session: AsyncSession):
    # Agregar subtitulo
    await session.execute(text("""
        ALTER TABLE torneos.torneos 
        ADD COLUMN IF NOT EXISTS subtitulo VARCHAR;
    """))
    
    # Agregar descripcion
    await session.execute(text("""
        ALTER TABLE torneos.torneos 
        ADD COLUMN IF NOT EXISTS descripcion TEXT;
    """))
    
    # Agregar imagen_portada
    await session.execute(text("""
        ALTER TABLE torneos.torneos 
        ADD COLUMN IF NOT EXISTS imagen_portada VARCHAR;
    """))
    
    # Agregar tipo_ubicacion (persona / internet)
    await session.execute(text("""
        ALTER TABLE torneos.torneos 
        ADD COLUMN IF NOT EXISTS tipo_ubicacion VARCHAR DEFAULT 'persona';
    """))
    
    # Agregar privacidad (publico / privado)
    await session.execute(text("""
        ALTER TABLE torneos.torneos 
        ADD COLUMN IF NOT EXISTS privacidad VARCHAR DEFAULT 'publico';
    """))

async def downgrade(session: AsyncSession):
    await session.execute(text("ALTER TABLE torneos.torneos DROP COLUMN IF EXISTS subtitulo;"))
    await session.execute(text("ALTER TABLE torneos.torneos DROP COLUMN IF EXISTS descripcion;"))
    await session.execute(text("ALTER TABLE torneos.torneos DROP COLUMN IF EXISTS imagen_portada;"))
    await session.execute(text("ALTER TABLE torneos.torneos DROP COLUMN IF EXISTS tipo_ubicacion;"))
    await session.execute(text("ALTER TABLE torneos.torneos DROP COLUMN IF EXISTS privacidad;"))
