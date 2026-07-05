"""
Migration 020: Normalizar cancha.deportes separando cancha.tipos_deporte
- Crea tabla cancha.tipos_deporte
- Migra datos de cancha.deportes.tipo a tipos_deporte
- Agrega FK tipo_id a deportes y elimina tipo
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_up = """
-- 1. Crear tabla cancha.tipos_deporte
CREATE TABLE IF NOT EXISTS cancha.tipos_deporte (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrar valores únicos existentes
INSERT INTO cancha.tipos_deporte (nombre)
SELECT DISTINCT tipo FROM cancha.deportes WHERE tipo IS NOT NULL
ON CONFLICT (nombre) DO NOTHING;

-- 3. Añadir tipo_id a cancha.deportes
ALTER TABLE cancha.deportes 
ADD COLUMN IF NOT EXISTS tipo_id INTEGER REFERENCES cancha.tipos_deporte(id) ON DELETE RESTRICT;

-- 4. Actualizar tipo_id en base al texto actual
UPDATE cancha.deportes d
SET tipo_id = t.id
FROM cancha.tipos_deporte t
WHERE d.tipo = t.nombre AND d.tipo_id IS NULL;

-- 5. Hacer tipo_id NOT NULL
ALTER TABLE cancha.deportes ALTER COLUMN tipo_id SET NOT NULL;

-- 6. Eliminar la columna vieja de texto
ALTER TABLE cancha.deportes DROP COLUMN IF EXISTS tipo;
"""

migration_down = """
-- 1. Recrear columna tipo
ALTER TABLE cancha.deportes ADD COLUMN IF NOT EXISTS tipo VARCHAR(100);

-- 2. Restaurar valores
UPDATE cancha.deportes d
SET tipo = t.nombre
FROM cancha.tipos_deporte t
WHERE d.tipo_id = t.id;

-- 3. Quitar tipo_id y la tabla
ALTER TABLE cancha.deportes DROP COLUMN IF EXISTS tipo_id;
DROP TABLE IF EXISTS cancha.tipos_deporte CASCADE;
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
        print(f"Ejecutando migracion 020: Normalizar tipos_deporte ({direction.upper()})...")
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
