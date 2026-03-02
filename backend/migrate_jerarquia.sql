-- =====================================================
-- MIGRACIÓN: Jerarquía de Roles SIGEL
-- Agregar distrito_id y departamento_id a usuarios
-- Agregar id_superior a caudillos para jerarquía
-- =====================================================

-- 1. Agregar campos de localización al usuario
ALTER TABLE sistema.usuarios
    ADD COLUMN IF NOT EXISTS departamento_id INTEGER NULL,
    ADD COLUMN IF NOT EXISTS distrito_id INTEGER NULL;

COMMENT ON COLUMN sistema.usuarios.departamento_id IS 'Departamento al que pertenece (para intendentes y concejales)';
COMMENT ON COLUMN sistema.usuarios.distrito_id IS 'Distrito al que pertenece (para intendentes y concejales)';

-- 2. Agregar referencia jerárquica entre caudillos
ALTER TABLE electoral.caudillos
    ADD COLUMN IF NOT EXISTS id_superior INTEGER NULL REFERENCES electoral.caudillos(id);

COMMENT ON COLUMN electoral.caudillos.id_superior IS 'Caudillo o candidato superior en la jerarquía (NULL si es el nivel más alto)';

-- 3. Agregar tipo de rol al caudillo para claridad
ALTER TABLE electoral.caudillos
    ADD COLUMN IF NOT EXISTS rol_electoral VARCHAR(20) NULL DEFAULT 'caudillo';

COMMENT ON COLUMN electoral.caudillos.rol_electoral IS 'intendente, concejal o caudillo';

-- 4. Actualizar los caudillos existentes con su rol según el usuario del sistema
UPDATE electoral.caudillos c
SET rol_electoral = u.rol
FROM sistema.usuarios u
WHERE c.id_usuario_sistema = u.id
  AND u.rol IN ('intendente', 'concejal', 'caudillo');

-- 5. Índices para acelerar las consultas de jerarquía
CREATE INDEX IF NOT EXISTS idx_usuarios_distrito ON sistema.usuarios(distrito_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_departamento ON sistema.usuarios(departamento_id);
CREATE INDEX IF NOT EXISTS idx_caudillos_superior ON electoral.caudillos(id_superior);
CREATE INDEX IF NOT EXISTS idx_caudillos_usuario ON electoral.caudillos(id_usuario_sistema);

-- Verificar resultado
SELECT 
    u.id, u.username, u.rol, u.departamento_id, u.distrito_id,
    c.id as caudillo_id, c.rol_electoral, c.id_superior
FROM sistema.usuarios u
LEFT JOIN electoral.caudillos c ON c.id_usuario_sistema = u.id
ORDER BY u.rol, u.username;
