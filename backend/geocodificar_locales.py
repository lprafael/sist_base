"""
geocodificar_locales.py

Busca en Google Maps o Nominatim (OpenStreetMap) la ubicación de cada local de
votación que aún no tiene coordenadas en electoral.ref_locales y las guarda.

Opciones:
  - Sin configurar nada: usa Nominatim (gratuito, 1 req/seg).
  - Con GOOGLE_MAPS_GEOCODING_API_KEY en .env: usa Google primero (mejor precisión).

Requisitos Google (opcional):
  1. Crear proyecto en https://console.cloud.google.com/
  2. Activar "Geocoding API".
  3. Crear API key y ponerla en .env como GOOGLE_MAPS_GEOCODING_API_KEY.

Ejecución:
  cd backend
  python geocodificar_locales.py
  python geocodificar_locales.py --solo-nominatim   # forzar solo Nominatim
  python geocodificar_locales.py --limite 50        # procesar solo 50 locales (prueba)
"""

import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

from geocoding_services import (
    geocode_address,
    build_queries_for_local,
)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DB_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")
if "localhost" in DB_URL and "db:" not in DB_URL:
    DB_URL = DB_URL.replace(":5432", ":5434")


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Geocodificar locales de votación (Google o Nominatim)")
    parser.add_argument("--solo-nominatim", action="store_true", help="Usar solo Nominatim (no Google)")
    parser.add_argument("--limite", type=int, default=0, help="Máximo de locales a procesar (0 = todos)")
    args = parser.parse_args()

    engine = create_async_engine(DB_URL)
    prefer_google = not args.solo_nominatim
    google_key = os.getenv("GOOGLE_MAPS_GEOCODING_API_KEY", "").strip() if prefer_google else ""

    async with engine.connect() as conn:
        q = text("""
            SELECT 
                l.departamento_id, l.distrito_id, l.seccional_id, l.local_id,
                l.descripcion AS nombre_local,
                l.domicilio,
                d.descripcion AS nombre_distrito,
                dep.descripcion AS nombre_dpto
            FROM electoral.ref_locales l
            JOIN electoral.ref_distritos d ON l.departamento_id = d.departamento_id AND l.distrito_id = d.id
            JOIN electoral.ref_departamentos dep ON l.departamento_id = dep.id
            WHERE l.geom_ubicacion IS NULL AND (l.ubicacion IS NULL OR l.ubicacion::text = 'null')
            ORDER BY l.departamento_id, l.distrito_id, l.seccional_id, l.local_id
        """)
        result = await conn.execute(q)
        locales = result.fetchall()

    total = len(locales)
    if args.limite > 0:
        locales = locales[: args.limite]
    print(f"Locales sin coordenadas: {total} (procesando {len(locales)})")
    if prefer_google and google_key:
        print("Modo: Google Geocoding (con fallback a Nominatim)")
    else:
        print("Modo: Nominatim (OpenStreetMap) — respetando 1 petición/seg")

    # Asegurar columnas
    async with engine.begin() as conn:
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'electoral' AND table_name = 'ref_locales' AND column_name = 'ubicacion') THEN
                    ALTER TABLE electoral.ref_locales ADD COLUMN ubicacion JSONB;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'electoral' AND table_name = 'ref_locales' AND column_name = 'geom_ubicacion') THEN
                    ALTER TABLE electoral.ref_locales ADD COLUMN geom_ubicacion GEOMETRY(Point, 4326);
                END IF;
            END $$;
        """))

    encontrados = 0
    for i, loc in enumerate(locales):
        queries = build_queries_for_local(
            loc.nombre_local or "",
            loc.nombre_distrito or "",
            loc.nombre_dpto or "",
            loc.domicilio,
        )
        lat, lng = None, None
        for query in queries:
            if not query.strip():
                continue
            print(f"  [{i+1}/{len(locales)}] Buscando: {query[:70]}...")
            result = geocode_address(query, prefer_google=prefer_google, google_api_key=google_key)
            if result:
                lat, lng = result
                # Evitar problemas de encoding en consolas Windows
                try:
                    print(f"    OK {lat:.5f}, {lng:.5f}")
                except Exception:
                    pass
                break
        if lat is not None and lng is not None:
            async with engine.begin() as conn:
                await conn.execute(text("""
                    UPDATE electoral.ref_locales
                    SET ubicacion = :ubic,
                        geom_ubicacion = ST_SetSRID(ST_Point(:lng, :lat), 4326)
                    WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
                """), {
                    "ubic": f'{{"lat": {lat}, "lng": {lng}}}',
                    "lat": lat, "lng": lng,
                    "d": loc.departamento_id, "di": loc.distrito_id,
                    "s": loc.seccional_id, "l": loc.local_id,
                })
            encontrados += 1
        else:
            print(f"    ✗ Sin resultado para '{loc.nombre_local}'")

    await engine.dispose()
    try:
        print(f"\nListo: {encontrados}/{len(locales)} locales geocodificados.")
    except Exception:
        pass


if __name__ == "__main__":
    asyncio.run(main())
