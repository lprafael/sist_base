import os
import glob
import json
import csv
import re

def enrich_intendentes():
    print("--- 1. Enriching Intendentes with TSJE Candidate Photos ---")
    with open("tsje_data/consolidado_intendentes.json", "r", encoding="utf-8") as f:
        intendentes = json.load(f)

    # Build raw lookup: (dpto_id, dist_id) -> list of raw candidate dicts
    raw_lookup = {}
    for fpath in glob.glob("tsje_data/raw_intendentes/*.json"):
        fname = os.path.basename(fpath)
        m = re.match(r"dept_(\d+)_dist_(\d+)\.json", fname)
        if not m:
            continue
        d_id, dist_id = m.group(1), m.group(2)
        try:
            with open(fpath, "r", encoding="utf-8") as fp:
                raw_data = json.load(fp)
            cands = raw_data.get("candidatos", [])
            raw_lookup[(str(d_id), str(dist_id))] = cands
        except Exception as e:
            print(f"Error loading {fpath}: {e}")

    enriched_ints = []
    photos_found = 0
    total_cand_count = 0

    for item in intendentes:
        k = (str(item["dpto_id"]), str(item["dist_id"]))
        raw_cands = raw_lookup.get(k, [])

        raw_map = {}
        for rc in raw_cands:
            nl = str(rc.get("numLista", ""))
            raw_map[nl] = rc

        # Enrich candidates list
        enriched_cands = []
        for c in item.get("candidatos", []):
            total_cand_count += 1
            nl = str(c.get("lista", ""))
            rc = raw_map.get(nl)
            foto = ""
            if rc and rc.get("imgCandidato"):
                img_name = f"{rc.get('imgCandidato').strip()}.jpg"
                foto = f"tsje_data/fotos_candidatos/{img_name}"
                photos_found += 1

            c_copy = dict(c)
            c_copy["foto"] = foto
            c_copy["img_id"] = rc.get("imgCandidato") if rc else ""
            enriched_cands.append(c_copy)

        # Winner & Runner up photos
        ganador_nl = str(item.get("ganador_lista", ""))
        ganador_rc = raw_map.get(ganador_nl)
        ganador_foto = ""
        if ganador_rc and ganador_rc.get("imgCandidato"):
            ganador_foto = f"tsje_data/fotos_candidatos/{ganador_rc.get('imgCandidato').strip()}.jpg"

        item_copy = dict(item)
        item_copy["candidatos"] = enriched_cands
        item_copy["ganador_foto"] = ganador_foto
        enriched_ints.append(item_copy)

    print(f"Enriched {len(enriched_ints)} intendentes. Found photos for {photos_found}/{total_cand_count} candidates.")

    with open("tsje_data/consolidado_intendentes.json", "w", encoding="utf-8") as f:
        json.dump(enriched_ints, f, ensure_ascii=False, indent=2)

    return enriched_ints

