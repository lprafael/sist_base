-- 0. CONFIGURACIÓN DE ESQUEMA
SET search_path TO playa, public, migracion;

-- 1. MIGRAR CLIENTES
-- (Nota: Se eliminaron DO blocks para evitar problemas de compatibilidad en ejecución por lotes)

WITH ins AS (
    INSERT INTO playa.clientes (
        tipo_documento,
        numero_documento,
        nombre,
        apellido,
        fecha_nacimiento,
        telefono,
        email,
        direccion,
        estado_civil,
        lugar_trabajo,
        telefono_trabajo,
        antiguedad_laboral,
        direccion_laboral,
        calificacion_actual,
        mora_acumulada,
        fecha_calificacion,
        observaciones,
        fecha_registro,
        activo
    )
    SELECT
        detectar_tipo_documento(s.cliruc),
        NULLIF(TRIM(s.cliruc), ''),
        COALESCE(separar_nombre(NULLIF(TRIM(s.clinombre), '')), 'S/N'),
        COALESCE(separar_apellido(NULLIF(TRIM(s.clinombre), '')), 'S/A'),
        s.clifenac,
        NULLIF(TRIM(s.clitelef), ''),
        NULLIF(LOWER(TRIM(s.cliemail)), ''),
        NULLIF(TRIM(s.clidirecc), ''),
        mapear_estado_civil(s.cliasaco),
        NULLIF(TRIM(s.clilulab), ''),
        NULLIF(TRIM(s.clitellab), ''),
        NULLIF(TRIM(s.cliantlab), ''),
        NULLIF(TRIM(s.clidirlab), ''),
        mapear_calificacion(s.clicalif),
        COALESCE(s.climora, 0),
        s.clifecal,
        NULLIF(TRIM(s.cliobs), ''),
        COALESCE(s.cliusuf, CURRENT_TIMESTAMP),
        TRUE
    FROM migracion.staging_cliente s
    WHERE NULLIF(TRIM(s.cliruc), '') IS NOT NULL
    ON CONFLICT (numero_documento) DO NOTHING
    RETURNING id_cliente, numero_documento
)
INSERT INTO migracion.cliente_map (cliruc_original, id_cliente)
SELECT TRIM(numero_documento), id_cliente
FROM ins
ON CONFLICT (cliruc_original) DO NOTHING;

-- Asegurar que todos los clientes de staging estén en el mapa (incluyendo los ya existentes)
INSERT INTO migracion.cliente_map (cliruc_original, id_cliente)
SELECT TRIM(s.cliruc), c.id_cliente
FROM migracion.staging_cliente s
JOIN playa.clientes c ON c.numero_documento = TRIM(s.cliruc)
ON CONFLICT (cliruc_original) DO NOTHING;

-- 2. MIGRAR GARANTE #0
INSERT INTO playa.garantes (
    id_cliente,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    fecha_nacimiento,
    telefono,
    direccion,
    estado_civil,
    lugar_trabajo,
    telefono_trabajo,
    antiguedad_laboral,
    direccion_laboral,
    relacion_cliente,
    activo
)
SELECT
    m.id_cliente,
    detectar_tipo_documento(s.cigarante),
    NULLIF(TRIM(s.cigarante), ''),
    COALESCE(separar_nombre(NULLIF(TRIM(s.clinomga), '')), 'S/N'),
    COALESCE(separar_apellido(NULLIF(TRIM(s.clinomga), '')), 'S/A'),
    s.cligfecn,
    NULLIF(TRIM(s.cligatel), ''),
    NULLIF(TRIM(s.cligadirec), ''),
    mapear_estado_civil(s.cligaasc),
    NULLIF(TRIM(s.cligallab), ''),
    NULLIF(TRIM(s.cligart), ''),
    NULLIF(TRIM(s.cligaant), ''),
    NULLIF(TRIM(s.cligadlab), ''),
    'GARANTE 1',
    TRUE
FROM migracion.staging_cliente s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.cigarante), '') IS NOT NULL;

