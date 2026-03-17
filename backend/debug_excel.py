import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "cartografia", "Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx")

print(f"Reading {file_path}")
df = pd.read_excel(file_path, engine='openpyxl')

# Look for Distrito headers
dist_headers = df[df.iloc[:, 1].str.contains("Distrito", na=False)]
print("\n--- Available Districts in Excel ---")
for val in dist_headers.iloc[:, 1]:
    print(f"Header found: '{val}'")

# Look at rows around J. Augusto Saldivar or Nemby
print("\n--- Sample rows around J. AUGUSTO SALDIVAR ---")
idx = df[df.iloc[:, 1].str.contains("JULIAN AUGUSTO SALDIVAR", na=False, case=False)].index
if not idx.empty:
    print(df.iloc[idx[0]-2:idx[0]+20, :2])
else:
    print("JULIAN AUGUSTO SALDIVAR not found exactly.")

# Look at rows around Nemby
print("\n--- Sample rows around NEMBY ---")
idx = df[df.iloc[:, 1].str.contains("NEMBY", na=False, case=False)].index
if not idx.empty:
    print(df.iloc[idx[0]-2:idx[0]+15, :2])
else:
    print("NEMBY not found exactly.")
