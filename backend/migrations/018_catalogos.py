"""
Migration 018: Catálogos para Deportes, Formatos de Torneo y Categorías
- cancha.deportes
- torneos.formatos_torneo
- torneos.categorias
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
-- 1. Crear tabla cancha.deportes
CREATE TABLE IF NOT EXISTS cancha.deportes (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(100) NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla torneos.formatos_torneo
CREATE TABLE IF NOT EXISTS torneos.formatos_torneo (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla torneos.categorias
CREATE TABLE IF NOT EXISTS torneos.categorias (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(100) NOT NULL,
    edad_minima INTEGER,
    edad_maxima INTEGER,
    nivel VARCHAR(100),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insertar datos por defecto (Deportes)
INSERT INTO cancha.deportes (nombre, tipo) VALUES
('Fútbol', 'Colectivo'),
('Fútbol Suizo', 'Colectivo'),
('Futsal', 'Colectivo'),
('Padel', 'Raqueta'),
('Tenis', 'Raqueta'),
('Vóley', 'Colectivo'),
('Básquetbol', 'Colectivo'),
('Taekwondo', 'Contacto'),
('Karate', 'Contacto'),
('Kickboxing', 'Contacto'),
('Jiu-Jitsu', 'Contacto')
ON CONFLICT (nombre) DO NOTHING;

-- 5. Insertar datos por defecto (Formatos)
INSERT INTO torneos.formatos_torneo (nombre, descripcion) VALUES
('Eliminatoria Directa', 'Llaves de eliminación directa donde el perdedor queda fuera del torneo.'),
('Todos contra Todos (Liga)', 'Fase regular donde cada equipo juega contra todos los demás de su grupo.'),
('Grupos y Eliminatorias (Mundial)', 'Fase de grupos seguida de llaves de eliminación directa.'),
('Suizo', 'Sistema de emparejamiento no eliminatorio con un número predeterminado de rondas.'),
('Doble Eliminación', 'El participante queda eliminado solo después de perder dos partidos.')
ON CONFLICT (nombre) DO NOTHING;
"""

migration_down = """
DROP TABLE IF EXISTS torneos.categorias CASCADE;
DROP TABLE IF EXISTS torneos.formatos_torneo CASCADE;
DROP TABLE IF EXISTS cancha.deportes CASCADE;
"""

if __name__ == "__main__":
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)

    if "host.docker.internal" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    sql_block = migration_up if direction != "down" else migration_down

    async def run():
        print(f"Ejecutando migracion 018: Catalogos ({direction.upper()})...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        statements = [s.strip() for s in sql_block.split(";") if s.strip()]
        ok = 0
        async with engine.begin() as conn:
            for i, stmt in enumerate(statements, 1):
                try:
                    await conn.execute(text(stmt))
                    print(f"  OK [{i}/{len(statements)}]: {stmt[:55].replace(chr(10), ' ')}")
                    ok += 1
                except Exception as e:
                    print(f"  WARN [{i}/{len(statements)}]: {str(e)[:100]}")
        await engine.dispose()
        print(f"\\nMigracion completada: {ok}/{len(statements)} sentencias OK.")

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