-- 3. MIGRAR GARANTE #1
INSERT INTO playa.garantes (
    id_cliente,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    fecha_nacimiento,
    telefono,
    direccion,
    estado_civil,
    lugar_trabajo,
    telefono_trabajo,
    antiguedad_laboral,
    direccion_laboral,
    relacion_cliente,
    activo
)
SELECT
    m.id_cliente,
    detectar_tipo_documento(s.cigarante1),
    NULLIF(TRIM(s.cigarante1), ''),
    COALESCE(separar_nombre(NULLIF(TRIM(s.clinomga1), '')), 'S/N'),
    COALESCE(separar_apellido(NULLIF(TRIM(s.clinomga1), '')), 'S/A'),
    s.cligfecn1,
    NULLIF(TRIM(s.cligatel1), ''),
    NULLIF(TRIM(s.cligadirec1), ''),
    mapear_estado_civil(s.cligaas1),
    NULLIF(TRIM(s.cligallab1), ''),
    NULLIF(TRIM(s.cligart1), ''),
    NULLIF(TRIM(s.cligaant1), ''),
    NULLIF(TRIM(s.cligadlab1), ''),
    'GARANTE 2',
    TRUE
FROM migracion.staging_cliente s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.cigarante1), '') IS NOT NULL;

-- 4. MIGRAR GARANTE #2 (con inconsistencias de nombres solventadas)
INSERT INTO playa.garantes (
    id_cliente,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    fecha_nacimiento,
    telefono,
    direccion,
    estado_civil,
    lugar_trabajo,
    telefono_trabajo,
    antiguedad_laboral,
    direccion_laboral,
    relacion_cliente,
    activo
)
SELECT
    m.id_cliente,
    detectar_tipo_documento(s.cigarante2),
    NULLIF(TRIM(s.cigarante2), ''),
    COALESCE(separar_nombre(NULLIF(TRIM(s.clinomga2), '')), 'S/N'),
    COALESCE(separar_apellido(NULLIF(TRIM(s.clinomga2), '')), 'S/A'),
    s.digfecn2, -- Según markdown es digfecn2
    NULLIF(TRIM(s.cligatel2), ''),
    NULLIF(TRIM(s.cligadirec2), ''),
    mapear_estado_civil(s.cligaasc2),
    NULLIF(TRIM(s.cligallab2), ''),
    NULLIF(TRIM(s.digart2), ''), -- Según markdown es digart2
    NULLIF(TRIM(s.digaant2), ''), -- Según markdown es digaant2
    NULLIF(TRIM(s.cligadlab2), ''),
    'GARANTE 3',
    TRUE
FROM migracion.staging_cliente s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.cigarante2), '') IS NOT NULL;

-- 5. MIGRAR REFERENCIAS UNIFICADAS

-- 5.1. Referencias Personales Cliente
INSERT INTO playa.referencias (id_cliente, tipo_entidad, tipo_referencia, nombre, telefono, observaciones)
SELECT m.id_cliente, 'CLIENTE', 'PERSONAL', TRUNCATE_ST(s.clirefpern, 150), TRUNCATE_ST(s.clirefpert, 100), TRUNCATE_ST(s.clirefver, 500)
FROM migracion.st_cli_ref_per s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.clirefpern), '') IS NOT NULL;

-- 5.2. Referencias Laborales Cliente
INSERT INTO playa.referencias (id_cliente, tipo_entidad, tipo_referencia, nombre, telefono, observaciones)
SELECT m.id_cliente, 'CLIENTE', 'LABORAL', TRUNCATE_ST(s.clireflab, 150), TRUNCATE_ST(s.clitelab, 100), TRUNCATE_ST(s.cliverlab, 500)
FROM migracion.st_cli_ref_lab s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.clireflab), '') IS NOT NULL;

-- 5.3. Referencias Personales Garante
INSERT INTO playa.referencias (id_cliente, tipo_entidad, tipo_referencia, nombre, telefono, observaciones)
SELECT m.id_cliente, 'GARANTE', 'PERSONAL', TRUNCATE_ST(s.garnor, 150), TRUNCATE_ST(s.gatef, 100), TRUNCATE_ST(s.garaver, 500)
FROM migracion.st_gar_ref_per s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.garnor), '') IS NOT NULL;

