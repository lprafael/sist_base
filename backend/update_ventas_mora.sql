-- Agregar columnas de mora a la tabla ventas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'ventas' AND column_name = 'periodo_int_mora') THEN
        ALTER TABLE playa.ventas ADD COLUMN periodo_int_mora VARCHAR(1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'ventas' AND column_name = 'monto_int_mora') THEN
        ALTER TABLE playa.ventas ADD COLUMN monto_int_mora DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;
