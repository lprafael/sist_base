import os
import glob
import json
import csv
import re

def main():
    print("Processing all 9,174 councilor candidates across Paraguay...")
    
    with open("tsje_data/consolidado_juntas.json", "r", encoding="utf-8") as f:
        juntas = json.load(f)

    juntas_by_key = {f"{j['dpto_id']}_{j['dist_id']}": j for j in juntas}

    all_candidates_status = []
    electos_count = 0
    no_electos_count = 0

    for fpath in glob.glob("tsje_data/raw_juntas/*.json"):
        fname = os.path.basename(fpath)
        m = re.match(r"dept_(\d+)_dist_(\d+)\.json", fname)
        if not m:
            continue
        dpto_id, dist_id = m.group(1), m.group(2)
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

        # Calculate D'Hondt quotient mapping
        # Rank lists
        for c in candidatos:
            nl = str(c.get("numLista", ""))
            partido = c.get("desPartido", "INDEPENDIENTE")
            color = c.get("colLista", "128,128,128")
            bancas_ganadas = seats_by_party.get(partido, 0)
            prefs = c.get("candidatosPref") or []
            
            # Sort prefs by individual votes desc, tie-breaker ordCandidato asc
            prefs_sorted = sorted(prefs, key=lambda x: (-int(x.get("votos", 0)), int(x.get("ordCandidato", 999))))

            for rank_interno, cand in enumerate(prefs_sorted, 1):
                votos_pref = int(cand.get("votos", 0))
                ord_orig = int(cand.get("ordCandidato", rank_interno))

                if rank_interno <= bancas_ganadas:
                    estado = "ELECTO"
                    electos_count += 1
                    motivo = f"Electo como Titular (Banca de la Lista #{rank_interno} de {bancas_ganadas})"
                    banca_titular = rank_interno
                else:
                    estado = "NO_ELECTO"
                    no_electos_count += 1
                    banca_titular = None
                    if bancas_ganadas == 0:
                        motivo = "Lista no alcanzó el cociente D'Hondt para adjudicarse bancas"
                    else:
                        last_elected = prefs_sorted[bancas_ganadas - 1]
                        diff = int(last_elected["votos"]) - votos_pref
                        motivo = f"Quedó fuera por {diff} votos (último que entró de su lista: {last_elected['nomCandidato']} con {last_elected['votos']:,} votos)"

                all_candidates_status.append({
                    "dpto_id": dpto_id,
                    "dpto_name": dpto_name,
                    "dist_id": dist_id,
                    "dist_name": dist_name,
                    "nombre": cand["nomCandidato"],
                    "partido": partido,
                    "numLista": nl,
                    "color": color,
                    "votos_preferenciales": votos_pref,
                    "orden_original": ord_orig,
                    "posicion_final_en_lista": rank_interno,
                    "salto_posiciones": ord_orig - rank_interno,
                    "estado": estado,
                    "banca_titular": banca_titular,
                    "motivo": motivo
                })

    print(f"Total procesados: {len(all_candidates_status)}")
    print(f"Electos (Entraron): {electos_count}")
    print(f"No Electos (Quedaron Fuera): {no_electos_count}")

    # Save complete JSON
    with open("tsje_data/concejales_todos_con_estado.json", "w", encoding="utf-8") as f:
        json.dump(all_candidates_status, f, ensure_ascii=False, indent=2)

    # Save CSV: Todos los Candidatos
    with open("tsje_data/concejales_todos_con_estado.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Departamento_ID", "Departamento", "Distrito_ID", "Distrito",
            "Concejal_Nombre", "Partido", "Lista", "Estado",
            "Votos_Preferenciales", "Orden_Original_Lista", "Posicion_Final_Lista",
            "Salto_Posiciones", "Motivo_Detalle"
        ])
        for c in all_candidates_status:
            writer.writerow([
                c["dpto_id"], c["dpto_name"], c["dist_id"], c["dist_name"],
                c["nombre"], c["partido"], c["numLista"], c["estado"],
                c["votos_preferenciales"], c["orden_original"], c["posicion_final_en_lista"],
                c["salto_posiciones"], c["motivo"]
            ])

    # Save CSV: Específico de los que NO ENTRARON (Quedaron Fuera)
    no_electos = [c for c in all_candidates_status if c["estado"] == "NO_ELECTO"]
    with open("tsje_data/concejales_no_electos.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Departamento", "Distrito", "Concejal_Nombre", "Partido", "Lista",
            "Votos_Preferenciales", "Orden_Original", "Posicion_Final_En_Lista",
            "Causa_Por_Que_No_Entro"
        ])
        for c in no_electos:
            writer.writerow([
                c["dpto_name"], c["dist_name"], c["nombre"], c["partido"], c["numLista"],
                c["votos_preferenciales"], c["orden_original"], c["posicion_final_en_lista"],
                c["motivo"]
            ])

    print("[OK] Generated tsje_data/concejales_todos_con_estado.csv & json")
    print("[OK] Generated tsje_data/concejales_no_electos.csv")

if __name__ == "__main__":
    main()
