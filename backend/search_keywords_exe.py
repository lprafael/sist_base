import re

exe_path = r'c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\pad_nac_2026.exe'
with open(exe_path, 'rb') as f:
    data = f.read()

words_to_find = [
    b"CENTRAL", b"FERNANDO", b"SAN JOSE", b"COL.NAC", b"COLEGIO",
    b"ESCUELA", b"ENCARNACION", b"PARAGUAY BRASIL", b"SAJONIA", b"ASUNCION"
]

for w in words_to_find:
    pos = 0
    cnt = 0
    while True:
        idx = data.upper().find(w, pos)
        if idx == -1: break
        cnt += 1
        pos = idx + len(w)
        ctx = data[max(0, idx-30):min(len(data), idx+50)]
        print(f"[{w.decode()}] found at {hex(idx)}: {ctx}")
        if cnt >= 5: break
    print(f"Total for {w.decode()}: {cnt}")
