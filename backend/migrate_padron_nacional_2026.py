"""
migrate_padron_nacional_2026.py
===============================
Script de alto rendimiento para migrar el Padron Nacional 2026 (regciv.dbf)
a PostgreSQL (electoral.personas y electoral.padrones).

Caracteristicas:
- Soporte para streaming binario directo de DBF en bloques de 50.000 registros
- Carga de alta velocidad mediante COPY unlogged a tabla intermedia staging
- Upsert sin duplicados en electoral.personas y electoral.padrones
- Creacion/vinculacion automatica con la eleccion "Elecciones Municipales Generales 2026"
- Reporte detallado de progreso, tiempos y validacion final

Uso:
  py -3.13 backend/migrate_padron_nacional_2026.py [--limit N] [--batch-size N] [--dry-run]
"""

import sys
import os
import time
import struct
import datetime
import argparse
import asyncio
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
DEFAULT_DBF_PATH = os.path.join("Padron", "pad_nac_2026", "regciv.dbf")

def parse_date(s):
    """Parsea fecha YYYYMMDD a datetime.date seguro."""
    if not s or len(s) != 8 or not s.isdigit():
        return None
    try:
        y, m, d = int(s[0:4]), int(s[4:6]), int(s[6:8])
        if y < 1900 or y > 2030 or m < 1 or m > 12 or d < 1 or d > 31:
            return None
        return datetime.date(y, m, d)
    except:
        return None

def parse_int(s):
    """Parsea enteros con manejo seguro de vacios."""
    if not s:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        return int(s)
    except:
        return None

def clean_str(s):
    """Limpia cadenas removiendo espacios sobrantes y nulos."""
    if not s:
        return None
    cleaned = s.strip()
    return cleaned if cleaned else None

