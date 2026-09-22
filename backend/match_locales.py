import urllib.request
import csv
import io
import time
import struct

# 1. First get all 1187 unique (dep, dis, zon, loc) from regciv.dbf
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
    
    unique_dbf = set()
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
            unique_dbf.add((dep, dis, zon, loc))
        processed += actual

print(f"Total locales needed from DBF: {len(unique_dbf)}")

# 2. Stream TSJE open data CSV and check how many of the 1187 match
url = 'https://www.datos.gov.py/sites/default/files/resultados-2001-2021-municipales-y-generales-por-local.csv'
print("Streaming TSJE Open Data CSV...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

matched = {} # (dep, dis, zon, loc) -> (depdes, disdes, zondes, locdes)

with urllib.request.urlopen(req) as resp:
    # Use TextIOWrapper for streaming line by line
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
    
    line_cnt = 0
    for row in reader:
        line_cnt += 1
        if not row or len(row) <= locdes_idx: continue
        try:
            k = (int(row[dep_idx]), int(row[dis_idx]), int(row[zon_idx]), int(row[loc_idx]))
            if k in unique_dbf and k not in matched:
                matched[k] = (row[depdes_idx].strip(), row[disdes_idx].strip(), row[zondes_idx].strip(), row[locdes_idx].strip())
                if len(matched) == len(unique_dbf):
                    print("All locales matched early!")
                    break
        except:
            continue
        if line_cnt % 100000 == 0:
            print(f"Read {line_cnt} lines... Matched so far: {len(matched)} / {len(unique_dbf)}")

print(f"\nFinal: Matched {len(matched)} of {len(unique_dbf)} locales from DBF.")
missing = unique_dbf - set(matched.keys())
print(f"Missing count: {len(missing)}")
if missing:
    print("Sample missing (first 5):", list(missing)[:5])
