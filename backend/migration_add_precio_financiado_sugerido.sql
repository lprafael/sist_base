-- Migración para agregar precio_financiado_sugerido a productos
ALTER TABLE playa.productos ADD COLUMN IF NOT EXISTS precio_financiado_sugerido DECIMAL(15, 2);
