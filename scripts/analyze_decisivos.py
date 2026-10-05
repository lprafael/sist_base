import json

with open('frontend/public/tsje_data/bundle_electoral.js', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('window.INTENDENTES_DATA'):
            intendentes = json.loads(line.split('=', 1)[1].rstrip(';\n'))
        elif line.startswith('window.CONCEJALES_TODOS'):
            concejales = json.loads(line.split('=', 1)[1].rstrip(';\n'))

juntas = {}
for c in concejales:
    key = (str(c.get('dpto_id')), str(c.get('dist_id')), str(c.get('numLista')))
    if key not in juntas:
        juntas[key] = {'partido': c.get('partido'), 'total': 0, 'cands': []}
    juntas[key]['total'] += c.get('votos_preferenciales', 0)
    juntas[key]['cands'].append(c)

decisivos = []
for d in intendentes:
    dpto_id = str(d.get('dpto_id'))
    dist_id = str(d.get('dist_id'))
    ganador_partido = d.get('ganador_partido')
    ganador_votos = d.get('ganador_votos', 0)
    margen = d.get('margen_votos', 0)
    
    for cand in d.get('candidatos', []):
        lista = str(cand.get('lista'))
        votos_int = cand.get('votos', 0)
        p = cand.get('partido')
        
        # Solo candidatos que NO ganaron
        if cand.get('nombre') != d.get('ganador_nombre'):
            j_info = juntas.get((dpto_id, dist_id, lista))
            if j_info and votos_int > 0:
                votos_j = j_info['total']
                diff = votos_j - votos_int
                # Si la lista de concejales sacó más votos y esa diferencia supera el margen de derrota
                if diff > 0 and diff >= margen:
                    top_c = max(j_info['cands'], key=lambda x: x.get('votos_preferenciales', 0))
                    decisivos.append({
                        'distrito': d.get('dist_name'),
                        'departamento': d.get('dpto_name'),
                        'partido': p,
                        'lista': lista,
                        'candidato_int': cand.get('nombre'),
                        'votos_int': votos_int,
                        'votos_junta': votos_j,
                        'diferencia_concejales': diff,
                        'margen_derrota': margen,
                        'ganador': d.get('ganador_nombre'),
                        'partido_ganador': ganador_partido,
                        'top_concejal': top_c['nombre'],
                        'top_c_votos': top_c['votos_preferenciales']
                    })

print(f"Total distritos donde el corte de boleta costó matemáticamente la intendencia: {len(decisivos)}")
for x in sorted(decisivos, key=lambda i: i['diferencia_concejales'], reverse=True)[:15]:
    print(f"- {x['distrito']} ({x['departamento']}): {x['candidato_int']} ({x['partido']}, L.{x['lista']}) perdió por {x['margen_derrota']:,} votos, pero sus concejales sacaron +{x['diferencia_concejales']:,} votos! (Concejal estrella: {x['top_concejal']} con {x['top_c_votos']:,} votos)")
