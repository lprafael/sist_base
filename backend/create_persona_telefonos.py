#!/usr/bin/env python3
"""
create_persona_telefonos.py
Migración para crear la tabla electoral.persona_telefonos e índices,
y migrar teléfonos existentes de electoral.personas hacia la nueva tabla.
"""

import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no encontrada en .env")

DDL_STATEMENTS = [
    """CREATE TABLE IF NOT EXISTS electoral.persona_telefonos (
        id SERIAL PRIMARY KEY,
        cedula VARCHAR(20) NOT NULL REFERENCES electoral.personas(cedula) ON DELETE CASCADE,
        telefono VARCHAR(50) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'Celular',
        observacion VARCHAR(255),
        id_usuario_registro INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
        fecha_registro TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
        es_actual BOOLEAN DEFAULT TRUE
    )""",
    "CREATE INDEX IF NOT EXISTS idx_persona_telefonos_cedula ON electoral.persona_telefonos(cedula)",
    "CREATE INDEX IF NOT EXISTS idx_persona_telefonos_fecha ON electoral.persona_telefonos(fecha_registro DESC)",
    "CREATE INDEX IF NOT EXISTS idx_persona_telefonos_actual ON electoral.persona_telefonos(cedula, es_actual)",
    """INSERT INTO electoral.persona_telefonos (cedula, telefono, tipo, fecha_registro, es_actual)
    SELECT 
        p.cedula,
        TRIM(p.telefono),
        'Principal',
        COALESCE(p.fecha_registro, NOW()),
        TRUE
    FROM electoral.personas p
    WHERE p.telefono IS NOT NULL 
      AND TRIM(p.telefono) != ''
      AND NOT EXISTS (
          SELECT 1 FROM electoral.persona_telefonos pt WHERE pt.cedula = p.cedula
      )"""
]

async def run_migration():
    print(f"Iniciando migración en: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        print("Ejecutando DDL para electoral.persona_telefonos...")
        for stmt in DDL_STATEMENTS:
            await conn.execute(text(stmt))
        
        # Verificar estado
        res = await conn.execute(text("SELECT COUNT(*) FROM electoral.persona_telefonos"))
        count = res.scalar()
        print(f"Migración completada con éxito. Registros en electoral.persona_telefonos: {count}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
