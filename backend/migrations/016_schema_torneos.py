import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Añadir el directorio padre (backend) al sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

# Configuración de base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql+asyncpg://postgres:admin@host.docker.internal:5432/BBDD_micancha"

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

migration_up = """
CREATE SCHEMA IF NOT EXISTS torneos;

-- Movemos las tablas y luego las renombramos para sacar el prefijo torneos_
ALTER TABLE torneos.torneos SET SCHEMA torneos;

ALTER TABLE torneos.equipos SET SCHEMA torneos;
ALTER TABLE torneos.torneos_equipos RENAME TO equipos;

ALTER TABLE torneos.partidos SET SCHEMA torneos;
ALTER TABLE torneos.torneos_partidos RENAME TO partidos;

ALTER TABLE torneos.posiciones SET SCHEMA torneos;
ALTER TABLE torneos.torneos_posiciones RENAME TO posiciones;

ALTER TABLE torneos.planilla SET SCHEMA torneos;
ALTER TABLE torneos.torneos_planilla RENAME TO planilla;

ALTER TABLE torneos.goles SET SCHEMA torneos;
ALTER TABLE torneos.torneos_goles RENAME TO goles;

ALTER TABLE torneos.tarjetas SET SCHEMA torneos;
ALTER TABLE torneos.torneos_tarjetas RENAME TO tarjetas;

ALTER TABLE torneos.sanciones SET SCHEMA torneos;
ALTER TABLE torneos.torneos_sanciones RENAME TO sanciones;

ALTER TABLE torneos.pagos SET SCHEMA torneos;
ALTER TABLE torneos.torneos_pagos RENAME TO pagos;

ALTER TABLE torneos.eventos SET SCHEMA torneos;
ALTER TABLE torneos.torneos_eventos RENAME TO eventos;

ALTER TABLE torneos.noticias SET SCHEMA torneos;
ALTER TABLE torneos.noticias_torneo RENAME TO noticias;
"""

migration_down = """
-- Rollback de renombre y movimiento de esquema
ALTER TABLE torneos.noticias RENAME TO noticias_torneo;
ALTER TABLE torneos.noticias_torneo SET SCHEMA cancha;

ALTER TABLE torneos.eventos RENAME TO torneos_eventos;
ALTER TABLE torneos.torneos_eventos SET SCHEMA cancha;

ALTER TABLE torneos.pagos RENAME TO torneos_pagos;
ALTER TABLE torneos.torneos_pagos SET SCHEMA cancha;

ALTER TABLE torneos.sanciones RENAME TO torneos_sanciones;
ALTER TABLE torneos.torneos_sanciones SET SCHEMA cancha;

ALTER TABLE torneos.tarjetas RENAME TO torneos_tarjetas;
ALTER TABLE torneos.torneos_tarjetas SET SCHEMA cancha;

ALTER TABLE torneos.goles RENAME TO torneos_goles;
ALTER TABLE torneos.torneos_goles SET SCHEMA cancha;

ALTER TABLE torneos.planilla RENAME TO torneos_planilla;
ALTER TABLE torneos.torneos_planilla SET SCHEMA cancha;

ALTER TABLE torneos.posiciones RENAME TO torneos_posiciones;
ALTER TABLE torneos.torneos_posiciones SET SCHEMA cancha;

ALTER TABLE torneos.partidos RENAME TO torneos_partidos;
ALTER TABLE torneos.torneos_partidos SET SCHEMA cancha;

ALTER TABLE torneos.equipos RENAME TO torneos_equipos;
ALTER TABLE torneos.torneos_equipos SET SCHEMA cancha;

ALTER TABLE torneos.torneos SET SCHEMA cancha;

DROP SCHEMA torneos;
"""
