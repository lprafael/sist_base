"""
Script para descargar el padrón de la ANR y guardarlo en la base de datos local SIGEL.

Comandos de ejemplo:
-------------------
# Descargar el rango solicitado (1,000,001 a 2,000,000) con concurrencia:
python download_anr.py --start 1000001 --end 2000000 --concurrency 20 --batch 500

# Probar con un rango pequeño:
python download_anr.py --start 1951831 --end 1951840 --concurrency 5

# Recrear la tabla y probar:
python download_anr.py --test --recreate
"""
import os
import requests
import asyncio
import sys
import logging
import time
from datetime import datetime
from sqlalchemy import text, insert
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.dialects.postgresql import insert as pg_insert
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("download_padron.log")
    ]
)
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

engine = create_async_engine(DATABASE_URL, pool_size=20, max_overflow=10)

BASE_URL = "https://www.anr.org.py/assets/p2026"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://www.anr.org.py/",
    "Accept": "application/json"
}

# Variable global para la sesión de requests
session = requests.Session()
session.headers.update(HEADERS)

# Configurar pool para manejar concurrencia
from requests.adapters import HTTPAdapter
adapter = HTTPAdapter(pool_connections=100, pool_maxsize=100)
session.mount("https://", adapter)
session.mount("http://", adapter)

def build_url(cedula):
    c_str = str(cedula)
    c_str_padded = c_str.zfill(7)
    path = "/".join(list(c_str_padded[:4]))
    return f"{BASE_URL}/{path}/{cedula}.json"

