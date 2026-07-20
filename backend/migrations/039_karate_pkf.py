"""
Migration: Karate PKF Scoring System
"""

migration_up = """
-- ==========================================
-- 1. TABLA PKF COMBATES (KUMITE)
-- ==========================================
CREATE TABLE IF NOT EXISTS torneos_generales.pkf_combates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL REFERENCES torneos_generales.encuentros(id) ON DELETE CASCADE,
    aka_id UUID REFERENCES torneos_generales.participantes(id),
    ao_id UUID REFERENCES torneos_generales.participantes(id),
    
    puntos_aka INT DEFAULT 0,
    senshu_aka BOOLEAN DEFAULT FALSE,
    jogai_aka INT DEFAULT 0,
    video_review_aka VARCHAR(20) DEFAULT 'ACTIVE',
    penalizaciones_aka INT DEFAULT 0,
    
    puntos_ao INT DEFAULT 0,
    senshu_ao BOOLEAN DEFAULT FALSE,
    jogai_ao INT DEFAULT 0,
    video_review_ao VARCHAR(20) DEFAULT 'ACTIVE',
    penalizaciones_ao INT DEFAULT 0,
    
    ganador_id UUID REFERENCES torneos_generales.participantes(id),
    metodo_victoria VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'pendiente',
    tiempo_restante_segundos INT DEFAULT 90,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pkf_combates_encuentro ON torneos_generales.pkf_combates(encuentro_id);

-- ==========================================
-- 2. TABLA PKF FORMAS (KATA - VOTACIÓN POR BANDERAS)
-- ==========================================
CREATE TABLE IF NOT EXISTS torneos_generales.pkf_formas_enfrentamientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL REFERENCES torneos_generales.encuentros(id) ON DELETE CASCADE,
    aka_id UUID REFERENCES torneos_generales.participantes(id),
    ao_id UUID REFERENCES torneos_generales.participantes(id),
    
    votos_aka INT DEFAULT 0,
    votos_ao INT DEFAULT 0,
    
    juez_1_voto VARCHAR(20),
    juez_2_voto VARCHAR(20),
    juez_3_voto VARCHAR(20),
    juez_4_voto VARCHAR(20),
    juez_5_voto VARCHAR(20),
    juez_6_voto VARCHAR(20),
    juez_7_voto VARCHAR(20),
    
    ganador_id UUID REFERENCES torneos_generales.participantes(id),
    estado VARCHAR(50) DEFAULT 'evaluando',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pkf_formas_encuentro ON torneos_generales.pkf_formas_enfrentamientos(encuentro_id);
"""

migration_down = """
DROP TABLE IF EXISTS torneos_generales.pkf_formas_enfrentamientos;
DROP TABLE IF EXISTS torneos_generales.pkf_combates;
"""
