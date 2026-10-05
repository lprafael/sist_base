import json

with open('frontend/public/tsje_data/bundle_electoral.js', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('window.INTENDENTES_DATA'):
            intendentes = json.loads(line.split('=', 1)[1].rstrip(';\n'))
        elif line.startswith('window.CONCEJALES_TODOS'):
            concejales = json.loads(line.split('=', 1)[1].rstrip(';\n'))

# Agrupar concejales por (dpto_id, dist_id, numLista)
juntas_by_dist_lista = {}
for c in concejales:
    dpto_id = str(c.get('dpto_id', ''))
    dist_id = str(c.get('dist_id', ''))
    lista = str(c.get('numLista', ''))
    key = (dpto_id, dist_id, lista)
    if key not in juntas_by_dist_lista:
        juntas_by_dist_lista[key] = {
            'partido': c.get('partido'),
            'total_votos_junta': 0,
            'candidatos': []
        }
    juntas_by_dist_lista[key]['total_votos_junta'] += c.get('votos_preferenciales', 0)
    juntas_by_dist_lista[key]['candidatos'].append(c)

print(f"Total listas de concejales indexadas: {len(juntas_by_dist_lista)}")

desacoples = []
for d in intendentes:
    dpto_id = str(d.get('dpto_id', ''))
    dist_id = str(d.get('dist_id', ''))
    dist_name = d.get('dist_name', '')
    dpto_name = d.get('dpto_name', '')
    
    for cand in d.get('candidatos', []):
        lista = str(cand.get('lista', ''))
        votos_int = cand.get('votos', 0)
        key = (dpto_id, dist_id, lista)
        
        junta_info = juntas_by_dist_lista.get(key)
        if junta_info and votos_int > 0:
            votos_junta = junta_info['total_votos_junta']
            diff = votos_junta - votos_int
            diff_pct = round((diff / votos_int) * 100, 1)
            electos = [c for c in junta_info['candidatos'] if c.get('estado') == 'ELECTO']
            top_c = max(junta_info['candidatos'], key=lambda x: x.get('votos_preferenciales', 0)) if junta_info['candidatos'] else None
            
            desacoples.append({
                'dist_name': dist_name,
                'dpto_name': dpto_name,
                'lista': lista,
                'partido': cand.get('partido'),
                'candidato_intendente': cand.get('nombre'),
                'votos_intendente': votos_int,
                'votos_concejales': votos_junta,
                'diferencia': diff,
                'diff_pct': diff_pct,
                'bancas_obtenidas': len(electos),
                'top_concejal': top_c['nombre'] if top_c else '',
                'top_concejal_votos': top_c['votos_preferenciales'] if top_c else 0,
                'ganador_distrito': d.get('ganador_nombre'),
                'margen_distrito': d.get('margen_votos', 0)
            })

# Ordenar por mayor exceso de votos de concejales respecto al intendente
desacoples_cortados = sorted([x for x in desacoples if x['diferencia'] > 0], key=lambda x: x['diferencia'], reverse=True)

print(f"\nTotal combinaciones Intendente-Concejales analizadas: {len(desacoples)}")
print(f"Listas donde los concejales sacaron MÁS votos que su Intendente (corte de boleta): {len(desacoples_cortados)}")

print("\n--- TOP 10 CASOS EMBLEMÁTICOS DE DESACOPLE (CONCEJALES >> INTENDENTE) ---")
for x in desacoples_cortados[:10]:
    print(f"* {x['dist_name']} ({x['dpto_name']}) | Lista {x['lista']} - {x['partido']}:")
    print(f"   Intendente: {x['candidato_intendente']} = {x['votos_intendente']:,} votos")
    print(f"   Lista Concejales: {x['votos_concejales']:,} votos (Corte: +{x['diferencia']:,} votos / +{x['diff_pct']}%)")
    print(f"   Bancas obtenidas: {x['bancas_obtenidas']} | Concejal más votado: {x['top_concejal']} ({x['top_concejal_votos']:,} votos)")
    print(f"   Margen del intendente electo: {x['margen_distrito']:,} votos\n")
