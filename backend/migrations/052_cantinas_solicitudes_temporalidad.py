"""
Migration 052: Cantinas Solicitudes, Temporalidad y Multi-Cantinas por Administrador
=====================================================================================
Añade control de temporalidad (por día, semana, fines de semana, personalizada),
flujo de solicitudes de creación, aprobación por el Super Administrador de la plataforma,
y soporte para que un mismo Administrador gestione múltiples cantinas en el tiempo.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida en .env")
    sys.exit(1)

# Asegurar protocolo asyncpg si viene como postgresql://
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

migration_sql = """
-- 1. Agregar columnas de temporalidad y aprobación a cantinas.cantinas
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS tipo_temporalidad VARCHAR(50) DEFAULT 'evento';
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS fecha_fin DATE;
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS dias_habilitados JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS evento_nombre VARCHAR(200);
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS solicitante_nombre VARCHAR(150);
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS solicitante_email VARCHAR(150);
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS solicitante_telefono VARCHAR(50);
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS admin_email VARCHAR(150);
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(30) DEFAULT 'aprobada';
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS aprobado_por INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL;
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS aprobado_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE cantinas.cantinas ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;

-- 2. Asegurar que cantinas existentes tengan vigencia y estado aprobada
UPDATE cantinas.cantinas 
SET 
    tipo_temporalidad = COALESCE(tipo_temporalidad, 'permanente'),
    fecha_inicio = COALESCE(fecha_inicio, '2025-01-01'::date),
    fecha_fin = COALESCE(fecha_fin, '2030-12-31'::date),
    estado_aprobacion = COALESCE(estado_aprobacion, 'aprobada'),
    evento_nombre = COALESCE(evento_nombre, 'Club Deportivo Central')
WHERE fecha_inicio IS NULL OR estado_aprobacion IS NULL;

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_cantinas_usuario_id ON cantinas.cantinas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cantinas_estado_aprobacion ON cantinas.cantinas(estado_aprobacion);
CREATE INDEX IF NOT EXISTS idx_cantinas_admin_email ON cantinas.cantinas(admin_email);
CREATE INDEX IF NOT EXISTS idx_cantinas_fechas ON cantinas.cantinas(fecha_inicio, fecha_fin);
"""

async def run_migration():
    print("Iniciando Migración 052: Cantinas Solicitudes, Temporalidad y Multi-Cantinas...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        for stmt in migration_sql.split(";"):
            clean_stmt = stmt.strip()
            if clean_stmt:
                try:
                    await conn.execute(text(clean_stmt))
                    await conn.commit()
                except Exception as e:
                    print(f"Nota en stmt: {e}")
                    
        # Verificar columnas creadas
        chk = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'cantinas' AND table_name = 'cantinas'
            ORDER BY ordinal_position;
        """))
        cols = [r[0] for r in chk.fetchall()]
        print("Columnas actuales en cantinas.cantinas:", cols)

    await engine.dispose()
    print("Migración 052 completada exitosamente!")

if __name__ == "__main__":
    asyncio.run(run_migration())
