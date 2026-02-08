-- Migración para agregar entrega_inicial_sugerida a productos
ALTER TABLE playa.productos ADD COLUMN IF NOT EXISTS entrega_inicial_sugerida DECIMAL(15, 2);
