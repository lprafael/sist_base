migration_up = """
CREATE TABLE IF NOT EXISTS cancha.torneos_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estado VARCHAR(30) DEFAULT 'abierto' CHECK (estado IN ('abierto','en_curso','finalizado','cancelado')),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cancha.torneos ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES cancha.torneos_eventos(id) ON DELETE CASCADE;
ALTER TABLE cancha.torneos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);

ALTER TABLE cancha.torneos DROP CONSTRAINT IF EXISTS torneos_formato_check;
ALTER TABLE cancha.torneos ADD CONSTRAINT torneos_formato_check 
    CHECK (formato IN ('liga', 'eliminacion_simple', 'mixto', 'suizo', 'eliminacion_doble', 'grupos'));
"""

migration_down = """
ALTER TABLE cancha.torneos DROP CONSTRAINT IF EXISTS torneos_formato_check;
ALTER TABLE cancha.torneos ADD CONSTRAINT torneos_formato_check CHECK (formato IN ('eliminacion_simple','eliminacion_doble','grupos','liga'));
ALTER TABLE cancha.torneos DROP COLUMN IF EXISTS categoria;
ALTER TABLE cancha.torneos DROP COLUMN IF EXISTS evento_id;
DROP TABLE IF EXISTS cancha.torneos_eventos;
"""
