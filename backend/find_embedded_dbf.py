import struct

exe_path = r'c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\pad_nac_2026.exe'
with open(exe_path, 'rb') as f:
    data = f.read()

print(f"Exe size: {len(data)}")

# Search for possible DBF headers (starting byte 0x30, 0x31, 0x03, 0xF5)
# A valid DBF header:
# pos 0: 0x30 or 0x03 or 0x31
# pos 1..3: YY MM DD (e.g. year between 90 and 130)
# pos 8..9: header_len > 32 and header_len < 65535
# pos 10..11: rec_len > 0 and rec_len < 32768
# at header_len - 1: 0x0D (header terminator)

candidates = []
for i in range(len(data) - 100):
    b0 = data[i]
    if b0 in (0x30, 0x31, 0x03, 0x32, 0xF5):
        yy = data[i+1]
        mm = data[i+2]
        dd = data[i+3]
        if 1 <= mm <= 12 and 1 <= dd <= 31:
            n_recs = struct.unpack('<I', data[i+4:i+8])[0]
            hdr_len = struct.unpack('<H', data[i+8:i+10])[0]
            rec_len = struct.unpack('<H', data[i+10:i+12])[0]
            if 32 < hdr_len < 10000 and 1 <= rec_len < 4000:
                if i + hdr_len <= len(data) and data[i + hdr_len - 1] == 0x0D:
                    # Check field descriptors: each 32 bytes
                    n_fields = (hdr_len - 32 - 1) // 32
                    fields = []
                    valid_fields = True
                    for fi in range(n_fields):
                        fdesc = data[i + 32 + fi*32 : i + 32 + (fi+1)*32]
                        fname = fdesc[:11].replace(b'\x00', b'').decode('latin-1', errors='replace').strip()
                        ftype = chr(fdesc[11])
                        if not fname.isidentifier() or ftype not in 'CNDLMGBTYIF':
                            valid_fields = False
                            break
                        fields.append((fname, ftype))
                    if valid_fields and len(fields) > 0:
                        candidates.append((i, n_recs, hdr_len, rec_len, fields))

print(f"Found {len(candidates)} DBF candidates inside EXE:")
for c in candidates:
    print(f"Offset {hex(c[0])}: recs={c[1]}, hdr={c[2]}, rec_len={c[3]}, fields={c[4]}")
