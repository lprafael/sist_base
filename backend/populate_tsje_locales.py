import os
import sys
import time
import struct
import io
import csv
import urllib.request
import asyncio
import asyncpg
from dotenv import load_dotenv

# Configurar UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Cargar .env
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://postgres:admin@187.77.247.23:5434/SIGEL"
elif "asyncpg" in DB_URL:
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://")

DBF_PATH = r"c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\regciv.dbf"
CSV_URL = "https://www.datos.gov.py/sites/default/files/resultados-2001-2021-municipales-y-generales-por-local.csv"

async def main():
    print("=" * 70)
    print(" CARGA OFICIAL DE LOCALES TSJE Y VINCULACIÓN AL PADRÓN NACIONAL")
    print("=" * 70)
    
    t_start = time.time()
    
    # -------------------------------------------------------------
    # 1. Conexión a la base de datos
    # -------------------------------------------------------------
    print("\n[PASO 1] Conectando a PostgreSQL...")
    conn = await asyncpg.connect(DB_URL)
    print("[OK] Conexión establecida exitosamente.")
    
    # Asegurar columnas en padrones
    print("\n[PASO 2] Asegurando columnas 'zona_id' y 'seccional_anr' en electoral.padrones...")
    await conn.execute("""
        ALTER TABLE electoral.padrones ADD COLUMN IF NOT EXISTS seccional_anr INTEGER;
        ALTER TABLE electoral.padrones ADD COLUMN IF NOT EXISTS zona_id INTEGER;
    """)
    print("[OK] Columnas verificadas/creadas.")
    
    # Resguardar la seccional ANR actual antes de actualizar
    print("\n[PASO 3] Resguardando seccional partidaria ANR en 'seccional_anr'...")
    t_resg = time.time()
    await conn.execute("""
        UPDATE electoral.padrones 
        SET seccional_anr = seccional_id 
        WHERE eleccion_id = 3 AND seccional_id IS NOT NULL AND seccional_anr IS NULL;
    """)
    print(f"[OK] Seccional ANR resguardada en {time.time() - t_resg:.2f}s.")
    
    # -------------------------------------------------------------
    # 2. Descargar catálogo oficial TSJE
    # -------------------------------------------------------------
    print(f"\n[PASO 4] Descargando catálogo oficial de locales del TSJE...")
    print(f"URL: {CSV_URL}")
    t_dl = time.time()
    
    req = urllib.request.Request(CSV_URL, headers={'User-Agent': 'Mozilla/5.0'})
    
    cat_zonas = {}   # (dep, dis, zon) -> zondes
    cat_locales = {} # (dep, dis, zon, loc) -> (depdes, disdes, zondes, locdes)
    
    with urllib.request.urlopen(req) as resp:
        stream = io.TextIOWrapper(resp, encoding='latin-1', errors='replace')
        reader = csv.reader(stream, delimiter=';')
        header = next(reader)
        dep_idx = header.index('dep')
        depdes_idx = header.index('depdes')
        dis_idx = header.index('dis')
        disdes_idx = header.index('disdes')
        zon_idx = header.index('zon')
        zondes_idx = header.index('zondes')
        loc_idx = header.index('loc')
        locdes_idx = header.index('locdes')
        
        for row in reader:
            if not row or len(row) <= locdes_idx:
                continue
            try:
                dep = int(row[dep_idx])
                dis = int(row[dis_idx])
                zon = int(row[zon_idx])
                loc = int(row[loc_idx])
                z_key = (dep, dis, zon)
                if z_key not in cat_zonas:
                    cat_zonas[z_key] = row[zondes_idx].strip()
                    
                l_key = (dep, dis, zon, loc)
                if l_key not in cat_locales:
                    cat_locales[l_key] = (
                        row[depdes_idx].strip(),
                        row[disdes_idx].strip(),
                        row[zondes_idx].strip(),
                        row[locdes_idx].strip()
                    )
            except Exception:
                continue

    print(f"[OK] Catálogo TSJE descargado en {time.time() - t_dl:.2f}s.")
    print(f"     * Zonas electorales encontradas: {len(cat_zonas)}")
    print(f"     * Locales oficiales encontrados: {len(cat_locales)}")
    
    # -------------------------------------------------------------
    # 3. Escaneo de regciv.dbf para asegurar los 1.187 locales
    # -------------------------------------------------------------
    print(f"\n[PASO 5] Escaneando '{DBF_PATH}' para validar todos los locales del padrón nacional...")
    t_scan = time.time()
    with open(DBF_PATH, 'rb') as f:
        hdr = f.read(32)
        num_recs, hdr_len, rec_len = struct.unpack('<IHH', hdr[4:12])
        fields = []
        while True:
            b = f.read(32)
            if not b or b[0] == 0x0D:
                break
            fname = b[:11].replace(b'\x00', b'').decode('latin-1').strip()
            flen = b[16]
            fields.append((fname, flen))
            
        field_offsets = {}
        cur = 1
        for fname, flen in fields:
            field_offsets[fname] = (cur, flen)
            cur += flen
            
        dep_off, dep_len = field_offsets['DEPART']
        dis_off, dis_len = field_offsets['DISTRITO']
        zon_off, zon_len = field_offsets['ZONA']
        loc_off, loc_len = field_offsets['LOCAL']
        dir_off, dir_len = field_offsets['DIRECCION']
        ci_off, ci_len = field_offsets['N_CEDULA']
        
        f.seek(hdr_len)
        unique_ddzl = set()
        dir_samples = {}
        
        chunk_size = 50000
        processed = 0
        while processed < num_recs:
            to_read = min(chunk_size, num_recs - processed)
            chunk = f.read(to_read * rec_len)
            if not chunk: break
            act = len(chunk) // rec_len
            for i in range(act):
                rec = chunk[i*rec_len:(i+1)*rec_len]
                if rec[0] == 0x2A: continue
                dep = int(rec[dep_off:dep_off+dep_len].decode('latin-1') or 0)
                dis = int(rec[dis_off:dis_off+dis_len].decode('latin-1') or 0)
                zon = int(rec[zon_off:zon_off+zon_len].decode('latin-1') or 0)
                loc = int(rec[loc_off:loc_off+loc_len].decode('latin-1') or 0)
                k = (dep, dis, zon, loc)
                unique_ddzl.add(k)
                if k not in cat_locales and k not in dir_samples:
                    d = rec[dir_off:dir_off+dir_len].decode('latin-1').strip()
                    if d: dir_samples[k] = d
            processed += act

    print(f"[OK] DBF escaneado en {time.time() - t_scan:.2f}s.")
    print(f"     * Total locales únicos requeridos por el padrón: {len(unique_ddzl)}")
    
    # -------------------------------------------------------------
    # 4. Poblar electoral.ref_seccionales y electoral.ref_locales
    # -------------------------------------------------------------
    print("\n[PASO 6] Insertando zonas y locales en electoral.ref_seccionales y electoral.ref_locales...")
    
    # Obtener descripciones de distritos de la DB para los que falten
    db_distritos = await conn.fetch("SELECT departamento_id, id, descripcion FROM electoral.ref_distritos;")
    dist_map = {(r['departamento_id'], r['id']): r['descripcion'] for r in db_distritos}
    
    # A) Zonas
    zonas_records = []
    for (dep, dis, zon), zondes in cat_zonas.items():
        zonas_records.append((dep, dis, zon, zondes))
        
    # Asegurar que todas las zonas del DBF existan en zonas_records
    for (dep, dis, zon, loc) in unique_ddzl:
        if (dep, dis, zon) not in cat_zonas:
            d_name = dist_map.get((dep, dis), f"DISTRITO {dis}")
            zon_name = d_name if zon == 0 else f"{d_name} - ZONA {zon}"
            cat_zonas[(dep, dis, zon)] = zon_name
            zonas_records.append((dep, dis, zon, zon_name))
            
    print(f"     -> Insertando {len(zonas_records)} zonas en electoral.ref_seccionales...")
    await conn.executemany("""
        INSERT INTO electoral.ref_seccionales (departamento_id, distrito_id, seccional_id, descripcion)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (departamento_id, distrito_id, seccional_id) 
        DO UPDATE SET descripcion = EXCLUDED.descripcion;
    """, zonas_records)
    print("     [OK] Zonas sincronizadas.")
    
    # B) Locales
    locales_records = []
    for (dep, dis, zon, loc) in unique_ddzl:
        if (dep, dis, zon, loc) in cat_locales:
            depdes, disdes, zondes, locdes = cat_locales[(dep, dis, zon, loc)]
            domicilio = f"{disdes}, {depdes}"
        else:
            # Local no catalogado en histórico: usar dirección de referencia
            d_name = dist_map.get((dep, dis), f"DISTRITO {dis}")
            ref_dir = dir_samples.get((dep, dis, zon, loc), "")
            locdes = f"LOCAL N° {loc} - {ref_dir}" if ref_dir else f"LOCAL DE VOTACION N° {loc} ({d_name})"
            domicilio = f"{ref_dir}, {d_name}" if ref_dir else d_name
            
        locales_records.append((dep, dis, zon, loc, locdes[:255], domicilio))
        
    print(f"     -> Insertando {len(locales_records)} locales en electoral.ref_locales...")
    await conn.executemany("""
        INSERT INTO electoral.ref_locales (departamento_id, distrito_id, seccional_id, local_id, descripcion, domicilio)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (departamento_id, distrito_id, seccional_id, local_id)
        DO UPDATE SET descripcion = EXCLUDED.descripcion, domicilio = EXCLUDED.domicilio;
    """, locales_records)
    print("     [OK] Locales sincronizados en ref_locales.")
    
    # -------------------------------------------------------------
    # 5. Sincronizar ZONA en electoral.padrones (Elección 3)
    # -------------------------------------------------------------
    print("\n[PASO 7] Sincronizando 'seccional_id' y 'zona_id' en electoral.padrones con la ZONA real de votación...")
    print("     -> Creando tabla temporal en PostgreSQL para carga masiva...")
    await conn.execute("DROP TABLE IF EXISTS electoral.tmp_padron_zonas;")
    await conn.execute("""
        CREATE UNLOGGED TABLE electoral.tmp_padron_zonas (
            cedula VARCHAR(20) PRIMARY KEY,
            zona INTEGER
        );
    """)
    
    print("     -> Leyendo cédula y zona desde regciv.dbf y cargando en PostgreSQL (COPY)...")
    t_copy = time.time()
    
    with open(DBF_PATH, 'rb') as f:
        f.seek(hdr_len)
        batch = []
        batch_size = 250000
        loaded = 0
        
        while loaded < num_recs:
            to_read = min(chunk_size, num_recs - loaded)
            chunk = f.read(to_read * rec_len)
            if not chunk: break
            act = len(chunk) // rec_len
            
            for i in range(act):
                rec = chunk[i*rec_len:(i+1)*rec_len]
                if rec[0] == 0x2A: continue
                ci = rec[ci_off:ci_off+ci_len].decode('latin-1').strip()
                if not ci: continue
                zon = int(rec[zon_off:zon_off+zon_len].decode('latin-1') or 0)
                batch.append((ci, zon))
                
            loaded += act
            
            if len(batch) >= batch_size:
                await conn.copy_records_to_table(
                    'tmp_padron_zonas',
                    schema_name='electoral',
                    records=batch,
                    columns=['cedula', 'zona']
                )
                print(f"        * Cargados {loaded:,} / {num_recs:,} registros...")
                batch = []
                
        if batch:
            await conn.copy_records_to_table(
                'tmp_padron_zonas',
                schema_name='electoral',
                records=batch,
                columns=['cedula', 'zona']
            )
            print(f"        * Cargados {loaded:,} / {num_recs:,} registros...")

    print(f"     [OK] Tabla temporal poblada en {time.time() - t_copy:.2f}s.")
    
    print("\n[PASO 8] Ejecutando UPDATE masivo en electoral.padrones para la Elección 3...")
    t_upd = time.time()
    res_upd = await conn.execute("""
        UPDATE electoral.padrones p
        SET seccional_id = t.zona,
            zona_id = t.zona
        FROM electoral.tmp_padron_zonas t
        WHERE p.eleccion_id = 3 AND p.cedula = t.cedula;
    """)
    print(f"[OK] {res_upd} en {time.time() - t_upd:.2f}s.")
    
    # Limpiar tabla temporal
    await conn.execute("DROP TABLE IF EXISTS electoral.tmp_padron_zonas;")
    print("[OK] Tabla temporal eliminada.")
    
    # Ejecutar ANALYZE
    print("\n[PASO 9] Optimizando estadísticas de las tablas (ANALYZE)...")
    await conn.execute("ANALYZE electoral.ref_locales; ANALYZE electoral.ref_seccionales; ANALYZE electoral.padrones;")
    print("[OK] Estadísticas actualizadas.")
    
    # -------------------------------------------------------------
    # 6. Verificación de prueba con electores testigo
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print(" VERIFICACIÓN DE ELECTORES TESTIGO TRAS LA CARGA")
    print("=" * 70)
    
    test_cis = ['3558002', '487656', '330395', '333911']
    
    for ci in test_cis:
        row = await conn.fetchrow("""
            SELECT 
                p.cedula,
                pe.nombres,
                pe.apellidos,
                d.descripcion as departamento,
                di.descripcion as distrito,
                s.descripcion as zona_seccional,
                l.descripcion as local_votacion,
                p.mesa,
                p.orden,
                p.seccional_anr
            FROM electoral.padrones p
            JOIN electoral.personas pe ON p.cedula = pe.cedula
            LEFT JOIN electoral.ref_departamentos d ON p.departamento_id = d.id
            LEFT JOIN electoral.ref_distritos di ON p.departamento_id = di.departamento_id AND p.distrito_id = di.id
            LEFT JOIN electoral.ref_seccionales s ON p.departamento_id = s.departamento_id AND p.distrito_id = s.distrito_id AND p.seccional_id = s.seccional_id
            LEFT JOIN electoral.ref_locales l ON p.departamento_id = l.departamento_id AND p.distrito_id = l.distrito_id AND p.seccional_id = l.seccional_id AND p.local_id = l.local_id
            WHERE p.eleccion_id = 3 AND p.cedula = $1;
        """, ci)
        if row:
            print(f"\n-> CI: {row['cedula']} | {row['nombres']} {row['apellidos']}")
            print(f"   Dpto:     {row['departamento']}")
            print(f"   Distrito: {row['distrito']}")
            print(f"   Zona:     {row['zona_seccional']}")
            print(f"   Local:    {row['local_votacion']}")
            print(f"   Mesa:     {row['mesa']} | Orden: {row['orden']}")
            print(f"   Secc ANR: {row['seccional_anr']}")
        else:
            print(f"\n-> CI: {ci} - No encontrado en la Elección 3.")
            
    await conn.close()
    print(f"\nProceso total finalizado exitosamente en {time.time() - t_start:.2f}s.")

if __name__ == '__main__':
    asyncio.run(main())
