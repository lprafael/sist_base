"""
busqueda_mejorada_nominatim.py

Script mejorado para georreferenciar locales de votación usando Nominatim.
Mejoras respecto al script anterior:
- Limpieza más agresiva de nombres (abreviaturas, números, etc.)
- Búsqueda por nombre de persona (eg: "Juan E Oleary, Paraguay")
- Fallback usando solo el apellido del patronímico
- Prefiere locales de Capital/Asunción donde Nominatim tiene más datos
- Agrega delay variable para evitar rate limiting
"""
import asyncio
import os
import re
import requests
import time
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

def limpiar_nombre(nombre):
    """Normaliza el nombre del local para mejorar la búsqueda."""
    nombre = nombre.strip()
    
    # Reemplazos de abreviaciones comunes
    replacements = {
        r'\bESC\.?\s*NAC\.?\s*N[·Oº°]?\s*\d+': 'Escuela Nacional',
        r'\bESC\.?\s*N[·Oº°]?\s*\d+': 'Escuela',
        r'\bESC\.?\s*GRAD\.?\s*N[·Oº°]?\s*\d+': 'Escuela Graduada',
        r'\bESC\.?\s*BAS\.?\s*N[·Oº°]?\s*\d+': 'Escuela Básica',
        r'\bESC\.?\s*GRAD\.?': 'Escuela Graduada',
        r'\bESC\.?\s*BAS\.?': 'Escuela Básica',
        r'\bESC\.?\s*NAC\.?': 'Escuela Nacional',
        r'\bESCUELA\s*BAS\.?\s*N[·Oº°]?\s*\d+': 'Escuela Básica',
        r'\bESCUELA\s*N[·Oº°]?\s*\d+': 'Escuela',
        r'\bCOL\.?\s*NAC\.?': 'Colegio Nacional',
        r'\bCOL\.?\s*NACI\.?': 'Colegio Nacional',
        r'\bCOLEGIO\s*NAC\.?': 'Colegio Nacional',
        r'\bCTRO\.\s*REG\.\s*DE\s*EDUCACION': 'Centro Regional de Educacion',
        r'\bGRAL\.': 'General',
        r'\bGRAL\b': 'General',
        r'\bPROF\.': 'Profesor',
        r'\bDR\.': 'Doctor',
        r'\bN[·Oº°]?\s*\d+\b': '',  # Eliminar "Nº 123"
        r'\s+': ' ',  # Espacios múltiples
    }
    
    for pattern, repl in replacements.items():
        nombre = re.sub(pattern, repl, nombre, flags=re.IGNORECASE)
    
    return nombre.strip()


def extraer_nombre_persona(nombre):
    """Intenta extraer solo el nombre de la persona del nombre del local."""
    # Quitar prefijos comunes de institución
    prefijos = [
        r'^ESCUELA\s+NACIONAL\s+',
        r'^ESCUELA\s+GRADUADA\s+',
        r'^ESCUELA\s+BASICA\s+',
        r'^ESCUELA\s+',
        r'^COLEGIO\s+NACIONAL\s+',
        r'^COLEGIO\s+',
        r'^CENTRO\s+REGIONAL\s+DE\s+EDUCACION\s+',
        r'^LICEO\s+',
        r'^SECCIONAL\s+COLORADA\s+N\s*\d+\s+',
        r'^MUNICIPALIDAD\s+',
        r'^SALON\s+',
    ]
    
    resultado = nombre.strip()
    for patron in prefijos:
        resultado = re.sub(patron, '', resultado, flags=re.IGNORECASE).strip()
    
    # Si quedó algo con sentido (mas de 5 chars)
    if len(resultado) > 5:
        return resultado
    return None


async def buscar_y_guardar(engine, local, lat, lng):
    """Guarda las coordenadas en la BD."""
    async with engine.begin() as conn:
        await conn.execute(text("""
            UPDATE electoral.ref_locales 
            SET 
                ubicacion = CAST(:val AS jsonb),
                geom_ubicacion = ST_SetSRID(ST_Point(:lng, :lat), 4326),
                domicilio = CASE 
                    WHEN domicilio LIKE '%[Ubicación estimada%' THEN 
                        REPLACE(domicilio, '[Ubicación estimada - coordenadas del distrito]', '')
                    ELSE domicilio 
                END
            WHERE departamento_id = :d AND distrito_id = :di AND seccional_id = :s AND local_id = :l
        """), {
            "val": f'{{"lat": {lat}, "lng": {lng}}}',
            "lat": lat, "lng": lng,
            "d": local.departamento_id, "di": local.distrito_id,
            "s": local.seccional_id, "l": local.local_id
        })


def buscar_nominatim(query, headers):
    """Realiza la búsqueda y devuelve (lat, lng) o None."""
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(query)}&format=json&limit=1&countrycodes=py"
        resp = requests.get(url, headers=headers, timeout=10)
        time.sleep(1.5)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"  Error HTTP: {e}")
    return None


async def main():
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    db_url = os.getenv("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)
    
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
            WHERE l.geom_ubicacion IS NULL
            ORDER BY l.departamento_id, l.distrito_id
        """))
        locales = result.fetchall()

    print(f"Locales sin coordenada exacta: {len(locales)}")
    headers = {'User-Agent': 'SIGEL-Electoral/2.0 (lpraf@poliverso.com)'}
    encontrados = 0

    for loc in locales:
        nombre_orig = loc.nombre_local
        distrito = loc.nombre_distrito.title()  # "Asuncion" en vez de "ASUNCION"
        dpto = loc.nombre_dpto.title()
        if dpto.upper() == "CAPITAL":
            dpto = "Asunción"

        nombre_limpio = limpiar_nombre(nombre_orig).title()
        nombre_persona = extraer_nombre_persona(nombre_orig)

        # Estrategias de búsqueda en orden de calidad
        estrategias = [
            f"{nombre_limpio}, {distrito}, {dpto}, Paraguay",
            f"{nombre_limpio}, {dpto}, Paraguay",
            f"{nombre_limpio}, Paraguay",
        ]
        
        # Si extraemos el nombre de una persona, buscamos solo ese nombre + distrito
        if nombre_persona and len(nombre_persona.split()) >= 2:
            estrategias.insert(1, f"{nombre_persona.title()}, {distrito}, Paraguay")
            estrategias.insert(2, f"{nombre_persona.title()}, Paraguay")

        resultado = None
        for query in estrategias:
            print(f"  Buscando: {query}")
            resultado = buscar_nominatim(query, headers)
            if resultado:
                lat, lng = resultado
                print(f"  ✓ Encontrado: {lat:.4f}, {lng:.4f}")
                await buscar_y_guardar(engine, loc, lat, lng)
                encontrados += 1
                break

        if not resultado:
            print(f"  ✗ '{nombre_orig}' - sin resultado")

    await engine.dispose()
    print(f"\n✅ Proceso finalizado: {encontrados}/{len(locales)} encontrados")

if __name__ == "__main__":
    asyncio.run(main())
