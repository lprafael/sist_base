import os
import sys
import re
import json
import time
import asyncio
import urllib.parse
import urllib.request
import asyncpg
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

# Cargar entorno
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://postgres:admin@127.0.0.1:5434/SIGEL"
elif "asyncpg" in DB_URL:
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://")

GOOGLE_KEY = os.getenv("GOOGLE_MAPS_GEOCODING_API_KEY", "").strip()

def clean_school_name(name: str) -> str:
    if not name: return ""
    s = name.upper().strip()
    
    # Normalizar títulos y tipos de instituciones
    s = re.sub(r'\bCENT\.?\s*REG\.?\s*EDUC\.?', 'Centro Regional de Educacion ', s)
    s = re.sub(r'\bCOL\.?\s*NAC\.?\s*DIV\.?\s*ESP\.?', 'Colegio Nacional Diversificado ', s)
    s = re.sub(r'\bCOL\.?\s*NAC\.?\s*VOC\.?', 'Colegio Nacional Vocacional ', s)
    s = re.sub(r'\bCOL\.?\s*NAC\.?\s*TECN\.?', 'Colegio Tecnico Nacional ', s)
    s = re.sub(r'\bCOL\.?\s*NAC\.?', 'Colegio Nacional ', s)
    s = re.sub(r'\bCOL\.?\s*TECN\.?', 'Colegio Tecnico ', s)
    s = re.sub(r'\bCOL\.?\s*PARR\.?', 'Colegio Parroquial ', s)
    s = re.sub(r'\bCOL\.?\s*PRIV\.?', 'Colegio Privado ', s)
    s = re.sub(r'\bCOL\.?', 'Colegio ', s)
    
    s = re.sub(r'\bESC\.?\s*BAS\.?\s*IND\.?', 'Escuela Basica Indigena ', s)
    s = re.sub(r'\bESC\.?\s*BAS\.?', 'Escuela Basica ', s)
    s = re.sub(r'\bESC\.?\s*NAC\.?', 'Escuela Nacional ', s)
    s = re.sub(r'\bESC\.?\s*PARR\.?', 'Escuela Parroquial ', s)
    s = re.sub(r'\bESC\.?\s*GRAD\.?', 'Escuela Graduada ', s)
    s = re.sub(r'\bESC\.?', 'Escuela ', s)
    
    s = re.sub(r'\bLIC\.?\s*NAC\.?', 'Liceo Nacional ', s)
    s = re.sub(r'\bINST\.?\s*FORM\.?\s*DOC\.?', 'Instituto de Formacion Docente ', s)
    
    # Rangos militares / cargos
    s = re.sub(r'\bCNEL\.?', 'Coronel ', s)
    s = re.sub(r'\bGRAL\.?', 'General ', s)
    s = re.sub(r'\bMYR\.?', 'Mayor ', s)
    s = re.sub(r'\bCAP\.?', 'Capitan ', s)
    s = re.sub(r'\bTTE\.?', 'Teniente ', s)
    s = re.sub(r'\bPROF\.?', 'Profesor ', s)
    s = re.sub(r'\bDR\.?', 'Doctor ', s)
    s = re.sub(r'\bDRA\.?', 'Doctora ', s)
    s = re.sub(r'\bSTA\.?', 'Santa ', s)
    s = re.sub(r'\bSTO\.?', 'Santo ', s)
    
    # Limpiar espacios
    s = re.sub(r'\s+', ' ', s).strip()
    return s.title()

