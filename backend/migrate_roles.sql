-- ============================================================
-- MIGRACIÓN: Reemplazo de roles genéricos por jerarquía electoral
-- Fecha: 2026-03-02
-- ============================================================
-- PRECAUCIÓN: ejecutar dentro de una transacción para poder revertir si hay error

BEGIN;

-- ============================================================
-- 1) ACTUALIZAR usuarios que tengan roles viejos → nuevos
--    (por si ya existían con manager/user/viewer en rol actual)
-- ============================================================
UPDATE sistema.usuarios
   SET rol = 'referente'
 WHERE rol IN ('user', 'viewer', 'manager')
   AND rol != 'admin';

-- ============================================================
-- 2) LIMPIAR permisos y asociaciones de los roles a eliminar
-- ============================================================

-- Quitar permisos asignados a roles que se van a borrar
DELETE FROM sistema.rol_permiso
 WHERE rol_id IN (
   SELECT id FROM sistema.roles WHERE nombre IN ('manager', 'user', 'viewer')
 );

-- Quitar asignaciones de usuarios a esos roles
DELETE FROM sistema.usuario_rol
 WHERE rol_id IN (
   SELECT id FROM sistema.roles WHERE nombre IN ('manager', 'user', 'viewer')
 );

-- ============================================================
-- 3) ELIMINAR roles obsoletos
-- ============================================================
DELETE FROM sistema.roles
 WHERE nombre IN ('manager', 'user', 'viewer');

-- ============================================================
-- 4) INSERTAR nuevos roles electorales (si no existen aún)
-- ============================================================

INSERT INTO sistema.roles (nombre, descripcion, activo)
SELECT 'intendente',
       'Candidato a Intendente: ve toda su rama (concejales + referentes + simpatizantes)',
       true
 WHERE NOT EXISTS (
   SELECT 1 FROM sistema.roles WHERE nombre = 'intendente'
 );

INSERT INTO sistema.roles (nombre, descripcion, activo)
SELECT 'concejal',
       'Candidato a Concejal: ve sus referentes directos y sus simpatizantes',
       true
 WHERE NOT EXISTS (
   SELECT 1 FROM sistema.roles WHERE nombre = 'concejal'
 );

INSERT INTO sistema.roles (nombre, descripcion, activo)
SELECT 'referente',
       'Referente: solo puede agregar y ver sus propios simpatizantes',
       true
 WHERE NOT EXISTS (
   SELECT 1 FROM sistema.roles WHERE nombre = 'referente'
 );

-- ============================================================
-- 5) ASIGNAR PERMISOS a los nuevos roles
--    - intendente y concejal: pueden leer usuarios (ver su equipo)
--    - referente: sin permisos en sistema (solo accede a electoral)
-- ============================================================

-- Permiso usuarios_read para intendente
INSERT INTO sistema.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
  FROM sistema.roles r, sistema.permisos p
 WHERE r.nombre = 'intendente'
   AND p.nombre = 'usuarios_read'
   AND NOT EXISTS (
     SELECT 1 FROM sistema.rol_permiso rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
   );

-- Permiso usuarios_read para concejal
INSERT INTO sistema.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
  FROM sistema.roles r, sistema.permisos p
 WHERE r.nombre = 'concejal'
   AND p.nombre = 'usuarios_read'
   AND NOT EXISTS (
     SELECT 1 FROM sistema.rol_permiso rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
   );

-- ============================================================
-- 6) VERIFICACIÓN FINAL
-- ============================================================
SELECT id, nombre, descripcion, activo
  FROM sistema.roles
 ORDER BY id;

SELECT u.id, u.username, u.rol
  FROM sistema.usuarios u
 ORDER BY u.id;

COMMIT;

-- Si algo falló: ROLLBACK;
