"""
download_tsje.py - Sincronizador de Padrón Nacional TSJE.

Este script lee las cédulas y fechas de nacimiento de la tabla electoral.personas,
realiza la consulta individual en el portal oficial del TSJE (https://padron.tsje.gov.py/)
y actualiza la tabla electoral.padrones con el local, mesa y orden correspondientes.

Uso:
----
# Ejecutar una prueba con 5 registros:
python download_tsje.py --limit 5 --concurrency 2

# Sincronizar todos los faltantes para la elección 1 (ANR 2026 por defecto):
python download_tsje.py --eleccion-id 1 --concurrency 10
"""
import os
import asyncio
import sys
import logging
import time
import re
from datetime import datetime, date
from typing import Set, Tuple, Optional, List, Dict, Any
from dotenv import load_dotenv  # type: ignore

# --- Dependencias ---
try:
    import httpx  # type: ignore
except ImportError:
    print("Instala httpx: pip install httpx")
    sys.exit(1)

try:
    from bs4 import BeautifulSoup  # type: ignore
except ImportError:
    print("Instala beautifulsoup4: pip install beautifulsoup4")
    sys.exit(1)

import asyncpg  # type: ignore

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("download_tsje.log")
    ]
)
logger = logging.getLogger(__name__)

# Silenciar logs verbosos
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)

# --- Config ---
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_DSN = DATABASE_URL \
    .replace("postgresql+asyncpg://", "postgresql://") \
    .replace("postgresql+psycopg2://", "postgresql://")

if not os.path.exists('/.dockerenv') and not os.path.exists('/run/.containerenv'):
    DB_DSN = DB_DSN.replace("@host.docker.internal:", "@localhost:")
    DB_DSN = DB_DSN.replace("@db:", "@localhost:")
    display_dsn = DB_DSN.split('@')[-1] if '@' in DB_DSN else DB_DSN
    logger.info(f"Entorno local. DSN: {display_dsn}")
else:
    logger.info("Entorno Docker detectado.")

TSJE_URL = "https://padron.tsje.gov.py/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://padron.tsje.gov.py",
    "Referer": "https://padron.tsje.gov.py/",
}

class Stats:
    processed = 0
    updated = 0
    not_found = 0
    errors = 0
    start_time = time.time()

stats = Stats()

def clean_scraped_text(text: str) -> str:
    """Limpia espacios y normaliza texto scrapeado."""
    if not text:
        return ""
    # Remover múltiples espacios y newlines
    text = re.sub(r'\s+', ' ', text)
    return text.strip().upper()

def parse_tsje_html(html: str) -> Optional[Dict[str, Any]]:
    """Parsea el HTML retornado por el TSJE para extraer los datos de votación."""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Si contiene texto indicando que no hay inscripción
    page_text = soup.get_text().upper()
    if any(msg in page_text for msg in ["NO TIENE NINGUNA INSCRIPCION", "NO SE ENCONTRARON REGISTROS", "INCORRECTO"]):
        return None

    data = {}
    forms = soup.find_all('form')
    for form in forms:
        divs = form.find_all('div', class_='form-style-agile')
        for div in divs:
            label = div.find('label')
            inp = div.find('input')
            if label and inp:
                label_text = clean_scraped_text(label.get_text())
                val = clean_scraped_text(inp.get('value'))
                
                # Mapear según la etiqueta
                if "NOMBRE" in label_text:
                    data["nombres"] = val
                elif "DEPARTAMENTO" in label_text:
                    data["departamento"] = val
                elif "DISTRITO" in label_text:
                    data["distrito"] = val
                elif "ZONA" in label_text:
                    data["zona"] = val
                elif "LOCAL" in label_text:
                    data["local"] = val
                elif "MESA" in label_text:
                    data["mesa"] = val
                elif "ORDEN" in label_text:
                    data["orden"] = val

    if "local" in data:
        # Convertir numéricos
        try: data["mesa"] = int(data["mesa"]) if "mesa" in data else None
        except: data["mesa"] = None
        try: data["orden"] = int(data["orden"]) if "orden" in data else None
        except: data["orden"] = None
        return data
        
    return None


