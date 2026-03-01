import os
import requests
import asyncio
import json
import logging
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cargar .env
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("No se encontró DATABASE_URL")
    sys.exit(1)

if "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL)

CATALOGS = {
    "departamentos": "https://www.anr.org.py/assets/p2026/departamento.json",
    "distritos": "https://www.anr.org.py/assets/p2026/distrito.json",
    "seccionales": "https://www.anr.org.py/assets/p2026/seccional.json",
    "locales": "https://www.anr.org.py/assets/p2026/local.json"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://www.anr.org.py/",
    "Accept": "application/json"
}

async def init_catalogs_db():
    async with engine.begin() as conn:
        logger.info("Creando/Verificando tablas de catálogos...")
        
        # Departamentos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS electoral.ref_departamentos (
                id INTEGER PRIMARY KEY,
                descripcion VARCHAR(255)
            );
        """))
        
        # Distritos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS electoral.ref_distritos (
                departamento_id INTEGER,
                id INTEGER,
                descripcion VARCHAR(255),
                PRIMARY KEY (departamento_id, id)
            );
        """))
        
        # Seccionales
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS electoral.ref_seccionales (
                departamento_id INTEGER,
                distrito_id INTEGER,
                seccional_id INTEGER,
                descripcion VARCHAR(255),
                PRIMARY KEY (departamento_id, distrito_id, seccional_id)
            );
        """))
        
        # Locales
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS electoral.ref_locales (
                departamento_id INTEGER,
                distrito_id INTEGER,
                seccional_id INTEGER,
                local_id INTEGER,
                descripcion VARCHAR(255),
                domicilio TEXT,
                PRIMARY KEY (departamento_id, distrito_id, seccional_id, local_id)
            );
        """))
        # Intentar agregar la columna geométrica si postgis está activo
        try:
            # Primero verificamos si existe postgis
            res = await conn.execute(text("SELECT count(*) FROM pg_extension WHERE extname = 'postgis'"))
            if res.scalar() > 0:
                # Verificar si la columna ya existe
                res_col = await conn.execute(text("""
                    SELECT count(*) FROM information_schema.columns 
                    WHERE table_schema = 'electoral' AND table_name = 'ref_locales' AND column_name = 'ubicacion'
                """))
                if res_col.scalar() == 0:
                    await conn.execute(text("ALTER TABLE electoral.ref_locales ADD COLUMN ubicacion GEOMETRY(POINT, 4326);"))
                    logger.info("Columna geométrica 'ubicacion' agregada a ref_locales.")
        except Exception as e:
            logger.warning(f"No se pudo agregar la columna geométrica (posiblemente falta PostGIS): {e}")

async def download_json(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Error {response.status_code} descargando {url}")
            return None
    except Exception as e:
        logger.error(f"Error descargando {url}: {str(e)}")
        return None

async def populate_catalogs():
    await init_catalogs_db()
    
    for name, url in CATALOGS.items():
        logger.info(f"Descargando catálogo: {name}...")
        data = await download_json(url)
        if not data:
            continue
        
        async with engine.begin() as conn:
            if name == "departamentos":
                logger.info(f"Insertando {len(data)} departamentos...")
                for item in data:
                    await conn.execute(text("""
                        INSERT INTO electoral.ref_departamentos (id, descripcion)
                        VALUES (:departamento, :descripcion)
                        ON CONFLICT (id) DO UPDATE SET descripcion = EXCLUDED.descripcion;
                    """), {"departamento": item["departamento"], "descripcion": item["descripcion"]})
            
            elif name == "distritos":
                logger.info(f"Insertando {len(data)} distritos...")
                for item in data:
                    await conn.execute(text("""
                        INSERT INTO electoral.ref_distritos (departamento_id, id, descripcion)
                        VALUES (:departamento, :distrito, :descripcion)
                        ON CONFLICT (departamento_id, id) DO UPDATE SET descripcion = EXCLUDED.descripcion;
                    """), {"departamento": item["departamento"], "distrito": item["distrito"], "descripcion": item["descripcion"]})
            
            elif name == "seccionales":
                logger.info(f"Insertando {len(data)} seccionales...")
                for item in data:
                    await conn.execute(text("""
                        INSERT INTO electoral.ref_seccionales (departamento_id, distrito_id, seccional_id, descripcion)
                        VALUES (:departamento, :distrito, :seccional, :descripcion)
                        ON CONFLICT (departamento_id, distrito_id, seccional_id) DO UPDATE SET descripcion = EXCLUDED.descripcion;
                    """), {
                        "departamento": item["departamento"], 
                        "distrito": item["distrito"], 
                        "seccional": item["seccional"], 
                        "descripcion": item["descripcion"]
                    })
            
            elif name == "locales":
                logger.info(f"Insertando {len(data)} locales...")
                for item in data:
                    # En local.json los campos pueden variar un poco
                    await conn.execute(text("""
                        INSERT INTO electoral.ref_locales (departamento_id, distrito_id, seccional_id, local_id, descripcion, domicilio)
                        VALUES (:departamento, :distrito, :seccional, :local, :descripcion, :domicilio)
                        ON CONFLICT (departamento_id, distrito_id, seccional_id, local_id) 
                        DO UPDATE SET descripcion = EXCLUDED.descripcion, domicilio = EXCLUDED.domicilio;
                    """), {
                        "departamento": item["departamento"], 
                        "distrito": item["distrito"], 
                        "seccional": item["seccional"], 
                        "local": item["local"], 
                        "descripcion": item["descripcion"],
                        "domicilio": item.get("domicilio")
                    })

async def main():
    await populate_catalogs()
    logger.info("Proceso de catálogos completado.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
