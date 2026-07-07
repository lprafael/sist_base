"""
Migration: ASAM Scoring System and Fines
Timestamp: 2026-07-07
"""

migration_up = """
-- ==========================================
-- 1. MODIFICAR PAYMENTS PARA MULTAS
-- ==========================================
ALTER TABLE cancha.payments ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'inscripcion';
ALTER TABLE cancha.payments ADD COLUMN IF NOT EXISTS description VARCHAR(255);

-- ==========================================
-- 2. TABLA DE CATEGORÍAS MARCIALES
-- ==========================================
CREATE TABLE IF NOT EXISTS torneos_generales.categorias_marciales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id UUID NOT NULL REFERENCES torneos_generales.torneos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    modalidad VARCHAR(50) NOT NULL, -- combate, formas
    edad_min INT,
    edad_max INT,
    cinturon_min VARCHAR(50),
    cinturon_max VARCHAR(50),
    peso_min DECIMAL(5,2),
    peso_max DECIMAL(5,2),
    genero VARCHAR(20), -- M, F, Mixto
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cat_marciales_torneo ON torneos_generales.categorias_marciales(torneo_id);

-- ==========================================
-- 3. TABLA ASAM COMBATES
-- ==========================================
CREATE TABLE IF NOT EXISTS torneos_generales.asam_combates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL REFERENCES torneos_generales.encuentros(id) ON DELETE CASCADE,
    blanco_id UUID REFERENCES torneos_generales.participantes(id),
    rojo_id UUID REFERENCES torneos_generales.participantes(id),
    puntos_blanco INT DEFAULT 0,
    salidas_blanco INT DEFAULT 0,
    faltas_blanco INT DEFAULT 0,
    puntos_rojo INT DEFAULT 0,
    salidas_rojo INT DEFAULT 0,
    faltas_rojo INT DEFAULT 0,
    ganador_id UUID REFERENCES torneos_generales.participantes(id),
    metodo_victoria VARCHAR(100), -- puntos, hantei, descalificacion
    estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, en_curso, finalizado
    tiempo_restante_segundos INT DEFAULT 90, -- 1:30 min
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asam_combates_encuentro ON torneos_generales.asam_combates(encuentro_id);

-- ==========================================
-- 4. TABLA ASAM FORMAS
-- ==========================================
CREATE TABLE IF NOT EXISTS torneos_generales.asam_formas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID NOT NULL REFERENCES torneos_generales.categorias_marciales(id) ON DELETE CASCADE,
    participante_id UUID NOT NULL REFERENCES torneos_generales.participantes(id) ON DELETE CASCADE,
    juez_1 DECIMAL(3,1),
    juez_2 DECIMAL(3,1),
    juez_3 DECIMAL(3,1),
    juez_4 DECIMAL(3,1),
    juez_5 DECIMAL(3,1),
    puntaje_descartado_alto DECIMAL(3,1),
    puntaje_descartado_bajo DECIMAL(3,1),
    puntaje_final DECIMAL(4,1),
    posicion_final INT,
    estado VARCHAR(50) DEFAULT 'evaluando',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asam_formas_categoria ON torneos_generales.asam_formas(categoria_id);
"""

migration_down = """
DROP TABLE IF EXISTS torneos_generales.asam_formas;
DROP TABLE IF EXISTS torneos_generales.asam_combates;
DROP TABLE IF EXISTS torneos_generales.categorias_marciales;
ALTER TABLE cancha.payments DROP COLUMN IF EXISTS type;
ALTER TABLE cancha.payments DROP COLUMN IF EXISTS description;
"""
