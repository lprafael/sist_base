"""
download_anr_v2.py - Versión optimizada del descargador de Padrón ANR.

Mejoras respecto a v1:
- httpx AsyncClient para peticiones HTTP 100% async (sin threads)
- deque en vez de list para el buffer de resultados (O(1) vs O(n))
- Tabla SQLAlchemy pre-cacheada fuera del loop de guardado
- INSERT con COPY via asyncpg para máxima velocidad de escritura
- Semaphore agresivo (hasta 100 concurrent requests)
- Skip inteligente: descarga bloques por rango y evita re-descargar

Comandos de ejemplo:
--------------------
# Descargar rango con alta concurrencia:
python download_anr_v2.py --start 1109405 --end 2000000 --concurrency 50 --batch 1000

# Continuar desde donde se detuvo (no re-descarga lo ya guardado):
python download_anr_v2.py --start 1109405 --end 2000000 --concurrency 50 --skip-existing
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
        logging.FileHandler("download_padron_v2.log")
    ]
)
logger = logging.getLogger(__name__)

# Silenciar loggers verbosos de httpx y asyncio
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)

# ——— Config ———
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL", "")
# Convertir a formato asyncpg (sin driver prefix)
DB_DSN = DATABASE_URL \
    .replace("postgresql+asyncpg://", "postgresql://") \
    .replace("postgresql+psycopg2://", "postgresql://")

# Ajuste de DSN según el entorno (Docker vs Local)
# Si NO estamos en Docker, y vemos '@db:', cambiamos a localhost para desarrollo local
# Nota: Usamos 5434 que es el puerto mapeado en docker-compose.yml
if not os.path.exists('/.dockerenv') and not os.path.exists('/run/.containerenv'):
    if "@db:5432/" in DB_DSN:
        DB_DSN = DB_DSN.replace("@db:5432/", "@localhost:5434/")
    elif "@localhost:5432/" in DB_DSN:
        DB_DSN = DB_DSN.replace("@localhost:5432/", "@localhost:5434/")
else:
    # Si estamos en Docker, nos aseguramos de usar el host 'db' interno
    logger.info("Entorno Docker detectado, usando host 'db'")


BASE_URL = "https://www.anr.org.py/assets/p2026"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.anr.org.py/",
    "Accept": "application/json"
}

def build_url(cedula: int) -> str:
    c_str = str(cedula).zfill(7)
    path = "/".join(list(c_str[:4]))
    return f"{BASE_URL}/{path}/{cedula}.json"


async def init_db(pool: asyncpg.Pool, force_recreate: bool = False):
    async with pool.acquire() as conn:
        await conn.execute("CREATE SCHEMA IF NOT EXISTS electoral;")
        if force_recreate:
            await conn.execute("DROP TABLE IF EXISTS electoral.anr_padron_2026;")
        await conn.execute("""
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
        """)
    logger.info("Tabla anr_padron_2026 verficada.")


async def get_existing_cedulas(pool: asyncpg.Pool, start: int, end: int) -> set:
    """Obtiene las cédulas ya descargadas en el rango para evitar re-descargas."""
    logger.info(f"Verificando cédulas ya descargadas en rango {start}-{end}...")
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT cedula::integer FROM electoral.anr_padron_2026 WHERE cedula::integer BETWEEN $1 AND $2",
            start, end
        )
    existing = {row['cedula'] for row in rows}
    logger.info(f"  -> {len(existing)} cedulas ya descargadas, seran omitidas.")
    return existing


async def fetch_single(client: httpx.AsyncClient, cedula: int, semaphore: asyncio.Semaphore, retries: int = 2):
    """Descarga un JSON de CI de forma asíncrona."""
    url = build_url(cedula)
    async with semaphore:
        for attempt in range(retries):
            try:
                resp = await client.get(url, timeout=8.0)
                if resp.status_code == 200:
                    data = resp.json()
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
                        "orden": data.get("orden"),
                    }
                elif resp.status_code == 404:
                    return None
                elif resp.status_code == 429:
                    await asyncio.sleep((attempt + 1) * 3)
                else:
                    await asyncio.sleep(0.5)
            except (httpx.TimeoutException, httpx.RequestError):
                if attempt < retries - 1:
                    await asyncio.sleep((attempt + 1) * 1)
    return None


async def save_batch_asyncpg(pool: asyncpg.Pool, batch: list) -> int:
    """
    Guarda un lote usando executemany con asyncpg — mucho más rápido que SQLAlchemy upsert.
    """
    if not batch:
        return 0
    
    sql = """
        INSERT INTO electoral.anr_padron_2026 
            (cedula, nombres, apellidos, nacimiento, departamento, distrito, seccional, local, mesa, orden)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (cedula) DO UPDATE SET
            nombres = EXCLUDED.nombres,
            apellidos = EXCLUDED.apellidos,
            nacimiento = EXCLUDED.nacimiento,
            departamento = EXCLUDED.departamento,
            distrito = EXCLUDED.distrito,
            seccional = EXCLUDED.seccional,
            local = EXCLUDED.local,
            mesa = EXCLUDED.mesa,
            orden = EXCLUDED.orden,
            fecha_descarga = CURRENT_TIMESTAMP
    """
    records = [
        (
            r["cedula"], r["nombres"], r["apellidos"], r["nacimiento"],
            r["departamento"], r["distrito"], r["seccional"],
            r["local"], r["mesa"], r["orden"]
        )
        for r in batch
    ]
    
    async with pool.acquire() as conn:
        await conn.executemany(sql, records)
    
    return len(records)


async def get_max_cedula(pool: asyncpg.Pool) -> int:
    """Consulta la cedula maxima y el conteo total en la base de datos."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT max(cedula::integer) as max_ci, count(*) as total FROM electoral.anr_padron_2026")
        return row['max_ci'] or 0, row['total'] or 0


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Descargador de Padron ANR v2 (optimizado)")
    parser.add_argument("--start", type=int, default=2000001)
    parser.add_argument("--end", type=int, default=3000000)
    parser.add_argument("--concurrency", type=int, default=50, help="Workers HTTP simultaneos")
    parser.add_argument("--batch", type=int, default=1000, help="Registros por INSERT batch")
    parser.add_argument("--recreate", action="store_true")
    parser.add_argument("--skip-existing", action="store_true", help="Omite CIs ya descargadas en el rango")
    parser.add_argument("--fill-gaps", action="store_true", help="Detecta y descarga TODOS los huecos automaticamente")
    parser.add_argument("--auto-resume", action="store_true", help="Inicia desde max(cedula) + 1")
    parser.add_argument("--test", action="store_true", help="Prueba con 100 CIs")
    args = parser.parse_args()

    pool = await asyncpg.create_pool(DB_DSN, min_size=5, max_size=20)
    await init_db(pool, args.recreate)

    # Identificar cedulas a descargar
    cedulas = []

    if args.fill_gaps:
        logger.info("Modo FILL-GAPS activado. Analizando faltantes en toda la base de datos...")
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT cedula::integer FROM electoral.anr_padron_2026 ORDER BY cedula::integer")
        
        existentes_list = [r[0] for r in rows]
        if not existentes_list:
            logger.warning("Base de datos vacia. Usando rango default.")
            cedulas = list(range(args.start, args.end + 1))
        else:
            # Encontrar huecos entre el mínimo y el máximo actual
            # O simplemente barrer hasta un tope razonable (ej. 9.5M)
            max_tope = 9500000
            existentes_set = set(existentes_list)
            min_ci = existentes_list[0]
            max_ci = existentes_list[-1]
            
            logger.info(f"Rango en DB: {min_ci:,} a {max_ci:,}. Buscando huecos...")
            
            # Generamos faltantes en el bloque conocido + hasta el tope
            rango_completo = range(min_ci, max_tope + 1)
            cedulas = [c for c in rango_completo if c not in existentes_set]
            
            logger.info(f"Detectados {len(cedulas):,} cedulas faltantes.")

    elif args.auto_resume:
        max_ci, total_db = await get_max_cedula(pool)
        if max_ci > 0:
            start_val = max_ci + 1
            logger.info(f"Auto-resume activado. Max CI en DB: {max_ci:,} (Total: {total_db:,}). Iniciando desde: {start_val:,}")
        else:
            logger.info("Auto-resume activado pero la base de datos esta vacia. Iniciando desde el default.")
        cedulas = list(range(start_val, args.end + 1))

    elif args.test:
        cedulas = list(range(args.start, args.start + 100))
    else:
        # Modo por defecto (rango manual) si no fue llenado por fill_gaps
        if not cedulas:
            cedulas = list(range(args.start, args.end + 1))

    # Si se pide skip-existing y NO estamos en modo gaps (que ya lo hace), filtramos
    if args.skip_existing and not args.fill_gaps:
        existing = await get_existing_cedulas(pool, args.start, args.end)
        cedulas = [c for c in cedulas if c not in existing]
        logger.info(f"Quedan {len(cedulas)} cedulas por descargar.")

    total = len(cedulas)
    logger.info(f"Iniciando descarga de {total} cedulas con concurrencia={args.concurrency}...")


    # Resetear el tiempo AQUI, despues de skip-existing
    buffer = deque()
    stats = {"checked": 0, "saved": 0, "start_time": time.time(), "done": False}

    # --- Saver task ---
    async def saver_task():
        while not stats["done"] or buffer:
            if len(buffer) >= args.batch:
                batch = [buffer.popleft() for _ in range(min(args.batch, len(buffer)))]
                saved = await save_batch_asyncpg(pool, batch)
                stats["saved"] += saved
            await asyncio.sleep(1)
        if buffer:
            batch = list(buffer)
            buffer.clear()
            saved = await save_batch_asyncpg(pool, batch)
            stats["saved"] += saved

    # --- Progress task ---
    async def progress_task():
        while not stats["done"]:
            await asyncio.sleep(15)
            elapsed = time.time() - stats["start_time"]
            speed = stats["checked"] / elapsed if elapsed > 0 else 0
            pct = stats["checked"] / total * 100 if total > 0 else 0
            eta_s = (total - stats["checked"]) / speed if speed > 0 else 0
            tasa_hit = stats["saved"] / stats["checked"] * 100 if stats["checked"] > 0 else 0
            logger.info(
                f"[{pct:.1f}%] {stats['checked']:,}/{total:,} CIs | "
                f"Guardadas: {stats['saved']:,} ({tasa_hit:.0f}% hit) | "
                f"Vel: {speed:.0f} CI/s | ETA: {eta_s/60:.0f} min"
            )

    # --- Workers (queue-based, throughput continuo) ---
    queue = asyncio.Queue(maxsize=args.concurrency * 3)

    limits = httpx.Limits(
        max_connections=args.concurrency + 20,
        max_keepalive_connections=args.concurrency
    )

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

    async with httpx.AsyncClient(headers=HEADERS, limits=limits) as client:
        # Lanzar workers
        workers = [asyncio.create_task(worker(client)) for _ in range(args.concurrency)]

        # Productor: encolar todas las cedulas
        for c in cedulas:
            await queue.put(c)

        # Senales de fin para cada worker
        for _ in range(args.concurrency):
            await queue.put(None)

        await queue.join()
        await asyncio.gather(*workers)

    stats["done"] = True
    await saver
    progress.cancel()

    total_time = time.time() - stats["start_time"]
    logger.info(f"Proceso finalizado en {total_time:.1f}s ({total_time/60:.1f} min)")
    logger.info(f"   Total verificadas: {stats['checked']:,}")
    logger.info(f"   Total guardadas:   {stats['saved']:,}")

    await pool.close()


if __name__ == "__main__":
    import sys
    if sys.platform == 'win32' and sys.version_info < (3, 14):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Proceso interrumpido.")
