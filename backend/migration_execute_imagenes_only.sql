-- Ejecutar solo la migración de imagenes_productos.
-- Requiere: migracion.st_productos ya cargada (desde dbo.Productos) y playa.productos poblada.
SET search_path TO playa, public, migracion;

TRUNCATE playa.imagenes_productos RESTART IDENTITY CASCADE;

-- Imagen principal
INSERT INTO playa.imagenes_productos (id_producto, imagen, es_principal, orden)
SELECT p.id_producto, s.proimagen, TRUE, 0
FROM migracion.st_productos s
JOIN playa.productos p ON p.codigo_interno = TRIM(s.procodigo)
WHERE s.proimagen IS NOT NULL;

-- Imágenes secundarias
INSERT INTO playa.imagenes_productos (id_producto, imagen, es_principal, orden)
SELECT p.id_producto, img, FALSE, ord
FROM migracion.st_productos s
JOIN playa.productos p ON p.codigo_interno = TRIM(s.procodigo)
CROSS JOIN LATERAL (
    VALUES 
        (s.proimagen1, 1),
        (s.proimagen2, 2),
        (s.proimagen3, 3),
        (s.proimagen4, 4),
        (s.proimagen5, 5),
        (s.proimagen6, 6)
) as t(img, ord)
WHERE img IS NOT NULL;