-- 5.4. Referencias Laborales Garante
INSERT INTO playa.referencias (id_cliente, tipo_entidad, tipo_referencia, nombre, telefono, observaciones)
SELECT m.id_cliente, 'GARANTE', 'LABORAL', TRUNCATE_ST(s.grelabn, 150), TRUNCATE_ST(s.gctefl, 100), TRUNCATE_ST(s.gcveri, 500)
FROM migracion.st_gar_ref_lab s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
WHERE NULLIF(TRIM(s.grelabn), '') IS NOT NULL;

-- 6. MIGRAR PRODUCTOS (VEHÍCULOS)

INSERT INTO playa.productos (
    codigo_interno,
    marca,
    modelo,
    año,
    color,
    chasis,
    motor,
    costo_base,
    precio_contado_sugerido,
    precio_venta_minimo,
    procedencia,
    estado_disponibilidad,
    fecha_ingreso,
    id_categoria,
    observaciones
)
SELECT 
    TRIM(s.procodigo),
    COALESCE(
        CASE 
            WHEN s.prodescri ILIKE '%TOYOTA%' THEN 'TOYOTA'
            WHEN s.prodescri ILIKE '%NISSAN%' THEN 'NISSAN'
            WHEN s.prodescri ILIKE '%HYUNDAI%' THEN 'HYUNDAI'
            WHEN s.prodescri ILIKE '%KIA%' THEN 'KIA'
            WHEN s.prodescri ILIKE '%MITSUBISHI%' THEN 'MITSUBISHI'
            WHEN s.prodescri ILIKE '%ISUZU%' THEN 'ISUZU'
            WHEN s.prodescri ILIKE '%MAZDA%' THEN 'MAZDA'
            WHEN s.prodescri ILIKE '%HONDA%' THEN 'HONDA'
            WHEN s.prodescri ILIKE '%MERCEDES%' THEN 'MERCEDES-BENZ'
            WHEN s.prodescri ILIKE '%BMW%' THEN 'BMW'
            WHEN s.prodescri ILIKE '%CHEVROLET%' THEN 'CHEVROLET'
            WHEN s.prodescri ILIKE '%FORD%' THEN 'FORD'
            WHEN s.prodescri ILIKE '%VOLKSWAGEN%' THEN 'VOLKSWAGEN'
            WHEN s.prodescri ILIKE '%FIAT%' THEN 'FIAT'
            WHEN s.prodescri ILIKE '%GRAND CHEROKEE%' THEN 'JEEP'
            WHEN s.prodescri ILIKE '%JEEP%' THEN 'JEEP'
            ELSE 'OTRO'
        END, 'OTRO'
    ),
    TRUNCATE_ST(s.prodescri, 100),
    s.proano,
    NULLIF(TRIM(s.procolor), ''),
    TRIM(s.procodigo),
    NULLIF(TRIM(s.promotor), ''),
    COALESCE(s.procosto, 0),
    s.proprecre,
    s.proprecon,
    'IMPORTADO',
    'DISPONIBLE',
    COALESCE(s.profingre::DATE, CURRENT_DATE),
    1, -- Default: Automóviles
    'Migrado de SQL Server. Chapa: ' || TRIM(s.prochapa)
FROM migracion.st_productos s
ON CONFLICT (chasis) DO NOTHING;

-- 7. MIGRAR IMÁGENES DE PRODUCTOS

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

-- 7.1. PRODUCTOS HUÉRFANOS (Para cuotas sin producto en staging)
INSERT INTO playa.productos (
    codigo_interno, marca, modelo, año, color, chasis, motor,
    costo_base, precio_contado_sugerido, precio_venta_minimo,
    procedencia, estado_disponibilidad, fecha_ingreso, id_categoria, observaciones
)
SELECT DISTINCT
    TRIM(s.cuotacha), 'GENERICO', 'PRODUCTO MIGRADO (SIN DETALLE)', NULL::INTEGER, 'S/D', 
    TRIM(s.cuotacha), 'S/D', 
    0, 0, 0, 'IMPORTADO', 'VENDIDO', '2000-01-01'::DATE, 1, 
    'Producto generado automáticamente por falta de registro en DB original para cuotas huérfanas.'
FROM migracion.st_cuotero s
LEFT JOIN playa.productos p ON p.codigo_interno = TRIM(s.cuotacha)
WHERE p.id_producto IS NULL AND NULLIF(TRIM(s.cuotacha), '') IS NOT NULL
ON CONFLICT (chasis) DO NOTHING;

