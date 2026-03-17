import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "cartografia", "Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx")

df = pd.read_excel(file_path, engine='openpyxl')
dist_headers = df[df.iloc[:, 1].str.contains("Distrito", na=False)]

with open("excel_debug.txt", "w") as f:
    f.write("Available Districts in Excel:\n")
    for val in dist_headers.iloc[:, 1]:
        f.write(f"- {val}\n")
    
    # Check for keywords
    f.write("\nChecking for J. Augusto Saldivar (keywords: JULIAN, SALDIVAR):\n")
    mask = df.iloc[:, 1].astype(str).str.contains("JULIAN|SALDIVAR", na=False, case=False)
    f.write(str(df[mask].iloc[:, :2]))

    f.write("\n\nChecking for Nemby (keywords: NEMBY, ÑEMBY):\n")
    mask = df.iloc[:, 1].astype(str).str.contains("NEMBY|ÑEMBY", na=False, case=False)
    f.write(str(df[mask].iloc[:, :2]))
