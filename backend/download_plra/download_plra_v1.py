"""
download_plra_v1.py - Descargador de Padrón PLRA optimizado.
Inspirado en download_anr_v2.py.
"""
import os
import asyncio
import sys
import logging
import time
from collections import deque
from datetime import datetime
from dotenv import load_dotenv

# ——— Dependencias ———
try:
    import httpx
except ImportError:
    print("Instala httpx: pip install httpx")
    sys.exit(1)

import asyncpg

# ——— Logging ———
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("download_plra_v1.log")
    ]
)
logger = logging.getLogger(__name__)

# Silenciar loggers verbosos
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)

# ——— Config ———
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_DSN = DATABASE_URL \
    .replace("postgresql+asyncpg://", "postgresql://") \
    .replace("postgresql+psycopg2://", "postgresql://")

if not os.path.exists('/.dockerenv'):
    if "@db:" in DB_DSN:
        DB_DSN = DB_DSN.replace("@db:5432/", "@localhost:5433/")
    elif "@localhost:5432/" in DB_DSN:
        DB_DSN = DB_DSN.replace("@localhost:5432/", "@localhost:5433/")

BASE_URL = "https://plra.org.py/public/buscar_padron.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Referer": "https://plra.org.py/public/buscar_enrcp.php",
    "Authorization": "Bearer antijakerclavesecreta321",
    "Accept": "*/*"
}

def build_url(cedula: int) -> str:
    return f"{BASE_URL}?cedula={cedula}"

async def init_db(pool: asyncpg.Pool, force_recreate: bool = False):
    async with pool.acquire() as conn:
        await conn.execute("CREATE SCHEMA IF NOT EXISTS electoral;")
        if force_recreate:
            await conn.execute("DROP TABLE IF EXISTS electoral.plra_padron;")
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS electoral.plra_padron (
                cedula VARCHAR(20) PRIMARY KEY,
                nombre VARCHAR(255),
                apellido VARCHAR(255),
                sexo VARCHAR(5),
                fec_nac DATE,
                fec_inscri DATE,
                direcc TEXT,
                departamento_nombre VARCHAR(255),
                distrito_nombre VARCHAR(255),
                zona_nombre VARCHAR(255),
                comite_nombre VARCHAR(255),
                local_generales VARCHAR(255),
                local_interna VARCHAR(255),
                afiliaciones TEXT,
                afiliacion_plra_2025 VARCHAR(10),
                voto_anr VARCHAR(10),
                fecha_descarga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Crear indice por cedula integer para busquedas rapidas si es necesario char->int
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_plra_cedula_int ON electoral.plra_padron ((cedula::integer));")
    logger.info("Tabla plra_padron verficada.")

async def get_existing_cedulas(pool: asyncpg.Pool, start: int, end: int) -> set:
    logger.info(f"Verificando cédulas PLRA ya descargadas en rango {start}-{end}...")
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT cedula::integer FROM electoral.plra_padron WHERE cedula::integer BETWEEN $1 AND $2",
            start, end
        )
    existing = {row['cedula'] for row in rows}
    logger.info(f"  -> {len(existing)} cedulas ya existen en DB, serán omitidas.")
    return existing

async def fetch_single(client: httpx.AsyncClient, cedula: int, semaphore: asyncio.Semaphore, retries: int = 3):
    url = build_url(cedula)
    async with semaphore:
        for attempt in range(retries):
            try:
                resp = await client.get(url, timeout=12.0)
                if resp.status_code == 200:
                    try:
                        data_list = resp.json()
                        if not data_list or not isinstance(data_list, list):
                            return None
                        data = data_list[0]
                    except:
                        return None
                    
                    def parse_date(d_str):
                        if not d_str or d_str == "0000-00-00" or d_str == "null":
                            return None
                        try:
                            return datetime.strptime(d_str, "%Y-%m-%d").date()
                        except:
                            return None

                    return {
                        "cedula": str(data.get("cedula")),
                        "nombre": data.get("nombre"),
                        "apellido": data.get("apellido"),
                        "sexo": data.get("sexo"),
                        "fec_nac": parse_date(data.get("fec_nac")),
                        "fec_inscri": parse_date(data.get("fec_inscri")),
                        "direcc": data.get("direcc"),
                        "departamento_nombre": data.get("departamento_nombre"),
                        "distrito_nombre": data.get("distrito_nombre"),
                        "zona_nombre": data.get("zona_nombre"),
                        "comite_nombre": data.get("comite_nombre"),
                        "local_generales": data.get("local_genrales"), # Ojo con el typo en la API "genrales"
                        "local_interna": data.get("local_inerna"),    # Ojo con el typo en la API "inerna"
                        "afiliaciones": data.get("afiliaciones"),
                        "afiliacion_plra_2025": data.get("afiliacion_plra_2025"),
                        "voto_anr": data.get("voto_anr")
                    }
                elif resp.status_code == 404:
                    return None
                elif resp.status_code == 429:
                    logger.warning(f"Rate limited (429) en CI {cedula}. Reintentando...")
                    await asyncio.sleep((attempt + 1) * 5)
                else:
                    await asyncio.sleep(1)
            except Exception as e:
                if attempt == retries - 1:
                    logger.error(f"Error fatal en CI {cedula}: {str(e)}")
                await asyncio.sleep((attempt + 1) * 2)
    return None

