"""
Migration 053: Modalidades Deportivas en Academias
===================================================
1. Crea la tabla academias.modalidades (Formas, Combate, Danza, Libre, etc.).
2. Añade columna modalidad_id a academias.categorias con foreign key y ON DELETE SET NULL.
3. Añade índices de búsqueda por academia y modalidad.
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
    # 1. Tabla academias.modalidades
    """
    CREATE TABLE IF NOT EXISTS academias.modalidades (
        id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        academia_id    UUID         NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
        nombre         VARCHAR(100) NOT NULL,
        deporte        VARCHAR(60),
        descripcion    TEXT,
        color          VARCHAR(20)  NOT NULL DEFAULT '#3B82F6',
        activa         BOOLEAN      NOT NULL DEFAULT TRUE,
        creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_modalidades_academia ON academias.modalidades(academia_id);",
    "CREATE INDEX IF NOT EXISTS idx_modalidades_activa ON academias.modalidades(activa);",

    # 2. Agregar modalidad_id a academias.categorias
    """
    ALTER TABLE academias.categorias
        ADD COLUMN IF NOT EXISTS modalidad_id UUID REFERENCES academias.modalidades(id) ON DELETE SET NULL;
    """,
    "CREATE INDEX IF NOT EXISTS idx_categorias_modalidad ON academias.categorias(modalidad_id);",
]


async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        for stmt in statements:
            cleaned = stmt.strip()
            if cleaned:
                print(f"Ejecutando: {cleaned[:60]}...")
                await conn.execute(text(cleaned))
        print("MIGRATION 053 COMPLETADA CON ÉXITO")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