-- 8. MIGRAR VENTAS

INSERT INTO playa.ventas (
    numero_venta,
    id_cliente,
    id_producto,
    fecha_venta,
    tipo_venta,
    precio_venta,
    descuento,
    precio_final,
    entrega_inicial,
    saldo_financiar,
    estado_venta,
    observaciones
)
SELECT 
    LPAD(s.facserie1::TEXT, 3, '0') || '-' || LPAD(s.facserie2::TEXT, 3, '0') || '-' || LPAD(s.factnum::TEXT, 7, '0'),
    m.id_cliente,
    p.id_producto,
    s.facfecha::DATE,
    CASE WHEN s.facfpag = 'C' THEN 'FINANCIADO' ELSE 'CONTADO' END,
    d.faccosto,
    d.facdtos,
    d.faccosto - d.facdtos,
    s.factent,
    (d.faccosto - d.facdtos) - s.factent,
    CASE WHEN s.facestado = 'F' THEN 'ACTIVA' ELSE 'ANULADA' END,
    'Migrado de SQL Server. FactNro: ' || s.factnro
FROM migracion.st_ventas s
JOIN migracion.st_ventas_detalle d ON s.factnro = d.factnro
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cliruc)
JOIN playa.productos p ON p.codigo_interno = TRIM(d.procodigo)
ON CONFLICT (numero_venta) DO NOTHING;

-- 8.1. VENTAS VIRTUALES PARA CUOTAS HUÉRFANAS
INSERT INTO playa.ventas (
    numero_venta, id_cliente, id_producto, fecha_venta, tipo_venta,
    precio_venta, descuento, precio_final, entrega_inicial, 
    saldo_financiar, estado_venta, observaciones
)
SELECT DISTINCT
    'PEND-' || TRIM(s.cuotaci) || '-' || TRIM(s.cuotacha),
    m.id_cliente,
    p.id_producto,
    COALESCE(s.cuotafec::DATE, '2024-01-01'::DATE), -- Usar fecha del cuotero o fallback
    'FINANCIADO',
    s.cuotamon, 
    0, 
    s.cuotamon,
    COALESCE(s.cuotaent, 0),
    s.cuotasal,
    'ACTIVA',
    'Venta virtual generada para migrar cuotas huérfanas (sin factura en origen).'
FROM migracion.st_cuotero s
JOIN migracion.cliente_map m ON m.cliruc_original = TRIM(s.cuotaci)
JOIN playa.productos p ON p.codigo_interno = TRIM(s.cuotacha)
-- Solo si NO tiene una venta real ya migrada o si el cuotanrof es inválido
WHERE (NULLIF(TRIM(s.cuotanrof), '') IS NULL OR NOT EXISTS (SELECT 1 FROM playa.ventas v2 WHERE v2.numero_venta = TRIM(s.cuotanrof)))
AND NOT EXISTS (SELECT 1 FROM playa.ventas v3 WHERE v3.numero_venta = 'PEND-' || TRIM(s.cuotaci) || '-' || TRIM(s.cuotacha))
ON CONFLICT (numero_venta) DO NOTHING;

UPDATE playa.productos
SET estado_disponibilidad = 'VENDIDO'
WHERE id_producto IN (SELECT id_producto FROM playa.ventas);

-- 9. MIGRAR PAGARÉS (CUOTAS)

INSERT INTO playa.pagares (
    id_venta,
    numero_pagare,
    numero_cuota,
    monto_cuota,
    fecha_vencimiento,
    tipo_pagare,
    estado,
    saldo_pendiente,
    observaciones
)
SELECT 
    v.id_venta,
    v.numero_venta || '_Q' || LPAD(d.cuotanro::TEXT, 3, '0'),
    d.cuotanro,
    d.cuotamen,
    d.cuotaven::DATE,
    'CUOTA',
    CASE 
        WHEN EXTRACT(YEAR FROM d.cuotafp) > 1900 THEN 'PAGADO'
        WHEN d.cuotaven < CURRENT_DATE THEN 'VENCIDO'
        ELSE 'PENDIENTE'
    END,
    CASE WHEN EXTRACT(YEAR FROM d.cuotafp) > 1900 THEN 0 ELSE d.cuotamen END,
    'Migrado de SQL Server. Cuota Nro ' || d.cuotanro
