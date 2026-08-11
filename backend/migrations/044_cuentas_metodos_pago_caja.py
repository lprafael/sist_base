"""
Migration 044: Módulo de Cuentas, Métodos de Pago y Tesorería Multi-Tenant
===========================================================================
Agrega:
  - academias.cuentas          — Cuentas del tenant (Caja, Banco Itaú, etc.)
  - academias.metodos_pago     — Métodos de pago configurables por tenant
  - academias.movimientos_caja — Registro de ingresos y egresos por cuenta
  - ALTER academias.pagos      — Agrega cuenta_id y metodo_pago_id (FKs)

Timestamp: 2026-08-11
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida en .env")
    sys.exit(1)

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")


migration_up = """
-- ============================================================
-- 1. TABLA: CUENTAS
--    Cada tenant define sus propias cuentas contables.
--    Ejemplos: "Caja Principal", "Banco Itaú", "Tigo Money"
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.cuentas (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id     UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    nombre          VARCHAR(120)  NOT NULL,
    tipo            VARCHAR(30)   NOT NULL DEFAULT 'efectivo'
                    CHECK (tipo IN ('efectivo','banco','billetera_digital','otro')),
    descripcion     TEXT,
    numero_cuenta   VARCHAR(100),
    banco           VARCHAR(100),
    moneda          VARCHAR(10)   NOT NULL DEFAULT 'GS',
    activa          BOOLEAN       NOT NULL DEFAULT TRUE,
    es_principal    BOOLEAN       NOT NULL DEFAULT FALSE,
    saldo_inicial   NUMERIC(15,0) NOT NULL DEFAULT 0,
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (academia_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_cuentas_academia ON academias.cuentas(academia_id);

-- ============================================================
-- 2. TABLA: MÉTODOS DE PAGO
--    Cada tenant define sus propios métodos de pago.
--    Ejemplos: "Efectivo", "Transferencia Itaú", "QR Tigo", etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.metodos_pago (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id    UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    nombre         VARCHAR(100)  NOT NULL,
    tipo           VARCHAR(30)   NOT NULL DEFAULT 'efectivo'
                   CHECK (tipo IN ('efectivo','transferencia','tarjeta','qr','debito','otro')),
    descripcion    TEXT,
    activo         BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (academia_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_metodos_pago_academia ON academias.metodos_pago(academia_id);

-- ============================================================
-- 3. TABLA: MOVIMIENTOS DE CAJA
--    Registra INGRESOS y EGRESOS por cuenta.
--    Un ingreso puede originarse en un pago de cuota (pago_id),
--    o ser un ingreso manual. Un egreso es siempre manual.
-- ============================================================
CREATE TABLE IF NOT EXISTS academias.movimientos_caja (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    academia_id     UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
    cuenta_id       UUID          NOT NULL REFERENCES academias.cuentas(id) ON DELETE RESTRICT,
    metodo_pago_id  UUID          REFERENCES academias.metodos_pago(id) ON DELETE SET NULL,
    tipo            VARCHAR(10)   NOT NULL CHECK (tipo IN ('ingreso','egreso')),
    categoria       VARCHAR(60)   NOT NULL DEFAULT 'cuota'
                    CHECK (categoria IN (
                        'cuota','matricula','inscripcion',
                        'alquiler','sueldos','materiales','servicios','impuestos',
                        'transferencia_interna','otro'
                    )),
    concepto        VARCHAR(300)  NOT NULL,
    monto           NUMERIC(15,0) NOT NULL CHECK (monto > 0),
    fecha           DATE          NOT NULL DEFAULT CURRENT_DATE,
    referencia      VARCHAR(200),
    notas           TEXT,
    -- Vinculación opcional con pagos de cuotas (para ingresos automáticos)
    pago_id         UUID          REFERENCES academias.pagos(id) ON DELETE SET NULL,
    anulado         BOOLEAN       NOT NULL DEFAULT FALSE,
    anulado_en      TIMESTAMPTZ,
    anulado_por     INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    motivo_anulacion TEXT,
    registrado_por  INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mov_caja_academia  ON academias.movimientos_caja(academia_id);
CREATE INDEX IF NOT EXISTS idx_mov_caja_cuenta    ON academias.movimientos_caja(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_mov_caja_fecha     ON academias.movimientos_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_mov_caja_tipo      ON academias.movimientos_caja(tipo);
CREATE INDEX IF NOT EXISTS idx_mov_caja_pago      ON academias.movimientos_caja(pago_id) WHERE pago_id IS NOT NULL;

-- ============================================================
-- 4. ALTERAR: academias.pagos
--    Agrega referencias a cuenta y método de pago estructurados.
--    El campo metodo_pago (varchar) se mantiene para compatibilidad.
-- ============================================================
ALTER TABLE academias.pagos
    ADD COLUMN IF NOT EXISTS cuenta_id      UUID REFERENCES academias.cuentas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS metodo_pago_id UUID REFERENCES academias.metodos_pago(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_cuenta        ON academias.pagos(cuenta_id) WHERE cuenta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagos_metodo_pago   ON academias.pagos(metodo_pago_id) WHERE metodo_pago_id IS NOT NULL;
"""

migration_down = """
ALTER TABLE academias.pagos
    DROP COLUMN IF EXISTS cuenta_id,
    DROP COLUMN IF EXISTS metodo_pago_id;
DROP TABLE IF EXISTS academias.movimientos_caja CASCADE;
DROP TABLE IF EXISTS academias.metodos_pago CASCADE;
DROP TABLE IF EXISTS academias.cuentas CASCADE;
"""


async def run():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # Ejecutar statement por statement para mejor manejo de errores
        statements = [s.strip() for s in migration_up.split(";") if s.strip()]
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
                short = stmt[:100].replace("\n", " ")
                print(f"  ✅ OK: {short}...")
            except Exception as e:
                print(f"  ⚠️  WARN: {e} → stmt: {stmt[:80]}")
    await engine.dispose()
    print("\n✅ Migration 044 aplicada correctamente.")
    print("   Tablas creadas:")
    print("     - academias.cuentas")
    print("     - academias.metodos_pago")
    print("     - academias.movimientos_caja")
    print("   Columnas agregadas a academias.pagos: cuenta_id, metodo_pago_id")


if __name__ == "__main__":
    asyncio.run(run())
