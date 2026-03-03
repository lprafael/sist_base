import pandas as pd
import os

csv_path = '/app/resultados_anteriores/Resultados-1996-a-2023-municipales-y-generales-por-distrito.csv'
try:
    # Read just a few columns to get an overview
    df_overview = pd.read_csv(csv_path, usecols=['año', 'tipo_eleccion', 'cand_desc'], encoding='latin-1', sep=';').drop_duplicates()
    print("\nEstructura de elecciones:\n")
    print(df_overview.sort_values(['año', 'tipo_eleccion']).to_string())
    
    # Check some data for a specific district to see the format
    df_sample = pd.read_csv(csv_path, nrows=20, encoding='latin-1', sep=';')
    print("\nMuestra de datos:\n")
    print(df_sample[['año', 'disdes', 'cand_desc', 'siglas_lista', 'votos']].head(20).to_string())
    
except Exception as e:
    print(f"Error: {e}")
