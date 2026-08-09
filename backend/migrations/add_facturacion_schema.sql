-- ============================================================
-- MIGRACIÓN: Módulo de Facturación Electrónica SIFEN
-- Sistema: mi_cancha.com.py — Módulo Academias
-- Fecha: 2026-08-09
-- Descripción: Crea el schema `facturacion` con todas las tablas
--              necesarias para emitir Documentos Electrónicos (DE)
--              SIFEN/e-Kuatia por parte de las academias.
-- ============================================================

-- Extensión necesaria para UUID (ya debería existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema principal de facturación
CREATE SCHEMA IF NOT EXISTS facturacion;

-- ============================================================
-- TABLA: Configuración del emisor SIFEN por academia (1 por academia)
-- ============================================================
CREATE TABLE IF NOT EXISTS facturacion.emisor_academia (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id         UUID NOT NULL UNIQUE,
    -- Datos RUC
    ruc_con_dv          VARCHAR(20) NOT NULL DEFAULT '',    -- Ej: "12345678-9"
    tipo_contribuyente  INTEGER DEFAULT 1,                  -- 1=física, 2=jurídica
    razon_social        VARCHAR(255) NOT NULL DEFAULT '',
    nombre_fantasia     VARCHAR(255),
    -- Dirección
    direccion           VARCHAR(255),
    num_casa            VARCHAR(20),
    telefono            VARCHAR(50),
    email               VARCHAR(150),
    -- Geografía emisor
    c_dep_emi           INTEGER,
    d_des_dep_emi       VARCHAR(100),
    c_ciu_emi           INTEGER,
    d_des_ciu_emi       VARCHAR(100),
    -- Actividad económica
    c_act_eco           VARCHAR(10),
    d_des_act_eco       VARCHAR(255),
    -- Datos de timbrado SET
    num_tim             VARCHAR(20),                        -- Número de timbrado
    d_est               VARCHAR(3) DEFAULT '001',           -- Establecimiento
    d_pun_exp           VARCHAR(3) DEFAULT '001',           -- Punto de expedición
    i_ti_de             INTEGER DEFAULT 1,                  -- Tipo DE: 1=Factura Electrónica
    i_tip_emi           INTEGER DEFAULT 1,                  -- Tipo Emisión: 1=Normal
    -- CSC (código de seguridad del contribuyente)
    id_csc              VARCHAR(10) DEFAULT '0001',
    csc_secreto         VARCHAR(255) DEFAULT '',
    -- Numerador secuencial
    ultimo_num_doc      INTEGER DEFAULT 0,
    -- Control
    activo              BOOLEAN DEFAULT TRUE,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE facturacion.emisor_academia IS
    'Configuración SIFEN de cada academia: RUC, timbrado, establecimientos, CSC.';

-- ============================================================
-- TABLA: Certificados digitales .p12 por academia
-- ============================================================
CREATE TABLE IF NOT EXISTS facturacion.certificados_digitales (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id     UUID NOT NULL,
    nombre_archivo  VARCHAR(255),
    ruta_archivo    VARCHAR(500) NOT NULL,   -- Path en servidor (relativo a SIFEN_CERTS_DIR)
    password_enc    VARCHAR(1000),           -- Contraseña cifrada con Fernet (SIFEN_FERNET_KEY)
    activo          BOOLEAN DEFAULT TRUE,
    valido_hasta    DATE,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE facturacion.certificados_digitales IS
    'Certificados PKCS#12 (.p12) subidos por cada academia para firma digital XMLDSig.';

-- ============================================================
-- TABLA: Datos de facturación por alumno o tutor (receptor del DE)
-- ============================================================
CREATE TABLE IF NOT EXISTS facturacion.datos_facturacion (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id             UUID NOT NULL,
    alumno_id               UUID,           -- FK a academias.alumnos
    tutor_id                UUID,           -- FK a academias.tutores
    -- Datos receptor SIFEN
    receptor_ruc            VARCHAR(20),    -- RUC o CI (sin DV)
    receptor_dv             VARCHAR(2),     -- Dígito verificador del RUC
    receptor_nombre         VARCHAR(255) NOT NULL,
    receptor_dir            VARCHAR(255),
    receptor_tel            VARCHAR(50),
    receptor_email          VARCHAR(150),
    -- Geografía receptor
    c_dep_rec               INTEGER,
    d_des_dep_rec           VARCHAR(100),
    c_ciu_rec               INTEGER,
    d_des_ciu_rec           VARCHAR(100),
    -- Preferencia
    es_pagador_principal    BOOLEAN DEFAULT TRUE,
    -- Control
    creado_en               TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_alumno_o_tutor CHECK (alumno_id IS NOT NULL OR tutor_id IS NOT NULL)
);

COMMENT ON TABLE facturacion.datos_facturacion IS
    'Datos de facturación (receptor del DE) de alumnos y/o tutores de cada academia.';

-- ============================================================
-- TABLA: Documentos Electrónicos emitidos (Facturas SIFEN)
-- ============================================================
CREATE TABLE IF NOT EXISTS facturacion.documentos_electronicos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id         UUID NOT NULL,
    emisor_id           UUID,               -- FK a facturacion.emisor_academia
    -- Referencias al cobro origen (máximo una por fila)
    cuota_id            UUID,               -- FK a academias.cuotas (si aplica)
    matricula_id        UUID,               -- FK a academias.matriculas (si aplica)
    concepto_libre      VARCHAR(255),       -- Para cobros no vinculados a cuota/matrícula
    -- Datos SIFEN
    cdc                 VARCHAR(44) UNIQUE,
    numero_documento    INTEGER NOT NULL,
    d_cod_seg           VARCHAR(9),
    i_ti_de             INTEGER DEFAULT 1,
    i_tip_emi           INTEGER DEFAULT 1,
    d_fe_emi_de         TIMESTAMPTZ DEFAULT NOW(),
    -- Receptor (snapshot al momento de emisión)
    receptor_ruc        VARCHAR(20),
    receptor_dv         VARCHAR(2),
    receptor_nombre     VARCHAR(255),
    receptor_dir        VARCHAR(255),
    receptor_tel        VARCHAR(50),
    receptor_email      VARCHAR(150),
    c_dep_rec           INTEGER,
    d_des_dep_rec       VARCHAR(100),
    c_ciu_rec           INTEGER,
    d_des_ciu_rec       VARCHAR(100),
    i_cond_ope          INTEGER DEFAULT 1,  -- 1=Contado
    -- Totales (en Guaraníes, enteros)
    d_tot_gral_ope      BIGINT,
    d_tot_iva           BIGINT,
    d_car_qr            TEXT,
    -- XML
    xml_generado        TEXT,
    xml_firmado         TEXT,
    -- Estado SIFEN
    estado              VARCHAR(30) DEFAULT 'generado',
    -- generado | firmado | enviado | aprobado | rechazado | cancelado
    sifen_respuesta     JSONB,
    motivo_cancelacion  TEXT,
    cancelado           BOOLEAN DEFAULT FALSE,
    cancelado_en        TIMESTAMPTZ,
    -- Trazabilidad
    creado_por          INTEGER,            -- FK sistema.usuarios.id
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE facturacion.documentos_electronicos IS
    'Documentos Electrónicos (facturas) emitidos por cada academia. '
    'Referencia a cuotas o matrículas de academias.';

-- Índices útiles para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_de_academia
    ON facturacion.documentos_electronicos (academia_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_de_cuota
    ON facturacion.documentos_electronicos (cuota_id)
    WHERE cuota_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_de_matricula
    ON facturacion.documentos_electronicos (matricula_id)
    WHERE matricula_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_de_estado
    ON facturacion.documentos_electronicos (academia_id, estado);

-- ============================================================
-- TABLA: Líneas de cada Documento Electrónico
-- ============================================================
CREATE TABLE IF NOT EXISTS facturacion.de_lineas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id        UUID NOT NULL REFERENCES facturacion.documentos_electronicos(id) ON DELETE CASCADE,
    orden               INTEGER NOT NULL,
    d_cod_int           VARCHAR(50),        -- Código interno del concepto
    d_des_pro_ser       VARCHAR(255) NOT NULL,  -- Descripción del bien o servicio
    c_uni_med           INTEGER DEFAULT 77, -- 77=Servicio (catálogo SIFEN)
    d_des_uni_med       VARCHAR(50) DEFAULT 'SERVICIO',
    d_cant_pro_ser      NUMERIC(18,4) DEFAULT 1,
    d_p_uni_pro_ser     BIGINT NOT NULL,    -- Precio unitario en Gs (entero)
    d_tasa_iva          INTEGER DEFAULT 10, -- 0, 5 o 10
    i_afec_iva          INTEGER DEFAULT 1,  -- 1=Gravado, 4=Exento
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COLUMNAS ADICIONALES en tablas existentes de academias
-- Vinculan cada cobro con su documento electrónico
-- ============================================================
ALTER TABLE academias.cuotas
    ADD COLUMN IF NOT EXISTS documento_electronico_id UUID;

ALTER TABLE academias.matriculas
    ADD COLUMN IF NOT EXISTS documento_electronico_id UUID;

COMMENT ON COLUMN academias.cuotas.documento_electronico_id IS
    'FK al DE emitido para esta cuota (NULL si no se facturó).';

COMMENT ON COLUMN academias.matriculas.documento_electronico_id IS
    'FK al DE emitido para esta matrícula (NULL si no se facturó).';

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Schema facturacion creado correctamente.';
    RAISE NOTICE '   Tablas: emisor_academia, certificados_digitales, datos_facturacion,';
    RAISE NOTICE '            documentos_electronicos, de_lineas';
    RAISE NOTICE '   Columnas añadidas: academias.cuotas.documento_electronico_id,';
    RAISE NOTICE '                      academias.matriculas.documento_electronico_id';
END $$;
