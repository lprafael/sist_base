import os
import geopandas as gpd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def upload_cartografia():
    load_dotenv()
    # Usamos el motor síncrono para geopandas (pq usa psycopg2-binary que instalamos)
    # Importante: host db es el nombre del container de docker, pero si corremos afuera usamos localhost:5434
    DB_URL = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")
    
    # Si estamos corriendo fuera de Docker, necesitamos usar localhost:5434
    # Si estamos dentro, DATABASE_URL ya tiene 'db:5432'
    if "localhost" in DB_URL or "127.0.0.1" in DB_URL:
        DB_URL = DB_URL.replace(":5432", ":5434")
    
    engine = create_engine(DB_URL)
    
    BASE_DIR = os.path.join(os.path.dirname(__file__), "cartografia")
    
    # Mapeo de tipos de archivos a nombres de tabla
    LAYER_MAPPING = {
        "Barrios": "barrios",
        "Ciudades": "ciudades",
        "Departamento": "departamentos",
        "Distrito": "distritos",
        "Distriros": "distritos", # Corrección por posible typo
        "Manzanas": "manzanas",
        "Vías Principales": "vias_principales",
        "Vías": "vias"
    }

    # Crear esquema 'cartografia'
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS cartografia;"))
    
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
                    print(f"Skipping: {file} (No se reconoce tipo de capa)")
                    continue
                
                print(f"Procesando {file} -> cartografia.{target_table}...")
                
                try:
                    # Leer GeoJSON
                    gdf = gpd.read_file(file_path)
                    
                    # Asegurar SRID 4326
                    if gdf.crs is None:
                        gdf.set_crs(epsg=4326, inplace=True)
                    elif gdf.crs != "EPSG:4326":
                        gdf = gdf.to_crs(epsg=4326)
                    
                    # Agregar información de origen (departamento) basado en el nombre de la carpeta
                    folder_name = os.path.basename(root)
                    if " " in folder_name:
                        dpto_id, dpto_name = folder_name.split(" ", 1)
                        gdf["dpto_id_ref"] = int(dpto_id)
                        gdf["dpto_nombre_ref"] = dpto_name
                    
                    # Subir a la base de datos
                    # Usamos if_exists='append' para ir acumulando de todos los departamentos
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
        print("Creando índices espaciales...")
        for table in set(LAYER_MAPPING.values()):
            try:
                # El nombre de la columna geometría por defecto en to_postgis es 'geometry'
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{table}_geom ON cartografia.{table} USING GIST (geometry);"))
            except Exception as e:
                print(f"No se pudo crear índice para {table}: {e}")

    print("¡Proceso de carga de cartografía finalizado!")

if __name__ == "__main__":
    upload_cartografia()
