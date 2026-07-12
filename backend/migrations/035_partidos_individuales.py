from sqlalchemy import text

def upgrade(op):
    conn = op.get_bind()
    conn.execute(text("""
        -- CREATE torneos.grupos
        CREATE TABLE IF NOT EXISTS torneos.grupos (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            torneo_id UUID NOT NULL REFERENCES torneos.torneos(id) ON DELETE CASCADE,
            division_id UUID REFERENCES torneos.divisiones(id) ON DELETE CASCADE,
            nombre VARCHAR(100) NOT NULL,
            estado VARCHAR(50) DEFAULT 'creado',
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Modify torneos.partidos for Individual matches and groups
        ALTER TABLE torneos.partidos 
        ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES torneos.divisiones(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES torneos.grupos(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS jugador_local_id UUID REFERENCES torneos.tournament_players(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS jugador_visitante_id UUID REFERENCES torneos.tournament_players(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS ganador_jugador_id UUID REFERENCES torneos.tournament_players(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS ronda VARCHAR(50),
        ALTER COLUMN equipo_local_id DROP NOT NULL,
        ALTER COLUMN equipo_visitante_id DROP NOT NULL;

        -- Modify torneos.posiciones for Individual players
        ALTER TABLE torneos.posiciones 
        ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES torneos.grupos(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS jugador_id UUID REFERENCES torneos.tournament_players(id) ON DELETE CASCADE,
        ALTER COLUMN equipo_id DROP NOT NULL;
    """))

def downgrade(op):
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE torneos.posiciones 
        DROP COLUMN IF EXISTS grupo_id,
        DROP COLUMN IF EXISTS jugador_id;

        ALTER TABLE torneos.partidos 
        DROP COLUMN IF EXISTS division_id,
        DROP COLUMN IF EXISTS grupo_id,
        DROP COLUMN IF EXISTS jugador_local_id,
        DROP COLUMN IF EXISTS jugador_visitante_id,
        DROP COLUMN IF EXISTS ganador_jugador_id,
        DROP COLUMN IF EXISTS ronda;

        DROP TABLE IF EXISTS torneos.grupos CASCADE;
    """))
