-- Migración: Documentos de Importación (Playa de Vehículos)
-- Tabla para almacenar documento de despacho y certificados de nacionalización por número de despacho.
-- Campos nuevos en productos: nro_despacho, nro_cert_nac.

SET search_path TO playa, public;

-- Tabla documentos_importacion (PK = número de despacho)
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
ALTER TABLE playa.productos ADD COLUMN IF NOT EXISTS nro_despacho VARCHAR(100);
ALTER TABLE playa.productos ADD COLUMN IF NOT EXISTS nro_cert_nac VARCHAR(100);

-- FK: productos.nro_despacho -> documentos_importacion.nro_despacho
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_productos_nro_despacho'
          AND table_schema = 'playa' AND table_name = 'productos'
    ) THEN
        ALTER TABLE playa.productos
        ADD CONSTRAINT fk_productos_nro_despacho
        FOREIGN KEY (nro_despacho) REFERENCES playa.documentos_importacion(nro_despacho);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_productos_nro_despacho ON playa.productos(nro_despacho);
CREATE INDEX IF NOT EXISTS idx_productos_nro_cert_nac ON playa.productos(nro_cert_nac);
