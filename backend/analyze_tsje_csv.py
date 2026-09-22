import urllib.request
import csv
import io

url = 'https://www.datos.gov.py/sites/default/files/resultados-2001-2021-municipales-y-generales-por-local.csv'

print("Streaming TSJE Open Data CSV to inspect unique locales...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

unique_locales = {} # (dep, dis, zon, loc) -> (depdes, disdes, zondes, locdes)
unique_dis_loc = {} # (dep, dis, loc) -> set of (zon, locdes)

with urllib.request.urlopen(req) as resp:
    # Read first 5MB to test
    chunk = resp.read(5 * 1024 * 1024)
    text = chunk.decode('latin-1', errors='replace')
    reader = csv.reader(io.StringIO(text), delimiter=';')
    header = next(reader)
    print("Header:", header)
    
    # ao;tipo_eleccion;dep;depdes;dis;disdes;zon;zondes;loc;locdes;candidatura;cand_desc;lista;siglas_lista;nombre_lista;votos
    dep_idx = header.index('dep')
    depdes_idx = header.index('depdes')
    dis_idx = header.index('dis')
    disdes_idx = header.index('disdes')
    zon_idx = header.index('zon')
    zondes_idx = header.index('zondes')
    loc_idx = header.index('loc')
    locdes_idx = header.index('locdes')
    
    count = 0
    for row in reader:
        if not row or len(row) <= locdes_idx: continue
        count += 1
        key = (int(row[dep_idx]), int(row[dis_idx]), int(row[zon_idx]), int(row[loc_idx]))
        if key not in unique_locales:
            unique_locales[key] = (row[depdes_idx], row[disdes_idx], row[zondes_idx], row[locdes_idx])
            
        k_short = (int(row[dep_idx]), int(row[dis_idx]), int(row[loc_idx]))
        if k_short not in unique_dis_loc:
            unique_dis_loc[k_short] = set()
        unique_dis_loc[k_short].add((int(row[zon_idx]), row[locdes_idx]))

print(f"Read {count} rows.")
print(f"Unique (dep, dis, zon, loc): {len(unique_locales)}")
print(f"Unique (dep, dis, loc): {len(unique_dis_loc)}")

# Check if any (dep, dis, loc) maps to multiple zones or names
collisions = {k: v for k, v in unique_dis_loc.items() if len(v) > 1}
print(f"Collisions where same (dep, dis, loc) has multiple zones/names: {len(collisions)}")
for k, v in list(collisions.items())[:5]:
    print("Collision sample:", k, v)

# Print first 10 locales
print("\nSample locales:")
for k in sorted(list(unique_locales.keys()))[:10]:
    print(k, "->", unique_locales[k])
