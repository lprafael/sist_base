import json

with open('tsje_data/paraguay_distritos.geojson', 'r', encoding='utf-8') as f:
    geo = json.load(f)

names = sorted([f['properties']['shapeName'] for f in geo['features']])
print("TOTAL NAMES:", len(names))
# print any name starting with Y or I or S or containing 'yau' or similar
for n in names:
    if n.startswith('Y') or 'yau' in n.lower() or 'ya' in n.lower() or 'yby' in n.lower() or 'concepc' in n.lower():
        print(f"'{n}'")