FROM migracion.st_cuoterodet d
JOIN migracion.st_cuotero c ON TRIM(c.cuotaci) = TRIM(d.cuotaci) AND TRIM(c.cuotacha) = TRIM(d.cuotacha)
JOIN playa.ventas v ON v.numero_venta = TRIM(c.cuotanrof)
ON CONFLICT (numero_pagare) DO NOTHING;

-- 9.1. MIGRAR PAGARÉS HUÉRFANOS (Usando las ventas virtuales)
INSERT INTO playa.pagares (
    id_venta, numero_pagare, numero_cuota, monto_cuota,
    fecha_vencimiento, tipo_pagare, estado, saldo_pendiente, observaciones
)
SELECT 
    v.id_venta,
    v.numero_venta || '_Q' || LPAD(d.cuotanro::TEXT, 3, '0'),
    d.cuotanro,
    d.cuotamen,
    d.cuotaven::DATE,
    'CUOTA',
    CASE 
        WHEN EXTRACT(YEAR FROM d.cuotafp) > 1900 THEN 'PAGADO'
        WHEN d.cuotaven < CURRENT_DATE THEN 'VENCIDO'
        ELSE 'PENDIENTE'
    END,
    CASE WHEN EXTRACT(YEAR FROM d.cuotafp) > 1900 THEN 0 ELSE d.cuotamen END,
    'Migrado de SQL Server (Caso Huérfano). Cuota Nro ' || d.cuotanro
FROM migracion.st_cuoterodet d
JOIN migracion.st_cuotero c ON TRIM(c.cuotaci) = TRIM(d.cuotaci) AND TRIM(c.cuotacha) = TRIM(d.cuotacha)
JOIN playa.ventas v ON v.numero_venta = 'PEND-' || TRIM(c.cuotaci) || '-' || TRIM(c.cuotacha)
-- Solo si no es una venta normal (ya cubierta por el paso anterior)
WHERE (NULLIF(TRIM(c.cuotanrof), '') IS NULL OR NOT EXISTS (SELECT 1 FROM migracion.st_ventas sv WHERE sv.factnro::TEXT = TRIM(c.cuotanrof)))
ON CONFLICT (numero_pagare) DO NOTHING;

-- 10. MIGRAR PAGOS
-- 10.1. Pagos desde Pagoparcial (Abonos parciales)
INSERT INTO playa.pagos (
    id_pagare,
    id_venta,
    numero_recibo,
    fecha_pago,
    monto_pagado,
    forma_pago,
    observaciones
)
SELECT 
    p.id_pagare,
    v.id_venta,
    'PP-' || v.numero_venta || '-Q' || d.cuotanropp || '-' || ROW_NUMBER() OVER (PARTITION BY v.id_venta, d.cuotanropp ORDER BY d.cuotafpp),
    d.cuotafpp::DATE,
    d.cuotapagp,
    'EFECTIVO',
    'Migrado de SQL Server (Pago Parcial - Pagoparcial)'
FROM migracion.st_pagoparcial d
JOIN migracion.st_cuotero c ON TRIM(c.cuotaci) = TRIM(d.cuotacipp) AND TRIM(c.cuotacha) = TRIM(d.cuotachapp)
JOIN playa.ventas v ON v.numero_venta = TRIM(c.cuotanrof)
JOIN playa.pagares p ON p.id_venta = v.id_venta AND p.numero_cuota = d.cuotanropp
ON CONFLICT (numero_recibo) DO NOTHING;

-- 10.1.1. Pagos desde Pagoparcial (ORPHANS)
INSERT INTO playa.pagos (
    id_pagare, id_venta, numero_recibo, fecha_pago, monto_pagado, forma_pago, observaciones
)
SELECT 
    p.id_pagare,
    v.id_venta,
    'PP-' || v.numero_venta || '-Q' || d.cuotanropp || '-' || ROW_NUMBER() OVER (PARTITION BY v.id_venta, d.cuotanropp ORDER BY d.cuotafpp),
    d.cuotafpp::DATE,
    d.cuotapagp,
    'EFECTIVO',
    'Migrado de SQL Server (Pago Parcial - Caso Huérfano)'
