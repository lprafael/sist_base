-- ============================================================
-- FIX: Actualizar funciones de triggers para usar schema playa.
-- Las funciones actuales referencian tablas sin el prefijo playa.
-- lo que causa "no existe la relación «ventas»" al insertar pagos.
-- ============================================================

-- 1. Eliminar triggers antes de recrear funciones
DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON playa.pagos;
DROP TRIGGER IF EXISTS trg_actualizar_calificacion_cliente ON playa.pagos;

-- 2. Recrear función actualizar_estado_pagare con schema completo
CREATE OR REPLACE FUNCTION playa.actualizar_estado_pagare()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado_monto DECIMAL(15,2);
    monto_pagare_monto DECIMAL(15,2);
BEGIN
    SELECT monto_cuota INTO monto_pagare_monto
    FROM playa.pagares
    WHERE id_pagare = NEW.id_pagare;
    
    SELECT COALESCE(SUM(monto_pagado), 0) INTO total_pagado_monto
    FROM playa.pagos
    WHERE id_pagare = NEW.id_pagare;
    
    IF total_pagado_monto >= monto_pagare_monto THEN
        UPDATE playa.pagares 
        SET estado = 'PAGADO', saldo_pendiente = 0
        WHERE id_pagare = NEW.id_pagare;
    ELSE
        UPDATE playa.pagares 
        SET estado = 'PARCIAL', saldo_pendiente = monto_pagare_monto - total_pagado_monto
        WHERE id_pagare = NEW.id_pagare;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recrear función actualizar_calificacion_cliente con schema completo
CREATE OR REPLACE FUNCTION playa.actualizar_calificacion_cliente()
RETURNS TRIGGER AS $$
DECLARE
    nueva_calif VARCHAR(50);
    calif_anterior VARCHAR(50);
    id_cli_actual INTEGER;
BEGIN
    SELECT v.id_cliente, c.calificacion_actual 
    INTO id_cli_actual, calif_anterior
    FROM playa.ventas v
    INNER JOIN playa.clientes c ON v.id_cliente = c.id_cliente
    INNER JOIN playa.pagares pg ON v.id_venta = pg.id_venta
    WHERE pg.id_pagare = NEW.id_pagare;
    
    nueva_calif := playa.obtener_calificacion(NEW.dias_atraso);
    
    IF nueva_calif != calif_anterior THEN
        UPDATE playa.clientes 
        SET calificacion_actual = nueva_calif
        WHERE id_cliente = id_cli_actual;
        
        INSERT INTO playa.historial_calificaciones 
        (id_cliente, id_venta, id_pago, calificacion_anterior, calificacion_nueva, motivo)
        VALUES 
        (id_cli_actual, 
         (SELECT id_venta FROM playa.pagares WHERE id_pagare = NEW.id_pagare),
         NEW.id_pago,
         calif_anterior,
         nueva_calif,
         'Pago registrado con ' || NEW.dias_atraso || ' días de atraso');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recrear la función obtener_calificacion también con schema completo (por si acaso)
CREATE OR REPLACE FUNCTION playa.obtener_calificacion(dias_atraso_int INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    calificacion_resultado VARCHAR(50);
BEGIN
    SELECT calificacion INTO calificacion_resultado
    FROM playa.config_calificaciones
    WHERE dias_atraso_int BETWEEN dias_atraso_desde AND COALESCE(dias_atraso_hasta, 999999)
    AND activo = TRUE
    LIMIT 1;
    
    RETURN COALESCE(calificacion_resultado, 'SIN CALIFICAR');
END;
$$ LANGUAGE plpgsql;

-- 5. Recrear triggers apuntando a las nuevas funciones con schema
CREATE TRIGGER trg_actualizar_estado_pagare
AFTER INSERT ON playa.pagos
FOR EACH ROW
EXECUTE FUNCTION playa.actualizar_estado_pagare();

CREATE TRIGGER trg_actualizar_calificacion_cliente
AFTER INSERT ON playa.pagos
FOR EACH ROW
EXECUTE FUNCTION playa.actualizar_calificacion_cliente();

-- 6. Verificar que los triggers existen y están activos
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