async def save_batch_asyncpg(pool: asyncpg.Pool, batch: list) -> int:
    if not batch:
        return 0
    
    sql = """
        INSERT INTO electoral.plra_padron 
            (cedula, nombre, apellido, sexo, fec_nac, fec_inscri, direcc, 
             departamento_nombre, distrito_nombre, zona_nombre, comite_nombre, 
             local_generales, local_interna, afiliaciones, afiliacion_plra_2025, voto_anr)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (cedula) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            apellido = EXCLUDED.apellido,
            sexo = EXCLUDED.sexo,
            fec_nac = EXCLUDED.fec_nac,
            fec_inscri = EXCLUDED.fec_inscri,
            direcc = EXCLUDED.direcc,
            departamento_nombre = EXCLUDED.departamento_nombre,
            distrito_nombre = EXCLUDED.distrito_nombre,
            zona_nombre = EXCLUDED.zona_nombre,
            comite_nombre = EXCLUDED.comite_nombre,
            local_generales = EXCLUDED.local_generales,
            local_interna = EXCLUDED.local_interna,
            afiliaciones = EXCLUDED.afiliaciones,
            afiliacion_plra_2025 = EXCLUDED.afiliacion_plra_2025,
            voto_anr = EXCLUDED.voto_anr,
            fecha_descarga = CURRENT_TIMESTAMP
    """
    records = [
        (
            r["cedula"], r["nombre"], r["apellido"], r["sexo"], r["fec_nac"], r["fec_inscri"],
            r["direcc"], r["departamento_nombre"], r["distrito_nombre"], r["zona_nombre"],
            r["comite_nombre"], r["local_generales"], r["local_interna"], r["afiliaciones"],
            r["afiliacion_plra_2025"], r["voto_anr"]
        )
        for r in batch
    ]
    
    async with pool.acquire() as conn:
        await conn.executemany(sql, records)
    return len(records)

async def get_max_cedula(pool: asyncpg.Pool) -> int:
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT max(cedula::integer) as max_ci, count(*) as total FROM electoral.plra_padron")
        return row['max_ci'] or 0, row['total'] or 0

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Descargador de Padron PLRA v1")
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=8000000)
    parser.add_argument("--concurrency", type=int, default=20, help="Workers HTTP simultaneos")
    parser.add_argument("--batch", type=int, default=500, help="Registros por INSERT batch")
    parser.add_argument("--recreate", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--auto-resume", action="store_true")
    args = parser.parse_args()

    pool = await asyncpg.create_pool(DB_DSN, min_size=2, max_size=10)
    await init_db(pool, args.recreate)

    start_val = args.start
    if args.auto_resume:
        max_ci, total_db = await get_max_cedula(pool)
        if max_ci > 0:
            start_val = max_ci + 1
            logger.info(f"Auto-resume PLRA: Max CI {max_ci:,}. Iniciando desde {start_val:,}")

    cedulas = list(range(start_val, args.end + 1))

    if args.skip_existing:
        existing = await get_existing_cedulas(pool, start_val, args.end)
        cedulas = [c for c in cedulas if c not in existing]
        logger.info(f"Quedan {len(cedulas)} cedulas PLRA por descargar.")

    total = len(cedulas)
    if total == 0:
        logger.info("Nada que descargar.")
        await pool.close()
        return

    logger.info(f"Iniciando descarga PLRA de {total} cedulas | Concurrencia={args.concurrency}")

    buffer = deque()
    stats = {"checked": 0, "saved": 0, "start_time": time.time(), "done": False}

    async def saver_task():
        while not stats["done"] or buffer:
            if len(buffer) >= args.batch:
                batch = [buffer.popleft() for _ in range(min(args.batch, len(buffer)))]
                saved = await save_batch_asyncpg(pool, batch)
                stats["saved"] += saved
            await asyncio.sleep(0.5)
        if buffer:
            batch = list(buffer)
            buffer.clear()
            saved = await save_batch_asyncpg(pool, batch)
            stats["saved"] += saved

    async def progress_task():
        while not stats["done"]:
            await asyncio.sleep(10)
            elapsed = time.time() - stats["start_time"]
            speed = stats["checked"] / elapsed if elapsed > 0 else 0
            eta_m = ((total - stats["checked"]) / speed / 60) if speed > 0 else 0
            logger.info(f"Progress: {stats['checked']}/{total} ({stats['checked']/total*100:.1f}%) | Saved: {stats['saved']} | Speed: {speed:.1f} CI/s | ETA: {eta_m:.1f} min")

    queue = asyncio.Queue(maxsize=args.concurrency * 2)

    async def worker(client):
        while True:
            cedula = await queue.get()
            if cedula is None:
                queue.task_done()
                break
            try:
                result = await fetch_single(client, cedula, asyncio.Semaphore(1))
                stats["checked"] += 1
                if result:
                    buffer.append(result)
            finally:
                queue.task_done()

    saver = asyncio.create_task(saver_task())
    progress = asyncio.create_task(progress_task())

    limits = httpx.Limits(max_connections=args.concurrency + 5, max_keepalive_connections=args.concurrency)
    async with httpx.AsyncClient(headers=HEADERS, limits=limits) as client:
        workers = [asyncio.create_task(worker(client)) for _ in range(args.concurrency)]
        for c in cedulas:
            await queue.put(c)
        for _ in range(args.concurrency):
            await queue.put(None)
        await queue.join()
        await asyncio.gather(*workers)

    stats["done"] = True
    await saver
    progress.cancel()
    
    logger.info(f"Descarga PLRA finalizada. Guardadas: {stats['saved']}")
    await pool.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrumpido por el usuario.")
