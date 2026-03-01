import asyncio
import os
import requests
import time
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

async def setup_location_field():
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path)
    
    # URL para correr dentro de docker o fuera
    db_url = os.getenv("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://")
    if "db" not in db_url and "localhost" in db_url:
        db_url = db_url.replace(":5432", ":5433")
        
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        print("Verificando existencia de campos...")
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
    
    # Obtener locales sin ubicación (o con JSON null)
    async with engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT 
                l.departamento_id, l.distrito_id, l.seccional_id, l.local_id, 
                l.descripcion as nombre_local,
                d.descripcion as nombre_distrito,
                dep.descripcion as nombre_dpto
            FROM electoral.ref_locales l
            JOIN electoral.ref_distritos d ON l.departamento_id = d.departamento_id AND l.distrito_id = d.id
            JOIN electoral.ref_departamentos dep ON l.departamento_id = dep.id
            WHERE l.geom_ubicacion IS NULL OR l.ubicacion::text = 'null' OR l.ubicacion IS NULL
        """))
        locales = result.fetchall()
        
    print(f"Encontrados {len(locales)} locales por georreferenciar. Iniciando...")
    
    headers = {'User-Agent': 'SIGEL-App/1.0 (lpraf@poliverso.com)'}
    
    for loc in locales:
        # Normalizar nombres para mejor búsqueda
        nombre = loc.nombre_local.replace("ESC.NAC.N", "Escuela Nacional ").replace("ESC. N", "Escuela ").replace("ESC.", "Escuela")
        distrito = loc.nombre_distrito
        dpto = loc.nombre_dpto
        if dpto == "CAPITAL": dpto = "Asunción"
        
        # Estrategias de búsqueda
        queries = [
            f"{nombre}, {distrito}, {dpto}, Paraguay",
            f"{nombre}, {distrito}, Paraguay",
            f"{nombre}, Paraguay"
        ]
        
        found = False
        for query in queries:
            if found: break
            print(f"Buscando: {query}...")
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
                response = requests.get(url, headers=headers)
                time.sleep(1.5) # Respetar límites
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        lat = float(data[0]['lat'])
                        lng = float(data[0]['lon'])
                        print(f"  ✓ Encontrado: {lat}, {lng}")
                        
                        async with engine.begin() as conn:
                            await conn.execute(text("""
                                UPDATE electoral.ref_locales 
                                SET ubicacion = :val,
                                    geom_ubicacion = ST_SetSRID(ST_Point(:lng, :lat), 4326)
                                WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
                            """), {
                                "val": f'{{"lat": {lat}, "lng": {lng}}}', 
                                "lat": lat, "lng": lng,
                                "d": loc.departamento_id, "di": loc.distrito_id, "s": loc.seccional_id, "l": loc.local_id
                            })
                        found = True
            except Exception as e:
                print(f"Error en query '{query}': {e}")

        if not found:
            print(f"  ✗ No se pudo georreferenciar '{loc.nombre_local}'")

    await engine.dispose()
    print("Proceso finalizado.")

if __name__ == "__main__":
    asyncio.run(setup_location_field())
