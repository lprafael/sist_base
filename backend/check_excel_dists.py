import pandas as pd
import os

file_path = r'c:\Users\lpraf\OneDrive\Documentos\Desarrollos\Poliverso\SIGEL\backend\cartografia\Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx'

distritos_central_norm = [
    "AREGUA", "CAPIATA", "FERNANDO DE LA MORA", "GUARAMBARE", "ITA", "ITAUGUA", 
    "J AUGUSTO SALDIVAR", "LAMBARE", "LIMPIO", "LUQUE", "MARIANO ROQUE ALONSO", 
    "NUEVA ITALIA", "NEMBY", "SAN ANTONIO", "SAN LORENZO", "VILLA ELISA", 
    "VILLETA", "YPACARAI", "YPANE"
]

def clean_name(name):
    if not name or pd.isna(name): return ""
    name = str(name).strip()
    return ''.join(c for c in name if c.isalnum() or c.isspace()).upper()

try:
    df = pd.read_excel(file_path, sheet_name=0, skiprows=6)
    df.columns = ['Empty', 'Lugar', 'Total', 'Hombres', 'Mujeres']
    
    print("Listando distritos detectados en el Excel:")
    for index, row in df.iterrows():
        raw = str(row['Lugar']).strip()
        clean = clean_name(raw)
        if clean in distritos_central_norm:
            print(f"Index {index}: '{raw}' -> '{clean}'")

except Exception as e:
    print(f"Error: {e}")
