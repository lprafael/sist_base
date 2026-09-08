"""
Migración 049 — Video Review / Replay
Crea la tabla torneos.video_reviews para registrar las apelaciones
de Video Replay en combates de artes marciales (WKF, ASAM).
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

migration_statements = [
    """
    CREATE TABLE IF NOT EXISTS torneos.video_reviews (
        id SERIAL PRIMARY KEY,
        partido_id INTEGER NOT NULL,
        competidor_color VARCHAR(10) NOT NULL
            CHECK (competidor_color IN ('Aka', 'Ao', 'Blanco', 'Rojo')),
        tiempo_cronometro VARCHAR(10) NOT NULL,
        tipo_solicitud VARCHAR(20) NOT NULL
            CHECK (tipo_solicitud IN ('YUKO','WAZA_ARI','IPPON','SENSHU','OTRO')),
        resultado VARCHAR(20)
            CHECK (resultado IN ('ACEPTADO','RECHAZADO','MIENAI')),
        puntos_otorgados INTEGER DEFAULT 0,
        clip_url VARCHAR(255),
        reglamento VARCHAR(10) DEFAULT 'WKF',
        resuelto BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        resuelto_at TIMESTAMP
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_video_reviews_partido
        ON torneos.video_reviews(partido_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_video_reviews_resuelto
        ON torneos.video_reviews(resuelto)
    """,
    """
    COMMENT ON TABLE torneos.video_reviews IS
        'Registro de solicitudes de Video Review en combates de artes marciales (WKF/ASAM)'
    """,
]


async def run_migration():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL no esta definida.")
        sys.exit(1)

    engine = create_async_engine(database_url, echo=True)
    async with engine.begin() as conn:
        print("Ejecutando migracion 049 (video_reviews) UP...")
        for stmt in migration_statements:
            await conn.execute(text(stmt))
        print("Migracion 049 completada exitosamente.")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
