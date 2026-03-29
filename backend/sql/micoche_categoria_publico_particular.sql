-- MiCoche: categoría global para particulares y alineación de FK en productos
-- Ejecutar una vez contra la base del proyecto (PostgreSQL).

-- 1) Permitir productos sin categoría de playa (histórico / casos especiales)
ALTER TABLE playa.productos
    ALTER COLUMN id_categoria DROP NOT NULL;

-- 2) Categoría compartida (id_playa NULL) para publicaciones de particulares en MiCoche
-- Evitar duplicado: ejecutar solo si no existe ya la categoría global.
INSERT INTO playa.categorias_vehiculos (nombre, descripcion, id_playa)
SELECT 'Público/Particular', 'Vehículos publicados por particulares en MiCoche (sin playa)', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM playa.categorias_vehiculos c
    WHERE c.nombre = 'Público/Particular' AND c.id_playa IS NULL
);

-- El backend también hace get_or_create por si este INSERT no se ejecutó.
