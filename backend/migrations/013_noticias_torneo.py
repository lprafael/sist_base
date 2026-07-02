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
    DATABASE_URL = "postgresql+asyncpg://postgres:admin@host.docker.internal:5432/BBDD_playa"

if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

async def run_migration():
    print(f"Conectando a {DATABASE_URL} para Migracion 013...")
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        print("Creando tabla cancha.noticias_torneo...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.noticias_torneo (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                torneo_id UUID NOT NULL REFERENCES cancha.torneos(id),
                titulo VARCHAR(255) NOT NULL,
                contenido TEXT NOT NULL,
                autor VARCHAR(100),
                fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
                es_ia BOOLEAN DEFAULT FALSE,
                prompt_usado TEXT,
                creado_en TIMESTAMPTZ DEFAULT NOW()
            );
        """))

        print("Creando indices...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_noticias_torneo_id ON cancha.noticias_torneo(torneo_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_noticias_fecha ON cancha.noticias_torneo(fecha_publicacion DESC);"))

    await engine.dispose()
    print("Migracion 013 completada con exito.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
