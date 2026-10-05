import json
import re
import unicodedata

def normalize_name(name):
    if not name:
        return ""
    # strip leading numbers like "0-ASUNCION"
    name = re.sub(r'^\d+-\s*', '', name)
    # normalize unicode
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    name = name.upper()
    # replace common prefixes / punctuation
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
    name = ' '.join(name.split())
    return name

if __name__ == "__main__":
    with open("tsje_data/paraguay_distritos.geojson", "r", encoding="utf-8") as f:
        geo = json.load(f)

    with open("tsje_data/distritos.js", "r", encoding="utf-8") as f:
        dist_raw = f.read()
    dist_json = json.loads(re.search(r'var jsonDistritos\s*=\s*(.*)', dist_raw, re.DOTALL).group(1).rstrip('; \n'))

    tsje_names = set()
    for dpto in dist_json['47']['1'].values():
        for d in dpto.values():
            tsje_names.add(normalize_name(d))

    geo_names = [normalize_name(f['properties']['shapeName']) for f in geo['features']]

    matched = 0
    unmatched_geo = []
    for g in geo_names:
        if g in tsje_names:
            matched += 1
        else:
            # check fuzzy
            closest = [t for t in tsje_names if g in t or t in g]
            unmatched_geo.append((g, closest))

    print(f"Total GeoJSON features: {len(geo_names)}")
    print(f"Direct/Clean matches: {matched} / {len(geo_names)} ({matched/len(geo_names)*100:.1f}%)")
    print(f"Sample unmatched ({len(unmatched_geo)}):")
    for g, c in unmatched_geo[:15]:
        print(f" - Geo: '{g}' -> Suggestions: {c}")
