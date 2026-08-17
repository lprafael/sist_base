-- Migración: Soporte WKF Para-Karate y Categoría Edad
-- Ejecutar en la base de datos de producción

ALTER TABLE torneos_generales.participantes
  ADD COLUMN IF NOT EXISTS clase_deportiva VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS extra_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categoria_edad VARCHAR(20) NULL;

-- clase_deportiva: K10, K21, K22, K30 (Para-Karate solamente)
-- extra_score: puntaje de compensación para K10 y K30
-- categoria_edad: 'Senior', 'Sub-21', 'Junior', 'Cadete', 'Sub-14' (declarado por el atleta)

COMMENT ON COLUMN torneos_generales.participantes.clase_deportiva IS 'Clase deportiva Para-Karate: K10 (Visual), K21/K22 (Intelectual), K30 (Física/Silla de ruedas)';
COMMENT ON COLUMN torneos_generales.participantes.extra_score IS 'Puntaje de compensación Para-Karate para clases K10 y K30';
COMMENT ON COLUMN torneos_generales.participantes.categoria_edad IS 'Categoría de edad declarada: Senior, Sub-21, Junior, Cadete, Sub-14';
