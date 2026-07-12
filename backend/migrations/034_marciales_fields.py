from sqlalchemy import text

def upgrade(op):
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE torneos.tournament_players 
        ADD COLUMN IF NOT EXISTS peso_verificado DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS estatura_verificada DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS pago_confirmado BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50),
        ADD COLUMN IF NOT EXISTS nivel_experiencia VARCHAR(50);
    """))

def downgrade(op):
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE torneos.tournament_players 
        DROP COLUMN IF EXISTS peso_verificado,
        DROP COLUMN IF EXISTS estatura_verificada,
        DROP COLUMN IF EXISTS pago_confirmado,
        DROP COLUMN IF EXISTS modalidad,
        DROP COLUMN IF EXISTS nivel_experiencia;
    """))