def enrich_concejales():
    print("\n--- 2. Processing Concejales D'Hondt & Ordering by Banca ---")
    with open("tsje_data/consolidado_juntas.json", "r", encoding="utf-8") as f:
        juntas = json.load(f)

    with open("tsje_data/concejales_electos_dhondt.json", "r", encoding="utf-8") as f:
        electos_dhondt = json.load(f)

    # Build lookup of electos: (dpto_id, dist_id, numLista, nombre) -> electo dict
    # Also (dpto_id, dist_id) -> list of electos sorted by banca
    electos_by_dist = {}
    electo_lookup = {}
    for el in electos_dhondt:
        dist_key = (str(el["dpto_id"]), str(el["dist_id"]))
        if dist_key not in electos_by_dist:
            electos_by_dist[dist_key] = []
        electos_by_dist[dist_key].append(el)

        # Normalize name for robust matching
        norm_name = re.sub(r'[^A-Z0-9]', '', el["nombre"].upper())
        k_exact = (str(el["dpto_id"]), str(el["dist_id"]), str(el["numLista"]), norm_name)
        electo_lookup[k_exact] = el

    juntas_by_key = {f"{j['dpto_id']}_{j['dist_id']}": j for j in juntas}

    all_concejales_ordered = []
    total_electos_matched = 0
    total_no_electos = 0

    for fpath in glob.glob("tsje_data/raw_juntas/*.json"):
        fname = os.path.basename(fpath)
        m = re.match(r"dept_(\d+)_dist_(\d+)\.json", fname)
        if not m:
            continue
        dpto_id, dist_id = m.group(1), m.group(2)
        dist_key = (str(dpto_id), str(dist_id))
        k = f"{dpto_id}_{dist_id}"
        j_info = juntas_by_key.get(k)
        if not j_info:
            continue

        dpto_name = j_info["dpto_name"]
        dist_name = j_info["dist_name"]
        total_bancas = j_info["total_bancas"]
        seats_by_party = j_info["distribucion_bancas"]

        with open(fpath, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        candidatos = data.get("candidatos", [])
        dist_electos = sorted(electos_by_dist.get(dist_key, []), key=lambda x: x["banca"])

        # Create quick map from electos in this district: (numLista, norm_name) -> electo
        dist_electos_map = {}
        for el in dist_electos:
            nn = re.sub(r'[^A-Z0-9]', '', el["nombre"].upper())
            dist_electos_map[(str(el["numLista"]), nn)] = el

        district_candidates_electos = []
        district_candidates_no_electos = []

        for c in candidatos:
            nl = str(c.get("numLista", ""))
            partido = c.get("desPartido", "INDEPENDIENTE")
            color = c.get("colLista", "128,128,128")
            bancas_ganadas = seats_by_party.get(partido, 0)
            prefs = c.get("candidatosPref") or []
            lista_logo = f"tsje_data/fotos_candidatos/L{nl}.jpg"

            # Sort prefs by individual votes desc, tie-breaker ordCandidato asc
            prefs_sorted = sorted(prefs, key=lambda x: (-int(x.get("votos", 0)), int(x.get("ordCandidato", 999))))

            for rank_interno, cand in enumerate(prefs_sorted, 1):
                votos_pref = int(cand.get("votos", 0))
                ord_orig = int(cand.get("ordCandidato", rank_interno))
                nombre = cand.get("nomCandidato", "").strip()
                nn = re.sub(r'[^A-Z0-9]', '', nombre.upper())

                el_match = dist_electos_map.get((nl, nn))

                # If rank_interno <= bancas_ganadas, candidate is electo
                is_electo = (rank_interno <= bancas_ganadas) or (el_match is not None)

                if is_electo:
                    banca = el_match["banca"] if el_match else rank_interno
                    cociente = el_match.get("cociente_dhondt") if el_match else None
                    estado = "ELECTO"
                    total_electos_matched += 1
                    motivo = f"Electo como Titular (Banca #{banca} adjudicada por D'Hondt)"
                    record = {
                        "dpto_id": str(dpto_id),
                        "dpto_name": dpto_name,
                        "dist_id": str(dist_id),
                        "dist_name": dist_name,
                        "banca": banca,
                        "posicion_final": banca,
                        "posicion_final_en_lista": rank_interno,
                        "orden_original": ord_orig,
                        "salto_posiciones": ord_orig - rank_interno,
                        "nombre": nombre,
                        "partido": partido,
                        "numLista": nl,
                        "color": color,
                        "lista_logo": lista_logo,
                        "votos_preferenciales": votos_pref,
                        "cociente_dhondt": cociente,
                        "estado": estado,
                        "motivo": motivo
                    }
                    district_candidates_electos.append(record)
                else:
                    estado = "NO_ELECTO"
                    total_no_electos += 1
                    if bancas_ganadas == 0:
                        motivo = "Lista no alcanzó el cociente D'Hondt para adjudicarse bancas"
                    else:
                        last_elected = prefs_sorted[bancas_ganadas - 1]
                        diff = int(last_elected["votos"]) - votos_pref
                        motivo = f"Quedó fuera por {diff} votos (último que entró de su lista: {last_elected['nomCandidato']} con {int(last_elected['votos']):,} votos)"

                    record = {
                        "dpto_id": str(dpto_id),
                        "dpto_name": dpto_name,
                        "dist_id": str(dist_id),
                        "dist_name": dist_name,
                        "banca": None,
                        "posicion_final": None, # Will be set after sorting no-electos
                        "posicion_final_en_lista": rank_interno,
                        "orden_original": ord_orig,
                        "salto_posiciones": ord_orig - rank_interno,
                        "nombre": nombre,
                        "partido": partido,
                        "numLista": nl,
                        "color": color,
                        "lista_logo": lista_logo,
                        "votos_preferenciales": votos_pref,
                        "cociente_dhondt": None,
                        "estado": estado,
                        "motivo": motivo
                    }
                    district_candidates_no_electos.append(record)

        # STRICT ORDERING FOR DISTRICT:
        # 1. Electos ordered strictly by banca ASC (1, 2, 3, ..., total_bancas)
        district_candidates_electos.sort(key=lambda x: x["banca"])

        # 2. No Electos ordered by preferential votes DESC
        district_candidates_no_electos.sort(key=lambda x: -x["votos_preferenciales"])
        for idx, ne in enumerate(district_candidates_no_electos, 1):
            ne["posicion_final"] = len(district_candidates_electos) + idx

        # Combine into complete ordered list for this district
        all_concejales_ordered.extend(district_candidates_electos)
        all_concejales_ordered.extend(district_candidates_no_electos)

    print(f"Total concejales processed: {len(all_concejales_ordered)}")
    print(f"Electos matched: {total_electos_matched}")
    print(f"No Electos: {total_no_electos}")

    # Save to JSON
    with open("tsje_data/concejales_todos_con_estado.json", "w", encoding="utf-8") as f:
        json.dump(all_concejales_ordered, f, ensure_ascii=False, indent=2)

    # Save to CSV
    with open("tsje_data/concejales_todos_con_estado.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Departamento_ID", "Departamento", "Distrito_ID", "Distrito",
            "Banca_D'Hondt", "Posicion_Final", "Estado", "Lista", "Partido", "Candidato",
            "Votos_Preferenciales", "Orden_Original_En_Lista", "Posicion_Final_En_Lista",
            "Salto_Posiciones", "Motivo_O_Detalle"
        ])
        for c in all_concejales_ordered:
            writer.writerow([
                c["dpto_id"], c["dpto_name"], c["dist_id"], c["dist_name"],
                c["banca"] if c["banca"] else "",
                c["posicion_final"],
                c["estado"],
                c["numLista"],
                c["partido"],
                c["nombre"],
                c["votos_preferenciales"],
                c["orden_original"],
                c["posicion_final_en_lista"],
                c["salto_posiciones"],
                c["motivo"]
            ])

    return all_concejales_ordered