async def init_db(force_recreate=False):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS electoral;"))
        if force_recreate:
            await conn.execute(text("DROP TABLE IF EXISTS electoral.anr_padron_2026;"))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS electoral.anr_padron_2026 (
                cedula VARCHAR(20) PRIMARY KEY,
                nombres VARCHAR(255),
                apellidos VARCHAR(255),
                nacimiento DATE,
                departamento INTEGER,
                distrito INTEGER,
                seccional INTEGER,
                local INTEGER,
                mesa INTEGER,
                orden INTEGER,
                fecha_descarga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        logger.info("Base de datos inicializada / verificada.")

def fetch_cedula(cedula, retries=3):
    url = build_url(cedula)
    for attempt in range(retries):
        try:
            # Aumentamos timeout a 15s
            response = session.get(url, timeout=15)
            if response.status_code == 200:
                data = response.json()
                nac_raw = data.get("nacimiento")
                nac_obj = None
                if nac_raw and nac_raw != "0000-00-00":
                    try:
                        nac_obj = datetime.strptime(nac_raw, "%Y-%m-%d").date()
                    except ValueError:
                        pass
                
                return {
                    "cedula": str(data.get("cedula")),
                    "nombres": data.get("nombres"),
                    "apellidos": data.get("apellidos"),
                    "nacimiento": nac_obj,
                    "departamento": data.get("departamento"),
                    "distrito": data.get("distrito"),
                    "seccional": data.get("seccional"),
                    "local": data.get("local"),
                    "mesa": data.get("mesa"),
                    "orden": data.get("orden")
                }
            elif response.status_code == 404:
                return None
            elif response.status_code == 429:
                wait = (attempt + 1) * 2
                logger.warning(f"Rate limited (429) para CI {cedula}. Reintento {attempt+1} en {wait}s...")
                time.sleep(wait)
            else:
                logger.warning(f"Error {response.status_code} para CI {cedula}. Reintento {attempt+1}...")
                time.sleep(1)
        except (requests.exceptions.Timeout, requests.exceptions.RequestException) as e:
            wait = (attempt + 1) * 2
            if attempt < retries - 1:
                logger.warning(f"Timeout/Error para CI {cedula}: {str(e)}. Reintento {attempt+1} en {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"Fallo definitivo para CI {cedula} tras {retries} intentos: {str(e)}")
    return None

async def save_batch(batch):
    if not batch:
        return
    
    async with engine.begin() as conn:
        # Definir la tabla directamente para usar insert() de PostgreSQL para Upsert eficiente
        from sqlalchemy import MetaData, Table, Column, String, Date, Integer
        metadata = MetaData(schema="electoral")
        anr_table = Table(
            "anr_padron_2026", metadata,
            Column("cedula", String, primary_key=True),
            Column("nombres", String),
            Column("apellidos", String),
            Column("nacimiento", Date),
            Column("departamento", Integer),
            Column("distrito", Integer),
            Column("seccional", Integer),
            Column("local", Integer),
            Column("mesa", Integer),
            Column("orden", Integer)
        )

        stmt = pg_insert(anr_table).values(batch)
        update_dict = {c.name: c for c in stmt.excluded if not c.primary_key}
        # Agregar fecha_descarga manualmente si fuera necesario, pero la DB tiene default
        stmt = stmt.on_conflict_do_update(
            index_elements=["cedula"],
            set_=update_dict
        )
        await conn.execute(stmt)

async def worker(queue, results_list, semaphore, stats):
    while True:
        cedula = await queue.get()
        if cedula is None:
            queue.task_done()
            break
        
        async with semaphore:
            result = await asyncio.to_thread(fetch_cedula, cedula)
            stats["checked"] += 1
            if result:
                results_list.append(result)
            
            # Log de progreso frecuente cada 50 CIs verificadas
            if stats["checked"] % 50 == 0:
                elapsed = time.time() - stats["start_time"]
                speed = stats["checked"] / elapsed if elapsed > 0 else 0
                logger.info(f"CI Verificadas: {stats['checked']} | Guardadas: {stats['saved']} | Vel: {speed:.2f} CI/s")
        
        queue.task_done()

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Descargador de Padrón ANR")
    parser.add_argument("--test", action="store_true")
    parser.add_argument("--cedula", type=int)
    parser.add_argument("--start", type=int, default=1000001)
    parser.add_argument("--end", type=int, default=2000000)
    parser.add_argument("--recreate", action="store_true")
    parser.add_argument("--concurrency", type=int, default=10, help="Número de descargas simultáneas")
    parser.add_argument("--batch", type=int, default=200, help="Tamaño de lote para guardar en DB")
    
    args = parser.parse_args()
    
    await init_db(force_recreate=args.recreate)
    
    cedulas_range = []
    if args.test:
        cedulas_range = [1951831, 3558002]
    elif args.cedula:
        cedulas_range = [args.cedula]
    else:
        cedulas_range = range(args.start, args.end + 1)
    
    total_to_process = len(cedulas_range)
    logger.info(f"Iniciando proceso para {total_to_process} cédulas...")
    
    queue = asyncio.Queue()
    results_list = []
    semaphore = asyncio.Semaphore(args.concurrency)
    
    stats = {
        "checked": 0,
        "saved": 0,
        "start_time": time.time()
    }
    
    # Iniciar trabajadores
    workers = []
    for _ in range(args.concurrency):
        workers.append(asyncio.create_task(worker(queue, results_list, semaphore, stats)))
    
    # Tarea para ir guardando lotes periódicamente
    async def batch_saver_task():
        while True:
            await asyncio.sleep(5) # Guardar cada 5 segundos lo que haya
            if results_list:
                to_save = []
                # Sacamos hasta un lote de la lista
                while len(to_save) < args.batch and results_list:
                    to_save.append(results_list.pop(0))
                
                if to_save:
                    await save_batch(to_save)
                    stats["saved"] += len(to_save)
            
            if queue.empty() and all(w.done() for w in workers) and not results_list:
                break
    
    saver_task = asyncio.create_task(batch_saver_task())

    for ci in cedulas_range:
        await queue.put(ci)
    
    # Indicar fin a los trabajadores
    for _ in range(args.concurrency):
        await queue.put(None)
    
    await queue.join()
    await asyncio.gather(*workers)
    
    # Guardar resto de resultados
    if results_list:
        await save_batch(results_list)
        stats["saved"] += len(results_list)
        results_list.clear()

    await saver_task
    
    total_time = time.time() - stats["start_time"]
    logger.info(f"Proceso finalizado en {total_time:.2f} segundos.")
    logger.info(f"Total verificadas: {stats['checked']}")
    logger.info(f"Total guardadas con éxito: {stats['saved']}")
    
    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Proceso interrumpido por el usuario.")
