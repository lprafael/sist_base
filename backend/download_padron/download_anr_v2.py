"""
download_anr_v2.py - Versión optimizada del descargador de Padrón ANR.

Optimizaciones de rendimiento:
- httpx AsyncClient + HTTP/2 (opcional: pip install 'httpx[http2]') para más requests por conexión
- COPY a tabla staging + INSERT ... ON CONFLICT desde staging (mucho más rápido que executemany)
- Saver despierta al instante cuando hay un batch completo (Event en vez de poll cada 1s)
- fill_gaps por chunks (500k) para no cargar millones de filas en RAM
- Semáforo compartido para limitar requests HTTP simultáneos
- Skip inteligente (--skip-existing / --fill-gaps) para no re-descargar

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
from typing import Set, Tuple, Optional, List, Dict, Any
from dotenv import load_dotenv  # type: ignore

# --- Metrics & State Global ---
class Stats:
    checked = 0
    saved = 0
    rate_limited = 0
    timeouts = 0
    start_time = time.time()
    done = False

stats = Stats()

# ——— Dependencias ———
try:
    import httpx  # type: ignore
except ImportError:
    print("Instala httpx: pip install httpx")
    sys.exit(1)

import asyncpg  # type: ignore

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
if not os.path.exists('/.dockerenv') and not os.path.exists('/run/.containerenv'):
    # Si estamos en Windows, cambiamos 'host.docker.internal' o 'db' por 'localhost'
    # Remove aggressive port forcing, depend on .env value
    # But keep the host replacement for local vs docker
    DB_DSN = DB_DSN.replace("@host.docker.internal:", "@localhost:")
    DB_DSN = DB_DSN.replace("@db:", "@localhost:")
    
    display_dsn = DB_DSN.split('@')[-1] if '@' in DB_DSN else DB_DSN
    logger.info(f"Entorno local detectado. Usando DSN: {display_dsn}")
else:
    logger.info("Entorno Docker detectado, usando host definido en .env")


BASE_URL = "https://www.anr.org.py/assets/p2026"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.anr.org.py/",
    "Accept": "application/json"
}

def build_url(cedula: int) -> str:
    # Aseguramos que tenga al menos 4 dígitos para los subdirectorios
    # El padrón parece usar una estructura basada en los primeros 4 dígitos
    c_str = str(cedula).zfill(7)
    d1, d2, d3, d4 = c_str[0], c_str[1], c_str[2], c_str[3]
    return f"{BASE_URL}/{d1}/{d2}/{d3}/{d4}/{cedula}.json"


async def init_db(pool: asyncpg.Pool, force_recreate: bool = False):
    async with pool.acquire() as conn:
        await conn.execute("CREATE SCHEMA IF NOT EXISTS electoral;")
        if force_recreate:
            await conn.execute("DROP TABLE IF EXISTS electoral.anr_padron_2026;")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS electoral.anr_padron_2026 (
                cedula INTEGER PRIMARY KEY,
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
        # Tabla staging para COPY masivo (mucho más rápido que INSERT fila a fila)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS electoral.anr_padron_2026_staging (
                cedula VARCHAR(20),
                nombres VARCHAR(255),
                apellidos VARCHAR(255),
                nacimiento DATE,
                departamento INTEGER,
                distrito INTEGER,
                seccional INTEGER,
                local INTEGER,
                mesa INTEGER,
                orden INTEGER
            );
        """)
    logger.info("Tabla anr_padron_2026 y staging verificadas.")


async def get_existing_cedulas(pool: asyncpg.Pool) -> Set[int]:
    """Obtiene las cédulas ya descargadas en la base de datos para evitar re-descargas."""
    logger.info("Verificando cédulas ya descargadas en la base de datos...")
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT cedula FROM electoral.anr_padron_2026")
    
    existing = {int(row['cedula']) for row in rows if str(row['cedula']).isdigit()}
    logger.info(f"  -> {len(existing):,} cedulas detectadas en DB, seran omitidas.")
    return existing


async def fetch_single(client: httpx.AsyncClient, cedula: int, semaphore: asyncio.Semaphore, retries: int = 1) -> Optional[Dict[str, Any]]:
    """Descarga un JSON de CI con fallo rápido."""
    url = build_url(cedula)
    async with semaphore:
        # Solo 1 reintento para máxima fluidez
        for attempt in range(retries + 1):
            try:
                # Timeout equilibrado: 1.5s para conectar, 10.0s total
                resp = await client.get(url, timeout=httpx.Timeout(10.0, connect=1.5))
                if resp.status_code == 200:
                    try:
                        data = resp.json()
                    except Exception as e:
                        logger.debug(f"Error parseando JSON CI {cedula}: {e}")
                        return None
                    
                    if not data or "cedula" not in data: return None
                    nac_raw = data.get("nacimiento")
                    nac_obj = None
                    if nac_raw and nac_raw != "0000-00-00":
                        try: nac_obj = datetime.strptime(nac_raw, "%Y-%m-%d").date()
                        except: pass
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
                    stats.rate_limited += 1
                    await asyncio.sleep(2) # Pausa más larga por bloqueo
                else:
                    if stats.checked < 10: # Solo logueamos los primeros para no saturar
                        logger.warning(f"CI {cedula} -> Status {resp.status_code}")
                    # Si recibimos 403 o similar, el servidor nos está bloqueando
                    if resp.status_code in (403, 503):
                        stats.rate_limited += 1
                        await asyncio.sleep(5)
            except (httpx.TimeoutException, httpx.RequestError) as e:
                stats.timeouts += 1
                if stats.checked < 5:
                    logger.debug(f"Error de red CI {cedula}: {e}")
            except Exception:
                stats.timeouts += 1
    return None


