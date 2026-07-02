import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "admin")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "BBDD_micancha")
    DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # replace host.docker.internal with localhost if running locally
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

migration_up = """
ALTER TABLE cancha.torneos 
ADD COLUMN IF NOT EXISTS limite_deuda_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS limite_deuda_monto NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa_amarilla_monto NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa_roja_monto NUMERIC(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS cancha.cuenta_corriente_equipos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id   UUID NOT NULL REFERENCES cancha.torneos(id),
    equipo_id   UUID NOT NULL REFERENCES cancha.torneos_equipos(id),
    concepto    VARCHAR(100) NOT NULL,
    monto       NUMERIC(12,2) NOT NULL,
    estado      VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    referencia_pago_id UUID REFERENCES cancha.torneos_pagos(id),
    partido_id  UUID REFERENCES cancha.torneos_partidos(id),
    creado_por  INTEGER REFERENCES sistema.usuarios(id),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_torneo ON cancha.cuenta_corriente_equipos(torneo_id);
CREATE INDEX IF NOT EXISTS idx_cc_equipo ON cancha.cuenta_corriente_equipos(equipo_id);
CREATE INDEX IF NOT EXISTS idx_cc_estado ON cancha.cuenta_corriente_equipos(estado);
"""

migration_down = """
DROP INDEX IF EXISTS idx_cc_estado;
DROP INDEX IF EXISTS idx_cc_equipo;
DROP INDEX IF EXISTS idx_cc_torneo;
DROP TABLE IF EXISTS cancha.cuenta_corriente_equipos;
ALTER TABLE cancha.torneos 
DROP COLUMN IF EXISTS limite_deuda_habilitado,
DROP COLUMN IF EXISTS limite_deuda_monto,
DROP COLUMN IF EXISTS multa_amarilla_monto,
DROP COLUMN IF EXISTS multa_roja_monto;
"""
