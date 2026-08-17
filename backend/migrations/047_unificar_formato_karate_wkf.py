"""
Migration 047: Unificar formatos de Karate en Sistema Oficial WKF (Kata y Kumite)
- Unifica 'Karate - Kumite' y 'Karate - Kata' en un solo formato troncal: 'Sistema Oficial WKF (Kata y Kumite)'
- Actualiza la asociación en cancha.deporte_formato para el deporte Karate (id=9)
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
-- 1. Actualizar el formato 7 para que sea el formato unificado oficial WKF
UPDATE cancha.formatos_torneo
SET 
    nombre = 'Sistema Oficial WKF (Kata y Kumite)',
    descripcion = 'Formato oficial basado en el reglamento de la Federación Mundial de Karate (WKF / PKF). Aplica un sistema de llaves de eliminación directa con repesca para Kumite (combate por puntos técnicos Yuko, Waza-Ari e Ippon con regla de Senshu y ventaja de 8 puntos) y evaluación técnica por banderas o puntaje para la modalidad de Kata (formas). Ambas modalidades conviven dentro del mismo torneo y sus atletas compiten en sus respectivas divisiones.'
WHERE id = 7 OR nombre = 'Karate - Kumite';

-- 2. Si alguna división o torneo apuntaba al formato 8 (Kata separado), migrarla al 7 (Unificado)
UPDATE torneos_generales.divisiones
SET formato_id = 7
WHERE formato_id = 8;

-- 3. Eliminar la asociación del formato 8 con Karate en deporte_formato
DELETE FROM cancha.deporte_formato
WHERE formato_id = 8 AND deporte_id = 9;

-- 4. Eliminar el formato 8 antiguo de formatos_torneo si ya no se utiliza
DELETE FROM cancha.formatos_torneo
WHERE id = 8 OR nombre = 'Karate - Kata';

-- 5. Asegurar que Karate (deporte_id = 9) tenga asignado el formato unificado (formato_id = 7)
INSERT INTO cancha.deporte_formato (deporte_id, formato_id)
VALUES (9, 7)
ON CONFLICT DO NOTHING;
"""

migration_down = """
-- Revertir a formatos separados
INSERT INTO cancha.formatos_torneo (id, nombre, descripcion)
OVERRIDING SYSTEM VALUE
VALUES 
    (7, 'Karate - Kumite', 'Sistema de combate individual por puntos técnicos acumulativos en tiempo corrido.'),
    (8, 'Karate - Kata', 'Evaluación del desarrollo de formas por votación de banderas o puntuación técnica.')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

INSERT INTO cancha.deporte_formato (deporte_id, formato_id)
VALUES (9, 7), (9, 8)
ON CONFLICT DO NOTHING;
"""

async def run_migration():
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
    db_url = os.getenv('DATABASE_URL', 'postgresql+asyncpg://postgres:admin@187.77.247.23:5436/BBDD_micancha')
    db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
    
    print(f"Connecting to database...")
    engine = create_async_engine(db_url, echo=False)
    
    statements = [s.strip() for s in migration_up.split(';') if s.strip()]
    print(f"Applying migration 047 ({len(statements)} statements)...")
    
    async with engine.begin() as conn:
        for i, stmt in enumerate(statements, 1):
            preview = stmt[:70].replace('\n', ' ')
            await conn.execute(text(stmt))
            print(f"  [OK] [{i:02d}/{len(statements)}]: {preview}")
            
    await engine.dispose()
    print("Migration 047 applied successfully!")

if __name__ == '__main__':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
