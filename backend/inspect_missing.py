import struct

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
    
    # We saw missing sample: (10, 17, 0, 3), (14, 16, 0, 503), (1, 13, 0, 501), etc.
    targets = {(10, 17, 0, 3), (14, 16, 0, 503), (1, 13, 0, 501), (11, 19, 0, 11), (10, 17, 0, 503)}
    
    f.seek(hdr_len)
    found = {}
    for _ in range(num_recs):
        rec = f.read(rec_len)
        if not rec: break
        if rec[0] == 0x2A: continue
        dep = int(rec[dep_off:dep_off+dep_len].decode('latin-1') or 0)
        dis = int(rec[dis_off:dis_off+dis_len].decode('latin-1') or 0)
        zon = int(rec[zon_off:zon_off+zon_len].decode('latin-1') or 0)
        loc = int(rec[loc_off:loc_off+loc_len].decode('latin-1') or 0)
        k = (dep, dis, zon, loc)
        if k in targets and k not in found:
            direccion = rec[dir_off:dir_off+dir_len].decode('latin-1').strip()
            found[k] = direccion
            if len(found) == len(targets): break

for k, d in found.items():
    print(k, "Dirección ejemplo:", d)
