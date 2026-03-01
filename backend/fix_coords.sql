-- Script para asignar coordenadas de centroides de distritos a los locales sin ubicación
-- Ejecutar dentro del contenedor: docker exec SIGEL-db psql -U postgres -d SIGEL -f /tmp/fix_coords.sql

-- Paso 1: Ver estado actual
SELECT 'Antes:' as estado, count(*) as total, count(geom_ubicacion) as con_coord 
FROM electoral.ref_locales;

-- Paso 2: Ver columnas disponibles en la tabla de distritos
SELECT column_name FROM information_schema.columns 
WHERE table_schema='cartografia' AND table_name='distritos' 
ORDER BY ordinal_position;

-- Paso 3: Ver cómo se ve la data (nombres)
SELECT "DIST_DESC_", "DPTO_DESC", dpto_id_ref 
FROM cartografia.distritos 
LIMIT 5;

-- Paso 4: Ver cómo se ven los distritos del padrón
SELECT descripcion, departamento_id, id 
FROM electoral.ref_distritos 
LIMIT 5;

-- Paso 5: Intentar el JOIN
UPDATE electoral.ref_locales l
SET 
    geom_ubicacion = sub.centroid,
    ubicacion = CAST(json_build_object(
        'lat', ST_Y(sub.centroid),
        'lng', ST_X(sub.centroid),
        'aprox', true,
        'fuente', 'centroide_distrito'
    ) AS jsonb)
FROM (
    SELECT 
        rd.departamento_id, 
        rd.id as distrito_id, 
        ST_Centroid(ST_Union(d.geometry)) as centroid
    FROM cartografia.distritos d
    JOIN electoral.ref_distritos rd 
        ON TRIM(UPPER(d."DIST_DESC_")) = TRIM(rd.descripcion)
    GROUP BY rd.departamento_id, rd.id
) sub
WHERE l.departamento_id = sub.departamento_id 
AND l.distrito_id = sub.distrito_id 
AND l.geom_ubicacion IS NULL;

-- Paso 6: Para los que aún faltan, usar centroide del departamento
UPDATE electoral.ref_locales l
SET 
    geom_ubicacion = sub.centroid,
    ubicacion = CAST(json_build_object(
        'lat', ST_Y(sub.centroid),
        'lng', ST_X(sub.centroid),
        'aprox', true,
        'fuente', 'centroide_departamento'
    ) AS jsonb)
FROM (
    SELECT 
        dep.id as departamento_id, 
        ST_Centroid(ST_Union(d.geometry)) as centroid
    FROM cartografia.departamentos d
    JOIN electoral.ref_departamentos dep 
        ON TRIM(UPPER(d."DPTO_DESC")) = TRIM(dep.descripcion)
    GROUP BY dep.id
) sub
WHERE l.departamento_id = sub.departamento_id 
AND l.geom_ubicacion IS NULL;

-- Paso 7: Estado final
SELECT 'Despues:' as estado, count(*) as total, count(geom_ubicacion) as con_coord 
FROM electoral.ref_locales;

-- Por departamento
SELECT dep.descripcion, count(*) as total, count(l.geom_ubicacion) as con_coord 
FROM electoral.ref_locales l 
JOIN electoral.ref_departamentos dep ON l.departamento_id = dep.id 
GROUP BY dep.descripcion 
ORDER BY total DESC;