def _record_to_tuple(r: dict) -> tuple:
    return (
        r["cedula"], r["nombres"], r["apellidos"], r["nacimiento"],
        r["departamento"], r["distrito"], r["seccional"],
        r["local"], r["mesa"], r["orden"]
    )


async def save_batch_asyncpg(pool: asyncpg.Pool, batch: list) -> int:
    """
    Guarda un lote usando COPY a tabla staging + INSERT ... ON CONFLICT desde staging.
    Mucho más rápido que executemany (menos round-trips y protocolo COPY nativo).
    """
    if not batch:
        return 0

    columns = [
        "cedula", "nombres", "apellidos", "nacimiento",
        "departamento", "distrito", "seccional", "local", "mesa", "orden"
    ]
    records = [_record_to_tuple(r) for r in batch]

    async with pool.acquire() as conn:
        await conn.copy_records_to_table(
            "anr_padron_2026_staging",
            records=records,
            columns=columns,
            schema_name="electoral",
        )
        await conn.execute("""
            INSERT INTO electoral.anr_padron_2026
                (cedula, nombres, apellidos, nacimiento, departamento, distrito, seccional, local, mesa, orden)
            SELECT cedula::integer, nombres, apellidos, nacimiento, departamento, distrito, seccional, local, mesa, orden
            FROM electoral.anr_padron_2026_staging
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
        """)
        await conn.execute("TRUNCATE electoral.anr_padron_2026_staging")

    return len(records)


