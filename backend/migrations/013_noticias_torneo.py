import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Añadir el directorio padre (backend) al sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

# Configuración de base de datos extraída de 012
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql+asyncpg://postgres:admin@host.docker.internal:5432/BBDD_micancha"

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

migration_up = """
CREATE TABLE IF NOT EXISTS torneos.noticias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id UUID NOT NULL REFERENCES torneos.torneos(id),
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    autor VARCHAR(100),
    fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
    es_ia BOOLEAN DEFAULT FALSE,
    prompt_usado TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_noticias_torneo_id ON torneos.noticias(torneo_id);
CREATE INDEX IF NOT EXISTS idx_noticias_fecha ON torneos.noticias(fecha_publicacion DESC);
"""

migration_down = """
DROP INDEX IF EXISTS idx_noticias_fecha;
DROP INDEX IF EXISTS idx_noticias_torneo_id;
DROP TABLE IF EXISTS torneos.noticias;
"""
