-- ======================================================
-- MIGRACION: CREACION DE INDICES ADICIONALES (V2)
-- Objetivo: Indexar todas las Claves Foraneas (FK) no indexadas
-- ======================================================

DO $$
BEGIN
    -- Productos: id_categoria (JOINs frecuentes)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_productos_id_categoria') THEN
        CREATE INDEX idx_productos_id_categoria ON playa.productos (id_categoria);
    END IF;

    -- Ubicaciones y Garantes: id_cliente
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ubicaciones_id_cliente') THEN
        CREATE INDEX idx_ubicaciones_id_cliente ON playa.ubicaciones_cliente (id_cliente);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_garantes_id_cliente') THEN
        CREATE INDEX idx_garantes_id_cliente ON playa.garantes (id_cliente);
    END IF;

    -- Ventas: FKs criticas
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ventas_id_cliente') THEN
        CREATE INDEX idx_ventas_id_cliente ON playa.ventas (id_cliente);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ventas_id_producto') THEN
        CREATE INDEX idx_ventas_id_producto ON playa.ventas (id_producto);
    END IF;

    -- Pagares: id_venta
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pagares_id_venta') THEN
        CREATE INDEX idx_pagares_id_venta ON playa.pagares (id_venta);
    END IF;

    -- Pagos: FKs criticas
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pagos_id_pagare') THEN
        CREATE INDEX idx_pagos_id_pagare ON playa.pagos (id_pagare);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pagos_id_venta') THEN
        CREATE INDEX idx_pagos_id_venta ON playa.pagos (id_venta);
    END IF;

    -- Imagenes: id_producto (Carga de galerias)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_imagenes_productos_id_producto') THEN
        CREATE INDEX idx_imagenes_productos_id_producto ON playa.imagenes_productos (id_producto);
    END IF;

    -- Detalle Venta: id_venta
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_detalle_venta_id_venta') THEN
        CREATE INDEX idx_detalle_venta_id_venta ON playa.detalle_venta (id_venta);
    END IF;

    -- Refuerzos: id_venta
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refuerzos_id_venta') THEN
        CREATE INDEX idx_refuerzos_id_venta ON playa.refuerzos (id_venta);
    END IF;

    -- Gastos: id_producto
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_gastos_productos_id_prod') THEN
        CREATE INDEX idx_gastos_productos_id_prod ON playa.gastos_productos (id_producto);
    END IF;

    -- Movimientos: Fechas y Cuentas (ya habia algunos, aseguramos completos)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_movimientos_fecha_asc') THEN
        CREATE INDEX idx_movimientos_fecha_asc ON playa.movimientos (fecha ASC);
    END IF;

END $$;
