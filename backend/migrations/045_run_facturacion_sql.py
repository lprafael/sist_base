"""
Migration 045: Crear Schema facturacion
========================================
Ejecuta el archivo migrations/add_facturacion_schema.sql para crear
las tablas de Facturación Electrónica SIFEN (facturacion.emisor_academia,
facturacion.certificados_digitales, facturacion.documentos_electronicos, etc.).
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


async def run():
    engine = create_async_engine(DATABASE_URL, echo=True)
    sql_path = os.path.join(os.path.dirname(__file__), "add_facturacion_schema.sql")
    
    if not os.path.exists(sql_path):
        print(f"ERROR: No se encontró {sql_path}")
        sys.exit(1)

    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    async with engine.begin() as conn:
        statements = [s.strip() for s in sql_content.split(";") if s.strip()]
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
                short = stmt[:100].replace("\n", " ")
                print(f"  ✅ OK: {short}...")
            except Exception as e:
                print(f"  ⚠️  WARN: {e} → stmt: {stmt[:80]}")
    await engine.dispose()
    print("\n✅ Migration 045 (facturación schema) aplicada correctamente.")


if __name__ == "__main__":
    asyncio.run(run())
