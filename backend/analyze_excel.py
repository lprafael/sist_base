import pandas as pd

file_path = r'c:\Users\lpraf\OneDrive\Documentos\Desarrollos\Poliverso\SIGEL\backend\cartografia\Dpto Central_Población_Barrios_CNPV 2022 - 1916.xlsx'

try:
    # Cargar todo el dataframe, saltando las primeras 6 filas que son decorativas
    df = pd.read_excel(file_path, sheet_name=0, skiprows=6)
    
    # Renombrar columnas para facilitar manejo
    df.columns = ['Empty', 'Lugar', 'Total', 'Hombres', 'Mujeres']
    
    # Filtrar filas vacías en la columna Lugar
    df = df[df['Lugar'].notna()]
    
    print("Muestra de datos limpios (primeras 50 filas):")
    print(df.head(50).to_string())

except Exception as e:
    print(f"Error: {e}")
