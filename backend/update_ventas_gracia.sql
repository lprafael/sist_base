-- Migración para agregar dias_gracia a ventas
ALTER TABLE playa.ventas ADD COLUMN IF NOT EXISTS dias_gracia INTEGER DEFAULT 0;