async def run_migration(dbf_path=DEFAULT_DBF_PATH, batch_size=50000, limit=None, dry_run=False):
    t_start = time.time()
    print("=" * 60)
    print("MIGRACION DE PADRON NACIONAL 2026 (regciv.dbf) A SIGEL")
    print("=" * 60)
    print(f"Archivo origen: {dbf_path}")
    print(f"Batch size: {batch_size:,}")
    if limit:
        print(f"MODO PRUEBA LIMITADO: Procesando maximo {limit:,} registros.")
    if dry_run:
        print("MODO DRY-RUN: Solo analisis y lectura, sin cambios en BD.")

    if not os.path.exists(dbf_path):
        print(f"[ERROR] No se encontro el archivo DBF en: {dbf_path}")
        return

    file_size_mb = os.path.getsize(dbf_path) / (1024 * 1024)
    print(f"Tamano del archivo: {file_size_mb:,.2f} MB")

    # 1. Leer cabecera de DBF
    with open(dbf_path, "rb") as f:
        header = f.read(32)
        total_records, header_len, record_len = struct.unpack('<IHH', header[4:12])
        
        # Mapear posiciones exactas de campos
        field_offsets = {}
        offset = 1 # byte 0 es deleted flag
        f.seek(32)
        while True:
            desc = f.read(32)
            if not desc or desc[0] == 0x0D:
                break
            fname = desc[:11].replace(b'\x00', b'').decode('latin-1').strip()
            flen = desc[16]
            field_offsets[fname] = (offset, flen)
            offset += flen

    target_records = min(total_records, limit) if limit else total_records
    print(f"Total registros en DBF: {total_records:,}")
    print(f"Registros a procesar: {target_records:,}")

    if dry_run:
        print("[DRY-RUN] Simulando lectura...")
        # Simular lectura rapida
        t0 = time.time()
        with open(dbf_path, "rb") as f:
            f.seek(header_len)
            processed = 0
            while processed < target_records:
                to_read = min(batch_size, target_records - processed)
                data = f.read(to_read * record_len)
                if not data:
                    break
                processed += len(data) // record_len
        print(f"[DRY-RUN] Leidos {processed:,} registros en {time.time() - t0:.2f}s.")
        print("[DRY-RUN] Verificacion completada exitosamente.")
        return

    # 2. Conectar a PostgreSQL
    print(f"\nConectando a PostgreSQL...")
    conn = await asyncpg.connect(DATABASE_URL)
    print("[OK] Conexion establecida con exito.")

    try:
        # 3. Crear o buscar Eleccion en BD
        print("\n--- PASO 1: Configuracion de la Eleccion de Destino ---")
        elec_nombre = "Elecciones Municipales Generales 2026"
        row_e = await conn.fetchrow("SELECT id, nombre, activo FROM electoral.elecciones WHERE nombre = $1;", elec_nombre)
        
        if row_e:
            eleccion_id = row_e['id']
            print(f"Eleccion existente encontrada (ID: {eleccion_id}) - '{elec_nombre}'")
        else:
            eleccion_id = await conn.fetchval("""
                INSERT INTO electoral.elecciones (nombre, tipo, fecha, partido, activo)
                VALUES ($1, 'Generales', '2026-10-01', 'TSJE / Nacional', TRUE)
                RETURNING id;
            """, elec_nombre)
            print(f"[OK] Nueva eleccion creada con exito (ID: {eleccion_id}) - '{elec_nombre}'")

        # 4. Crear tabla staging unlogged
        print("\n--- PASO 2: Preparando tabla intermedia staging (unlogged) ---")
        await conn.execute("DROP TABLE IF EXISTS electoral.staging_regciv_2026;")
        await conn.execute("""
            CREATE UNLOGGED TABLE electoral.staging_regciv_2026 (
                cedula VARCHAR(20),
                nombres VARCHAR(255),
                apellidos VARCHAR(255),
                fecha_nacimiento DATE,
                genero CHAR(1),
                direccion TEXT,
                departamento_id INT,
                distrito_id INT,
                seccional_id INT,
                local_id INT,
                mesa INT,
                orden INT
            );
        """)
        print("[OK] Tabla electoral.staging_regciv_2026 creada.")

        # 5. Lectura y carga por bloques a staging
        print("\n--- PASO 3: Streaming de datos hacia staging ---")
        ci_off, ci_len = field_offsets['N_CEDULA']
        nom_off, nom_len = field_offsets['NOMBRE']
        ape_off, ape_len = field_offsets['APELLIDO']
        dir_off, dir_len = field_offsets['DIRECCION']
        fen_off, fen_len = field_offsets['C_FENACI']
        sex_off, sex_len = field_offsets['SEXO']
        dep_off, dep_len = field_offsets['DEPART']
        dis_off, dis_len = field_offsets['DISTRITO']
        sec_off, sec_len = field_offsets['SECCIONAL']
        loc_off, loc_len = field_offsets['LOCAL']
        mes_off, mes_len = field_offsets['MESA']
        ord_off, ord_len = field_offsets['ORDEN']

        processed_count = 0
        batch = []
        t_load_start = time.time()

        with open(dbf_path, "rb") as f:
            f.seek(header_len)
            
            while processed_count < target_records:
                to_read_records = min(batch_size, target_records - processed_count)
                raw_chunk = f.read(to_read_records * record_len)
                if not raw_chunk:
                    break
                
                n_records_in_chunk = len(raw_chunk) // record_len
                for r_idx in range(n_records_in_chunk):
                    rec = raw_chunk[r_idx * record_len : (r_idx + 1) * record_len]
                    if rec[0] == 0x2A: # Eliminado
                        continue
                    
                    cedula = rec[ci_off:ci_off+ci_len].decode('latin-1', errors='replace').strip()
                    if not cedula:
                        continue
                        
                    nombres = clean_str(rec[nom_off:nom_off+nom_len].decode('latin-1', errors='replace'))
                    apellidos = clean_str(rec[ape_off:ape_off+ape_len].decode('latin-1', errors='replace'))
                    direccion = clean_str(rec[dir_off:dir_off+dir_len].decode('latin-1', errors='replace'))
                    fenaci = parse_date(rec[fen_off:fen_off+fen_len].decode('latin-1', errors='replace'))
                    
                    sexo_raw = rec[sex_off:sex_off+sex_len].decode('latin-1', errors='replace').strip()
                    sexo = sexo_raw if sexo_raw in ('M', 'F') else None
                    
                    dep = parse_int(rec[dep_off:dep_off+dep_len].decode('latin-1', errors='replace'))
                    dis = parse_int(rec[dis_off:dis_off+dis_len].decode('latin-1', errors='replace'))
                    sec = parse_int(rec[sec_off:sec_off+sec_len].decode('latin-1', errors='replace'))
                    loc = parse_int(rec[loc_off:loc_off+loc_len].decode('latin-1', errors='replace'))
                    mesa = parse_int(rec[mes_off:mes_off+mes_len].decode('latin-1', errors='replace'))
                    orden = parse_int(rec[ord_off:ord_off+ord_len].decode('latin-1', errors='replace'))
                    
                    batch.append((
                        cedula, nombres, apellidos, fenaci, sexo, direccion,
                        dep, dis, sec, loc, mesa, orden
                    ))

                processed_count += n_records_in_chunk
                
                # Cargar batch a staging con COPY
                if len(batch) >= batch_size or processed_count >= target_records:
                    await conn.copy_records_to_table(
                        table_name="staging_regciv_2026",
                        schema_name="electoral",
                        columns=[
                            "cedula", "nombres", "apellidos", "fecha_nacimiento", "genero",
                            "direccion", "departamento_id", "distrito_id", "seccional_id",
                            "local_id", "mesa", "orden"
                        ],
                        records=batch
                    )
                    batch = []
                    
                    pct = (processed_count / target_records) * 100
                    elapsed = time.time() - t_load_start
                    rate = processed_count / elapsed if elapsed > 0 else 0
                    print(f"  -> {processed_count:,} / {target_records:,} registros ({pct:.1f}%) cargados a staging ({rate:,.0f} reg/s)")

        staging_rows = await conn.fetchval("SELECT count(*) FROM electoral.staging_regciv_2026;")
        print(f"[OK] Carga en staging finalizada: {staging_rows:,} registros insertados en {time.time() - t_load_start:.2f}s.")

        # 6. Indexar staging para optimizar el merge
        print("\n--- PASO 4: Optimizando indices en staging ---")
        t_idx = time.time()
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_staging_cedula ON electoral.staging_regciv_2026 (cedula);")
        print(f"[OK] Indice creado en {time.time() - t_idx:.2f}s.")

        # 7. Upsert masivo a personas
        print("\n--- PASO 5: Sincronizando tabla maestra (electoral.personas) ---")
        t_pers = time.time()
        res_pers = await conn.execute("""
            INSERT INTO electoral.personas (cedula, nombres, apellidos, fecha_nacimiento, genero, direccion_residencia)
            SELECT DISTINCT ON (cedula)
                cedula, nombres, apellidos, fecha_nacimiento, genero, direccion
            FROM electoral.staging_regciv_2026
            WHERE cedula IS NOT NULL AND cedula != ''
            ON CONFLICT (cedula) DO UPDATE SET
                nombres = COALESCE(EXCLUDED.nombres, electoral.personas.nombres),
                apellidos = COALESCE(EXCLUDED.apellidos, electoral.personas.apellidos),
                fecha_nacimiento = COALESCE(electoral.personas.fecha_nacimiento, EXCLUDED.fecha_nacimiento),
                genero = COALESCE(electoral.personas.genero, EXCLUDED.genero),
                direccion_residencia = COALESCE(electoral.personas.direccion_residencia, EXCLUDED.direccion_residencia);
        """)
        print(f"[OK] electoral.personas sincronizada en {time.time() - t_pers:.2f}s.")

        # 8. Upsert masivo a padrones para la eleccion
        print(f"\n--- PASO 6: Vinculando padron electoral (Eleccion ID: {eleccion_id}) ---")
        t_pad = time.time()
        res_pad = await conn.execute(f"""
            INSERT INTO electoral.padrones (eleccion_id, cedula, local_id, mesa, orden, seccional_id, distrito_id, departamento_id)
            SELECT DISTINCT ON (cedula)
                {eleccion_id}, cedula, local_id, mesa, orden, seccional_id, distrito_id, departamento_id
            FROM electoral.staging_regciv_2026
            WHERE cedula IS NOT NULL AND cedula != ''
            ON CONFLICT (eleccion_id, cedula) DO UPDATE SET
                local_id = EXCLUDED.local_id,
                mesa = EXCLUDED.mesa,
                orden = EXCLUDED.orden,
                seccional_id = EXCLUDED.seccional_id,
                distrito_id = EXCLUDED.distrito_id,
                departamento_id = EXCLUDED.departamento_id;
        """)
        print(f"[OK] electoral.padrones vinculada en {time.time() - t_pad:.2f}s.")

        # 9. Limpieza de staging y analyze
        print("\n--- PASO 7: Limpieza y actualizacion estadistica ---")
        await conn.execute("DROP TABLE IF EXISTS electoral.staging_regciv_2026;")
        await conn.execute("ANALYZE electoral.personas; ANALYZE electoral.padrones;")
        print("[OK] Tabla staging eliminada y estadisticas de optimizador actualizadas.")

        # 10. Resumen final y validacion
        print("\n" + "=" * 60)
        print("REPORTE DE AUDITORIA FINAL")
        print("=" * 60)
        total_personas = await conn.fetchval("SELECT count(*) FROM electoral.personas;")
        print(f"Total de personas en base de datos: {total_personas:,}")
        
        elecs = await conn.fetch("SELECT id, nombre, partido FROM electoral.elecciones ORDER BY id;")
        print("\nDistribucion de padrones por eleccion:")
        for el in elecs:
            cnt = await conn.fetchval("SELECT count(*) FROM electoral.padrones WHERE eleccion_id = $1;", el['id'])
            print(f"  Eleccion #{el['id']}: {el['nombre']} ({el['partido']}) -> {cnt:,} electores")

        total_time = time.time() - t_start
        print(f"\nTiempo total transcurrido: {total_time:.2f} segundos ({total_time / 60:.2f} minutos)")
        print("MIGRACION COMPLETADA EXITOSAMENTE.")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR CRITICO] Ocurrio una falla durante la migracion: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migracion masiva de padron 2026 a SIGEL")
    parser.add_argument("--dbf", default=DEFAULT_DBF_PATH, help="Ruta al archivo regciv.dbf")
    parser.add_argument("--batch-size", type=int, default=50000, help="Tamano del lote COPY (default: 50,000)")
    parser.add_argument("--limit", type=int, default=None, help="Limite de registros a procesar (para pruebas)")
    parser.add_argument("--dry-run", action="store_true", help="Simulacion de lectura sin escribir en BD")
    args = parser.parse_args()

    asyncio.run(run_migration(
        dbf_path=args.dbf,
        batch_size=args.batch_size,
        limit=args.limit,
        dry_run=args.dry_run
    ))
