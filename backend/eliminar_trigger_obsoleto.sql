-- Script para eliminar el trigger obsoleto trg_actualizar_estado_pagare
-- Este trigger ya no es necesario porque la lógica de actualización de estados
-- se maneja desde el código de la aplicación

-- 1. Eliminar el trigger
DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON playa.pagos;

-- 2. Registrar en auditoría (si existe la tabla de auditoría)
-- Nota: La auditoría completa se hará desde la aplicación cuando uses el endpoint

-- 3. Verificar que se eliminó correctamente
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'playa'
              AND c.relname = 'pagos'
              AND t.tgname = 'trg_actualizar_estado_pagare'
        ) THEN '❌ El trigger todavía existe'
        ELSE '✅ Trigger eliminado exitosamente'
    END AS resultado;

-- 4. Mostrar triggers restantes en la tabla pagos
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'playa'
  AND c.relname = 'pagos'
  AND NOT t.tgisinternal;
