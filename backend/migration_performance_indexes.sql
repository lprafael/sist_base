-- ======================================================
-- MIGRACION: CREACION DE INDICES PARA OPTIMIZACION
-- ======================================================

DO $$
BEGIN
    -- Clientes: optimizar busquedas por nombre y apellido
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clientes_nombre_apellido') THEN
        CREATE INDEX idx_clientes_nombre_apellido ON playa.clientes (nombre, apellido);
    END IF;

    -- Ventas: nuevos campos y filtros frecuentes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ventas_escribania') THEN
        CREATE INDEX idx_ventas_escribania ON playa.ventas (id_escribania);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ventas_vendedor') THEN
        CREATE INDEX idx_ventas_vendedor ON playa.ventas (id_vendedor);
    END IF;

    -- Pagares: optimizar estados y vencimientos
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pagares_id_estado') THEN
        CREATE INDEX idx_pagares_id_estado ON playa.pagares (id_estado);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pagares_venc_estado_comp') THEN
        CREATE INDEX idx_pagares_venc_estado_comp ON playa.pagares (fecha_vencimiento, id_estado);
    END IF;

    -- Pagos: optimizar arqueos por cuenta
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pagos_id_cuenta') THEN
        CREATE INDEX idx_pagos_id_cuenta ON playa.pagos (id_cuenta);
    END IF;

    -- Movimientos: optimizar flujo de caja
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_movimientos_cuentas_origen') THEN
        CREATE INDEX idx_movimientos_cuentas_origen ON playa.movimientos (id_cuenta_origen);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_movimientos_cuentas_destino') THEN
        CREATE INDEX idx_movimientos_cuentas_destino ON playa.movimientos (id_cuenta_destino);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_movimientos_fecha_v2') THEN
        CREATE INDEX idx_movimientos_fecha_v2 ON playa.movimientos (fecha DESC);
    END IF;
    
    -- Gastos: para reportes de rentabilidad por producto
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_gastos_productos_filtros') THEN
        CREATE INDEX idx_gastos_productos_filtros ON playa.gastos_productos (id_producto, fecha_gasto);
    END IF;

END $$;
