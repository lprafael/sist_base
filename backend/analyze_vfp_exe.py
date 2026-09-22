import os
import struct

exe_path = r'c:\Users\lpraf\OneDrive\Documentos\Poliverso\SIGEL\Padron\pad_nac_2026\pad_nac_2026.exe'
size = os.path.getsize(exe_path)
print(f"Exe size: {size} bytes")

with open(exe_path, 'rb') as f:
    data = f.read()

# Let's check PE header
pe_offset = struct.unpack('<I', data[0x3C:0x40])[0]
print(f"PE header at: {hex(pe_offset)}")

# Number of sections
num_sections = struct.unpack('<H', data[pe_offset+6:pe_offset+8])[0]
print(f"Number of sections: {num_sections}")

# Size of optional header
opt_hdr_size = struct.unpack('<H', data[pe_offset+20:pe_offset+22])[0]
section_headers_offset = pe_offset + 24 + opt_hdr_size

last_section_end = 0
for i in range(num_sections):
    sec = data[section_headers_offset + i*40 : section_headers_offset + (i+1)*40]
    name = sec[:8].decode('latin-1').strip('\x00')
    vsize, vaddr, rsize, raddr = struct.unpack('<IIII', sec[8:24])
    print(f"Section {name}: RawAddr={hex(raddr)}, RawSize={hex(rsize)}, End={hex(raddr+rsize)}")
    if raddr + rsize > last_section_end:
        last_section_end = raddr + rsize

print(f"Last section end: {hex(last_section_end)} ({last_section_end} bytes)")
print(f"Overlay size: {size - last_section_end} bytes")

overlay = data[last_section_end:]
print(f"First 64 bytes of overlay: {overlay[:64]}")
print(f"Last 64 bytes of overlay: {overlay[-64:]}")
