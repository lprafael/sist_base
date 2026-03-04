import asyncio
import os
import requests
import time
import re
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

def clean_name(name):
    """Limpia el nombre del local de códigos y números para una búsqueda más humana"""
    if not name: return ""
    # Normalizar prefijos comunes
    name = name.upper()
    name = name.replace("ESC.NAC.N", "Escuela Nacional ")
    name = name.replace("ESC. N", "Escuela ")
    name = name.replace("ESC.", "Escuela ")
    name = name.replace("ESCUELA N ", "Escuela ")
    name = name.replace("COL.NAC.N", "Colegio Nacional ")
    name = name.replace("COL.NAC.", "Colegio Nacional ")
    
    # Remover patrones como "N 123", "Nº 123", "N. 123", "N123"
    name = re.sub(r'\bN(º|\.| )?\s?\d+\b', '', name)
    # Algunos vienen pegados: EscuelaN123 -> Escuela
    name = re.sub(r'Escuela\s?N\s?\d+', 'Escuela ', name, flags=re.IGNORECASE)
    
    # Limpiar abreviaturas de nombres propios comunes si son muy estrictas
    name = name.replace("GRAL.", "General ")
    name = name.replace("FRANCISCO CABALLERO A.", "Francisco Caballero Alvarez")
    
    # Limpiar espacios extra y mayúsculas/minúsculas para Nominatim
    name = re.sub(r'\s+', ' ', name).strip()
    return name

async def setup_location_field():
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path)
    
    # URL para correr dentro de docker o fuera
    db_url = os.getenv("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://")
    if "db" not in db_url and "localhost" in db_url:
        db_url = db_url.replace(":5432", ":5434")
        
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
    
    # Obtener locales sin ubicación
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
        distrito = loc.nombre_distrito
        dpto = loc.nombre_dpto
        if dpto == "CAPITAL": dpto = "Asunción"
        
        nombre_limpio = clean_name(loc.nombre_local)
        
        # Estrategias de búsqueda de más a menos específica
        queries = [
            f"{nombre_limpio}, {distrito}, {dpto}, Paraguay",
            f"{nombre_limpio}, {distrito}, Paraguay",
            f"{nombre_limpio}, Paraguay",
            f"{loc.nombre_local}, {distrito}, Paraguay" # Último recurso: Nombre original
        ]
        
        found = False
        for query in queries:
            if found: break
            print(f"Buscando: {query}...")
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
                response = requests.get(url, headers=headers)
                time.sleep(1.2) # Respetar límites (mínimo 1s)
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        lat = float(data[0]['lat'])
                        lng = float(data[0]['lon'])
                        print(f"  ✓ Encontrado: {lat}, {lng} ({data[0].get('display_name', '')[:50]}...)")
                        
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