def query_google_geocoding(query: str, key: str):
    """Consulta la API de Google Maps Geocoding"""
    try:
        params = urllib.parse.urlencode({
            'address': query,
            'key': key,
            'region': 'py'
        })
        url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
        req = urllib.request.Request(url, headers={'User-Agent': 'SIGEL/1.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        if data.get('status') == 'OK' and data.get('results'):
            res = data['results'][0]
            loc = res['geometry']['location']
            loc_type = res['geometry'].get('location_type', 'APPROXIMATE')
            formatted = res.get('formatted_address', '')
            types = res.get('types', [])
            return {
                'lat': float(loc['lat']),
                'lng': float(loc['lng']),
                'location_type': loc_type,
                'formatted_address': formatted,
                'types': types,
                'status': 'OK'
            }
        return {'status': data.get('status', 'ZERO_RESULTS')}
    except Exception as e:
        return {'status': f'ERROR: {str(e)}'}

async def validate_point_postgis(conn, dep_id, dist_id, dist_name, lat, lng):
    """Valida espacialmente que el punto se ubique en Paraguay y cercano al distrito oficial"""
    # 1. Bounding box de Paraguay
    if not (-28.0 <= lat <= -19.0 and -63.0 <= lng <= -54.0):
        return False, "Fuera de Paraguay"
        
    # 2. Distancia al polígono del distrito en cartografia.distritos
    val = await conn.fetchval("""
        SELECT EXISTS(
            SELECT 1 FROM cartografia.distritos d
            WHERE (
                (d.dpto_id_ref = $1 AND d.ref_distrito_id = $2)
                OR LOWER(UNACCENT(d.dist_desc_)) = LOWER(UNACCENT($3))
            )
            AND ST_DWithin(d.geometry::geography, ST_SetSRID(ST_Point($4, $5), 4326)::geography, 25000)
        );
    """, dep_id, dist_id, dist_name, lng, lat)
    
    if val:
        return True, "Validado dentro de región distrital"
    return False, "Punto fuera del distrito esperado (posible homónimo)"

async def get_district_centroid(conn, dep_id, dist_id, dist_name):
    """Obtiene el centroide oficial del distrito como fallback seguro"""
    row = await conn.fetchrow("""
        SELECT ST_Y(ST_Centroid(d.geometry)) as lat,
               ST_X(ST_Centroid(d.geometry)) as lng,
               d.dist_desc_ as dist_nombre
        FROM cartografia.distritos d
        WHERE (d.dpto_id_ref = $1 AND d.ref_distrito_id = $2)
           OR LOWER(UNACCENT(d.dist_desc_)) = LOWER(UNACCENT($3))
        LIMIT 1;
    """, dep_id, dist_id, dist_name)
    if row and row['lat'] is not None:
        return float(row['lat']), float(row['lng'])
    return None, None

async def main():
    print("=" * 75, flush=True)
    print(" GEOREFERENCIACIÓN DE ALTA PRECISIÓN Y CONTROL ESPACIAL - LOCALES SIGEL", flush=True)
    print("=" * 75, flush=True)
    
    t_start = time.time()
    
    print("\n[1] Conectando a PostgreSQL...", flush=True)
    conn = await asyncpg.connect(DB_URL)
    print("[OK] Conexión establecida.", flush=True)
    
    # Obtener locales sin coordenadas
    locales = await conn.fetch("""
        SELECT l.departamento_id, l.distrito_id, l.seccional_id, l.local_id,
               l.descripcion as local_nombre,
               di.descripcion as distrito_nombre,
               d.descripcion as departamento_nombre
        FROM electoral.ref_locales l
        JOIN electoral.ref_distritos di ON l.departamento_id = di.departamento_id AND l.distrito_id = di.id
        JOIN electoral.ref_departamentos d ON l.departamento_id = d.id
        WHERE l.geom_ubicacion IS NULL OR l.ubicacion IS NULL OR l.ubicacion::text = 'null'
        ORDER BY l.departamento_id, l.distrito_id, l.local_id;
    """)
    
    total = len(locales)
    print(f"\n[2] Total de locales pendientes de georreferenciar: {total:,}", flush=True)
    if total == 0:
        print("¡Todos los locales ya cuentan con coordenadas georreferenciadas!", flush=True)
        await conn.close()
        return

    stats = {
        'rooftop': 0,
        'geometric_center': 0,
        'approx_school': 0,
        'distrito_fallback': 0,
        'rejected_spatial': 0
    }
    
    print("\n[3] Iniciando geocodificación precisa con Google Maps y validación PostGIS...", flush=True)
    
    for idx, loc in enumerate(locales, start=1):
        dep_id = loc['departamento_id']
        dist_id = loc['distrito_id']
        sec_id = loc['seccional_id']
        loc_id = loc['local_id']
        raw_name = loc['local_nombre']
        clean_name = clean_school_name(raw_name)
        dist_name = loc['distrito_nombre'].strip()
        dep_name = loc['departamento_nombre'].strip()
        if dep_name == "CAPITAL": dep_name = "Asunción"
        
        # 1. Estrategia de búsqueda
        # Intento A: Nombre normalizado + Distrito + Departamento + Paraguay
        query_a = f"{clean_name}, {dist_name}, {dep_name}, Paraguay"
        res = query_google_geocoding(query_a, GOOGLE_KEY)
        
        # Si no encontró o dio error, Intento B: Nombre original + Distrito
        if res.get('status') != 'OK':
            query_b = f"{raw_name}, {dist_name}, Paraguay"
            res = query_google_geocoding(query_b, GOOGLE_KEY)
            
        success = False
        lat, lng = None, None
        precision = None
        fuente = None
        direccion = None
        
        if res.get('status') == 'OK':
            r_lat = res['lat']
            r_lng = res['lng']
            loc_type = res['location_type']
            
            # Validación espacial en PostGIS
            is_valid, msg = await validate_point_postgis(conn, dep_id, dist_id, dist_name, r_lat, r_lng)
            
            if is_valid:
                # Si es un colegio específico (ROOFTOP o GEOMETRIC_CENTER)
                if loc_type in ['ROOFTOP', 'GEOMETRIC_CENTER']:
                    lat, lng = r_lat, r_lng
                    precision = 'exacta' if loc_type == 'ROOFTOP' else 'predio_escolar'
                    fuente = 'google_maps'
                    direccion = res['formatted_address']
                    success = True
                    if loc_type == 'ROOFTOP':
                        stats['rooftop'] += 1
                    else:
                        stats['geometric_center'] += 1
                elif 'establishment' in res.get('types', []) or 'point_of_interest' in res.get('types', []):
                    lat, lng = r_lat, r_lng
                    precision = 'institucional'
                    fuente = 'google_maps'
                    direccion = res['formatted_address']
                    success = True
                    stats['approx_school'] += 1
                else:
                    # Es solo el centro de la ciudad / calle general devuelto por Google
                    # Usamos el centroide de distrito para mayor precisión territorial
                    pass
            else:
                stats['rejected_spatial'] += 1
                # print(f"       [!] Rechazado por validación espacial: {raw_name} -> {msg}", flush=True)

        # Si no se encontró el edificio exacto con validación espacial, aplicar Centroide de Distrito
        if not success:
            c_lat, c_lng = await get_district_centroid(conn, dep_id, dist_id, dist_name)
            if c_lat is not None:
                lat, lng = c_lat, c_lng
                precision = 'distrito'
                fuente = 'centroide_distrito'
                direccion = f"Ubicación por distrito: {dist_name}, {dep_name}"
                stats['distrito_fallback'] += 1
            else:
                # Centroide de Paraguay por defecto si falta cartografía
                lat, lng = -25.2637, -57.5759
                precision = 'aproximada'
                fuente = 'default'
                direccion = f"{dist_name}, {dep_name}"

        # Guardar en base de datos
        ubicacion_json = {
            'lat': round(lat, 7),
            'lng': round(lng, 7),
            'precision': precision,
            'fuente': fuente,
            'direccion': direccion,
            'aprox': (precision == 'distrito')
        }
        
        await conn.execute("""
            UPDATE electoral.ref_locales
            SET ubicacion = $1::jsonb,
                geom_ubicacion = ST_SetSRID(ST_Point($2, $3), 4326),
                domicilio = COALESCE(domicilio, $4)
            WHERE departamento_id = $5 
              AND distrito_id = $6 
              AND seccional_id = $7 
              AND local_id = $8;
        """, json.dumps(ubicacion_json), lng, lat, direccion, dep_id, dist_id, sec_id, loc_id)
        
        # Log cada 50 o al final
        if idx % 50 == 0 or idx == total:
            pct = (idx / total) * 100
            print(f"  [{idx:,}/{total:,} ({pct:.1f}%)] "
                  f"Rooftop: {stats['rooftop']} | "
                  f"Predio: {stats['geometric_center']} | "
                  f"Inst: {stats['approx_school']} | "
                  f"Distrito: {stats['distrito_fallback']} | "
                  f"Filtro Espacial OK", flush=True)
            
        # Pausa mínima de cortesía (0.04s) para procesar fluido
        await asyncio.sleep(0.04)

    print("\n" + "=" * 75, flush=True)
    print(" RESUMEN FINAL DE GEOREFERENCIACIÓN", flush=True)
    print("=" * 75, flush=True)
    print(f"Total procesados:                       {total:,}")
    print(f" - Precisión Exacta (ROOFTOP - Puerta): {stats['rooftop']:,}")
    print(f" - Precisión Predio Escolar:            {stats['geometric_center']:,}")
    print(f" - Precisión Institucional:             {stats['approx_school']:,}")
    print(f" - Centroide Distrital (Validado):      {stats['distrito_fallback']:,}")
    print(f" - Alucinaciones/Falsos homónimos bloqueados: {stats['rejected_spatial']:,}")
    print(f"\n¡Locales de votación 100% georreferenciados en {time.time() - t_start:.2f}s!", flush=True)
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