FROM migracion.st_pagoparcial d
JOIN migracion.st_cuotero c ON TRIM(c.cuotaci) = TRIM(d.cuotacipp) AND TRIM(c.cuotacha) = TRIM(d.cuotachapp)
JOIN playa.ventas v ON v.numero_venta = 'PEND-' || TRIM(c.cuotaci) || '-' || TRIM(c.cuotacha)
JOIN playa.pagares p ON p.id_venta = v.id_venta AND p.numero_cuota = d.cuotanropp
WHERE (NULLIF(TRIM(c.cuotanrof), '') IS NULL OR NOT EXISTS (SELECT 1 FROM migracion.st_ventas sv WHERE sv.factnro::TEXT = TRIM(c.cuotanrof)))
ON CONFLICT (numero_recibo) DO NOTHING;

-- 10.2. Pagos desde cuoterodet (para cuotas pagadas que NO tienen detalle en Pagoparcial)
INSERT INTO playa.pagos (
    id_pagare,
    id_venta,
    numero_recibo,
    fecha_pago,
    monto_pagado,
    forma_pago,
    observaciones
)
SELECT 
    p.id_pagare,
    v.id_venta,
    'REC-' || v.numero_venta || '-Q' || d.cuotanro,
    d.cuotafp::DATE,
    d.cuotamen,
    'EFECTIVO',
    'Migrado de SQL Server (Pago Cuota Completa - cuoterodet)'
FROM migracion.st_cuoterodet d
JOIN migracion.st_cuotero c ON TRIM(c.cuotaci) = TRIM(d.cuotaci) AND TRIM(c.cuotacha) = TRIM(d.cuotacha)
JOIN playa.ventas v ON v.numero_venta = TRIM(c.cuotanrof)
JOIN playa.pagares p ON p.id_venta = v.id_venta AND p.numero_cuota = d.cuotanro
WHERE EXTRACT(YEAR FROM d.cuotafp) > 1900
-- Evitar duplicar si ya migramos abonos desde Pagoparcial para esta cuota
AND NOT EXISTS (
    SELECT 1 FROM migracion.st_pagoparcial pp 
    WHERE TRIM(pp.cuotacipp) = TRIM(d.cuotaci) 
    AND TRIM(pp.cuotachapp) = TRIM(d.cuotacha) 
    AND pp.cuotanropp = d.cuotanro
)
ON CONFLICT (numero_recibo) DO NOTHING;

-- 10.2.1. Pagos desde cuoterodet (ORPHANS)
INSERT INTO playa.pagos (
    id_pagare, id_venta, numero_recibo, fecha_pago, monto_pagado, forma_pago, observaciones
)
SELECT 
    p.id_pagare,
    v.id_venta,
    'REC-' || v.numero_venta || '-Q' || d.cuotanro,
    d.cuotafp::DATE,
    d.cuotamen,
    'EFECTIVO',
    'Migrado de SQL Server (Pago Total - Caso Huérfano)'
FROM migracion.st_cuoterodet d
JOIN migracion.st_cuotero c ON TRIM(c.cuotaci) = TRIM(d.cuotaci) AND TRIM(c.cuotacha) = TRIM(d.cuotacha)
JOIN playa.ventas v ON v.numero_venta = 'PEND-' || TRIM(c.cuotaci) || '-' || TRIM(c.cuotacha)
JOIN playa.pagares p ON p.id_venta = v.id_venta AND p.numero_cuota = d.cuotanro
WHERE EXTRACT(YEAR FROM d.cuotafp) > 1900
AND (NULLIF(TRIM(c.cuotanrof), '') IS NULL OR NOT EXISTS (SELECT 1 FROM migracion.st_ventas sv WHERE sv.factnro::TEXT = TRIM(c.cuotanrof)))
AND NOT EXISTS (
    SELECT 1 FROM migracion.st_pagoparcial pp 
    WHERE TRIM(pp.cuotacipp) = TRIM(d.cuotaci) 
    AND TRIM(pp.cuotachapp) = TRIM(d.cuotacha) 
    AND pp.cuotanropp = d.cuotanro
)
ON CONFLICT (numero_recibo) DO NOTHING;
