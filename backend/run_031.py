import asyncio
import sys
import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock alembic op object
class MockOp:
    def get_bind(self):
        # We need a synchronous connection for the mock, but we are using async engine.
        # So we will just pass a connection wrapper or execute directly.
        pass

async def run_migration():
    try:
        async with engine.begin() as conn:
            # We can't use mod.upgrade directly since it expects sync connection.
            # We will rewrite the logic here for execution.
            
            # 1. Perfil del Organizador
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sistema.perfil_organizador (
                    usuario_id INTEGER PRIMARY KEY REFERENCES sistema.usuarios(id),
                    enlace_sitio VARCHAR(100) UNIQUE,
                    logo_url VARCHAR(255),
                    banner_url VARCHAR(255),
                    color_primario VARCHAR(20) DEFAULT '#1e3a8a',
                    texto_1 VARCHAR(255),
                    texto_2 VARCHAR(255),
                    visibilidad VARCHAR(20) DEFAULT 'publico',
                    tipo_sede VARCHAR(20) DEFAULT 'fisico',
                    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            # 2. Modificar torneos.torneos
            await conn.execute(text("""
                ALTER TABLE torneos.torneos 
                ADD COLUMN IF NOT EXISTS tipo_campeonato VARCHAR(50) DEFAULT 'categorias';
            """))

            # 3. Categorías
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS torneos.categorias (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    torneo_id UUID NOT NULL REFERENCES torneos.torneos(id) ON DELETE CASCADE,
                    nombre VARCHAR(100) NOT NULL,
                    descripcion TEXT,
                    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            # 4. Divisiones
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS torneos.divisiones (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    categoria_id UUID NOT NULL REFERENCES torneos.categorias(id) ON DELETE CASCADE,
                    nombre VARCHAR(100) NOT NULL,
                    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            # 5. Clubes / Equipos
            await conn.execute(text("""
                ALTER TABLE torneos.equipos 
                ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES torneos.divisiones(id) ON DELETE CASCADE,
                ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255);
            """))

            # 6. Biometría Jugadores
            await conn.execute(text("""
                ALTER TABLE torneos.tournament_players
                ADD COLUMN IF NOT EXISTS biometria_aprobada BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS biometria_hash VARCHAR(255);
            """))

            # 7. Equipo Técnico
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS torneos.equipo_tecnico (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    equipo_id UUID NOT NULL REFERENCES torneos.equipos(id) ON DELETE CASCADE,
                    nombre VARCHAR(150) NOT NULL,
                    dni VARCHAR(50),
                    rol VARCHAR(50) DEFAULT 'Entrenador',
                    foto_url VARCHAR(255),
                    biometria_aprobada BOOLEAN DEFAULT FALSE,
                    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))
            logger.info("Migration 031 applied successfully!")
    except Exception as e:
        logger.error(f"Error applying migration 031: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(run_migration())
