import os
import sys
import time
import struct
import asyncio
import asyncpg
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://postgres:admin@127.0.0.1:5434/SIGEL"
elif "asyncpg" in DB_URL:
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://")

DBF_PATH = r"c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\regciv.dbf"

async def main():
    print("=" * 70, flush=True)
    print(" SINCRONIZACIÓN ROBUSTA POR LOTES DE ZONAS EN electoral.padrones", flush=True)
    print("=" * 70, flush=True)
    
    t_start = time.time()
    
    print("\n[1] Conectando a PostgreSQL...", flush=True)
    conn = await asyncpg.connect(DB_URL)
    print("[OK] Conexión establecida.", flush=True)
    
    # 1. Asegurar tabla temporal
    print("\n[2] Preparando tabla temporal electoral.tmp_padron_zonas...", flush=True)
    await conn.execute("DROP TABLE IF EXISTS electoral.tmp_padron_zonas;")
    await conn.execute("""
        CREATE TABLE electoral.tmp_padron_zonas (
            cedula VARCHAR(20),
            zona INTEGER
        );
    """)
    print("[OK] Tabla temporal creada.", flush=True)
    
    # 2. Cargar datos desde regciv.dbf
    print(f"\n[3] Extrayendo cédulas y zonas desde '{DBF_PATH}'...", flush=True)
    t_read = time.time()
    with open(DBF_PATH, 'rb') as f:
        hdr = f.read(32)
        num_recs, hdr_len, rec_len = struct.unpack('<IHH', hdr[4:12])
        fields = []
        while True:
            b = f.read(32)
            if not b or b[0] == 0x0D: break
            fname = b[:11].replace(b'\x00', b'').decode('latin-1').strip()
            flen = b[16]
            fields.append((fname, flen))
            
        field_offsets = {}
        cur = 1
        for fname, flen in fields:
            field_offsets[fname] = (cur, flen)
            cur += flen
            
        ci_off, ci_len = field_offsets['N_CEDULA']
        zon_off, zon_len = field_offsets['ZONA']
        
        f.seek(hdr_len)
        seen_ci = set()
        batch = []
        batch_size = 250000
        loaded = 0
        duplicates = 0
        chunk_size = 50000
        
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
                if ci in seen_ci:
                    duplicates += 1
                    continue
                seen_ci.add(ci)
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
                print(f"     -> Cargados {len(seen_ci):,} electores únicos en BD (Progreso: {loaded:,}/{num_recs:,})...", flush=True)
                batch = []
                
        if batch:
            await conn.copy_records_to_table(
                'tmp_padron_zonas',
                schema_name='electoral',
                records=batch,
                columns=['cedula', 'zona']
            )
            print(f"     -> Cargados {len(seen_ci):,} electores únicos en BD...", flush=True)

    print(f"[OK] Carga en tabla temporal completada en {time.time() - t_read:.2f}s.", flush=True)
    
    # 3. Crear índice temporal
    print("\n[4] Creando índice temporal en tmp_padron_zonas(cedula)...", flush=True)
    t_idx = time.time()
    await conn.execute("CREATE INDEX idx_tmp_zonas_ci ON electoral.tmp_padron_zonas (cedula);")
    print(f"[OK] Índice creado en {time.time() - t_idx:.2f}s.", flush=True)
    
    # 4. Obtener rango de IDs para procesar en chunks
    print("\n[5] Obteniendo rango de IDs en electoral.padrones para Elección 3...", flush=True)
    range_info = await conn.fetchrow("""
        SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total
        FROM electoral.padrones
        WHERE eleccion_id = 3;
    """)
    min_id = range_info['min_id']
    max_id = range_info['max_id']
    total_pad = range_info['total']
    print(f"     * Rango de IDs: {min_id:,} a {max_id:,} (Total: {total_pad:,})", flush=True)
    
    # 5. Ejecutar UPDATE en bloques de 250,000 IDs para evitar saturación de memoria y desconexiones
    chunk_step = 250000
    cur_id = min_id
    total_updated = 0
    t_upd_start = time.time()
    
    print("\n[6] Ejecutando UPDATE por bloques controlados...", flush=True)
    while cur_id <= max_id:
        next_id = cur_id + chunk_step - 1
        t_chunk = time.time()
        res = await conn.execute(f"""
            UPDATE electoral.padrones p
            SET seccional_id = t.zona,
                zona_id = t.zona
            FROM electoral.tmp_padron_zonas t
            WHERE p.eleccion_id = 3 
              AND p.id BETWEEN {cur_id} AND {next_id}
              AND p.cedula = t.cedula;
        """)
        # Extraer filas actualizadas
        cnt = int(res.split()[-1]) if res else 0
        total_updated += cnt
        pct = min(100.0, (next_id - min_id + 1) / (max_id - min_id + 1) * 100)
        print(f"     -> IDs {cur_id:,} .. {next_id:,} ({cnt:,} actualizados) en {time.time()-t_chunk:.2f}s [{pct:.1f}%]", flush=True)
        cur_id = next_id + 1

    print(f"[OK] Total actualizados en padrones: {total_updated:,} en {time.time() - t_upd_start:.2f}s.", flush=True)
    
    # 6. Limpiar tabla temporal
    print("\n[7] Limpiando tabla temporal...", flush=True)
    await conn.execute("DROP TABLE IF EXISTS electoral.tmp_padron_zonas;")
    print("[OK] Tabla temporal eliminada.", flush=True)
    
    # 7. ANALYZE
    print("\n[8] Actualizando estadísticas de PostgreSQL...", flush=True)
    await conn.execute("ANALYZE electoral.padrones;")
    print("[OK] ANALYZE completado.", flush=True)
    
    # 8. Verificación final
    print("\n" + "=" * 70, flush=True)
    print(" VERIFICACIÓN FINAL CON ELECTORES TESTIGO", flush=True)
    print("=" * 70, flush=True)
    
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
            print(f"\n-> CI: {row['cedula']} | {row['nombres']} {row['apellidos']}", flush=True)
            print(f"   Dpto:     {row['departamento']}", flush=True)
            print(f"   Distrito: {row['distrito']}", flush=True)
            print(f"   Zona:     {row['zona_seccional']}", flush=True)
            print(f"   Local:    {row['local_votacion']}", flush=True)
            print(f"   Mesa:     {row['mesa']} | Orden: {row['orden']}", flush=True)
            print(f"   Secc ANR: {row['seccional_anr']}", flush=True)
        else:
            print(f"\n-> CI: {ci} - No encontrado.", flush=True)
            
    await conn.close()
    print(f"\n¡PROCESO TOTAL CULMINADO CON ÉXITO en {time.time() - t_start:.2f}s!", flush=True)

if __name__ == '__main__':
    asyncio.run(main())
