"""
Migration: Agregar tablas de chat, vista materializada para estadísticas y campo face_encoding
Timestamp: 2026-05-29
"""

migration_up = """
-- ==========================================
-- 1. TABLA DE CONVERSACIONES
-- ==========================================
CREATE TABLE IF NOT EXISTS cancha.conversaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante1_id INTEGER REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
    participante2_id INTEGER REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participante1_id, participante2_id)
);

CREATE INDEX idx_conversaciones_p1 ON cancha.conversaciones(participante1_id);
CREATE INDEX idx_conversaciones_p2 ON cancha.conversaciones(participante2_id);

-- ==========================================
-- 2. TABLA DE MENSAJES
-- ==========================================
CREATE TABLE IF NOT EXISTS cancha.mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID NOT NULL REFERENCES cancha.conversaciones(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES sistema.usuarios(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mensajes_conversacion ON cancha.mensajes(conversacion_id);
CREATE INDEX idx_mensajes_creado_en ON cancha.mensajes(creado_en);

-- ==========================================
-- 3. CAMPO RECONOCIMIENTO FACIAL EN JUGADORES
-- ==========================================
-- Usamos JSONB para guardar un array de floats que representa el encoding facial de dlib (128 dimensiones)
ALTER TABLE cancha.tournament_players 
ADD COLUMN IF NOT EXISTS face_encoding JSONB;

-- ==========================================
-- 4. VISTA PARA ESTADÍSTICAS (Opcional, puede usarse para facilitar consultas)
-- ==========================================
CREATE OR REPLACE VIEW cancha.vw_reservas_stats AS
SELECT 
    complejo_id,
    cancha_id,
    DATE(inicio) as fecha,
    COUNT(id) as total_reservas,
    SUM(precio_total) as ingresos_totales,
    SUM(seña_pagada) as ingresos_cobrados
FROM cancha.reservas
WHERE estado = 'finalizada' OR estado = 'confirmada'
GROUP BY complejo_id, cancha_id, DATE(inicio);
"""

migration_down = """
DROP VIEW IF EXISTS cancha.vw_reservas_stats;

ALTER TABLE cancha.tournament_players 
DROP COLUMN IF EXISTS face_encoding;

DROP TABLE IF EXISTS cancha.mensajes;
DROP TABLE IF EXISTS cancha.conversaciones;
"""