async def get_or_create_local(conn: asyncpg.Connection, data: Dict[str, Any]) -> Optional[int]:
    """Busca el local_id correspondiente en locales_votacion o lo crea si no existe."""
    local_name = data.get("local")
    if not local_name:
        return None

    # Normalizar departamento y distrito si vienen como texto
    dep_name = data.get("departamento", "")
    dist_name = data.get("distrito", "")

    # 1. Buscar en la tabla electoral.locales_votacion por nombre coincidente
    row = await conn.fetchrow("""
        SELECT id FROM electoral.locales_votacion 
        WHERE nombre_local ILIKE $1 
        LIMIT 1
    """, f"%{local_name}%")
    
    if row:
        return row['id']

    # Obtener las columnas reales de locales_votacion para adaptarnos dinámicamente
    columns_rows = await conn.fetch("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'electoral' AND table_name = 'locales_votacion'
    """)
    columns = {r['column_name'] for r in columns_rows}
    has_id_cols = "departamento_id" in columns

    # 2. Buscar en la tabla de referencia ref_locales
    ref_row = await conn.fetchrow("""
        SELECT local_id, departamento_id, distrito_id, seccional_id, descripcion, domicilio, ubicacion 
        FROM electoral.ref_locales 
        WHERE descripcion ILIKE $1 
        LIMIT 1
    """, f"%{local_name}%")

    if ref_row:
        # Si está en referencia, lo insertamos en locales_votacion
        if has_id_cols:
            new_id = await conn.fetchval("""
                INSERT INTO electoral.locales_votacion (nombre_local, direccion, departamento_id, distrito_id, activo)
                VALUES ($1, $2, $3, $4, TRUE)
                RETURNING id
            """, ref_row['descripcion'], ref_row['domicilio'], ref_row['departamento_id'], ref_row['distrito_id'])
        else:
            new_id = await conn.fetchval("""
                INSERT INTO electoral.locales_votacion (nombre_local, direccion, departamento, distrito, activo)
                VALUES ($1, $2, $3, $4, TRUE)
                RETURNING id
            """, ref_row['descripcion'], ref_row['domicilio'], dep_name, dist_name)
        logger.info(f"Creado local físico '{ref_row['descripcion']}' desde ref_locales (ID: {new_id})")
        return new_id

    # 3. Si no existe en ningún lado, insertar nuevo local
    if has_id_cols:
        dep_id = None
        dist_id = None
        if dep_name:
            dep_id = await conn.fetchval("SELECT id FROM electoral.ref_departamentos WHERE descripcion ILIKE $1 LIMIT 1", f"%{dep_name}%")
        if dist_name and dep_id:
            dist_id = await conn.fetchval("SELECT id FROM electoral.ref_distritos WHERE departamento_id = $1 AND descripcion ILIKE $2 LIMIT 1", dep_id, f"%{dist_name}%")

        new_id = await conn.fetchval("""
            INSERT INTO electoral.locales_votacion (nombre_local, departamento_id, distrito_id, activo)
            VALUES ($1, $2, $3, TRUE)
            RETURNING id
        """, local_name, dep_id, dist_id)
        logger.info(f"Creado local físico nuevo '{local_name}' (ID: {new_id}, Depto ID: {dep_id}, Dist ID: {dist_id})")
    else:
        new_id = await conn.fetchval("""
            INSERT INTO electoral.locales_votacion (nombre_local, departamento, distrito, activo)
            VALUES ($1, $2, $3, TRUE)
            RETURNING id
        """, local_name, dep_name, dist_name)
        logger.info(f"Creado local físico nuevo '{local_name}' (ID: {new_id}, Depto: {dep_name}, Dist: {dist_name})")
        
    return new_id


async def fetch_tsje(client: httpx.AsyncClient, cedula: str, birth_date: date, semaphore: asyncio.Semaphore) -> Tuple[str, Optional[Dict[str, Any]]]:
    """Realiza la consulta POST al TSJE para una cédula y fecha de nacimiento."""
    dia = str(birth_date.day)
    mes = str(birth_date.month)
    anio = str(birth_date.year)

    payload = {
        "cedula": str(cedula),
        "dia": dia,
        "mes": mes,
        "anio": anio,
        "buscar": "si"
    }

    async with semaphore:
        for attempt in range(3):
            try:
                # El TSJE responde rápido normalmente, damos 15s de timeout
                resp = await client.post(TSJE_URL, data=payload, timeout=15.0)
                if resp.status_code == 200:
                    parsed = parse_tsje_html(resp.text)
                    return cedula, parsed
                elif resp.status_code == 429:
                    logger.warning(f"Rate limited (429) en CI {cedula}. Reintentando en {2 ** attempt}s...")
                    await asyncio.sleep(2 ** attempt)
                else:
                    logger.warning(f"Error {resp.status_code} consultando CI {cedula}. Reintentando...")
                    await asyncio.sleep(1)
            except Exception as e:
                logger.debug(f"Excepción de red en CI {cedula}: {e}")
                await asyncio.sleep(1)
                
    return cedula, None

async def process_batch(pool: asyncpg.Pool, client: httpx.AsyncClient, batch: List[Dict[str, Any]], eleccion_id: int, semaphore: asyncio.Semaphore):
    """Procesa un lote de consultas en paralelo y actualiza la base de datos."""
    tasks = [fetch_tsje(client, item['cedula'], item['fecha_nacimiento'], semaphore) for item in batch]
    results = await asyncio.gather(*tasks)

    async with pool.acquire() as conn:
        async with conn.transaction():
            for cedula, parsed_data in results:
                stats.processed += 1
                if not parsed_data:
                    stats.not_found += 1
                    logger.info(f"[{stats.processed}] CI {cedula} -> No tiene inscripción o fecha incorrecta.")
                    continue

                try:
                    # Resolver local_id
                    local_id = await get_or_create_local(conn, parsed_data)
                    
                    # Intentar resolver departamento_id y distrito_id de referencia
                    dep_id = None
                    dist_id = None
                    if parsed_data.get("departamento"):
                        dep_id = await conn.fetchval("SELECT id FROM electoral.ref_departamentos WHERE descripcion ILIKE $1 LIMIT 1", f"%{parsed_data['departamento']}%")
                    if parsed_data.get("distrito") and dep_id:
                        dist_id = await conn.fetchval("SELECT id FROM electoral.ref_distritos WHERE departamento_id = $1 AND descripcion ILIKE $2 LIMIT 1", dep_id, f"%{parsed_data['distrito']}%")

                    # Si no se resolvió local_id pero tenemos departamento/distrito, actualizamos lo que tengamos
                    # Insertar o actualizar en la tabla electoral.padrones
                    await conn.execute("""
                        INSERT INTO electoral.padrones (eleccion_id, cedula, local_id, mesa, orden, departamento_id, distrito_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (eleccion_id, cedula) DO UPDATE SET
                            local_id = EXCLUDED.local_id,
                            mesa = EXCLUDED.mesa,
                            orden = EXCLUDED.orden,
                            departamento_id = EXCLUDED.departamento_id,
                            distrito_id = EXCLUDED.distrito_id
                    """, eleccion_id, cedula, local_id, parsed_data['mesa'], parsed_data['orden'], dep_id, dist_id)

                    stats.updated += 1
                    logger.info(f"[{stats.processed}] CI {cedula} -> Sincronizado: {parsed_data.get('nombres')} | Local: {parsed_data.get('local')} | Mesa: {parsed_data.get('mesa')} | Orden: {parsed_data.get('orden')}")

                except Exception as ex:
                    stats.errors += 1
                    logger.error(f"Error guardando CI {cedula} en base de datos: {ex}")

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Sincronizador de Padrón Electoral con el TSJE")
    parser.add_argument("--eleccion-id", type=int, default=1, help="ID de la elección a vincular en padrones (default: 1)")
    parser.add_argument("--concurrency", type=int, default=10, help="Trabajadores HTTP simultáneos (default: 10)")
    parser.add_argument("--batch", type=int, default=100, help="Registros por lote (default: 100)")
    parser.add_argument("--limit", type=int, default=None, help="Límite máximo de personas a procesar")
    parser.add_argument("--force", action="store_true", help="Forzar actualización de registros ya cargados en padrones")
    parser.add_argument("--departamento", type=int, default=None, help="Filtrar por ID de departamento")
    parser.add_argument("--distrito", type=int, default=None, help="Filtrar por ID de distrito")
    parser.add_argument("--test", action="store_true", help="Realizar prueba rápida con CI 3558002 (Rafael López)")
    args = parser.parse_args()

    # Iniciar pool de conexiones a la base de datos
    pool = await asyncpg.create_pool(DB_DSN, min_size=2, max_size=args.concurrency + 2)
    
    # 1. Resolver las cédulas a procesar
    logger.info("Analizando registros en base de datos...")
    
    batch_items = []
    
    if args.test:
        logger.info("Modo de PRUEBA activado. Usando CI 3558002.")
        batch_items = [{
            "cedula": "3558002",
            "fecha_nacimiento": date(1981, 10, 17)
        }]
    else:
        # Obtener personas con fecha de nacimiento cargada
        query_parts = [
            "SELECT p.cedula, p.fecha_nacimiento FROM electoral.personas p"
        ]
        params = []
        where_clauses = ["p.fecha_nacimiento IS NOT NULL"]
        
        # Filtros geográficos
        # (Si el usuario es por ejemplo del distrito 27 de Central, puede asociar simpatizantes en posibles_votantes)
        # O podemos filtrar directamente si hay referencias en la tabla personas
        if args.departamento is not None:
            # Dado que la tabla personas no tiene departamento_id directamente, podemos filtrar
            # a través de locales_votacion o ref_locales de su residencia si los hay
            pass

        if not args.force:
            # Omitir los que ya tienen registro en padrones para esta elección
            where_clauses.append(f"""
                NOT EXISTS (
                    SELECT 1 FROM electoral.padrones pd 
                    WHERE pd.cedula = p.cedula AND pd.eleccion_id = {args.eleccion_id}
                )
            """)

        query_parts.append("WHERE " + " AND ".join(where_clauses))
        query_parts.append("ORDER BY p.cedula")
        
        if args.limit:
            query_parts.append(f"LIMIT {args.limit}")

        sql = " ".join(query_parts)
        
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql)
            batch_items = [{"cedula": r['cedula'], "fecha_nacimiento": r['fecha_nacimiento']} for r in rows]

    total_items = len(batch_items)
    if total_items == 0:
        logger.info("No se encontraron registros de personas con fecha de nacimiento válidos para procesar.")
        await pool.close()
        return

    logger.info(f"Registros a procesar: {total_items:,}")
    logger.info(f"Concurrencia: {args.concurrency} | Tamaño lote: {args.batch}")

    # Semáforo para limitar la concurrencia
    semaphore = asyncio.Semaphore(args.concurrency)
    
    limits = httpx.Limits(
        max_connections=args.concurrency + 5,
        max_keepalive_connections=args.concurrency
    )

    stats.start_time = time.time()
    
    async with httpx.AsyncClient(headers=HEADERS, limits=limits, follow_redirects=True, trust_env=False) as client:
        # Procesar por lotes
        for i in range(0, total_items, args.batch):
            chunk = batch_items[i:i + args.batch]
            logger.info(f"Procesando lote {i // args.batch + 1} ({len(chunk)} registros)...")
            await process_batch(pool, client, chunk, args.eleccion_id, semaphore)
            
            # Pausa de cortesía para no saturar al servidor del TSJE
            await asyncio.sleep(0.5)

    # Resumen final
    elapsed = time.time() - stats.start_time
    logger.info("=" * 40)
    logger.info("PROCESO FINALIZADO")
    logger.info(f"Tiempo total: {elapsed:.2f}s ({elapsed/60:.2f} min)")
    logger.info(f"Procesados:   {stats.processed:,}")
    logger.info(f"Sincronizados: {stats.updated:,}")
    logger.info(f"No Encontrados: {stats.not_found:,}")
    logger.info(f"Errores base:  {stats.errors:,}")
    logger.info("=" * 40)

    await pool.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Sincronización interrumpida por el usuario.")
