-- =====================================================
-- MIGRACIÓN: Jerarquía de Roles SIGEL
-- Agregar distrito_id y departamento_id a usuarios
-- Agregar id_superior a referentes para jerarquía
-- =====================================================

-- 1. Agregar campos de localización al usuario
ALTER TABLE sistema.usuarios
    ADD COLUMN IF NOT EXISTS departamento_id INTEGER NULL,
    ADD COLUMN IF NOT EXISTS distrito_id INTEGER NULL;

COMMENT ON COLUMN sistema.usuarios.departamento_id IS 'Departamento al que pertenece (para intendentes y concejales)';
COMMENT ON COLUMN sistema.usuarios.distrito_id IS 'Distrito al que pertenece (para intendentes y concejales)';

-- 2. Agregar referencia jerárquica entre referentes
ALTER TABLE electoral.referentes
    ADD COLUMN IF NOT EXISTS id_superior INTEGER NULL REFERENCES electoral.referentes(id);

COMMENT ON COLUMN electoral.referentes.id_superior IS 'Referente o candidato superior en la jerarquía (NULL si es el nivel más alto)';

-- 3. Agregar tipo de rol al referente para claridad
ALTER TABLE electoral.referentes
    ADD COLUMN IF NOT EXISTS rol_electoral VARCHAR(20) NULL DEFAULT 'referente';

COMMENT ON COLUMN electoral.referentes.rol_electoral IS 'intendente, concejal o referente';

-- 4. Actualizar los referentes existentes con su rol según el usuario del sistema
UPDATE electoral.referentes c
SET rol_electoral = u.rol
FROM sistema.usuarios u
WHERE c.id_usuario_sistema = u.id
  AND u.rol IN ('intendente', 'concejal', 'referente');

-- 5. Índices para acelerar las consultas de jerarquía
CREATE INDEX IF NOT EXISTS idx_usuarios_distrito ON sistema.usuarios(distrito_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_departamento ON sistema.usuarios(departamento_id);
CREATE INDEX IF NOT EXISTS idx_referentes_superior ON electoral.referentes(id_superior);
CREATE INDEX IF NOT EXISTS idx_referentes_usuario ON electoral.referentes(id_usuario_sistema);

-- Verificar resultado
SELECT 
    u.id, u.username, u.rol, u.departamento_id, u.distrito_id,
    c.id as referente_id, c.rol_electoral, c.id_superior
FROM sistema.usuarios u
LEFT JOIN electoral.referentes c ON c.id_usuario_sistema = u.id
ORDER BY u.rol, u.username;
