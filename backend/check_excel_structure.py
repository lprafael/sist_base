import pandas as pd
import os

file_path = r'c:\Users\lpraf\OneDrive\Documentos\Desarrollos\Poliverso\SIGEL\backend\cartografia\Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx'

try:
    df = pd.read_excel(file_path, sheet_name=0, skiprows=6)
    df.columns = ['Empty', 'Lugar', 'Total', 'Hombres', 'Mujeres']
    # Mostrar 100 filas para entender la jerarquia
    print(df.head(100).to_string())

except Exception as e:
    print(f"Error: {e}")
