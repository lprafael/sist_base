import re
import os

files_to_update = [
    'c:/Users/NISSEI/Documents/Poliverso/mi_cancha/backend/main.py',
    'c:/Users/NISSEI/Documents/Poliverso/mi_cancha/backend/routers/analytics.py',
    'c:/Users/NISSEI/Documents/Poliverso/mi_cancha/backend/routers/noticias.py',
    'c:/Users/NISSEI/Documents/Poliverso/mi_cancha/backend/routers/payments.py',
    'c:/Users/NISSEI/Documents/Poliverso/mi_cancha/backend/routers/reportes.py',
    'c:/Users/NISSEI/Documents/Poliverso/mi_cancha/backend/seed_mock_torneo.py'
]

tables = [
    'eventos', 'torneos', 'equipos', 'partidos', 'tournament_players',
    'planilla', 'goles', 'tarjetas', 'posiciones', 'sanciones', 'pagos', 'noticias'
]

for file_path in files_to_update:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    for table in tables:
        pattern = r'\btorneos\.' + table + r'\b'
        replacement = 'torneos.' + table
        content = re.sub(pattern, replacement, content)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replacement in other files complete.")
