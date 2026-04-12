# init_surtidor.py
# Script de inicialización de la base de datos del Sistema de Gestión de Surtidor
# Ejecutar UNA SOLA VEZ para crear el schema y las tablas en PostgreSQL
# Uso: cd backend && python init_surtidor.py

import asyncio
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("No se encontró DATABASE_URL en el archivo .env")

engine = create_async_engine(DATABASE_URL, echo=False)


SQL_SCHEMA = """
-- ============================================================
-- SCHEMA: surtidor
-- Sistema de Gestión de Surtidor - SGS
-- ============================================================

CREATE SCHEMA IF NOT EXISTS surtidor;

-- ----------------------------------------------------------------
-- TIPOS DE COMBUSTIBLE (dinámico: alta/baja/modificación)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.tipos_combustible (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    color_hex   VARCHAR(7)  NOT NULL DEFAULT '#4CAF50',
    unidad      VARCHAR(20) NOT NULL DEFAULT 'litros',
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por  INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- TANQUES (dinámico: alta/baja/modificación)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.tanques (
    id                    SERIAL PRIMARY KEY,
    nombre                VARCHAR(100) NOT NULL,
    numero                INTEGER      NOT NULL UNIQUE,
    tipo_combustible_id   INTEGER      NOT NULL REFERENCES surtidor.tipos_combustible(id),
    capacidad_litros      NUMERIC(12,2) NOT NULL,
    stock_minimo_litros   NUMERIC(12,2) NOT NULL DEFAULT 5000,
    stock_actual_litros   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ubicacion             VARCHAR(200),
    activo                BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por            INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- ISLAS (dinámico)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.islas (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(50)  NOT NULL,
    numero         INTEGER      NOT NULL UNIQUE,
    descripcion    VARCHAR(200),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PICOS EXPENDEDORES (dinámico: cada pico → un solo tipo de combustible)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.picos (
    id                  SERIAL PRIMARY KEY,
    numero              INTEGER NOT NULL,
    isla_id             INTEGER NOT NULL REFERENCES surtidor.islas(id),
    tipo_combustible_id INTEGER NOT NULL REFERENCES surtidor.tipos_combustible(id),
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(isla_id, numero)
);

-- ----------------------------------------------------------------
-- CONFIGURACIÓN DE TURNOS (dinámico: nombre, hora, duración)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.turnos_config (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50)  NOT NULL,
    hora_inicio     TIME         NOT NULL,
    duracion_horas  INTEGER      NOT NULL DEFAULT 8,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    orden           INTEGER      NOT NULL DEFAULT 1,
    color_hex       VARCHAR(7)   NOT NULL DEFAULT '#2196F3',
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PERSONAL / PLAYEROS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.personal (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    ci              VARCHAR(20)  NOT NULL UNIQUE,
    telefono        VARCHAR(30),
    email           VARCHAR(100),
    cargo           VARCHAR(50)  NOT NULL DEFAULT 'playero',
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_ingreso   DATE,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por      INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- TURNOS (instancias de TurnoConfig para una fecha concreta)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.turnos (
    id                   SERIAL PRIMARY KEY,
    config_turno_id      INTEGER      NOT NULL REFERENCES surtidor.turnos_config(id),
    fecha                DATE         NOT NULL,
    fecha_hora_apertura  TIMESTAMPTZ,
    fecha_hora_cierre    TIMESTAMPTZ,
    estado               VARCHAR(20)  NOT NULL DEFAULT 'abierto',  -- abierto, cerrado, anulado
    observaciones        TEXT,
    abierto_por          INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    cerrado_por          INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON surtidor.turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON surtidor.turnos(estado);

-- ----------------------------------------------------------------
-- ASIGNACIONES DE PERSONAL A TURNO
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.asignaciones_turno (
    id            SERIAL PRIMARY KEY,
    turno_id      INTEGER NOT NULL REFERENCES surtidor.turnos(id) ON DELETE CASCADE,
    personal_id   INTEGER NOT NULL REFERENCES surtidor.personal(id),
    rol_turno     VARCHAR(50) NOT NULL DEFAULT 'playero',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(turno_id, personal_id)
);

-- ----------------------------------------------------------------
-- MÉTODOS DE PAGO
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.metodos_pago (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50)  NOT NULL UNIQUE,
    tipo            VARCHAR(20)  NOT NULL,    -- efectivo, tarjeta
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    dias_reembolso  INTEGER      NOT NULL DEFAULT 0,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- CUENTAS BANCARIAS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.cuentas_bancarias (
    id              SERIAL PRIMARY KEY,
    banco           VARCHAR(100) NOT NULL,
    nro_cuenta      VARCHAR(50)  NOT NULL,
    titular         VARCHAR(100),
    tipo            VARCHAR(30)  NOT NULL DEFAULT 'corriente',
    moneda          VARCHAR(10)  NOT NULL DEFAULT 'PYG',
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- REEMBOLSOS DE TARJETA (comprobantes bancarios)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.reembolsos_tarjeta (
    id                 SERIAL PRIMARY KEY,
    cuenta_bancaria_id INTEGER      NOT NULL REFERENCES surtidor.cuentas_bancarias(id),
    metodo_pago_id     INTEGER REFERENCES surtidor.metodos_pago(id),
    nro_comprobante    VARCHAR(100) NOT NULL UNIQUE,
    fecha_deposito     DATE         NOT NULL,
    monto_bruto        NUMERIC(14,2) NOT NULL,
    comision           NUMERIC(14,2) NOT NULL DEFAULT 0,
    monto_neto         NUMERIC(14,2) NOT NULL,
    observacion        TEXT,
    conciliado         BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_registro     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    registrado_por     INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- VENTAS (registro de cada transacción)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.ventas (
    id                    SERIAL PRIMARY KEY,
    turno_id              INTEGER      NOT NULL REFERENCES surtidor.turnos(id),
    pico_id               INTEGER      NOT NULL REFERENCES surtidor.picos(id),
    tanque_id             INTEGER      NOT NULL REFERENCES surtidor.tanques(id),
    metodo_pago_id        INTEGER      NOT NULL REFERENCES surtidor.metodos_pago(id),
    nro_comprobante       VARCHAR(50),
    litros                NUMERIC(10,3) NOT NULL,
    precio_litro          NUMERIC(12,2) NOT NULL,
    monto_total           NUMERIC(14,2) NOT NULL,
    -- 'na' = efectivo, 'pendiente' = tarjeta sin conciliar, 'reembolsado' = conciliado
    estado_reembolso      VARCHAR(20)  NOT NULL DEFAULT 'na',
    reembolso_id          INTEGER REFERENCES surtidor.reembolsos_tarjeta(id) ON DELETE SET NULL,
    nro_comprobante_banco VARCHAR(100),
    observaciones         TEXT,
    anulada               BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_hora            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    registrado_por        INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ventas_turno ON surtidor.ventas(turno_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON surtidor.ventas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_ventas_reembolso ON surtidor.ventas(estado_reembolso);

-- ----------------------------------------------------------------
-- MOVIMIENTOS DE STOCK (trazabilidad completa)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.movimientos_stock (
    id               SERIAL PRIMARY KEY,
    tanque_id        INTEGER      NOT NULL REFERENCES surtidor.tanques(id),
    tipo             VARCHAR(20)  NOT NULL,  -- entrada, salida, ajuste_manual
    litros           NUMERIC(12,3) NOT NULL,
    stock_anterior   NUMERIC(12,3),
    stock_posterior  NUMERIC(12,3),
    referencia       VARCHAR(100),
    motivo           VARCHAR(200),
    turno_id         INTEGER REFERENCES surtidor.turnos(id),
    fecha_hora       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    registrado_por   INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mov_stock_tanque ON surtidor.movimientos_stock(tanque_id);

-- ----------------------------------------------------------------
-- MEDICIONES MANUALES DE TANQUE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.mediciones_manuales (
    id               SERIAL PRIMARY KEY,
    tanque_id        INTEGER      NOT NULL REFERENCES surtidor.tanques(id),
    turno_id         INTEGER REFERENCES surtidor.turnos(id),
    litros_medidos   NUMERIC(12,3) NOT NULL,
    litros_sistema   NUMERIC(12,3) NOT NULL,
    diferencia_litros NUMERIC(12,3) GENERATED ALWAYS AS (litros_medidos - litros_sistema) STORED,
    metodo_medicion  VARCHAR(50)  NOT NULL DEFAULT 'varilla',
    observaciones    TEXT,
    fecha_hora       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    medido_por       INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- MOVIMIENTOS DE CAJA (efectivo)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.caja_movimientos (
    id               SERIAL PRIMARY KEY,
    turno_id         INTEGER REFERENCES surtidor.turnos(id),
    tipo             VARCHAR(20)  NOT NULL,  -- ingreso, egreso
    concepto         VARCHAR(200) NOT NULL,
    monto            NUMERIC(14,2) NOT NULL,
    saldo_anterior   NUMERIC(14,2),
    saldo_posterior  NUMERIC(14,2),
    referencia       VARCHAR(100),
    observaciones    TEXT,
    fecha_hora       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    registrado_por   INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- DEPÓSITOS BANCARIOS (del efectivo en cuenta)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.depositos_bancarios (
    id                  SERIAL PRIMARY KEY,
    cuenta_bancaria_id  INTEGER      NOT NULL REFERENCES surtidor.cuentas_bancarias(id),
    monto               NUMERIC(14,2) NOT NULL,
    fecha_deposito      DATE         NOT NULL,
    nro_boleta          VARCHAR(100),
    observaciones       TEXT,
    fecha_registro      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    registrado_por      INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- PROVEEDORES DE COMBUSTIBLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.proveedores (
    id              SERIAL PRIMARY KEY,
    razon_social    VARCHAR(200) NOT NULL,
    ruc             VARCHAR(30),
    contacto        VARCHAR(100),
    telefono        VARCHAR(50),
    email           VARCHAR(100),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PEDIDOS DE COMBUSTIBLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.pedidos_combustible (
    id                       SERIAL PRIMARY KEY,
    proveedor_id             INTEGER REFERENCES surtidor.proveedores(id),
    tipo_combustible_id      INTEGER NOT NULL REFERENCES surtidor.tipos_combustible(id),
    tanque_id                INTEGER REFERENCES surtidor.tanques(id),
    litros_solicitados       NUMERIC(12,3) NOT NULL,
    precio_litro_estimado    NUMERIC(12,2),
    estado                   VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
    es_estimacion            BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_pedido             DATE         NOT NULL,
    fecha_entrega_estimada   DATE,
    observaciones            TEXT,
    fecha_creacion           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    creado_por               INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- RECEPCIONES DE COMBUSTIBLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidor.recepciones_combustible (
    id                SERIAL PRIMARY KEY,
    pedido_id         INTEGER REFERENCES surtidor.pedidos_combustible(id),
    tanque_id         INTEGER NOT NULL REFERENCES surtidor.tanques(id),
    litros_recibidos  NUMERIC(12,3) NOT NULL,
    precio_litro      NUMERIC(12,2),
    nro_remito        VARCHAR(100),
    nro_factura       VARCHAR(100),
    proveedor_id      INTEGER REFERENCES surtidor.proveedores(id),
    observaciones     TEXT,
    fecha_recepcion   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    recibido_por      INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- DATOS INICIALES (maestros básicos)
-- ----------------------------------------------------------------

-- Tipos de combustible por defecto (editables/eliminables desde admin)
INSERT INTO surtidor.tipos_combustible (nombre, descripcion, color_hex, unidad)
VALUES
    ('Nafta Super',  'Nafta de alta octanaje',          '#F44336', 'litros'),
    ('Nafta Común',  'Nafta estándar',                  '#FF9800', 'litros'),
    ('Diesel',       'Gas oil / Diesel',                '#795548', 'litros'),
    ('Kerosene',     'Combustible para aviación/calef.','#607D8B', 'litros'),
    ('GNC',          'Gas Natural Comprimido',           '#4CAF50', 'm3')
ON CONFLICT (nombre) DO NOTHING;

-- Turnos por defecto (editables desde admin)
INSERT INTO surtidor.turnos_config (nombre, hora_inicio, duracion_horas, orden, color_hex)
VALUES
    ('Mañana', '06:00:00', 8, 1, '#FFC107'),
    ('Tarde',  '14:00:00', 8, 2, '#2196F3'),
    ('Noche',  '22:00:00', 8, 3, '#673AB7')
ON CONFLICT DO NOTHING;

-- Métodos de pago por defecto
INSERT INTO surtidor.metodos_pago (nombre, tipo, dias_reembolso)
VALUES
    ('Efectivo',   'efectivo', 0),
    ('Visa',       'tarjeta',  3),
    ('Mastercard', 'tarjeta',  3),
    ('Bancard',    'tarjeta',  2),
    ('AmEx',       'tarjeta',  5)
ON CONFLICT (nombre) DO NOTHING;
"""


async def init_surtidor():
    print("=" * 60)
    print("  SGS - Inicialización de Base de Datos del Surtidor")
    print("=" * 60)

    async with engine.begin() as conn:
        # Ejecutar el SQL completo de creación del schema y tablas
        statements = [s.strip() for s in SQL_SCHEMA.split(";") if s.strip()]
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
                print(f"✓ OK: {stmt[:60].replace(chr(10), ' ')}...")
            except Exception as e:
                print(f"⚠  WARN: {e}")

    print("\n✅ Schema 'surtidor' inicializado correctamente.")
    print("   - Tipos de combustible cargados: Nafta Super, Nafta Común, Diesel, Kerosene, GNC")
    print("   - Turnos cargados: Mañana (06-14hs), Tarde (14-22hs), Noche (22-06hs)")
    print("   - Métodos de pago: Efectivo, Visa, Mastercard, Bancard, AmEx")
    print("\n   ➤ Ahora puede agregar tanques, islas y picos desde el Panel de Administración.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(init_surtidor())
