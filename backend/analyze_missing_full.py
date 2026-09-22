import struct
import urllib.request
import io
import csv

# 1. Get all matched from TSJE CSV
url = 'https://www.datos.gov.py/sites/default/files/resultados-2001-2021-municipales-y-generales-por-local.csv'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
matched_locales = {} # (dep, dis, zon, loc) -> (depdes, disdes, zondes, locdes)

print("Streaming TSJE Open Data CSV...")
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
        if not row or len(row) <= locdes_idx: continue
        try:
            k = (int(row[dep_idx]), int(row[dis_idx]), int(row[zon_idx]), int(row[loc_idx]))
            if k not in matched_locales:
                matched_locales[k] = (row[depdes_idx].strip(), row[disdes_idx].strip(), row[zondes_idx].strip(), row[locdes_idx].strip())
        except:
            continue

print(f"Total locales in CSV: {len(matched_locales)}")

# 2. Check all 1187 locales in regciv.dbf and inspect the 56 missing
dbf_path = r'c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\regciv.dbf'
with open(dbf_path, 'rb') as f:
    hdr = f.read(32)
    num_recs, hdr_len, rec_len = struct.unpack('<IHH', hdr[4:12])
    fields = []
    while True:
        b = f.read(32)
        if not b or b[0] == 0x0D: break
        name = b[:11].replace(b'\x00', b'').decode('latin-1').strip()
        flen = b[16]
        fields.append((name, flen))
    field_offsets = {}
    cur = 1
    for name, flen in fields:
        field_offsets[name] = (cur, flen)
        cur += flen
        
    dep_off, dep_len = field_offsets['DEPART']
    dis_off, dis_len = field_offsets['DISTRITO']
    zon_off, zon_len = field_offsets['ZONA']
    loc_off, loc_len = field_offsets['LOCAL']
    dir_off, dir_len = field_offsets['DIRECCION']
    
    missing_locs = {} # (dep, dis, zon, loc) -> {'count': 0, 'sample_dirs': set()}
    f.seek(hdr_len)
    chunk_size = 50000
    processed = 0
    while processed < num_recs:
        to_read = min(chunk_size, num_recs - processed)
        data = f.read(to_read * rec_len)
        if not data: break
        actual = len(data) // rec_len
        for i in range(actual):
            rec = data[i*rec_len:(i+1)*rec_len]
            if rec[0] == 0x2A: continue
            dep = int(rec[dep_off:dep_off+dep_len].decode('latin-1') or 0)
            dis = int(rec[dis_off:dis_off+dis_len].decode('latin-1') or 0)
            zon = int(rec[zon_off:zon_off+zon_len].decode('latin-1') or 0)
            loc = int(rec[loc_off:loc_off+loc_len].decode('latin-1') or 0)
            k = (dep, dis, zon, loc)
            if k not in matched_locales:
                if k not in missing_locs:
                    missing_locs[k] = {'count': 0, 'sample_dirs': set()}
                missing_locs[k]['count'] += 1
                if len(missing_locs[k]['sample_dirs']) < 3:
                    d = rec[dir_off:dir_off+dir_len].decode('latin-1').strip()
                    if d: missing_locs[k]['sample_dirs'].add(d)
        processed += actual

print(f"\nTotal missing locales: {len(missing_locs)}")
for k, v in sorted(missing_locs.items()):
    print(f"Locale {k}: {v['count']} voters. Dirs: {list(v['sample_dirs'])}")
