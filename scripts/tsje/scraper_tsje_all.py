import os
import re
import json
import time
import hashlib
import requests
import csv
from concurrent.futures import ThreadPoolExecutor, as_completed

class TSJEScraper:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = "https://resultados.tsje.gov.py/publicacion/"
        self.api_url = self.base_url + "dinamics/divulgacion.ajax.php"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        }
        self.raw_dir_int = os.path.join("tsje_data", "raw_intendentes")
        self.raw_dir_jun = os.path.join("tsje_data", "raw_juntas")
        os.makedirs(self.raw_dir_int, exist_ok=True)
        os.makedirs(self.raw_dir_jun, exist_ok=True)
        self.ensure_clearance()

    def ensure_clearance(self):
        url = self.base_url + "divulgacion.html"
        r = self.session.get(url, headers=self.headers)
        if "Sucuri WebSite Firewall" in r.text:
            print("[TSJE] Sucuri challenge detected. Solving PoW...")
            cs = re.search(r'var _cs="([^"]+)";', r.text).group(1)
            cd = int(re.search(r'var _cd=(\d+);', r.text).group(1))
            ce = re.search(r'var _ce=(\d+);', r.text).group(1)
            cg = re.search(r'var _cg="([^"]+)";', r.text).group(1)
            
            prefix = "0" * cd
            n = 0
            while True:
                s = f"{cs}{n}".encode('utf-8')
                if hashlib.sha256(s).hexdigest().startswith(prefix):
                    break
                n += 1
                
            token = f"{cs}:{cd}:{ce}:{cg}:{n}"
            post_headers = self.headers.copy()
            post_headers["Origin"] = "https://resultados.tsje.gov.py"
            post_headers["Referer"] = url
            post_headers["Content-Type"] = "application/x-www-form-urlencoded"
            self.session.post(url, headers=post_headers, data={"cap-token": token}, allow_redirects=True)
            self.session.get(url, headers=self.headers)
            print("[TSJE] Clearance obtained successfully.")

    def fetch_district(self, eleccion, candidatura, dpto_id, dist_id, out_dir, force=False):
        out_file = os.path.join(out_dir, f"dept_{dpto_id}_dist_{dist_id}.json")
        if not force and os.path.exists(out_file) and os.path.getsize(out_file) > 10:
            try:
                with open(out_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        req_headers = self.headers.copy()
        req_headers.update({
            "Referer": self.base_url + "divulgacion.html",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01"
        })
        params = {
            "codeleccion": str(eleccion),
            "candidatura": str(candidatura),
            "departamento": str(dpto_id),
            "distrito": str(dist_id)
        }

        for attempt in range(4):
            try:
                r = self.session.get(self.api_url, headers=req_headers, params=params, timeout=15)
                if "Sucuri WebSite Firewall" in r.text:
                    self.ensure_clearance()
                    continue
                if r.status_code == 200 and r.text.strip():
                    data = r.json()
                    with open(out_file, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    return data
            except Exception as e:
                time.sleep(0.5 + attempt * 0.5)
        return None

    def scrape_all(self, force=False):
        # Load metadata
        with open("tsje_data/departamentos.js", "r", encoding="utf-8") as f:
            dept_raw = f.read()
        dept_json = json.loads(re.search(r'var jsonDepartamentos\s*=\s*(.*)', dept_raw, re.DOTALL).group(1).rstrip('; \n'))

        with open("tsje_data/distritos.js", "r", encoding="utf-8") as f:
            dist_raw = f.read()
        dist_json = json.loads(re.search(r'var jsonDistritos\s*=\s*(.*)', dist_raw, re.DOTALL).group(1).rstrip('; \n'))

        elec = "47"
        targets = []
        for dpto_id, dpto_name in dept_json[elec]['1'].items():
            distritos_dict = dist_json[elec]['1'].get(dpto_id, {})
            clean_dpto_name = re.sub(r'^\d+-', '', dpto_name).strip()
            for dist_id, dist_name in distritos_dict.items():
                clean_dist_name = re.sub(r'^\d+-', '', dist_name).strip()
                targets.append({
                    "dpto_id": dpto_id,
                    "dpto_name": clean_dpto_name,
                    "dist_id": dist_id,
                    "dist_name": clean_dist_name
                })

        print(f"[TSJE] Starting scrape of {len(targets)} districts (force_refresh={force})...")
        
        # Scrape Intendentes (Candidatura 1)
        print("\n--- Scraping Candidatura 1 (Intendentes Municipales) ---")
        count_int = 0
        for i, t in enumerate(targets):
            data = self.fetch_district(elec, "1", t["dpto_id"], t["dist_id"], self.raw_dir_int, force=force)
            if data:
                count_int += 1
            if (i + 1) % 25 == 0 or (i + 1) == len(targets):
                print(f"Intendentes: {i + 1}/{len(targets)} processed (Success: {count_int})")
            time.sleep(0.04)

        # Scrape Juntas (Candidatura 2)
        print("\n--- Scraping Candidatura 2 (Juntas Municipales & Concejales) ---")
        count_jun = 0
        for i, t in enumerate(targets):
            data = self.fetch_district(elec, "2", t["dpto_id"], t["dist_id"], self.raw_dir_jun, force=force)
            if data:
                count_jun += 1
            if (i + 1) % 25 == 0 or (i + 1) == len(targets):
                print(f"Juntas: {i + 1}/{len(targets)} processed (Success: {count_jun})")
            time.sleep(0.04)

        print("\n[TSJE] Scraping complete! Processing and consolidating data...")
        self.consolidate_results(targets)

    def calculate_dhondt(self, candidatos, total_seats):
        if not candidatos or total_seats <= 0:
            return [], {}

        quotients = []
        for c in candidatos:
            num_lista = str(c.get("numLista", ""))
            partido = c.get("desPartido", "INDEPENDIENTE")
            color = c.get("colLista", "128,128,128")
            votos_lista = int(c.get("votos", 0))
            prefs = c.get("candidatosPref") or []
            
            # Sort candidates by preferential votes desc, tie-breaker ordCandidato asc
            prefs_sorted = sorted(prefs, key=lambda x: (-int(x.get("votos", 0)), int(x.get("ordCandidato", 999))))
            
            for k in range(1, total_seats + 1):
                quotients.append({
                    "quotient": votos_lista / k,
                    "k": k,
                    "numLista": num_lista,
                    "partido": partido,
                    "color": color,
                    "prefs": prefs_sorted,
                    "votos_lista": votos_lista
                })

        quotients.sort(key=lambda x: x["quotient"], reverse=True)
        top_seats = quotients[:total_seats]

        seats_by_party = {}
        for q in top_seats:
            p = q["partido"]
            seats_by_party[p] = seats_by_party.get(p, 0) + 1

        concejales_electos = []
        party_counts = {}
        for banca_idx, q in enumerate(top_seats):
            nl = q["numLista"]
            idx = party_counts.get(nl, 0)
            if idx < len(q["prefs"]):
                cand = q["prefs"][idx]
                nombre = cand.get("nomCandidato", f"CANDIDATO {idx+1}")
                votos_pref = int(cand.get("votos", 0))
                orden_orig = int(cand.get("ordCandidato", idx + 1))
            else:
                nombre = f"CANDIDATO LISTA {nl} #{idx+1}"
                votos_pref = 0
                orden_orig = idx + 1

            concejales_electos.append({
                "banca": banca_idx + 1,
                "numLista": nl,
                "partido": q["partido"],
                "color": q["color"],
                "nombre": nombre,
                "votos_preferenciales": votos_pref,
                "orden_original": orden_orig,
                "cociente_dhondt": round(q["quotient"], 2),
                "cambio_posicion": orden_orig - (idx + 1) # positive means moved up in party ranking!
            })
            party_counts[nl] = idx + 1

        return concejales_electos, seats_by_party

    def consolidate_results(self, targets):
        consolidated_intendentes = []
        consolidated_juntas = []
        all_concejales = []

        total_votos_nacional_int = 0
        total_electores_nacional = 0
        partidos_intendencias_ganadas = {}
        partidos_votos_int = {}
        partidos_concejales_ganados = {}

        for t in targets:
            d_id = t["dpto_id"]
            dist_id = t["dist_id"]
            d_name = t["dpto_name"]
            dist_name = t["dist_name"]

            # 1. Process Intendentes
            f_int = os.path.join(self.raw_dir_int, f"dept_{d_id}_dist_{dist_id}.json")
            if os.path.exists(f_int):
                with open(f_int, "r", encoding="utf-8") as f:
                    data_int = json.load(f)
                
                totales = data_int.get("totales", {})
                candidatos = data_int.get("candidatos", [])
                
                # Sort candidates by votes desc
                candidatos.sort(key=lambda x: int(x.get("votos", 0)), reverse=True)
                
                ganador = candidatos[0] if candidatos else None
                segundo = candidatos[1] if len(candidatos) > 1 else None

                votos_totales = int(totales.get("totalVotos", 0))
                electores_pub = int(totales.get("canElectoresPublicados", 0) or totales.get("canElectores", 0))
                participacion = round((votos_totales / electores_pub * 100), 2) if electores_pub > 0 else 0.0
                
                total_votos_nacional_int += votos_totales
                total_electores_nacional += electores_pub

                votos_ganador = int(ganador.get("votos", 0)) if ganador else 0
                votos_segundo = int(segundo.get("votos", 0)) if segundo else 0
                pct_ganador = round((votos_ganador / votos_totales * 100), 2) if votos_totales > 0 else 0.0
                margen_votos = votos_ganador - votos_segundo
                margen_pct = round((margen_votos / votos_totales * 100), 2) if votos_totales > 0 else 0.0

                if votos_totales > 0 and ganador and int(ganador.get("votos", 0)) > 0:
                    partido_ganador = ganador.get("desPartido", "DESCONOCIDO")
                    partidos_intendencias_ganadas[partido_ganador] = partidos_intendencias_ganadas.get(partido_ganador, 0) + 1
                else:
                    partido_ganador = "SIN COMPUTAR"

                for c in candidatos:
                    p = c.get("desPartido", "OTRO")
                    partidos_votos_int[p] = partidos_votos_int.get(p, 0) + int(c.get("votos", 0))

                dist_int_record = {
                    "dpto_id": d_id,
                    "dpto_name": d_name,
                    "dist_id": dist_id,
                    "dist_name": dist_name,
                    "total_mesas": totales.get("totalMesas", 0),
                    "mesas_publicadas": totales.get("mesasPublicadas", 0),
                    "electores": electores_pub,
                    "total_votos": votos_totales,
                    "participacion_pct": participacion,
                    "votos_blancos": int(totales.get("blancos", 0)),
                    "votos_nulos": int(totales.get("nulos", 0)),
                    "ganador_nombre": ganador.get("nomCandidato") if ganador else "",
                    "ganador_partido": partido_ganador,
                    "ganador_lista": ganador.get("numLista") if ganador else "",
                    "ganador_color": ganador.get("colLista") if ganador else "128,128,128",
                    "ganador_votos": votos_ganador,
                    "ganador_pct": pct_ganador,
                    "segundo_nombre": segundo.get("nomCandidato") if segundo else "",
                    "segundo_partido": segundo.get("desPartido") if segundo else "",
                    "segundo_votos": votos_segundo,
                    "margen_votos": margen_votos,
                    "margen_pct": margen_pct,
                    "candidatos": [
                        {
                            "lista": c.get("numLista"),
                            "nombre": c.get("nomCandidato"),
                            "partido": c.get("desPartido"),
                            "color": c.get("colLista"),
                            "votos": int(c.get("votos", 0)),
                            "pct": round(int(c.get("votos", 0)) / votos_totales * 100, 2) if votos_totales > 0 else 0
                        } for c in candidatos
                    ]
                }
                consolidated_intendentes.append(dist_int_record)

            # 2. Process Juntas & D'Hondt
            f_jun = os.path.join(self.raw_dir_jun, f"dept_{d_id}_dist_{dist_id}.json")
            if os.path.exists(f_jun):
                with open(f_jun, "r", encoding="utf-8") as f:
                    data_jun = json.load(f)

                tot_jun = data_jun.get("totales", {})
                cand_jun = data_jun.get("candidatos", [])
                
                # Determine seats for this municipality:
                # Default: max candidate count in any list (typically 24 for Asuncion, 12 for most, or 9)
                max_prefs = max((len(c.get("candidatosPref") or []) for c in cand_jun), default=12)
                total_bancas = max_prefs if max_prefs > 0 else 12

                concejales, seats_by_party = self.calculate_dhondt(cand_jun, total_bancas)

                for p, count in seats_by_party.items():
                    partidos_concejales_ganados[p] = partidos_concejales_ganados.get(p, 0) + count

                for c in concejales:
                    all_concejales.append({
                        "dpto_id": d_id,
                        "dpto_name": d_name,
                        "dist_id": dist_id,
                        "dist_name": dist_name,
                        **c
                    })

                consolidated_juntas.append({
                    "dpto_id": d_id,
                    "dpto_name": d_name,
                    "dist_id": dist_id,
                    "dist_name": dist_name,
                    "total_bancas": total_bancas,
                    "total_votos_junta": int(tot_jun.get("totalVotos", 0)),
                    "blancos_junta": int(tot_jun.get("blancos", 0)),
                    "nulos_junta": int(tot_jun.get("nulos", 0)),
                    "distribucion_bancas": seats_by_party,
                    "concejales_electos": concejales,
                    "listas": [
                        {
                            "lista": c.get("numLista"),
                            "partido": c.get("desPartido"),
                            "color": c.get("colLista"),
                            "votos": int(c.get("votos", 0)),
                            "bancas_obtenidas": seats_by_party.get(c.get("desPartido"), 0)
                        } for c in cand_jun
                    ]
                })

        # Save JSON files
        with open("tsje_data/consolidado_intendentes.json", "w", encoding="utf-8") as f:
            json.dump(consolidated_intendentes, f, ensure_ascii=False, indent=2)

        with open("tsje_data/consolidado_juntas.json", "w", encoding="utf-8") as f:
            json.dump(consolidated_juntas, f, ensure_ascii=False, indent=2)

        with open("tsje_data/concejales_electos_dhondt.json", "w", encoding="utf-8") as f:
            json.dump(all_concejales, f, ensure_ascii=False, indent=2)

        # Save CSV files
        # CSV Intendentes
        with open("tsje_data/consolidado_intendentes.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Departamento_ID", "Departamento", "Distrito_ID", "Distrito",
                "Total_Mesas", "Mesas_Publicadas", "Electores", "Total_Votos", "Participacion_Pct",
                "Votos_Blancos", "Votos_Nulos", "Ganador_Nombre", "Ganador_Partido", "Ganador_Lista",
                "Ganador_Votos", "Ganador_Pct", "Segundo_Nombre", "Segundo_Partido", "Segundo_Votos",
                "Margen_Votos", "Margen_Pct"
            ])
            for r in consolidated_intendentes:
                writer.writerow([
                    r["dpto_id"], r["dpto_name"], r["dist_id"], r["dist_name"],
                    r["total_mesas"], r["mesas_publicadas"], r["electores"], r["total_votos"], r["participacion_pct"],
                    r["votos_blancos"], r["votos_nulos"], r["ganador_nombre"], r["ganador_partido"], r["ganador_lista"],
                    r["ganador_votos"], r["ganador_pct"], r["segundo_nombre"], r["segundo_partido"], r["segundo_votos"],
                    r["margen_votos"], r["margen_pct"]
                ])

        # CSV Concejales Electos
        with open("tsje_data/concejales_electos_dhondt.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Departamento_ID", "Departamento", "Distrito_ID", "Distrito",
                "Banca_Numero", "Lista", "Partido", "Concejal_Nombre",
                "Votos_Preferenciales", "Orden_Original_Lista", "Cociente_DHondt", "Variacion_Posicion"
            ])
            for c in all_concejales:
                writer.writerow([
                    c["dpto_id"], c["dpto_name"], c["dist_id"], c["dist_name"],
                    c["banca"], c["numLista"], c["partido"], c["nombre"],
                    c["votos_preferenciales"], c["orden_original"], c["cociente_dhondt"], c["cambio_posicion"]
                ])

        # Generate National Summary
        resumen_nacional = {
            "total_distritos": len(targets),
            "distritos_computados": len(consolidated_intendentes),
            "total_electores": total_electores_nacional,
            "total_votos_emitidos": total_votos_nacional_int,
            "participacion_promedio_pct": round(total_votos_nacional_int / total_electores_nacional * 100, 2) if total_electores_nacional > 0 else 0,
            "intendencias_por_partido": dict(sorted(partidos_intendencias_ganadas.items(), key=lambda x: x[1], reverse=True)),
            "votos_intendente_por_partido": dict(sorted(partidos_votos_int.items(), key=lambda x: x[1], reverse=True)),
            "concejales_totales_por_partido": dict(sorted(partidos_concejales_ganados.items(), key=lambda x: x[1], reverse=True)),
            "total_concejales_electos": len(all_concejales)
        }

        with open("tsje_data/resumen_nacional.json", "w", encoding="utf-8") as f:
            json.dump(resumen_nacional, f, ensure_ascii=False, indent=2)

        print("\n=== RESUMEN NACIONAL PRELIMINAR ===")
        print(f"Total Distritos: {resumen_nacional['total_distritos']}")
        print(f"Votos Emitidos: {resumen_nacional['total_votos_emitidos']:,}")
        print(f"Participacion Nacional: {resumen_nacional['participacion_promedio_pct']}%")
        print("\nTop Intendencias por Partido:")
        for p, count in list(resumen_nacional['intendencias_por_partido'].items())[:7]:
            print(f" - {p}: {count} municipios")
        print("\nTop Concejales por Partido:")
        for p, count in list(resumen_nacional['concejales_totales_por_partido'].items())[:7]:
            print(f" - {p}: {count} bancas")

if __name__ == "__main__":
    import sys
    force_refresh = "--no-force" not in sys.argv
    scraper = TSJEScraper()
    scraper.scrape_all(force=force_refresh)
