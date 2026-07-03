import json
import urllib.request

BASE_URL = 'http://localhost:8001/api/marciales'
req = urllib.request.Request(f'{BASE_URL}/torneos', method='GET')
res = urllib.request.urlopen(req)
torneos = json.loads(res.read())
torneo_id = torneos[0]['id']

# 1. Crear Penalidad
penalidad_payload = json.dumps({
    'nombre': 'Falta de parche oficial',
    'descripcion': 'Multa por no llevar parche del torneo',
    'monto_gs': 50000
}).encode('utf-8')
req = urllib.request.Request(f'{BASE_URL}/torneos/{torneo_id}/penalidades', data=penalidad_payload, method='POST', headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
print('Penalidad creada:', json.loads(res.read()))

# 2. Listar Penalidades
req = urllib.request.Request(f'{BASE_URL}/torneos/{torneo_id}/penalidades', method='GET')
penalidades = json.loads(urllib.request.urlopen(req).read())
penalidad_id = penalidades[0]['id']

# 3. Buscar Participante E2E
req = urllib.request.Request(f'{BASE_URL}/torneos/{torneo_id}/participantes/buscar?q=E2E', method='GET')
res = urllib.request.urlopen(req)
atleta = json.loads(res.read())[0]
atleta_id = atleta['id']

# 4. Asignar Multa
multa_payload = json.dumps({
    'participante_id': atleta_id,
    'penalidad_id': penalidad_id
}).encode('utf-8')
req = urllib.request.Request(f'{BASE_URL}/participantes/{atleta_id}/multas', data=multa_payload, method='POST', headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
print('Multa asignada:', json.loads(res.read()))

# 5. Listar Multas (Pendiente)
req = urllib.request.Request(f'{BASE_URL}/participantes/{atleta_id}/multas', method='GET')
multas = json.loads(urllib.request.urlopen(req).read())
multa_id = multas[0]['multa_id']
print('Estado inicial multa:', multas[0]['estado_pago'])

# 6. Pagar Multa
req = urllib.request.Request(f'{BASE_URL}/multas/{multa_id}/pagar', method='PUT')
res = urllib.request.urlopen(req)
print('Pagando multa:', json.loads(res.read()))

# 7. Listar Multas (Pagado)
req = urllib.request.Request(f'{BASE_URL}/participantes/{atleta_id}/multas', method='GET')
multas = json.loads(urllib.request.urlopen(req).read())
print('Estado final multa:', multas[0]['estado_pago'])

