
import asyncio
import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def import_padron(file_path, eleccion_id):
    """
    Ejemplo de importación de un nuevo padrón desde Excel/CSV
    Columnas esperadas: cedula, nombres, apellidos, nacimiento, genero, mesa, orden, local_id, departamento_id, distrito_id
    """
    engine = create_async_engine(DATABASE_URL)
    
    # Cargar datos (ejemplo con pandas)
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)
        
    print(f"Cargados {len(df)} registros de {file_path}")

    async with engine.begin() as conn:
        # 1. Insertar/Actualizar Personas
        print("Sincronizando personas...")
        for _, row in df.iterrows():
            await conn.execute(text("""
                INSERT INTO electoral.personas (cedula, nombres, apellidos, fecha_nacimiento, genero)
                VALUES (:cedula, :nombres, :apellidos, :nacimiento, :genero)
                ON CONFLICT (cedula) DO UPDATE SET
                    nombres = EXCLUDED.nombres,
                    apellidos = EXCLUDED.apellidos,
                    fecha_nacimiento = COALESCE(electoral.personas.fecha_nacimiento, EXCLUDED.fecha_nacimiento),
                    genero = COALESCE(electoral.personas.genero, EXCLUDED.genero);
            """), {
                "cedula": str(row['cedula']),
                "nombres": row['nombres'],
                "apellidos": row['apellidos'],
                "nacimiento": row['nacimiento'] if not pd.isna(row['nacimiento']) else None,
                "genero": row['genero'] if not pd.isna(row['genero']) else None
            })

        # 2. Vincular a la Elección (Padrones)
        print(f"Vinculando a la elección ID: {eleccion_id}...")
        for _, row in df.iterrows():
            await conn.execute(text("""
                INSERT INTO electoral.padrones (eleccion_id, cedula, local_id, mesa, orden, departamento_id, distrito_id)
                VALUES (:eleccion_id, :cedula, :local_id, :mesa, :orden, :departamento_id, :distrito_id)
                ON CONFLICT (eleccion_id, cedula) DO UPDATE SET
                    local_id = EXCLUDED.local_id,
                    mesa = EXCLUDED.mesa,
                    orden = EXCLUDED.orden,
                    departamento_id = EXCLUDED.departamento_id,
                    distrito_id = EXCLUDED.distrito_id;
            """), {
                "eleccion_id": eleccion_id,
                "cedula": str(row['cedula']),
                "local_id": int(row['local_id']) if not pd.isna(row['local_id']) else None,
                "mesa": int(row['mesa']) if not pd.isna(row['mesa']) else None,
                "orden": int(row['orden']) if not pd.isna(row['orden']) else None,
                "departamento_id": int(row['departamento_id']) if not pd.isna(row['departamento_id']) else None,
                "distrito_id": int(row['distrito_id']) if not pd.isna(row['distrito_id']) else None
            })
            
    print("Importación completada con éxito.")

if __name__ == "__main__":
    # Ejemplo de uso:
    # asyncio.run(import_padron("nuevo_padron.xlsx", eleccion_id=1))
    print("Script de ejemplo creado. Edita la llamada final para usarlo con tu archivo.")
