import pandas as pd
import os
import unicodedata
import re

def clean_name(name):
    if not name or pd.isna(name): return ""
    name = str(name).strip()
    name = ''.join(c for c in unicodedata.normalize('NFD', name) if unicodedata.category(c) != 'Mn')
    name = re.sub(r'[^a-zA-Z0-9\s]', ' ', name)
    return ' '.join(name.upper().split())

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "cartografia", "Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx")

df = pd.read_excel(file_path, engine='openpyxl')

central_data = []
current_dist = None

for index, row in df.iterrows():
    val = str(row.iloc[1])
    if "Distrito" in val:
        current_dist = clean_name(val.replace("Distrito", ""))
        continue
    if current_dist:
        lugar = clean_name(val)
        if lugar and "TOTAL" not in lugar:
            central_data.append((current_dist, lugar))

with open("central_excel_data.txt", "w") as f:
    for d, b in sorted(central_data):
        f.write(f"{d} | {b}\n")

print(f"Saved {len(central_data)} records to central_excel_data.txt")
