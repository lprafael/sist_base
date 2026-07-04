"""
Migration: Agregar campos de reglas de negocio en torneos, equipos y jugadores
Timestamp: 2026-06-27
"""

migration_up = """
-- Agregar columna categoria a torneos.torneos
ALTER TABLE torneos.torneos 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'Primera';

-- Agregar columna promocion a torneos.equipos
ALTER TABLE torneos.equipos 
ADD COLUMN IF NOT EXISTS promocion INT DEFAULT 0;

-- Agregar columnas egreso_ano y es_exalumno a cancha.tournament_players
ALTER TABLE cancha.tournament_players 
ADD COLUMN IF NOT EXISTS egreso_ano INT,
ADD COLUMN IF NOT EXISTS es_exalumno BOOLEAN DEFAULT TRUE;
"""

migration_down = """
ALTER TABLE cancha.tournament_players 
DROP COLUMN IF EXISTS egreso_ano,
DROP COLUMN IF EXISTS es_exalumno;

ALTER TABLE torneos.equipos 
DROP COLUMN IF EXISTS promocion;

ALTER TABLE torneos.torneos 
DROP COLUMN IF EXISTS categoria;
"""
