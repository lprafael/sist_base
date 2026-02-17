-- Script de diagnóstico para verificar triggers en la tabla pagares
-- Este script verifica si hay triggers activos que puedan estar causando conflictos

-- 1. Listar todos los triggers en la tabla pagares
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        WHEN 'R' THEN 'REPLICA'
        WHEN 'A' THEN 'ALWAYS'
    END AS status,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'playa'
  AND c.relname = 'pagares'
  AND NOT t.tgisinternal;

-- 2. Verificar si existe el trigger específico del initBD.sql
SELECT EXISTS (
    SELECT 1 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'playa'
      AND c.relname = 'pagos'
      AND t.tgname = 'trg_actualizar_estado_pagare'
) AS trigger_exists;

-- 3. Verificar si existe la función del trigger
SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'playa'
      AND p.proname = 'actualizar_estado_pagare'
) AS function_exists;

-- 4. Ver la definición de la función si existe
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'playa'
  AND p.proname = 'actualizar_estado_pagare';

-- 5. Verificar la estructura actual de la tabla pagares
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'playa'
  AND table_name = 'pagares'
  AND column_name IN ('estado', 'id_estado', 'cancelado', 'saldo_pendiente')
ORDER BY ordinal_position;

-- 6. Contar pagarés con problemas (saldo 0 sin pagos)
SELECT 
    COUNT(*) AS total_inconsistentes,
    COUNT(CASE WHEN pg.id_estado IS NOT NULL THEN 1 END) AS con_id_estado,
    COUNT(CASE WHEN pg.cancelado = TRUE THEN 1 END) AS marcados_cancelado
FROM playa.pagares pg
LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
WHERE (pg.saldo_pendiente = 0 OR pg.saldo_pendiente IS NULL)
  AND p.id_pago IS NULL
GROUP BY 1=1;

-- 7. Mostrar ejemplos de pagarés inconsistentes
SELECT 
    pg.id_pagare,
    pg.numero_pagare,
    pg.numero_cuota,
    pg.monto_cuota,
    pg.saldo_pendiente,
    pg.id_estado,
    e.nombre AS estado_nombre,
    pg.cancelado,
    COUNT(p.id_pago) AS cantidad_pagos
FROM playa.pagares pg
LEFT JOIN playa.estados e ON pg.id_estado = e.id_estado
LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
WHERE (pg.saldo_pendiente = 0 OR pg.saldo_pendiente IS NULL)
GROUP BY pg.id_pagare, pg.numero_pagare, pg.numero_cuota, pg.monto_cuota, 
         pg.saldo_pendiente, pg.id_estado, e.nombre, pg.cancelado
HAVING COUNT(p.id_pago) = 0
LIMIT 10;
