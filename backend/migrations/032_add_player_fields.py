from sqlalchemy import text

def upgrade(op):
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE torneos.tournament_players 
        ADD COLUMN IF NOT EXISTS nombre_abreviado VARCHAR(100),
        ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
    """))

def downgrade(op):
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE torneos.tournament_players 
        DROP COLUMN IF EXISTS nombre_abreviado,
        DROP COLUMN IF EXISTS telefono;
    """))
