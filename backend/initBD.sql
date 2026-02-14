-- ============================================
-- SISTEMA DE GESTIÓN PARA PLAYA DE VEHÍCULOS
-- Base de Datos PostgreSQL - Schema: playa
-- ============================================

-- Crear schema si no existe
CREATE SCHEMA IF NOT EXISTS playa;

-- Extensiones útiles (usualmente en public)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurar el path para que todo se cree en 'playa' por defecto
SET search_path TO playa, public;

-- ============================================
-- TABLA: CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(20) NOT NULL, -- CI, RUC, Pasaporte
    numero_documento VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(50),
    celular VARCHAR(50),
    email VARCHAR(100),
    direccion TEXT,
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    codigo_postal VARCHAR(20),
    estado_civil VARCHAR(50),
    profesion VARCHAR(100),
    lugar_trabajo VARCHAR(200),
    telefono_trabajo VARCHAR(50),
    antiguedad_laboral VARCHAR(20),
    direccion_laboral TEXT,
    ingreso_mensual DECIMAL(15,2),
    calificacion_actual VARCHAR(20) DEFAULT 'NUEVO', -- NUEVO, EXCELENTE, BUENO, REGULAR, MALO
    fecha_calificacion DATE,
    mora_acumulada DECIMAL(15,2) DEFAULT 0,
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: GARANTES
-- ============================================
CREATE TABLE IF NOT EXISTS garantes (
    id_garante SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes(id_cliente),
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(50),
    celular VARCHAR(50),
    email VARCHAR(100),
    direccion TEXT,
    ciudad VARCHAR(100),
    estado_civil VARCHAR(50),
    relacion_cliente VARCHAR(100), -- Familiar, Amigo, Conocido
    lugar_trabajo VARCHAR(200),
    telefono_trabajo VARCHAR(50),
    antiguedad_laboral VARCHAR(20),
    direccion_laboral TEXT,
    ingreso_mensual DECIMAL(15,2),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: DOCUMENTOS INFORCONF (Historial)
-- ============================================
CREATE TABLE IF NOT EXISTS documentos_inforconf (
    id_documento SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes(id_cliente),
    fecha_consulta DATE NOT NULL,
    calificacion VARCHAR(50),
    score INTEGER,
    archivo_pdf BYTEA, -- Almacena el PDF
    ruta_archivo VARCHAR(500), -- O ruta si prefieres guardar en filesystem
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: CATEGORÍAS DE VEHÍCULOS
-- ============================================
CREATE TABLE IF NOT EXISTS categorias_vehiculos (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- ============================================
-- TABLA: PRODUCTOS (VEHÍCULOS)
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
    id_producto SERIAL PRIMARY KEY,
    id_categoria INTEGER REFERENCES categorias_vehiculos(id_categoria),
    codigo_interno VARCHAR(50) UNIQUE,
    tipo_vehiculo VARCHAR(50), -- Auto, Camioneta, Moto, etc
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    año INTEGER,
    color VARCHAR(50),
    chasis VARCHAR(100) UNIQUE,
    motor VARCHAR(100),
    kilometraje INTEGER,
    combustible VARCHAR(50), -- Nafta, Diesel, Eléctrico, Híbrido
    transmision VARCHAR(50), -- Manual, Automática
    numero_puertas INTEGER,
    capacidad_pasajeros INTEGER,
    estado VARCHAR(50), -- Nuevo, Usado, Seminuevo
    procedencia VARCHAR(100), -- Nacional, Importado
    ubicacion_actual VARCHAR(200),
    costo_base DECIMAL(15,2) NOT NULL,
    precio_contado_sugerido DECIMAL(15,2),
    precio_financiado_sugerido DECIMAL(15,2),
    precio_venta_minimo DECIMAL(15,2),
    estado_disponibilidad VARCHAR(50) DEFAULT 'DISPONIBLE', -- DISPONIBLE, RESERVADO, VENDIDO, EN_REPARACION
    observaciones TEXT,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: TIPOS DE GASTOS DE PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS tipos_gastos_productos (
    id_tipo_gasto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE, -- Flete, Chapería, Cambio Volante, Cubiertas, Baterías, etc
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: GASTOS DE PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS gastos_productos (
    id_gasto_producto SERIAL PRIMARY KEY,
    id_producto INTEGER REFERENCES productos(id_producto),
    id_tipo_gasto INTEGER REFERENCES tipos_gastos_productos(id_tipo_gasto),
    descripcion TEXT,
    monto DECIMAL(15,2) NOT NULL,
    fecha_gasto DATE NOT NULL,
    proveedor VARCHAR(200),
    numero_factura VARCHAR(100),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: TIPOS DE GASTOS DE EMPRESA
-- ============================================
CREATE TABLE IF NOT EXISTS tipos_gastos_empresa (
    id_tipo_gasto_empresa SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE, -- Alquiler, Internet, Personal, Agua, Energía, etc
    descripcion TEXT,
    es_fijo BOOLEAN DEFAULT FALSE, -- Si es un gasto fijo mensual
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: GASTOS DE EMPRESA
-- ============================================
CREATE TABLE IF NOT EXISTS gastos_empresa (
    id_gasto_empresa SERIAL PRIMARY KEY,
    id_tipo_gasto_empresa INTEGER REFERENCES tipos_gastos_empresa(id_tipo_gasto_empresa),
    descripcion TEXT,
    monto DECIMAL(15,2) NOT NULL,
    fecha_gasto DATE NOT NULL,
    periodo VARCHAR(50), -- Enero 2024, Febrero 2024, etc
    proveedor VARCHAR(200),
    numero_factura VARCHAR(100),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: VENDEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS vendedores (
    id_vendedor SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(50),
    email VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: VENTAS
-- ============================================
CREATE TABLE IF NOT EXISTS ventas (
    id_venta SERIAL PRIMARY KEY,
    numero_venta VARCHAR(50) UNIQUE NOT NULL,
    id_cliente INTEGER REFERENCES clientes(id_cliente),
    id_producto INTEGER REFERENCES productos(id_producto),
    fecha_venta DATE NOT NULL,
    tipo_venta VARCHAR(50) NOT NULL, -- CONTADO, FINANCIADO
    precio_venta DECIMAL(15,2) NOT NULL,
    descuento DECIMAL(15,2) DEFAULT 0,
    precio_final DECIMAL(15,2) NOT NULL,
    
    -- Datos de financiación
    entrega_inicial DECIMAL(15,2) DEFAULT 0,
    saldo_financiar DECIMAL(15,2),
    cantidad_cuotas INTEGER,
    monto_cuota DECIMAL(15,2),
    tasa_interes DECIMAL(5,2), -- Porcentaje
    
    -- Refuerzos
    tiene_refuerzos BOOLEAN DEFAULT FALSE,
    periodicidad_refuerzos VARCHAR(50), -- ANUAL, SEMESTRAL, TRIMESTRAL
    monto_refuerzo DECIMAL(15,2),
    cantidad_refuerzos INTEGER DEFAULT 0,
    
    -- Configuración de Mora
    periodo_int_mora VARCHAR(1), -- D, S, M, A (Diario, Semanal, Mensual, Anual)
    monto_int_mora DECIMAL(15,2) DEFAULT 0,
    
    estado_venta VARCHAR(50) DEFAULT 'ACTIVA', -- ACTIVA, FINALIZADA, CANCELADA
    id_vendedor INTEGER REFERENCES vendedores(id_vendedor),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: DETALLE DE VENTA
-- ============================================
CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta SERIAL PRIMARY KEY,
    id_venta INTEGER REFERENCES ventas(id_venta) ON DELETE CASCADE,
    concepto VARCHAR(100) NOT NULL, -- Entrega Inicial, Cuotas, Refuerzos
    monto_unitario DECIMAL(15,2) NOT NULL,
    cantidad INTEGER DEFAULT 1,
    subtotal DECIMAL(15,2) NOT NULL,
    observaciones TEXT
);

-- ============================================
-- TABLA: CONTRATOS DE VENTA
-- ============================================
CREATE TABLE IF NOT EXISTS contratos_venta (
    id_contrato SERIAL PRIMARY KEY,
    id_venta INTEGER REFERENCES ventas(id_venta),
    numero_contrato VARCHAR(50) UNIQUE NOT NULL,
    fecha_contrato DATE NOT NULL,
    contenido_contrato TEXT,
    archivo_pdf BYTEA, -- Almacena el PDF del contrato
    ruta_archivo VARCHAR(500),
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma DATE,
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: PAGARÉS
-- ============================================
CREATE TABLE IF NOT EXISTS pagares (
    id_pagare SERIAL PRIMARY KEY,
    id_venta INTEGER REFERENCES ventas(id_venta),
    numero_pagare VARCHAR(50) UNIQUE NOT NULL,
    numero_cuota INTEGER NOT NULL,
    monto_cuota DECIMAL(15,2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    tipo_pagare VARCHAR(50) DEFAULT 'CUOTA', -- CUOTA, REFUERZO, ENTREGA_INICIAL
    estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO, VENCIDO, PARCIAL
    saldo_pendiente DECIMAL(15,2),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: PAGOS DE CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS pagos (
    id_pago SERIAL PRIMARY KEY,
    id_pagare INTEGER REFERENCES pagares(id_pagare),
    id_venta INTEGER REFERENCES ventas(id_venta),
    numero_recibo VARCHAR(50) UNIQUE NOT NULL,
    fecha_pago DATE NOT NULL,
    monto_pagado DECIMAL(15,2) NOT NULL,
    forma_pago VARCHAR(50), -- EFECTIVO, TRANSFERENCIA, CHEQUE, TARJETA
    numero_referencia VARCHAR(100), -- Número de transferencia, cheque, etc
    dias_atraso INTEGER DEFAULT 0,
    mora_aplicada DECIMAL(15,2) DEFAULT 0,
    descuento_aplicado DECIMAL(15,2) DEFAULT 0,
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: REFERENCIAS (Unificada)
-- ============================================
CREATE TABLE IF NOT EXISTS referencias (
    id_referencia SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes(id_cliente),
    tipo_entidad VARCHAR(20) NOT NULL, -- CLIENTE, GARANTE
    tipo_referencia VARCHAR(20) NOT NULL, -- PERSONAL, LABORAL
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(100),
    parentesco_cargo VARCHAR(150),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: HISTORIAL DE CALIFICACIONES
-- ============================================
CREATE TABLE IF NOT EXISTS historial_calificaciones (
    id_historial SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes(id_cliente),
    id_venta INTEGER REFERENCES ventas(id_venta),
    id_pago INTEGER REFERENCES pagos(id_pago),
    calificacion_anterior VARCHAR(50),
    calificacion_nueva VARCHAR(50) NOT NULL,
    motivo TEXT,
    fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: CONFIGURACIÓN DE CALIFICACIONES
-- ============================================
CREATE TABLE IF NOT EXISTS config_calificaciones (
    id_config SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    dias_atraso_desde INTEGER NOT NULL,
    dias_atraso_hasta INTEGER,
    calificacion VARCHAR(50) NOT NULL, -- EXCELENTE, BUENO, REGULAR, MALO
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: REFUERZOS PROGRAMADOS
-- ============================================
CREATE TABLE IF NOT EXISTS refuerzos (
    id_refuerzo SERIAL PRIMARY KEY,
    id_venta INTEGER REFERENCES ventas(id_venta),
    numero_refuerzo INTEGER NOT NULL,
    monto_refuerzo DECIMAL(15,2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO, VENCIDO
    id_pagare INTEGER REFERENCES pagares(id_pagare), -- Vinculado al pagaré generado
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: IMÁGENES DE PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS imagenes_productos (
    id_imagen SERIAL PRIMARY KEY,
    id_producto INTEGER REFERENCES productos(id_producto),
    nombre_archivo VARCHAR(200),
    ruta_archivo VARCHAR(500),
    imagen BYTEA, -- O almacenar la imagen directamente
    es_principal BOOLEAN DEFAULT FALSE,
    orden INTEGER DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: DOCUMENTOS DE IMPORTACIÓN (Despacho + Certificados nacionalización)
-- ============================================
CREATE TABLE IF NOT EXISTS documentos_importacion (
    nro_despacho VARCHAR(100) PRIMARY KEY,
    fecha_despacho DATE,
    cantidad_vehiculos INTEGER,
    monto_pagado DECIMAL(15, 2),
    pdf_despacho BYTEA,
    pdf_certificados BYTEA,
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campos en productos para vincular con documento de importación y certificado de nacionalización
ALTER TABLE productos ADD COLUMN IF NOT EXISTS nro_despacho VARCHAR(100);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS nro_cert_nac VARCHAR(100);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_productos_nro_despacho'
          AND table_schema = 'playa' AND table_name = 'productos'
    ) THEN
        ALTER TABLE productos
        ADD CONSTRAINT fk_productos_nro_despacho
        FOREIGN KEY (nro_despacho) REFERENCES documentos_importacion(nro_despacho);
    END IF;
END $$;

-- ============================================
-- TABLA: USUARIOS (Nota: Redundante si se usa schema 'sistema')
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    rol VARCHAR(50) NOT NULL, -- ADMIN, VENDEDOR, CONTADOR, GERENTE
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP
);

-- ============================================
-- TABLA: AUDITORÍA (Nota: Redundante si se usa schema 'sistema')
-- ============================================
CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario),
    tabla_afectada VARCHAR(100),
    accion VARCHAR(50), -- INSERT, UPDATE, DELETE
    id_registro INTEGER,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================
-- Clientes: búsqueda por documento, listados por activo
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(numero_documento);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo) WHERE activo = TRUE;

-- Productos: chasis, filtros por disponibilidad y categoría (listado, stock, dashboard)
CREATE INDEX IF NOT EXISTS idx_productos_chasis ON productos(chasis);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado_disponibilidad);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_disponible_activo ON productos(estado_disponibilidad, activo) WHERE estado_disponibilidad = 'DISPONIBLE';
CREATE INDEX IF NOT EXISTS idx_productos_nro_despacho ON productos(nro_despacho);
CREATE INDEX IF NOT EXISTS idx_productos_nro_cert_nac ON productos(nro_cert_nac);

-- Ventas: listado ordenado por fecha_registro, filtros por estado (dashboard, reportes)
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON ventas(id_producto);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_registro ON ventas(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado_venta) WHERE estado_venta != 'ANULADA';

-- Detalle venta: JOIN venta -> detalles
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta(id_venta);

-- Pagarés: por venta, reportes mora/cobros (estado + vencimiento)
CREATE INDEX IF NOT EXISTS idx_pagares_venta ON pagares(id_venta);
CREATE INDEX IF NOT EXISTS idx_pagares_vencimiento ON pagares(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pagares_estado ON pagares(estado);
CREATE INDEX IF NOT EXISTS idx_pagares_estado_vencimiento ON pagares(estado, fecha_vencimiento) WHERE estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDO');

-- Pagos: por pagaré, por venta (verificación antes anular), por fecha
CREATE INDEX IF NOT EXISTS idx_pagos_pagare ON pagos(id_pagare);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(id_venta);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);

-- Garantes y referencias: cliente full (garantes por cliente, referencias por entidad)
CREATE INDEX IF NOT EXISTS idx_garantes_cliente ON garantes(id_cliente);
CREATE INDEX IF NOT EXISTS idx_referencias_cliente ON referencias(id_cliente);
CREATE INDEX IF NOT EXISTS idx_referencias_tipo_entidad ON referencias(tipo_entidad, id_cliente);

-- Config calificaciones: función obtener_calificacion (activo + rango dias_atraso)
CREATE INDEX IF NOT EXISTS idx_config_calif_activo_dias ON config_calificaciones(activo, dias_atraso_desde) WHERE activo = TRUE;

-- Gastos: por producto, por tipo (uso antes de eliminar tipo)
CREATE INDEX IF NOT EXISTS idx_gastos_productos ON gastos_productos(id_producto);
CREATE INDEX IF NOT EXISTS idx_gastos_productos_tipo ON gastos_productos(id_tipo_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_productos_fecha ON gastos_productos(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_fecha ON gastos_empresa(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_tipo ON gastos_empresa(id_tipo_gasto_empresa);

-- Imágenes productos: por producto
CREATE INDEX IF NOT EXISTS idx_imagenes_productos_producto ON imagenes_productos(id_producto);

-- ============================================
-- DATOS INICIALES (INSERT solo si no existe por nombre, evita depender de UNIQUE)
-- ============================================
INSERT INTO config_calificaciones (nombre, dias_atraso_desde, dias_atraso_hasta, calificacion, descripcion)
SELECT * FROM (VALUES
  ('Pago Anticipado', -999, -1, 'EXCELENTE', 'Cliente paga antes del vencimiento'),
  ('Pago Puntual', 0, 0, 'EXCELENTE', 'Cliente paga en fecha exacta'),
  ('Atraso Leve', 1, 30, 'BUENO', 'Cliente paga con hasta 30 días de atraso'),
  ('Atraso Moderado', 31, 60, 'REGULAR', 'Cliente paga con 31 a 60 días de atraso'),
  ('Atraso Grave', 61, 999, 'MALO', 'Cliente paga con más de 60 días de atraso')
) AS v(nombre, dias_atraso_desde, dias_atraso_hasta, calificacion, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM config_calificaciones c WHERE c.nombre = v.nombre);

INSERT INTO tipos_gastos_productos (nombre, descripcion)
SELECT * FROM (VALUES
  ('Costo Vehículo', 'Costo de compra del vehículo'),
  ('Flete', 'Costo de transporte del vehículo'),
  ('Gastos de Compra', 'Gastos administrativos de compra'),
  ('Chapería', 'Trabajos de chapería y pintura'),
  ('Cambio de Volante', 'Cambio de volante (izquierda/derecha)'),
  ('Cubiertas', 'Compra e instalación de neumáticos'),
  ('Baterías', 'Compra e instalación de batería'),
  ('Mecánica General', 'Reparaciones mecánicas'),
  ('Documentación', 'Gastos de documentación y transferencia'),
  ('Limpieza y Detailing', 'Limpieza profunda y detallado')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM tipos_gastos_productos t WHERE t.nombre = v.nombre);

INSERT INTO tipos_gastos_empresa (nombre, descripcion, es_fijo)
SELECT * FROM (VALUES
  ('Alquiler de Local', 'Alquiler mensual del local', TRUE),
  ('Internet', 'Servicio de internet', TRUE),
  ('Energía Eléctrica', 'Consumo de energía eléctrica', TRUE),
  ('Agua', 'Consumo de agua', TRUE),
  ('Salarios Personal', 'Sueldos del personal', TRUE),
  ('Publicidad', 'Gastos de marketing y publicidad', FALSE),
  ('Mantenimiento', 'Mantenimiento del local', FALSE),
  ('Seguros', 'Seguros varios', TRUE),
  ('Impuestos', 'Impuestos municipales y otros', FALSE),
  ('Materiales de Oficina', 'Papelería y materiales', FALSE)
) AS v(nombre, descripcion, es_fijo)
WHERE NOT EXISTS (SELECT 1 FROM tipos_gastos_empresa t WHERE t.nombre = v.nombre);

INSERT INTO categorias_vehiculos (nombre, descripcion)
SELECT * FROM (VALUES
  ('Automóviles', 'Vehículos de pasajeros tipo sedán'),
  ('Camionetas', 'Camionetas y pick-ups'),
  ('SUV', 'Vehículos utilitarios deportivos'),
  ('Motos', 'Motocicletas'),
  ('Utilitarios', 'Vehículos utilitarios y comerciales'),
  ('Deportivos', 'Vehículos deportivos')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM categorias_vehiculos c WHERE c.nombre = v.nombre);

-- ============================================
-- VISTAS ÚTILES
-- ============================================
-- Eliminar vistas antes de recrear (permite cambiar nombres de columnas)
DROP VIEW IF EXISTS playa.v_costo_total_productos CASCADE;
DROP VIEW IF EXISTS playa.v_estado_pagos_ventas CASCADE;
DROP VIEW IF EXISTS playa.v_proximos_vencimientos CASCADE;

CREATE OR REPLACE VIEW v_costo_total_productos AS
SELECT 
    p.id_producto,
    p.codigo_interno,
    p.marca,
    p.modelo,
    p.año,
    p.costo_base,
    COALESCE(SUM(gp.monto), 0) as total_gastos,
    p.costo_base + COALESCE(SUM(gp.monto), 0) as costo_total,
    p.precio_contado_sugerido,
    p.precio_contado_sugerido - (p.costo_base + COALESCE(SUM(gp.monto), 0)) as utilidad_estimada
FROM productos p
LEFT JOIN gastos_productos gp ON p.id_producto = gp.id_producto
GROUP BY p.id_producto, p.codigo_interno, p.marca, p.modelo, p.año, p.costo_base, p.precio_contado_sugerido;

CREATE OR REPLACE VIEW v_estado_pagos_ventas AS
SELECT 
    v.id_venta,
    v.numero_venta,
    c.nombre || ' ' || c.apellido as cliente,
    v.precio_final,
    v.entrega_inicial,
    v.saldo_financiar,
    COUNT(pg.id_pagare) as total_cuotas,
    COUNT(CASE WHEN pg.estado = 'PAGADO' THEN 1 END) as cuotas_pagadas,
    COUNT(CASE WHEN pg.estado = 'PENDIENTE' THEN 1 END) as cuotas_pendientes,
    COUNT(CASE WHEN pg.estado = 'VENCIDO' THEN 1 END) as cuotas_vencidas,
    COALESCE(SUM(p.monto_pagado), 0) as total_pagado,
    v.saldo_financiar - COALESCE(SUM(p.monto_pagado), 0) as saldo_pendiente
FROM ventas v
INNER JOIN clientes c ON v.id_cliente = c.id_cliente
LEFT JOIN pagares pg ON v.id_venta = pg.id_venta
LEFT JOIN pagos p ON pg.id_pagare = p.id_pagare
WHERE v.tipo_venta = 'FINANCIADO'
GROUP BY v.id_venta, c.nombre, c.apellido, v.numero_venta, v.precio_final, v.entrega_inicial, v.saldo_financiar;

CREATE OR REPLACE VIEW v_proximos_vencimientos AS
SELECT 
    pg.id_pagare,
    pg.numero_pagare,
    v.numero_venta,
    c.nombre || ' ' || c.apellido as cliente,
    c.celular,
    pg.monto_cuota,
    pg.fecha_vencimiento,
    pg.estado,
    CURRENT_DATE - pg.fecha_vencimiento as dias_atraso,
    CASE 
        WHEN pg.fecha_vencimiento > CURRENT_DATE THEN 'POR VENCER'
        WHEN pg.fecha_vencimiento = CURRENT_DATE THEN 'VENCE HOY'
        ELSE 'VENCIDO'
    END as situacion
FROM pagares pg
INNER JOIN ventas v ON pg.id_venta = v.id_venta
INNER JOIN clientes c ON v.id_cliente = c.id_cliente
WHERE pg.estado IN ('PENDIENTE', 'VENCIDO')
ORDER BY pg.fecha_vencimiento;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION calcular_dias_atraso(fecha_vencimiento DATE, fecha_pago DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN GREATEST(0, fecha_pago - fecha_vencimiento);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION obtener_calificacion(dias_atraso_int INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    calificacion_resultado VARCHAR(50);
BEGIN
    SELECT calificacion INTO calificacion_resultado
    FROM config_calificaciones
    WHERE dias_atraso_int BETWEEN dias_atraso_desde AND COALESCE(dias_atraso_hasta, 999999)
    AND activo = TRUE
    LIMIT 1;
    
    RETURN COALESCE(calificacion_resultado, 'SIN CALIFICAR');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION actualizar_estado_pagare()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado_monto DECIMAL(15,2);
    monto_pagare_monto DECIMAL(15,2);
BEGIN
    SELECT monto_cuota INTO monto_pagare_monto
    FROM pagares
    WHERE id_pagare = NEW.id_pagare;
    
    SELECT COALESCE(SUM(monto_pagado), 0) INTO total_pagado_monto
    FROM pagos
    WHERE id_pagare = NEW.id_pagare;
    
    IF total_pagado_monto >= monto_pagare_monto THEN
        UPDATE pagares 
        SET estado = 'PAGADO', saldo_pendiente = 0
        WHERE id_pagare = NEW.id_pagare;
    ELSE
        UPDATE pagares 
        SET estado = 'PARCIAL', saldo_pendiente = monto_pagare_monto - total_pagado_monto
        WHERE id_pagare = NEW.id_pagare;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON pagos;
CREATE TRIGGER trg_actualizar_estado_pagare
AFTER INSERT ON pagos
FOR EACH ROW
EXECUTE FUNCTION actualizar_estado_pagare();

CREATE OR REPLACE FUNCTION actualizar_calificacion_cliente()
RETURNS TRIGGER AS $$
DECLARE
    nueva_calif VARCHAR(50);
    calif_anterior VARCHAR(50);
    id_cli_actual INTEGER;
BEGIN
    SELECT v.id_cliente, c.calificacion_actual 
    INTO id_cli_actual, calif_anterior
    FROM ventas v
    INNER JOIN clientes c ON v.id_cliente = c.id_cliente
    INNER JOIN pagares pg ON v.id_venta = pg.id_venta
    WHERE pg.id_pagare = NEW.id_pagare;
    
    nueva_calif := obtener_calificacion(NEW.dias_atraso);
    
    IF nueva_calif != calif_anterior THEN
        UPDATE clientes 
        SET calificacion_actual = nueva_calif
        WHERE id_cliente = id_cli_actual;
        
        INSERT INTO historial_calificaciones 
        (id_cliente, id_venta, id_pago, calificacion_anterior, calificacion_nueva, motivo)
        VALUES 
        (id_cli_actual, 
         (SELECT id_venta FROM pagares WHERE id_pagare = NEW.id_pagare),
         NEW.id_pago,
         calif_anterior,
         nueva_calif,
         'Pago registrado con ' || NEW.dias_atraso || ' días de atraso');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_calificacion_cliente ON pagos;
CREATE TRIGGER trg_actualizar_calificacion_cliente
AFTER INSERT ON pagos
FOR EACH ROW
EXECUTE FUNCTION actualizar_calificacion_cliente();