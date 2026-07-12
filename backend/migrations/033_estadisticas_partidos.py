import asyncio
from sqlalchemy import text
from database import engine

async def up():
    async with engine.begin() as conn:
        # Añadir columnas a torneos.partidos si no existen
        await conn.execute(text("""
            ALTER TABLE torneos.partidos 
            ADD COLUMN IF NOT EXISTS estadisticas JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS jugador_local_id UUID REFERENCES torneos.tournament_players(id),
            ADD COLUMN IF NOT EXISTS jugador_visitante_id UUID REFERENCES torneos.tournament_players(id);
        """))
        
        # Añadir género a torneos.tournament_players si no existe
        await conn.execute(text("""
            ALTER TABLE torneos.tournament_players 
            ADD COLUMN IF NOT EXISTS genero VARCHAR(20) DEFAULT 'Masculino';
        """))
        
        print("Migración 033 ejecutada correctamente: Campos añadidos para gestión avanzada de partidos y MMA.")

async def down():
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE torneos.partidos 
            DROP COLUMN IF EXISTS estadisticas,
            DROP COLUMN IF EXISTS jugador_local_id,
            DROP COLUMN IF EXISTS jugador_visitante_id;
        """))
        
        await conn.execute(text("""
            ALTER TABLE torneos.tournament_players 
            DROP COLUMN IF EXISTS genero;
        """))
        
        print("Rollback de migración 033 completado.")

if __name__ == "__main__":
    asyncio.run(up())
