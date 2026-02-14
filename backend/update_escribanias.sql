-- Crear tabla de escribanías
CREATE TABLE IF NOT EXISTS playa.escribanias (
    id_escribania SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    telefono VARCHAR(50),
    email VARCHAR(100),
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columnas a ventas si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'ventas' AND column_name = 'id_escribania') THEN
        ALTER TABLE playa.ventas ADD COLUMN id_escribania INTEGER REFERENCES playa.escribanias(id_escribania);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'ventas' AND column_name = 'tipo_documento_propiedad') THEN
        ALTER TABLE playa.ventas ADD COLUMN tipo_documento_propiedad VARCHAR(100);
    END IF;
END $$;
