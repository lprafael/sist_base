"""
Migration 031: Ecosistema Fútbol (Categorías, Divisiones, Clubes, Biometría, Perfil Organizador)
"""

from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

def upgrade(op):
    conn = op.get_bind()
    
    # 1. Perfil del Organizador (para páginas estilo Copafacil)
    conn.execute(text("""
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

    # 2. Modificar torneos_futbol.torneos para soportar tipos
    conn.execute(text("""
        ALTER TABLE torneos_futbol.torneos 
        ADD COLUMN IF NOT EXISTS tipo_campeonato VARCHAR(50) DEFAULT 'categorias';
    """))

    # 3. Categorías (Ej: Femenino, Masculino, Libre, Sub-15)
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS torneos_futbol.categorias (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            torneo_id UUID NOT NULL REFERENCES torneos_futbol.torneos(id) ON DELETE CASCADE,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))

    # 4. Divisiones (Ej: Primera A, Primera B dentro de Masculino)
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS torneos_futbol.divisiones (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            categoria_id UUID NOT NULL REFERENCES torneos_futbol.categorias(id) ON DELETE CASCADE,
            nombre VARCHAR(100) NOT NULL,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))

    # 5. Clubes / Equipos (Renovado con Logo)
    # Reutilizamos `torneos_futbol.equipos` pero le agregamos club_logo_url y division_id
    conn.execute(text("""
        ALTER TABLE torneos_futbol.equipos 
        ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES torneos_futbol.divisiones(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255);
    """))

    # 6. Biometría para Jugadores
    conn.execute(text("""
        ALTER TABLE torneos_futbol.tournament_players
        ADD COLUMN IF NOT EXISTS biometria_aprobada BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS biometria_hash VARCHAR(255);
    """))

    # 7. Equipo Técnico
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS torneos_futbol.equipo_tecnico (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            equipo_id UUID NOT NULL REFERENCES torneos_futbol.equipos(id) ON DELETE CASCADE,
            nombre VARCHAR(150) NOT NULL,
            dni VARCHAR(50),
            rol VARCHAR(50) DEFAULT 'Entrenador',
            foto_url VARCHAR(255),
            biometria_aprobada BOOLEAN DEFAULT FALSE,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))

def downgrade(op):
    conn = op.get_bind()
    conn.execute(text("DROP TABLE IF EXISTS torneos_futbol.equipo_tecnico;"))
    conn.execute(text("ALTER TABLE torneos_futbol.tournament_players DROP COLUMN IF EXISTS biometria_aprobada, DROP COLUMN IF EXISTS biometria_hash;"))
    conn.execute(text("ALTER TABLE torneos_futbol.equipos DROP COLUMN IF EXISTS division_id, DROP COLUMN IF EXISTS logo_url;"))
    conn.execute(text("DROP TABLE IF EXISTS torneos_futbol.divisiones;"))
    conn.execute(text("DROP TABLE IF EXISTS torneos_futbol.categorias;"))
    conn.execute(text("ALTER TABLE torneos_futbol.torneos DROP COLUMN IF EXISTS tipo_campeonato;"))
    conn.execute(text("DROP TABLE IF EXISTS sistema.perfil_organizador;"))
