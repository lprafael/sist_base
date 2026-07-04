"""
Migration: Agregar campos reglas y premios a la tabla torneos
Timestamp: 2026-05-29
"""

migration_up = """
-- Agregar columnas JSONB para reglas y premios
ALTER TABLE torneos.torneos 
ADD COLUMN IF NOT EXISTS reglas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS premios JSONB DEFAULT '[]'::jsonb;
"""

migration_down = """
ALTER TABLE torneos.torneos 
DROP COLUMN IF EXISTS reglas,
DROP COLUMN IF EXISTS premios;
"""
