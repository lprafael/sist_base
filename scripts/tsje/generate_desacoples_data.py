import json
import os

print("=== Generando Análisis de Desacople Electoral (Corte de Boleta) ===")

bundle_path = 'frontend/public/tsje_data/bundle_electoral.js'
with open(bundle_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

intendentes = None
concejales = None

for line in lines:
    if line.startswith('window.INTENDENTES_DATA'):
        intendentes = json.loads(line.split('=', 1)[1].rstrip(';\n\r'))
    elif line.startswith('window.CONCEJALES_TODOS'):
        concejales = json.loads(line.split('=', 1)[1].rstrip(';\n\r'))

if not intendentes or not concejales:
    raise ValueError("No se pudieron cargar los datos de intendentes o concejales del bundle.")

# Agrupar concejales por (dpto_id, dist_id, lista)
juntas = {}
for c in concejales:
    dpto_id = str(c.get('dpto_id', ''))
    dist_id = str(c.get('dist_id', ''))
    lista = str(c.get('numLista', ''))
    key = (dpto_id, dist_id, lista)
    if key not in juntas:
        juntas[key] = {
            'partido': c.get('partido', ''),
            'total': 0,
            'cands': [],
            'electos': 0
        }
    juntas[key]['total'] += c.get('votos_preferenciales', 0)
    if c.get('estado') == 'ELECTO':
        juntas[key]['electos'] += 1
    juntas[key]['cands'].append({
        'nombre': c.get('nombre', ''),
        'votos': c.get('votos_preferenciales', 0),
        'orden': c.get('orden_original'),
        'banca': c.get('banca'),
        'estado': c.get('estado', '')
    })

desacoples = []
for d in intendentes:
    dpto_id = str(d.get('dpto_id', ''))
    dist_id = str(d.get('dist_id', ''))
    dist_name = d.get('dist_name', '')
    dpto_name = d.get('dpto_name', '')
    ganador_nombre = d.get('ganador_nombre', '')
    ganador_partido = d.get('ganador_partido', '')
    margen_distrito = d.get('margen_votos', 0)
    
    for cand in d.get('candidatos', []):
        lista = str(cand.get('lista', ''))
        votos_int = cand.get('votos', 0)
        nombre_int = cand.get('nombre', '')
        partido = cand.get('partido', '')
        foto_int = cand.get('foto', '')
        
        j_info = juntas.get((dpto_id, dist_id, lista))
        if j_info and votos_int > 0:
            votos_j = j_info['total']
            diff = votos_j - votos_int
            diff_pct = round((diff / votos_int) * 100, 1)
            
            cands_sorted = sorted(j_info['cands'], key=lambda x: x['votos'], reverse=True)
            top_c = cands_sorted[0] if cands_sorted else None
            
            es_ganador = (nombre_int.strip().upper() == ganador_nombre.strip().upper())
            costo_intendencia = (not es_ganador) and (diff > 0) and (diff >= margen_distrito)
            
            if costo_intendencia:
                tipo = 'CORTE_DECISIVO'
            elif diff > 50 and diff_pct > 2.0:
                tipo = 'CORTE_CONCEJAL'
            elif diff < -50 and diff_pct < -2.0:
                tipo = 'TRACCION_INTENDENTE'
            else:
                tipo = 'ALINEADO'
            
            desacoples.append({
                'dpto_id': dpto_id,
                'dist_id': dist_id,
                'dist_name': dist_name,
                'dpto_name': dpto_name,
                'lista': lista,
                'partido': partido,
                'intendente_nombre': nombre_int,
                'intendente_foto': foto_int,
                'intendente_votos': votos_int,
                'intendente_pct': cand.get('pct', 0),
                'intendente_gano': es_ganador,
                'concejales_votos': votos_j,
                'bancas_obtenidas': j_info['electos'],
                'diferencia': diff,
                'diff_pct': diff_pct,
                'tipo': tipo,
                'costo_intendencia': costo_intendencia,
                'margen_distrito': margen_distrito,
                'ganador_distrito': ganador_nombre,
                'partido_ganador': ganador_partido,
                'top_concejal_nombre': top_c['nombre'] if top_c else '',
                'top_concejal_votos': top_c['votos'] if top_c else 0,
                'top_concejal_banca': top_c['banca'] if top_c else None,
                'concejales_detalle': cands_sorted[:5]
            })

# Ordenar por defecto por diferencia descendente (mayor corte primero)
desacoples = sorted(desacoples, key=lambda x: x['diferencia'], reverse=True)
print(f"Total registros de desacoples calculados: {len(desacoples)}")

# Filtrar líneas anteriores de DESACOPLES_DATA si ya existían
clean_lines = [l for l in lines if not l.startswith('window.DESACOPLES_DATA')]

# Agregar nueva variable
desacoples_json = json.dumps(desacoples, ensure_ascii=False)
clean_lines.append(f"\nwindow.DESACOPLES_DATA = {desacoples_json};\n")

# Guardar en frontend/public y tsje_data
for target in ['frontend/public/tsje_data/bundle_electoral.js', 'tsje_data/bundle_electoral.js']:
    if os.path.exists(os.path.dirname(target)):
        with open(target, 'w', encoding='utf-8') as f:
            f.writelines(clean_lines)
        print(f"Actualizado con éxito: {target} ({os.path.getsize(target):,} bytes)")

print("=== Proceso completado exitosamente ===")
