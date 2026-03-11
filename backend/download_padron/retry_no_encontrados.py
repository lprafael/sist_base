"""
retry_no_encontrados.py
Lee el archivo PADRON_SAN_LORENZO_COTEJADO.xlsx, extrae los CIs con 
observación "No encontrado" en la columna 'observacion_sigel', e intenta 
descargarlos nuevamente de la API de la ANR.
Si los encuentra, los inserta en la BD y actualiza el Excel.
"""
import os
import sys
import asyncio
import logging
import time
from datetime import datetime
from collections import deque
import pandas as pd
import httpx
import asyncpg
from dotenv import load_dotenv

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("retry_no_encontrados.log")
    ]
)
logger = logging.getLogger(__name__)

# Config
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_DSN = DATABASE_URL \
    .replace("postgresql+asyncpg://", "postgresql://") \
    .replace("postgresql+psycopg2://", "postgresql://")

if not os.path.exists('/.dockerenv') and not os.path.exists('/run/.containerenv'):
    if "@db:5432/" in DB_DSN:
        DB_DSN = DB_DSN.replace("@db:5432/", "@localhost:5434/")

BASE_URL = "https://www.anr.org.py/assets/p2026"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.anr.org.py/pre-padron-2026/"
}
CONCURRENCY = 30
TIMEOUT = 10.0

EXCEL_FILE = os.path.join(os.path.dirname(__file__), "PADRON_SAN_LORENZO_COTEJADO.xlsx")

def build_url(cedula: str) -> str:
    ci = str(cedula).strip().lstrip("0")
    if not ci or not ci.isdigit():
        return None
    parts = list(ci)
    if len(parts) < 4:
        # Pad with zeros if less than 4 digits (unlikely for CI, but safe)
        parts = (['0'] * (4 - len(parts))) + parts
    path = "/".join(parts[:4])
    return f"{BASE_URL}/{path}/{ci}.json"

async def fetch_one(client: httpx.AsyncClient, cedula: str):
    url = build_url(cedula)
    if not url:
        return cedula, None
    try:
        r = await client.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            return cedula, r.json()
        return cedula, None
    except Exception:
        return cedula, None

async def fetch_batch(cedulas: list):
    sem = asyncio.Semaphore(CONCURRENCY)
    results = {}

    async def fetch_with_sem(client, ci):
        async with sem:
            return await fetch_one(client, ci)

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:
        tasks = [fetch_with_sem(client, ci) for ci in cedulas]
        for coro in asyncio.as_completed(tasks):
            ci, data = await coro
            results[ci] = data
    return results

async def save_found(conn, found_records: list):
    """Inserta los registros encontrados en la BD."""
    if not found_records:
        return 0
    
    inserted = 0
    for ci, data in found_records:
        try:
            record = {
                "cedula": str(ci),
                "nombres": data.get("nombres") or data.get("nombre") or "",
                "apellidos": data.get("apellidos") or data.get("apellido") or "",
                "nacimiento": data.get("nacimiento") or data.get("fechaNacimiento") or None,
                "departamento": data.get("departamento") or None,
                "distrito": data.get("distrito") or None,
                "seccional": data.get("seccional") or None,
                "local": data.get("local") or None,
                "mesa": data.get("mesa") or None,
                "orden": data.get("orden") or None,
            }
            
            await conn.execute("""
                INSERT INTO electoral.anr_padron_2026
                    (cedula, nombres, apellidos, nacimiento, departamento, distrito, seccional, local, mesa, orden)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (cedula) DO NOTHING
            """,
                record["cedula"], record["nombres"], record["apellidos"],
                record["nacimiento"], record["departamento"], record["distrito"],
                record["seccional"], record["local"], record["mesa"], record["orden"]
            )
            inserted += 1
        except Exception as e:
            logger.warning(f"Error insertando CI {ci}: {e}")
    
    return inserted

def read_no_encontrados(filepath: str):
    logger.info(f"Leyendo archivo con pandas: {filepath}")
    df = pd.read_excel(filepath, dtype=str)
    col_ci = 'numero_ced'
    col_obs = 'observacion_sigel'
    
    if col_ci not in df.columns or col_obs not in df.columns:
        logger.error(f"Columnas no encontradas. Columnas disponibles: {df.columns.tolist()}")
        return [], df

    mask = df[col_obs].str.strip().str.lower() == "no encontrado"
    no_encontrados_df = df[mask]
    
    results = []
    for idx, row in no_encontrados_df.iterrows():
        results.append((idx, str(row[col_ci]).strip()))
    
    logger.info(f"Encontrados {len(results)} CIs con 'No encontrado'")
    return results, df

def update_excel_pandas(filepath: str, df: pd.DataFrame, results_map: dict):
    logger.info("Actualizando el DataFrame...")
    col_obs = 'observacion_sigel'
    for idx, found in results_map.items():
        if found:
            df.at[idx, col_obs] = "Coincide (Recuperado)"
        else:
            # Marcamos que ya se reintentó
            df.at[idx, col_obs] = "No encontrado (Reintentado)"
            
    logger.info(f"Guardando Excel: {filepath}")
    df.to_excel(filepath, index=False)
    logger.info("Excel guardado correctamente.")

async def main():
    no_enc, df_full = read_no_encontrados(EXCEL_FILE)
    if not no_enc:
        logger.info("No hay CIs con 'No encontrado'.")
        return

    cedulas = [ci for _, ci in no_enc]
    idx_map = {ci: idx for idx, ci in no_enc}

    logger.info(f"Descargando {len(cedulas)} registros...")
    results = await fetch_batch(cedulas)

    found = [(ci, data) for ci, data in results.items() if data]
    logger.info(f"Encontrados: {len(found)}")

    if found:
        conn = await asyncpg.connect(DB_DSN)
        try:
            inserted = await save_found(conn, found)
            logger.info(f"Insertados en BD: {inserted}")
        finally:
            await conn.close()

    update_results = {idx_map[ci]: (data is not None) for ci, data in results.items()}
    update_excel_pandas(EXCEL_FILE, df_full, update_results)

if __name__ == "__main__":
    asyncio.run(main())
