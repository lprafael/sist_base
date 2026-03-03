import pandas as pd
import os

file_path = r'c:\Users\lpraf\OneDrive\Documentos\Desarrollos\Poliverso\SIGEL\backend\cartografia\Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx'

try:
    df = pd.read_excel(file_path, sheet_name=0, skiprows=6)
    df.columns = ['Empty', 'Lugar', 'Total', 'Hombres', 'Mujeres']
    # Ver filas 80 a 120
    print(df.iloc[80:120].to_string())

except Exception as e:
    print(f"Error: {e}")
