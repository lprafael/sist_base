import os
import geopandas as gpd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import pandas as pd

def upload_cartografia():
    load_dotenv()
    # Usamos el motor síncrono para geopandas
    DB_URL = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")
    
    engine = create_engine(DB_URL)
    
    BASE_DIR = os.path.join(os.path.dirname(__file__), "cartografia")
    
    # Mapeo de tipos de archivos a nombres de tabla
    LAYER_MAPPING = {
        "Barrios": "barrios",
        "Departamento": "departamentos",
        "Distrito": "distritos",
        "Distriros": "distritos" # Corrección por posible typo
    }

    # Cargar catálogo de distritos para vincular (linking)
    dist_catalog = {}
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT departamento_id, id, UPPER(TRIM(descripcion)) as nombre FROM electoral.ref_distritos"))
            for r in res:
                # Usamos una clave compuesta (dpto_id, nombre_limpio)
                dist_catalog[(int(r[0]), str(r[2]))] = int(r[1])
        print(f"Catálogo de distritos cargado: {len(dist_catalog)} distritos encontrados.")
    except Exception as e:
        print(f"Advertencia: No se pudo cargar catálogo de distritos para linking: {e}")

    # Crear esquema 'cartografia' y truncar tablas
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS cartografia;"))
        print("Limpiando tablas para recarga...")
        for table in set(LAYER_MAPPING.values()):
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS cartografia.{table} CASCADE;"))
            except: pass

    print(f"Buscando archivos GeoJSON en {BASE_DIR}...")
    
    for root, dirs, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith(".geojson"):
                file_path = os.path.join(root, file)
                
                # Detectar tipo de capa
                target_table = None
                for key, table in LAYER_MAPPING.items():
                    if key in file:
                        target_table = table
                        break
                
                if not target_table:
                    continue
                
                print(f"Procesando {file} -> cartografia.{target_table}...")
                
                try:
                    # Leer GeoJSON
                    gdf = gpd.read_file(file_path)
                    
                    # Asegurar que todas las columnas sean minúsculas para facilitar procesamiento
                    gdf.columns = [c.lower() for c in gdf.columns]

                    # Asegurar SRID 4326
                    if gdf.crs is None:
                        gdf.set_crs(epsg=4326, inplace=True)
                    elif gdf.crs != "EPSG:4326":
                        gdf = gdf.to_crs(epsg=4326)
                    
                    # Agregar información de origen (departamento) basado en el nombre de la carpeta
                    folder_name = os.path.basename(root)
                    dpto_id = None
                    if " " in folder_name:
                        parts = folder_name.split(" ", 1)
                        if parts[0].isdigit():
                            dpto_id = int(parts[0])
                            dpto_name = parts[1]
                            gdf["dpto_id_ref"] = dpto_id
                            gdf["dpto_nombre_ref"] = dpto_name
                    
                    # Mapeo de columnas de población y descriptivos (Normalización)
                    # Las columnas de origen ya están en minúsculas en 'gdf.columns'
                    pop_mapping = {
                        'pobl_total': 'poblacion_total',
                        'pobl_homb': 'poblacion_hombres',
                        'pobl_muje': 'poblacion_mujeres',
                        'pob_total': 'poblacion_total',
                        'poblacion_total': 'poblacion_total',
                        'dist_desc': 'dist_desc_',
                        'dist_desc_': 'dist_desc_',
                        'barrio_desc': 'barlo_desc',
                        'barlo_desc': 'barlo_desc',
                        'barrio': 'barlo_desc',
                        'nombre': 'barlo_desc'
                    }
                    for old, new in pop_mapping.items():
                        if old in gdf.columns:
                            # Para población, asegurar que sea numérico
                            if 'poblacion' in new:
                                gdf[new] = pd.to_numeric(gdf[old], errors='coerce').fillna(0).astype(int)
                            else:
                                gdf[new] = gdf[old]
                    
                    # Asegurar que existan todas las columnas clave (todas en minúsculas)
                    columnas_fijas = [
                        'poblacion_total', 'poblacion_hombres', 'poblacion_mujeres',
                        'dist_desc_', 'barlo_desc', 'ref_distrito_id',
                        'dpto_id_ref', 'dpto_nombre_ref'
                    ]
                    for cf in columnas_fijas:
                        if cf not in gdf.columns:
                            if 'poblacion' in cf:
                                gdf[cf] = 0
                            else:
                                gdf[cf] = None

                    # Linking de distritos (Solo si tenemos dpto_id_ref y columna de nombre de distrito)
                    if dpto_id is not None and target_table in ['barrios', 'distritos']:
                        def link_dist(row):
                            # Columnas candidatas para nombre de distrito (en minúsculas)
                            d_col = row.get("dist_desc_") or row.get("dist_desc") or row.get("dsto_desc")
                            if not d_col: return None
                            name = str(d_col).strip().upper()
                            return dist_catalog.get((dpto_id, name))
                        
                        gdf["ref_distrito_id"] = gdf.apply(link_dist, axis=1)

                    # Subir a la base de datos
                    gdf.to_postgis(
                        target_table, 
                        engine, 
                        schema="cartografia", 
                        if_exists="append", 
                        index=False
                    )
                    print(f"  ✓ {len(gdf)} registros subidos.")
                    
                except Exception as e:
                    print(f"  ✗ Error en {file}: {e}")

    # Crear índices espaciales después de cargar todo
    with engine.begin() as conn:
        print("Creando índices espaciales y optimizaciones...")
        for table in set(LAYER_MAPPING.values()):
            try:
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{table}_geom ON cartografia.{table} USING GIST (geometry);"))
                if table == 'barrios':
                    conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_barrios_dpto ON cartografia.barrios (dpto_id_ref);"))
                    conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_barrios_dist ON cartografia.barrios (ref_distrito_id);"))
            except Exception as e:
                print(f"No se pudo optimizar {table}: {e}")

    print("¡Proceso de carga de cartografía finalizado con vinculación de datos!")

if __name__ == "__main__":
    upload_cartografia()
