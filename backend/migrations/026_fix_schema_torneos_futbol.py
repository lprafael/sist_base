import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

migration_up = """
-- 1. Agregar organizador_id y quitar NOT NULL de complejo_id en torneos y eventos
ALTER TABLE torneos_futbol.torneos ADD COLUMN IF NOT EXISTS organizador_id INTEGER REFERENCES cancha.organizadores(id) ON DELETE SET NULL;
ALTER TABLE torneos_futbol.eventos ADD COLUMN IF NOT EXISTS organizador_id INTEGER REFERENCES cancha.organizadores(id) ON DELETE SET NULL;
ALTER TABLE torneos_futbol.torneos ALTER COLUMN complejo_id DROP NOT NULL;
ALTER TABLE torneos_futbol.eventos ALTER COLUMN complejo_id DROP NOT NULL;

-- 2. Agregar email y activo a tournament_players
ALTER TABLE torneos_futbol.tournament_players ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE torneos_futbol.tournament_players ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Crear tabla documentos_jugador
CREATE TABLE IF NOT EXISTS torneos_futbol.documentos_jugador (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id UUID NOT NULL REFERENCES torneos_futbol.tournament_players(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL,
    archivo_url VARCHAR(500) NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente',
    observaciones TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Crear tabla cargos_equipo
CREATE TABLE IF NOT EXISTS torneos_futbol.cargos_equipo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES torneos_futbol.equipos(id) ON DELETE CASCADE,
    concepto VARCHAR(200) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    saldo NUMERIC(12,2) NOT NULL,
    fecha_vencimiento DATE,
    estado VARCHAR(30) DEFAULT 'pendiente',
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Crear tabla pagos_cargo
CREATE TABLE IF NOT EXISTS torneos_futbol.pagos_cargo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cargo_id UUID NOT NULL REFERENCES torneos_futbol.cargos_equipo(id) ON DELETE CASCADE,
    monto NUMERIC(12,2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    referencia VARCHAR(100),
    fecha_pago TIMESTAMPTZ DEFAULT NOW(),
    creado_por INTEGER REFERENCES sistema.usuarios(id)
);
"""

migration_down = """
DROP TABLE IF EXISTS torneos_futbol.pagos_cargo CASCADE;
DROP TABLE IF EXISTS torneos_futbol.cargos_equipo CASCADE;
DROP TABLE IF EXISTS torneos_futbol.documentos_jugador CASCADE;

ALTER TABLE torneos_futbol.tournament_players DROP COLUMN IF EXISTS email;
ALTER TABLE torneos_futbol.tournament_players DROP COLUMN IF EXISTS activo;

ALTER TABLE torneos_futbol.torneos DROP COLUMN IF EXISTS organizador_id;
ALTER TABLE torneos_futbol.eventos DROP COLUMN IF EXISTS organizador_id;
-- No revertimos el DROP NOT NULL de complejo_id porque podria violar restricciones.
"""

if __name__ == "__main__":
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)
        
    if "host.docker.internal" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")
        
    async def run_migration():
        engine = create_async_engine(DATABASE_URL)
        async with engine.begin() as conn:
            print("Ejecutando migracion 026 UP...")
            await conn.execute(text(migration_up))
            print("Migracion completada.")
        await engine.dispose()
        
    asyncio.run(run_migration())
