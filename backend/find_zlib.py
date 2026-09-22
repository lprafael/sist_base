import zlib

exe_path = r'c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\pad_nac_2026.exe'
with open(exe_path, 'rb') as f:
    data = f.read()

target = b'FERNANDO DE LA MORA'
target_sub = b'COL.NAC.'

found_decompressed = []
for i in range(len(data) - 10):
    # check zlib header: b0=0x78, (b0*256 + b1) % 31 == 0
    if data[i] == 0x78 and ((0x78 * 256 + data[i+1]) % 31 == 0):
        try:
            decomp = zlib.decompress(data[i:])
            if target in decomp or target_sub in decomp:
                print(f"MATCH IN ZLIB STREAM at offset {hex(i)}!")
                found_decompressed.append((i, len(decomp)))
        except Exception:
            pass

print(f"Total zlib streams with match: {len(found_decompressed)}")
