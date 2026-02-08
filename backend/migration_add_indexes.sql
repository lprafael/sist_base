-- ============================================
-- Migración: índices adicionales para rendimiento
-- Schema: playa
-- Aplicar sobre una BD ya existente (solo crea índices nuevos).
-- ============================================
-- Cómo aplicar (el contenedor backend no incluye psql):
--   docker compose exec backend python run_migration_indexes.py
-- O desde la PC:  cd backend && python run_migration_indexes.py
-- ============================================

SET search_path TO playa, public;

-- Clientes: listados por activo
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON playa.clientes(activo) WHERE activo = TRUE;

-- Productos: categoría y filtro stock disponible
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON playa.productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_disponible_activo ON playa.productos(estado_disponibilidad, activo) WHERE estado_disponibilidad = 'DISPONIBLE';

-- Ventas: orden listado y filtro dashboard/reportes
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_registro ON playa.ventas(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON playa.ventas(estado_venta) WHERE estado_venta != 'ANULADA';

-- Detalle venta: JOIN venta -> detalles
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON playa.detalle_venta(id_venta);

-- Pagarés: reportes mora/cobros (estado + vencimiento)
CREATE INDEX IF NOT EXISTS idx_pagares_estado_vencimiento ON playa.pagares(estado, fecha_vencimiento) WHERE estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDO');

-- Pagos: verificación por venta (ej. antes de anular)
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON playa.pagos(id_venta);

-- Garantes y referencias: cliente full
CREATE INDEX IF NOT EXISTS idx_garantes_cliente ON playa.garantes(id_cliente);
CREATE INDEX IF NOT EXISTS idx_referencias_cliente ON playa.referencias(id_cliente);
CREATE INDEX IF NOT EXISTS idx_referencias_tipo_entidad ON playa.referencias(tipo_entidad, id_cliente);

-- Config calificaciones: función obtener_calificacion
CREATE INDEX IF NOT EXISTS idx_config_calif_activo_dias ON playa.config_calificaciones(activo, dias_atraso_desde) WHERE activo = TRUE;

-- Gastos: por tipo y por fecha
CREATE INDEX IF NOT EXISTS idx_gastos_productos_tipo ON playa.gastos_productos(id_tipo_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_productos_fecha ON playa.gastos_productos(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_tipo ON playa.gastos_empresa(id_tipo_gasto_empresa);

-- Imágenes productos: por producto
CREATE INDEX IF NOT EXISTS idx_imagenes_productos_producto ON playa.imagenes_productos(id_producto);