async def get_max_cedula(pool: asyncpg.Pool) -> Tuple[int, int]:
    """Consulta la cedula maxima y el conteo total en la base de datos."""
    m, t = 0, 0
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT max(cedula::integer) as max_ci, count(*) as total FROM electoral.anr_padron_2026")
        if row:
            m = row['max_ci'] or 0
            t = row['total'] or 0
    return (int(m), int(t))


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Descargador de Padron ANR v2 (optimizado)")
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=8000000)
    parser.add_argument("--concurrency", type=int, default=40, help="Workers HTTP simultaneos (Recomendado: 30-50 por Sucuri)")
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
        logger.info("Modo FILL-GAPS activado. Analizando faltantes por chunks (sin cargar toda la tabla en RAM)...")
        CHUNK_SIZE = 500_000
        max_tope = 9500000

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT min(cedula::integer) as mn, max(cedula::integer) as mx FROM electoral.anr_padron_2026"
            )
        min_ci = row["mn"] if row and row["mn"] is not None else None
        max_ci = row["mx"] if row and row["mx"] is not None else None

        if min_ci is None or max_ci is None:
            logger.warning("Base de datos vacia. Usando rango default.")
            cedulas = list(range(args.start, args.end + 1))
        else:
            cedulas = []
            # Barrer por chunks: en cada chunk consultamos solo las CI existentes en ese rango
            range_end = min(max_ci, max_tope)
            chunk_start = min_ci
            while chunk_start <= range_end:
                chunk_end = min(chunk_start + CHUNK_SIZE - 1, range_end)
                async with pool.acquire() as conn:
                    rows = await conn.fetch(
                        "SELECT cedula::integer FROM electoral.anr_padron_2026 WHERE cedula::integer BETWEEN $1 AND $2",
                        chunk_start, chunk_end
                    )
                existentes_chunk = {r[0] for r in rows}
                faltantes = [c for c in range(chunk_start, chunk_end + 1) if c not in existentes_chunk]
                cedulas.extend(faltantes)
                logger.info(f"  Chunk {chunk_start:,}-{chunk_end:,}: {len(faltantes):,} faltantes (total acum: {len(cedulas):,})")
                chunk_start = chunk_end + 1

            # Opcional: desde max_ci+1 hasta max_tope (nuevas CI nunca descargadas)
            if max_ci < max_tope:
                cedulas.extend(range(max_ci + 1, max_tope + 1))
                logger.info(f"  Rango nuevo {max_ci+1:,}-{max_tope:,}: {max_tope - max_ci:,} cedulas anadidas.")

            logger.info(f"Detectados {len(cedulas):,} cedulas faltantes en total.")

    elif args.auto_resume:
        max_ci, total_db = await get_max_cedula(pool)
        if max_ci > 0:
            start_val = max_ci + 1
            logger.info(f"Auto-resume activado. Max CI en DB: {max_ci:,} (Total: {total_db:,}). Iniciando desde: {start_val:,}")
        else:
            logger.info("Auto-resume activado pero la base de datos esta vacia. Iniciando desde el default.")
            start_val = args.start
        cedulas = list(range(start_val, args.end + 1))

    elif args.test:
        cedulas = list(range(args.start, args.start + 100))
    else:
        # Modo por defecto (rango manual) si no fue llenado por fill_gaps
        if not cedulas:
            cedulas = list(range(args.start, args.end + 1))

    # Si se pide skip-existing y NO estamos en modo gaps (que ya lo hace), filtramos
    if args.skip_existing and not args.fill_gaps:
        existing = await get_existing_cedulas(pool)
        cedulas = [c for c in cedulas if c not in existing]
        logger.info(f"Quedan {len(cedulas):,} cedulas por descargar.")

    # --- Metrics & State ---
    buffer: deque[Dict[str, Any]] = deque()
    total = len(cedulas)
    stats.start_time = time.time()
    stats.done = False
    stats.checked = 0
    stats.saved = 0
    stats.rate_limited = 0
    stats.timeouts = 0

    buffer_ready = asyncio.Event()  # Se señala cuando buffer >= batch para reaccionar al instante
    semaphore = asyncio.Semaphore(args.concurrency)  # Limite global de requests HTTP simultaneos

    logger.info(f"Iniciando descarga de {total} cedulas con concurrencia={args.concurrency}...")

    # --- Saver task: despierta en cuanto hay un batch completo (o cada 1s por si acaso) ---
    async def saver_task():
        while not stats.done or buffer:
            if len(buffer) >= args.batch:
                batch = [buffer.popleft() for _ in range(min(args.batch, len(buffer)))]
                saved = await save_batch_asyncpg(pool, batch)
                stats.saved += saved
            else:
                try:
                    await asyncio.wait_for(buffer_ready.wait(), timeout=1.0)
                except asyncio.TimeoutError:
                    pass
                buffer_ready.clear()
        if buffer:
            batch = list(buffer)
            buffer.clear()
            saved = await save_batch_asyncpg(pool, batch)
            stats.saved += saved

    # --- Progress task ---
    async def progress_task():
        while not stats.done:
            await asyncio.sleep(15)
            elapsed = time.time() - stats.start_time
            if elapsed > 0 and stats.checked > 0:
                speed = stats.checked / elapsed
                pct = stats.checked / total * 100 if total > 0 else 0
                eta_s = (total - stats.checked) / speed
                tasa_hit = stats.saved / stats.checked * 100
                diag = f" | 429s: {stats.rate_limited} | T/O: {stats.timeouts}"
                logger.info(
                    f"[{pct:.1f}%] {stats.checked:,}/{total:,} CIs | "
                    f"Guardadas: {stats.saved:,} ({tasa_hit:.0f}% hit){diag} | "
                    f"Vel: {speed:.0f} CI/s | ETA: {eta_s/60:.0f} min"
                )

    # --- Workers (queue-based, throughput continuo) ---
    queue: asyncio.Queue[Optional[int]] = asyncio.Queue(maxsize=args.concurrency * 3)

    limits = httpx.Limits(
        max_connections=args.concurrency + 50,
        max_keepalive_connections=args.concurrency + 20
    )

    async def worker(client: httpx.AsyncClient):
        while True:
            cedula = await queue.get()
            if cedula is None:
                queue.task_done()
                break
            try:
                result = await fetch_single(client, cedula, semaphore)
                stats.checked += 1
                if result:
                    buffer.append(result)
                    if len(buffer) >= args.batch:
                        buffer_ready.set()
            finally:
                queue.task_done()

    saver = asyncio.create_task(saver_task())
    progress = asyncio.create_task(progress_task())

    # We need to ensure the client is available for all workers
    # Desactivamos http2 y confiamos en un pool grande de HTTP/1.1 para estabilidad en Windows
    # follow_redirects=True es vital por si Sucuri redirige a la version con trailing slash o similar
    async with httpx.AsyncClient(headers=HEADERS, limits=limits, http2=False, trust_env=False, follow_redirects=True) as client:
        # Lanzar workers
        workers = [asyncio.create_task(worker(client)) for _ in range(args.concurrency)]

        # Llenar cola
        for c in cedulas:
            await queue.put(c)

        # Marcador de fin para workers
        for _ in range(args.concurrency):
            await queue.put(None)

        # Esperar a que la cola se vacíe
        await queue.join()

        # Detener workers explícitamente antes de salir del bloque 'with'
        stats.done = True
        for w in workers:
            w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)

    stats.done = True
    await progress
    await saver

    total_time = time.time() - stats.start_time
    logger.info(f"Proceso finalizado en {total_time:.1f}s ({total_time/60:.1f} min)")
    logger.info(f"   Total verificadas: {stats.checked:,}")
    logger.info(f"   Total guardadas:   {stats.saved:,}")

    await pool.close()


if __name__ == "__main__":
    # Eliminado WindowsSelectorEventLoopPolicy para permitir >64 sockets (usar Proactor default)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Proceso interrumpido.")
