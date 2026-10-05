import json
import re
import unicodedata
from difflib import get_close_matches

def normalize_name(name):
    if not name:
        return ""
    name = re.sub(r'^\d+-\s*', '', name)
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    name = name.upper()
    replacements = [
        (r'\bSGTO\.?\b', 'SARGENTO'),
        (r'\bMCAL\.?\b', 'MARISCAL'),
        (r'\bDR\.?\b', 'DOCTOR'),
        (r'\bGRAL\.?\b', 'GENERAL'),
        (r'\bPTE\.?\b', 'PRESIDENTE'),
        (r'\bCDAD\.?\b', 'CIUDAD'),
        (r'\bSTA\.?\b', 'SANTA'),
        (r'\bSTO\.?\b', 'SANTO'),
        (r'[^A-Z0-9\s]', ' '),
    ]
    for pattern, repl in replacements:
        name = re.sub(pattern, repl, name)
    return ' '.join(name.split())

with open("tsje_data/paraguay_distritos.geojson", "r", encoding="utf-8") as f:
    geo = json.load(f)

with open("tsje_data/distritos.js", "r", encoding="utf-8") as f:
    dist_raw = f.read()
dist_json = json.loads(re.search(r'var jsonDistritos\s*=\s*(.*)', dist_raw, re.DOTALL).group(1).rstrip('; \n'))

tsje_map = {}
for dpto_id, dpto in dist_json['47']['1'].items():
    for dist_id, d_name in dpto.items():
        norm = normalize_name(d_name)
        tsje_map[norm] = {"dpto_id": dpto_id, "dist_id": dist_id, "raw_name": d_name}

geo_features = geo['features']
mappings = {}

for feat in geo_features:
    g_raw = feat['properties']['shapeName']
    g_norm = normalize_name(g_raw)
    if g_norm in tsje_map:
        mappings[g_raw] = tsje_map[g_norm]
    else:
        # fuzzy match
        matches = get_close_matches(g_norm, list(tsje_map.keys()), n=1, cutoff=0.5)
        if matches:
            mappings[g_raw] = tsje_map[matches[0]]
            print(f"Matched '{g_raw}' (norm: {g_norm}) -> '{matches[0]}' ({tsje_map[matches[0]]['raw_name']})")
        else:
            print(f"FAILED TO MATCH: '{g_raw}' (norm: {g_norm})")

print(f"\nTotal mappings resolved: {len(mappings)} / {len(geo_features)}")
with open("tsje_data/geo_to_tsje_mapping.json", "w", encoding="utf-8") as f:
    json.dump(mappings, f, ensure_ascii=False, indent=2)
