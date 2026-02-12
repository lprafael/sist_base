-- migration_setup.sql
SET search_path TO playa, public, migracion;

-- 1. CREAR ESQUEMA DE MIGRACIÓN
CREATE SCHEMA IF NOT EXISTS migracion;

-- 2. FUNCIONES AUXILIARES
-- Detectar tipo de documento
CREATE OR REPLACE FUNCTION detectar_tipo_documento(doc TEXT)
RETURNS VARCHAR(20) AS $$
BEGIN
    doc := TRIM(doc);
    IF doc IS NULL OR doc = '' THEN RETURN NULL; END IF;
    IF doc ~ '^[0-9]+$' THEN
        IF LENGTH(doc) BETWEEN 6 AND 8 THEN RETURN 'CI';
        ELSIF LENGTH(doc) BETWEEN 8 AND 11 THEN RETURN 'RUC';
        END IF;
    END IF;
    IF doc ~ '[A-Za-z]' THEN RETURN 'PASAPORTE'; END IF;
    RETURN 'RUC';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Separar Nombre
CREATE OR REPLACE FUNCTION separar_nombre(nombre_completo TEXT)
RETURNS TEXT AS $$
BEGIN
    nombre_completo := TRIM(nombre_completo);
    IF nombre_completo IS NULL OR nombre_completo = '' THEN RETURN NULL; END IF;
    IF POSITION(' ' IN nombre_completo) = 0 THEN RETURN nombre_completo; END IF;
    RETURN TRIM(REGEXP_REPLACE(nombre_completo, '\s+\S+$', ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Separar Apellido
CREATE OR REPLACE FUNCTION separar_apellido(nombre_completo TEXT)
RETURNS TEXT AS $$
BEGIN
    nombre_completo := TRIM(nombre_completo);
    IF nombre_completo IS NULL OR nombre_completo = '' THEN RETURN NULL; END IF;
    IF POSITION(' ' IN nombre_completo) = 0 THEN RETURN NULL; END IF;
    RETURN TRIM(REGEXP_REPLACE(nombre_completo, '^.*\s+', ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mapear Estado Civil
CREATE OR REPLACE FUNCTION mapear_estado_civil(codigo CHAR(1))
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN CASE TRIM(codigo)
        WHEN 'S' THEN 'Soltero/a'
        WHEN 'C' THEN 'Casado/a'
        WHEN 'D' THEN 'Divorciado/a'
        WHEN 'V' THEN 'Viudo/a'
        WHEN 'U' THEN 'Unión Libre'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mapear Calificación
CREATE OR REPLACE FUNCTION mapear_calificacion(calificacion_numerica INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN CASE
        WHEN calificacion_numerica = 0 THEN 'NUEVO'
        WHEN calificacion_numerica = 1 THEN 'EXCELENTE'
        WHEN calificacion_numerica = 2 THEN 'BUENO'
        WHEN calificacion_numerica = 3 THEN 'REGULAR'
        WHEN calificacion_numerica >= 4 THEN 'MALO'
        ELSE 'NUEVO'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función auxiliar para truncar strings y evitar errores de longitud
CREATE OR REPLACE FUNCTION TRUNCATE_ST(text_val TEXT, max_len INT)
RETURNS TEXT AS $$
BEGIN
    IF text_val IS NULL THEN RETURN NULL; END IF;
    RETURN LEFT(TRIM(text_val), max_len);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. TABLA STAGING
DROP TABLE IF EXISTS migracion.staging_cliente;
CREATE TABLE migracion.staging_cliente (
    cliruc VARCHAR(20),
    clinombre VARCHAR(80),
    clidirecc VARCHAR(100),
    cliemail VARCHAR(100),
    clitelef VARCHAR(20),
    cliobs TEXT,
    cliasaco CHAR(1),
    clilulab VARCHAR(100),
    cliantlab VARCHAR(20),
    clidirlab VARCHAR(100),
    clitellab VARCHAR(20),
    
    -- Garante 0
    cigarante VARCHAR(20),
    clinomga VARCHAR(80),
    cligadirec VARCHAR(100),
    cligatel VARCHAR(20),
    cligaasc CHAR(1),
    cligallab VARCHAR(100),
    cligaant VARCHAR(20),
    cligadlab VARCHAR(100),
    cligart VARCHAR(20),
    cligfecn DATE,
    
    -- Garante 1
    cigarante1 VARCHAR(20),
    clinomga1 VARCHAR(80),
    cligadirec1 VARCHAR(100),
    cligatel1 VARCHAR(20),
    cligaas1 CHAR(1),
    cligallab1 VARCHAR(100),
    cligaant1 VARCHAR(20),
    cligadlab1 VARCHAR(100),
    cligart1 VARCHAR(20),
    cligfecn1 DATE,
    
    -- Garante 2
    cigarante2 VARCHAR(20),
    clinomga2 VARCHAR(80),
    cligadirec2 VARCHAR(100),
    cligatel2 VARCHAR(20),
    cligaasc2 CHAR(1),
    cligallab2 VARCHAR(100),
    digaant2 VARCHAR(20),
    cligadlab2 VARCHAR(100),
    digart2 VARCHAR(20),
    digfecn2 DATE,
    
    -- Calificación y mora
    clicalif INTEGER,
    clifecal DATE,
    climora DECIMAL(15,2),
    
    -- Fechas
    clifenac DATE,
    clifechaa DATE,
    
    -- Auditoría
    cliusui VARCHAR(10),
    cliusuf TIMESTAMP,
    cliush VARCHAR(10),
    cliusum VARCHAR(10),
    cliusfm TIMESTAMP,
    cliushm VARCHAR(10),
    
    -- Contadores
    ultnref INT,
    ultnrla INT,
    ultrefg INT,
    ultrelg INT,
    ultnroi INT
);

-- Staging Referencia Personal Cliente
DROP TABLE IF EXISTS migracion.st_cli_ref_per;
CREATE TABLE migracion.st_cli_ref_per (
    cliruc VARCHAR(20),
    idrefper INT,
    clirefpern VARCHAR(100),
    clirefpert VARCHAR(50),
    clirefver VARCHAR(100)
);

-- Staging Referencia Laboral Cliente
DROP TABLE IF EXISTS migracion.st_cli_ref_lab;
CREATE TABLE migracion.st_cli_ref_lab (
    cliruc VARCHAR(20),
    idreflab INT,
    clireflab VARCHAR(100),
    clitelab VARCHAR(50),
    cliverlab VARCHAR(100)
);

-- Staging Referencia Personal Garante
DROP TABLE IF EXISTS migracion.st_gar_ref_per;
CREATE TABLE migracion.st_gar_ref_per (
    cliruc VARCHAR(20),
    idcgref INT,
    garnor VARCHAR(100),
    gatef VARCHAR(50),
    garaver VARCHAR(100)
);

-- Staging Referencia Laboral Garante
DROP TABLE IF EXISTS migracion.st_gar_ref_lab;
CREATE TABLE migracion.st_gar_ref_lab (
    cliruc VARCHAR(20),
    idgrelab INT,
    grelabn VARCHAR(100),
    gctefl VARCHAR(50),
    gcveri VARCHAR(100)
);

-- Staging Productos (Vehículos)
DROP TABLE IF EXISTS migracion.st_productos;
CREATE TABLE migracion.st_productos (
    procodigo VARCHAR(50),
    prodescri VARCHAR(200),
    profingre TIMESTAMP,
    procosto DECIMAL(15,2),
    proprecon DECIMAL(15,2),
    proprecre DECIMAL(15,2),
    promodelo VARCHAR(100),
    proano INTEGER,
    procolor VARCHAR(50),
    promotor VARCHAR(100),
    prochapa VARCHAR(50),
    protipo VARCHAR(10),
    prodeposi DECIMAL(15,2),
    proimagen BYTEA,
    proimagen1 BYTEA,
    proimagen2 BYTEA,
    proimagen3 BYTEA,
    proimagen4 BYTEA,
    proimagen5 BYTEA,
    proimagen6 BYTEA
);

-- Staging Ventas
DROP TABLE IF EXISTS migracion.st_ventas;
CREATE TABLE migracion.st_ventas (
    factnro DECIMAL(15,0),
    facserie1 INT,
    facserie2 INT,
    factnum INT,
    facfpag CHAR(1),
    facfecha TIMESTAMP,
    facestado CHAR(1),
    cliruc VARCHAR(20),
    factent DECIMAL(15,2),
    facvend VARCHAR(100)
);

-- Staging VentasDetalle
DROP TABLE IF EXISTS migracion.st_ventas_detalle;
CREATE TABLE migracion.st_ventas_detalle (
    factnro DECIMAL(15,0),
    procodigo VARCHAR(50),
    facdcant INT,
    faccosto DECIMAL(15,2),
    facdtos DECIMAL(15,2)
);

-- Staging cuotero
DROP TABLE IF EXISTS migracion.st_cuotero;
CREATE TABLE migracion.st_cuotero (
    cuotaci VARCHAR(20),
    cuotacha VARCHAR(50),
    cuotanrof VARCHAR(50),
    cuotaent DECIMAL(15,2),
    cuotamon DECIMAL(15,2),
    cuotasal DECIMAL(15,2),
    cuotacan INT,
    cuotafec TIMESTAMP,
    cuotaest CHAR(1)
);

-- Staging cuoterodet
DROP TABLE IF EXISTS migracion.st_cuoterodet;
CREATE TABLE migracion.st_cuoterodet (
    cuotaci VARCHAR(20),
    cuotacha VARCHAR(50),
    cuotanro INT,
    cuotaven TIMESTAMP,
    cuotasald DECIMAL(15,2),
    cuotaint DECIMAL(15,2),
    cuotamen DECIMAL(15,2),
    cuotafp TIMESTAMP,
    cuotaes CHAR(1)
);

-- Staging Pagoparcial
DROP TABLE IF EXISTS migracion.st_pagoparcial;
CREATE TABLE migracion.st_pagoparcial (
    cuotacipp VARCHAR(20),
    cuotachapp VARCHAR(50),
    cuotanropp INT,
    cuotamenpp DECIMAL(15,2),
    cuotapagp DECIMAL(15,2),
    cuotafpp TIMESTAMP
);

-- 4. TABLA DE MAPEO
DROP TABLE IF EXISTS migracion.cliente_map;
CREATE TABLE migracion.cliente_map (
    cliruc_original VARCHAR(20) PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES playa.clientes(id_cliente)
);

-- 5. ASEGURAR COLUMNAS EN TABLAS FINALES
ALTER TABLE playa.clientes ADD COLUMN IF NOT EXISTS mora_acumulada DECIMAL(15,2) DEFAULT 0;
ALTER TABLE playa.clientes ADD COLUMN IF NOT EXISTS fecha_calificacion DATE;
ALTER TABLE playa.imagenes_productos ADD COLUMN IF NOT EXISTS imagen BYTEA;

-- Limpiar tablas para re-migración completa
TRUNCATE playa.imagenes_productos RESTART IDENTITY CASCADE;
TRUNCATE playa.referencias RESTART IDENTITY CASCADE;
TRUNCATE playa.pagos RESTART IDENTITY CASCADE;
TRUNCATE playa.pagares RESTART IDENTITY CASCADE;
TRUNCATE playa.ventas RESTART IDENTITY CASCADE;
TRUNCATE playa.productos RESTART IDENTITY CASCADE;
TRUNCATE playa.garantes RESTART IDENTITY CASCADE;
TRUNCATE playa.clientes RESTART IDENTITY CASCADE;
-- No truncar categorias_vehiculos ya que tiene datos maestros

ALTER TABLE playa.garantes ADD COLUMN IF NOT EXISTS antiguedad_laboral VARCHAR(20);
ALTER TABLE playa.garantes ADD COLUMN IF NOT EXISTS direccion_laboral TEXT;
ALTER TABLE playa.garantes ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50);

-- Tabla de Referencias final (por si no existe)
CREATE TABLE IF NOT EXISTS playa.referencias (
    id_referencia SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES playa.clientes(id_cliente),
    tipo_entidad VARCHAR(20) NOT NULL, -- CLIENTE, GARANTE
    tipo_referencia VARCHAR(20) NOT NULL, -- PERSONAL, LABORAL
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(100),
    parentesco_cargo VARCHAR(150),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);
