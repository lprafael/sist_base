import struct

exe_path = r'c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\pad_nac_2026.exe'
with open(exe_path, 'rb') as f:
    data = f.read()

total_len = len(data)
print(f"Total size: {total_len}")

# Let's inspect the last 128 bytes
last_128 = data[-128:]
print("Hex dump of last 128 bytes:")
for i in range(0, 128, 16):
    chunk = last_128[i:i+16]
    hex_str = ' '.join(f'{b:02x}' for b in chunk)
    ascii_str = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)
    print(f"{(total_len - 128 + i):08x}: {hex_str:<48}  {ascii_str}")
