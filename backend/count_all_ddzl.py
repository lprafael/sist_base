import struct
import time

dbf_path = r'c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\regciv.dbf'
t0 = time.time()
with open(dbf_path, 'rb') as f:
    hdr = f.read(32)
    num_recs, hdr_len, rec_len = struct.unpack('<IHH', hdr[4:12])
    fields = []
    while True:
        b = f.read(32)
        if not b or b[0] == 0x0D:
            break
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
    
    # Read in big chunks
    chunk_size = 50000
    unique_ddzl = set()
    f.seek(hdr_len)
    
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
            unique_ddzl.add((dep, dis, zon, loc))
        processed += actual

print(f"Scanned {processed} records in {time.time()-t0:.2f}s.")
print(f"Total unique (dep, dis, zon, loc) in regciv.dbf: {len(unique_ddzl)}")
