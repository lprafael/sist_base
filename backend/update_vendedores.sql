-- Crear tabla de vendedores
CREATE TABLE IF NOT EXISTS playa.vendedores (
    id_vendedor SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(50),
    email VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columna FK a ventas si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'ventas' AND column_name = 'id_vendedor') THEN
        ALTER TABLE playa.ventas ADD COLUMN id_vendedor INTEGER REFERENCES playa.vendedores(id_vendedor);
    END IF;
END $$;
