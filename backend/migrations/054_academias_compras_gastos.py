"""
Migration 054: Compras, Gastos de Empresa y Proveedores en Academias
====================================================================
1. Crea tabla academias.proveedores para prestadores y proveedores.
2. Crea tabla academias.compras_gastos para compras contado y a crédito (cuentas por pagar).
3. Flexibiliza el constraint de categoria en academias.movimientos_caja.
4. Crea índices de búsqueda y rendimiento.
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

statements = [
    # 1. Tabla academias.proveedores
    """
    CREATE TABLE IF NOT EXISTS academias.proveedores (
        id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id          UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        nombre               VARCHAR(200) NOT NULL,
        ruc_ci               VARCHAR(50),
        telefono             VARCHAR(50),
        email                VARCHAR(100),
        categoria_frecuente  VARCHAR(60),
        direccion            VARCHAR(250),
        notas                TEXT,
        activo               BOOLEAN      NOT NULL DEFAULT TRUE,
        creado_en            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_proveedores_academia ON academias.proveedores(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON academias.proveedores(activo);",

    # 2. Tabla academias.compras_gastos
    """
    CREATE TABLE IF NOT EXISTS academias.compras_gastos (
        id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id          UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        proveedor_id         UUID          REFERENCES academias.proveedores(id) ON DELETE SET NULL,
        proveedor_nombre     VARCHAR(200),
        tipo                 VARCHAR(50)   NOT NULL DEFAULT 'gasto_operativo',
        categoria            VARCHAR(60)   NOT NULL DEFAULT 'otro',
        concepto             VARCHAR(300)  NOT NULL,
        monto_total          NUMERIC(15,0) NOT NULL CHECK (monto_total > 0),
        monto_pagado         NUMERIC(15,0) NOT NULL DEFAULT 0,
        condicion_pago       VARCHAR(20)   NOT NULL DEFAULT 'contado' CHECK (condicion_pago IN ('contado', 'credito')),
        estado               VARCHAR(20)   NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado', 'pendiente', 'parcial', 'anulado')),
        fecha_emision        DATE          NOT NULL DEFAULT CURRENT_DATE,
        fecha_vencimiento    DATE,
        comprobante_nro      VARCHAR(100),
        cuenta_id            UUID          REFERENCES academias.cuentas(id) ON DELETE SET NULL,
        metodo_pago_id       UUID          REFERENCES academias.metodos_pago(id) ON DELETE SET NULL,
        movimiento_caja_id   UUID          REFERENCES academias.movimientos_caja(id) ON DELETE SET NULL,
        notas                TEXT,
        registrado_por       INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
        creado_en            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_compras_academia ON academias.compras_gastos(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_compras_fecha_emision ON academias.compras_gastos(fecha_emision);",
    "CREATE INDEX IF NOT EXISTS idx_compras_estado ON academias.compras_gastos(estado);",
    "CREATE INDEX IF NOT EXISTS idx_compras_condicion ON academias.compras_gastos(condicion_pago);",
    "CREATE INDEX IF NOT EXISTS idx_compras_categoria ON academias.compras_gastos(categoria);",
    "CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON academias.compras_gastos(proveedor_id);",

    # 3. Flexibilizar check constraint en academias.movimientos_caja para admitir categorías adicionales
    """
    ALTER TABLE academias.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_categoria_check;
    """,
]


async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        for stmt in statements:
            cleaned = stmt.strip()
            if cleaned:
                print(f"Ejecutando: {cleaned[:60]}...")
                await conn.execute(text(cleaned))
        print("MIGRATION 054 COMPLETADA CON ÉXITO")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