def update_geojson_and_export():
    print("\n--- 3. Updating GeoJSON with candidate photos & concejales order ---")
    with open("tsje_data/paraguay_distritos_optimizado.geojson", "r", encoding="utf-8") as f:
        geo = json.load(f)

    with open("tsje_data/consolidado_intendentes.json", "r", encoding="utf-8") as f:
        intendentes = json.load(f)
    int_by_key = {f"{i['dpto_id']}_{i['dist_id']}": i for i in intendentes}

    for feat in geo["features"]:
        p = feat["properties"]
        k = f"{p.get('dpto_id')}_{p.get('dist_id')}"
        int_data = int_by_key.get(k)
        if int_data:
            p["ganador_foto"] = int_data.get("ganador_foto", "")
            p["candidatos"] = int_data.get("candidatos", [])

    with open("tsje_data/paraguay_distritos_optimizado.geojson", "w", encoding="utf-8") as f:
        json.dump(geo, f, separators=(',', ':'), ensure_ascii=False)

    print("\n--- 4. Regenerating Web Bundle ---")
    import sys
    sys.path.insert(0, os.path.abspath("."))
    from scripts.tsje.export_web_bundle import main as export_main
    export_main()

if __name__ == "__main__":
    enrich_intendentes()
    enrich_concejales()
    update_geojson_and_export()
