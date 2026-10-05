import json
import csv
import re
import unicodedata

def normalize_name(name):
    if not name:
        return ""
    name = re.sub(r'^\d+-\s*', '', name)
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    name = name.upper()
    replacements = [
        (r'\bSGTO\.?\b', 'SARGENTO'),
        (r'\bMCAL\.?\b', 'MARISCAL'),
        (r'\bDR\.?\b', 'DOCTOR'),
        (r'\bGRAL\.?\b', 'GENERAL'),
        (r'\bPTE\.?\b', 'PRESIDENTE'),
        (r'\bCDAD\.?\b', 'CIUDAD'),
        (r'\bSTA\.?\b', 'SANTA'),
        (r'\bSTO\.?\b', 'SANTO'),
        (r'[^A-Z0-9\s]', ' '),
    ]
    for pattern, repl in replacements:
        name = re.sub(pattern, repl, name)
    return ' '.join(name.split())

def main():
    # 1. Load consolidated datasets
    with open("tsje_data/consolidado_intendentes.json", "r", encoding="utf-8") as f:
        intendentes = json.load(f)

    with open("tsje_data/consolidado_juntas.json", "r", encoding="utf-8") as f:
        juntas = json.load(f)

    with open("tsje_data/concejales_electos_dhondt.json", "r", encoding="utf-8") as f:
        concejales = json.load(f)

    with open("tsje_data/resumen_nacional.json", "r", encoding="utf-8") as f:
        resumen = json.load(f)

    # Build quick lookup by (dpto_id, dist_id) and by normalized name
    int_by_key = {}
    int_by_norm = {}
    for item in intendentes:
        k = f"{item['dpto_id']}_{item['dist_id']}"
        int_by_key[k] = item
        norm_d = normalize_name(item['dist_name'])
        int_by_norm[norm_d] = item

    junta_by_key = {}
    for item in juntas:
        k = f"{item['dpto_id']}_{item['dist_id']}"
        junta_by_key[k] = item

    concejales_by_key = {}
    for c in concejales:
        k = f"{c['dpto_id']}_{c['dist_id']}"
        if k not in concejales_by_key:
            concejales_by_key[k] = []
        concejales_by_key[k].append(c)

    # 2. Export consolidado_juntas.csv
    with open("tsje_data/consolidado_juntas.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Departamento_ID", "Departamento", "Distrito_ID", "Distrito",
            "Total_Bancas", "Total_Votos_Junta", "Votos_Blancos", "Votos_Nulos",
            "Distribucion_Bancas_Resumen"
        ])
        for j in juntas:
            bancas_str = " | ".join([f"{p}: {count}" for p, count in j["distribucion_bancas"].items()])
            writer.writerow([
                j["dpto_id"], j["dpto_name"], j["dist_id"], j["dist_name"],
                j["total_bancas"], j["total_votos_junta"], j["blancos_junta"], j["nulos_junta"],
                bancas_str
            ])
    print("[OK] Created tsje_data/consolidado_juntas.csv")

    # 3. Create enriched GeoJSON for the interactive map
    with open("tsje_data/paraguay_distritos.geojson", "r", encoding="utf-8") as f:
        geo = json.load(f)

    # Specific manual overrides for known naming discrepancies between GeoJSON shapeName and TSJE
    overrides = {
        "CURUGUATY": ("14", "1"), # Canindeyu - San Isidro Curuguaty
        "MBOCAYATY": ("4", "9"), # Guaira - Mbocayaty
        "SAN CARLOS": ("1", "6"), # Concepcion - San Carlos del Apa
        "YATAITY": ("4", "23"), # Guaira - Yataity
        "COLONIA INDEPENDENCIA": ("4", "13"), # Guaira - Independencia
        "CECILIO BAEZ": ("5", "7"), # Caaguazu - Dr. Cecilio Baez
        "DR. BOTTRELL": ("4", "7"), # Guaira - Dr. Botrell
        "DR. JUAN LEON MALLORQUIN": ("10", "1"), # Alto Parana - Dr. J.L. Mallorquin
        "DR. JUAN MANUEL FRUTOS": ("5", "11"), # Caaguazu - Dr. Juan M. Frutos
        "GENERAL DIAZ": ("12", "7"), # Neembucu - Gral. Jose E. Diaz
        "GENERAL EUGENIO A. GARAY": ("4", "11"), # Guaira - Gral. E. A. Garay
        "GENERAL HIGINIO MORINIGO": ("6", "9"), # Caazapa - Gral. Morinigo
        "GENERAL JOSE MARIA BRUGUEZ": ("15", "4"), # Pte. Hayes - Gral. Jose M. Bruguez
        "GENERAL RESQUIN": ("2", "11"), # San Pedro - Gral. F. Resquin
        "J EULOGIO ESTIGARRIBIA": ("5", "9"), # Caaguazu - Dr. J.E. Estigarribia
        "JOSE FALCON": ("15", "3"), # Pte. Hayes - Fortin Jose Falcon
        "JOSE FASSARDI": ("4", "19"), # Guaira - Jose A. Fassardi
        "LEANDRO OVIEDO": ("7", "31"), # Itapua - Jose Leandro Oviedo
        "LOS LAURELES": ("12", "15"), # Neembucu - Laureles
        "MARIANO ROQUE ALONSO": ("11", "19"), # Central - Mariano R. Alonso
        "MARISCAL ESTIGARRIBIA": ("17", "3"), # Boqueron - Mcal. Estigarribia
        "MAURICIO JOSE TROCHE": ("4", "3"), # Guaira - Cap. Mauricio Jose Troche
        "MAYOR MARTINEZ": ("12", "17"), # Neembucu - Mayor J. Martinez
        "MCAL. FRANCISCO SOLANO LOPEZ": ("5", "17"), # Caaguazu - Francisco Solano Lopez
        "MOISES BERTONI": ("6", "5"), # Caazapa - Dr. Moises Bertoni
        "PEDRO JUAN CABALLERO": ("13", "0"), # Amambay - Pedro J. Caballero
        "PRIMERO DE MARZO": ("3", "1"), # Cordillera - 1ro de Marzo
        "SALTOS DEL GUAIRA": ("14", "0"), # Canindeyu - Salto del Guaira
        "SAN JUAN BAUTISTA DE ÑEEMBUCU": ("12", "21"), # Neembucu - San Juan Bautista
        "SAN JUAN DE PARANA": ("7", "47"), # Itapua - San Juan del Parana
        "SAN JUAN DELPARANA": ("7", "47"),
        "SAN PEDRO DEL YKUAMANDIYU": ("2", "0"), # San Pedro - San Pedro del Ycuamandyyu
        "SGTO. JOSE FELIX LOPEZ": ("1", "4"), # Concepcion - Sgto. Jose Felix Lopez
        "TEBICUARY-MI": ("9", "25"), # Paraguari - Tebicuarymi
        "TTE 1RO MANUEL IRALA FERNANDEZ": ("15", "9"), # Pte. Hayes - Tte. Irala Fernandez
        "YABEBYRY": ("8", "17"), # Misiones - Yavevyry
        "YASY KA'Y": ("14", "16"), # Canindeyu - Yasy Cañy
        "YASY KANY": ("14", "16"), # Canindeyu - Yasy Cañy (normalized)
        "YASY KAÑY": ("14", "16"),
        "YBYRAROBANA": ("14", "18"), # Canindeyu - Ybyrarovana
        "YRYVU CUA": ("2", "32"), # San Pedro - Yrybucua
        "YVY YA'U": ("1", "9"), # Concepcion - Yby Ya'u
        "YVY YA U": ("1", "9"), # Concepcion - Yby Ya'u (normalized)
        "YVY YA´U": ("1", "9"),
        "YVYCUI": ("9", "29"), # Paraguari - Ybycui
        "YVYTIMI": ("9", "31"), # Paraguari - Ybytymi
        "CAPIIBARY": ("2", "5"), # San Pedro - Capiivary
    }

    matched_count = 0
    for feat in geo["features"]:
        shape_name = feat["properties"]["shapeName"]
        norm_shape = normalize_name(shape_name)

        target_data = None
        # Check override
        if shape_name.upper() in overrides:
            d_id, dist_id = overrides[shape_name.upper()]
            target_data = int_by_key.get(f"{d_id}_{dist_id}")
        elif norm_shape in overrides:
            d_id, dist_id = overrides[norm_shape]
            target_data = int_by_key.get(f"{d_id}_{dist_id}")
        elif norm_shape in int_by_norm:
            target_data = int_by_norm[norm_shape]
        else:
            # Fallback search
            for norm_d, item in int_by_norm.items():
                if norm_shape == norm_d or norm_shape in norm_d or norm_d in norm_shape:
                    target_data = item
                    break

        if target_data:
            matched_count += 1
            k = f"{target_data['dpto_id']}_{target_data['dist_id']}"
            junta_info = junta_by_key.get(k, {})
            concejales_list = concejales_by_key.get(k, [])

            # Attach rich properties directly to feature
            feat["properties"].update({
                "has_data": True,
                "dpto_id": target_data["dpto_id"],
                "dpto_name": target_data["dpto_name"],
                "dist_id": target_data["dist_id"],
                "dist_name": target_data["dist_name"],
                "electores": target_data["electores"],
                "total_votos": target_data["total_votos"],
                "participacion_pct": target_data["participacion_pct"],
                "blancos": target_data["votos_blancos"],
                "nulos": target_data["votos_nulos"],
                "ganador_nombre": target_data["ganador_nombre"],
                "ganador_partido": target_data["ganador_partido"],
                "ganador_lista": target_data["ganador_lista"],
                "ganador_votos": target_data["ganador_votos"],
                "ganador_pct": target_data["ganador_pct"],
                "ganador_color": target_data["ganador_color"],
                "segundo_nombre": target_data["segundo_nombre"],
                "segundo_partido": target_data["segundo_partido"],
                "segundo_votos": target_data["segundo_votos"],
                "margen_votos": target_data["margen_votos"],
                "margen_pct": target_data["margen_pct"],
                "candidatos": target_data["candidatos"],
                "total_bancas": junta_info.get("total_bancas", 12),
                "distribucion_bancas": junta_info.get("distribucion_bancas", {}),
                "concejales": concejales_list
            })
        else:
            feat["properties"]["has_data"] = False

    print(f"[OK] Enriched GeoJSON features matched: {matched_count} / {len(geo['features'])} ({matched_count/len(geo['features'])*100:.1f}%)")

    # Save enriched GeoJSON
    with open("tsje_data/paraguay_distritos_enriquecido.geojson", "w", encoding="utf-8") as f:
        json.dump(geo, f, ensure_ascii=False)
    print("[OK] Saved tsje_data/paraguay_distritos_enriquecido.geojson")

    # 4. Generate Comprehensive Detailed Electoral Analysis
    generate_markdown_report(intendentes, juntas, concejales, resumen)

def generate_markdown_report(intendentes, juntas, concejales, resumen):
    # Total calculations
    total_electores = sum(i["electores"] for i in intendentes)
    total_votos = sum(i["total_votos"] for i in intendentes)
    total_blancos = sum(i["votos_blancos"] for i in intendentes)
    total_nulos = sum(i["votos_nulos"] for i in intendentes)
    participacion_global = round(total_votos / total_electores * 100, 2) if total_electores > 0 else 0

    # Top Intendencias by Party
    intendencias_partido = resumen.get("intendencias_por_partido", {})
    votos_partido = resumen.get("votos_intendente_por_partido", {})
    concejales_partido = resumen.get("concejales_totales_por_partido", {})

    # Top Turnout Districts
    top_participacion = sorted(intendentes, key=lambda x: x["participacion_pct"], reverse=True)[:10]
    lowest_participacion = sorted(intendentes, key=lambda x: x["participacion_pct"])[:10]

    # Closest Raced (menor margen de victoria)
    closest = sorted(intendentes, key=lambda x: x["margen_votos"])[:10]

    # Landslide victories (mayor margen % con al menos 1000 votos)
    landslides = sorted([i for i in intendentes if i["total_votos"] > 1000], key=lambda x: x["ganador_pct"], reverse=True)[:10]

    # Top Most Voted Intendentes
    most_voted_int = sorted(intendentes, key=lambda x: x["ganador_votos"], reverse=True)[:10]

    # Top Most Voted Concejales
    most_voted_conc = sorted(concejales, key=lambda x: x["votos_preferenciales"], reverse=True)[:10]

    # Top Preferential Vote Climbers (salto en lista)
    top_climbers = sorted([c for c in concejales if c["cambio_posicion"] > 0], key=lambda x: x["cambio_posicion"], reverse=True)[:10]

    # Department breakdown
    dept_stats = {}
    for i in intendentes:
        d = i["dpto_name"]
        if d not in dept_stats:
            dept_stats[d] = {
                "dpto_name": d,
                "distritos": 0,
                "electores": 0,
                "votos": 0,
                "anr_int": 0,
                "plra_int": 0,
                "otros_int": 0
            }
        dept_stats[d]["distritos"] += 1
        dept_stats[d]["electores"] += i["electores"]
        dept_stats[d]["votos"] += i["total_votos"]
        p = i["ganador_partido"]
        if "COLORADO" in p:
            dept_stats[d]["anr_int"] += 1
        elif "LIBERAL" in p:
            dept_stats[d]["plra_int"] += 1
        else:
            dept_stats[d]["otros_int"] += 1

    report_content = f"""# INFORME ELECTORAL Y ANÁLISIS INTEGRAL DE LAS ELECCIONES MUNICIPALES DEL PARAGUAY

> **Fuente Oficial:** Tribunal Superior de Justicia Electoral (TSJE) - Transmisión de Resultados Electorales Preliminares (TREP).  
> **Escrutinio Computado:** 100% de los 263 distritos en los 18 departamentos de la República del Paraguay.  
> **Sistema Electoral Aplicado:** Mayoría simple para Intendentes Municipales | Sistema D'Hondt con Desbloqueo de Listas y Voto Preferencial (Ley N° 6318/19) para Concejales Municipales.

---

## 1. RESUMEN EJECUTIVO NACIONAL (KPIs)

| Indicador Clave | Cifra Oficial | % Relativo |
| :--- | :--- | :--- |
| **Total de Distritos / Municipios** | **263** | 100.0% |
| **Electores Habilitados** | **{total_electores:,}** | 100.0% del Padrón |
| **Total de Votos Emitidos** | **{total_votos:,}** | **{participacion_global}%** Participación |
| **Votos en Blanco** | **{total_blancos:,}** | {round(total_blancos/total_votos*100, 2)}% de los votos |
| **Votos Nulos** | **{total_nulos:,}** | {round(total_nulos/total_votos*100, 2)}% de los votos |
| **Total de Bancas de Concejales Adjudicadas** | **{len(concejales):,}** | 100% Bancas D'Hondt |

---

## 2. MAPA DE PODER POLÍTICO: INTENDENCIAS MUNICIPALES

El escrutinio de las 263 intendencias municipales del país arroja un predominio territorial significativo de la Asociación Nacional Republicana (ANR / Partido Colorado), seguido por el Partido Liberal Radical Auténtico (PLRA) y diversas alianzas y movimientos regionales:

| Fuerza Política | Intendencias Ganadas | % de Intendencias | Total Votos Intendente | % Voto Popular |
| :--- | :--- | :--- | :--- | :--- |
"""
    for p, count in list(intendencias_partido.items())[:10]:
        v = votos_partido.get(p, 0)
        pct_int = round(count / 263 * 100, 1)
        pct_v = round(v / total_votos * 100, 1)
        report_content += f"| **{p}** | **{count}** | {pct_int}% | {v:,} | {pct_v}% |\n"

    report_content += f"""
---

## 3. COMPOSICIÓN NACIONAL DE LAS JUNTAS MUNICIPALES (SISTEMA D'HONDT)

El Sistema D'Hondt aplicado a cada una de las 263 Juntas Municipales distribuyó un total de **{len(concejales):,} bancas de concejales titulares**:

| Partido / Alianza Política | Concejales Ganados (Bancas) | % de Presencia Legislativa Comunal |
| :--- | :--- | :--- |
"""
    for p, count in list(concejales_partido.items())[:12]:
        pct_c = round(count / len(concejales) * 100, 2)
        report_content += f"| **{p}** | **{count:,}** | {pct_c}% |\n"

    report_content += f"""
---

## 4. RADIOGRAFÍA POR DEPARTAMENTO

| Departamento | Distritos | Electores | Votos Emitidos | Participación | Intendencias ANR | Intendencias PLRA | Alianzas / Otros |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for d, st in sorted(dept_stats.items(), key=lambda x: x[0]):
        part_d = round(st["votos"] / st["electores"] * 100, 1) if st["electores"] > 0 else 0
        report_content += f"| **{d}** | {st['distritos']} | {st['electores']:,} | {st['votos']:,} | {part_d}% | {st['anr_int']} | {st['plra_int']} | {st['otros_int']} |\n"

    report_content += f"""
---

## 5. LOS 10 INTENDENTES MÁS VOTADOS DEL PAÍS

| Puesto | Intendente Electo | Distrito | Departamento | Partido | Votos Obtenidos | % del Distrito |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for idx, c in enumerate(most_voted_int, 1):
        report_content += f"| {idx} | **{c['ganador_nombre']}** | {c['dist_name']} | {c['dpto_name']} | {c['ganador_partido']} | {c['ganador_votos']:,} | {c['ganador_pct']}% |\n"

    report_content += f"""
---

## 6. LOS 10 CONCEJALES MÁS VOTADOS DE LA REPÚBLICA (VOTO PREFERENCIAL)

| Puesto | Concejal Electo | Distrito | Departamento | Partido | Votos Preferenciales | Posición Original en Lista |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for idx, c in enumerate(most_voted_conc, 1):
        report_content += f"| {idx} | **{c['nombre']}** | {c['dist_name']} | {c['dpto_name']} | {c['partido']} | {c['votos_preferenciales']:,} | Lista #{c['orden_original']} |\n"

    report_content += f"""
---

## 7. EL FENÓMENO DEL DESBLOQUEO DE LISTAS: LOS MAYORES SALTOS ELECTORALES

Bajo la ley de voto preferencial, los ciudadanos pudieron reordenar la lista cerrada propuesta por los partidos políticos. Los siguientes candidatos ingresaron a las bancas realizando saltos espectaculares desde posiciones casi testimoniales:

| Concejal | Distrito | Partido | Puesto Original en Lista | Banca Final Adjudicada | Salto en Lista (+ Puestos) | Votos Preferenciales |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for c in top_climbers:
        report_content += f"| **{c['nombre']}** | {c['dist_name']} | {c['partido']} | Lugar #{c['orden_original']} | Banca #{c['banca']} | **+{c['cambio_posicion']} posiciones** | {c['votos_preferenciales']:,} |\n"

    report_content += f"""
---

## 8. ELECCIONES MÁS REÑIDAS E INFARTANTES (MENOR MARGEN DE VICTORIA)

| Distrito | Departamento | Ganador | 2do Lugar | Diferencia de Votos | Margen % |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for c in closest:
        report_content += f"| **{c['dist_name']}** | {c['dpto_name']} | {c['ganador_nombre']} ({c['ganador_partido']}) | {c['segundo_nombre']} ({c['segundo_partido']}) | **{c['margen_votos']} votos** | {c['margen_pct']}% |\n"

    report_content += f"""
---

## 9. DISTRITOS CON MAYOR Y MENOR PARTICIPACIÓN CIUDADANA

### Mayor Participación Ciudadana
"""
    for c in top_participacion[:5]:
        report_content += f"- **{c['dist_name']} ({c['dpto_name']})**: **{c['participacion_pct']}%** ({c['total_votos']:,} votantes de {c['electores']:,} empadronados)\n"

    report_content += "\n### Menor Participación Ciudadana\n"
    for c in lowest_participacion[:5]:
        report_content += f"- **{c['dist_name']} ({c['dpto_name']})**: **{c['participacion_pct']}%** ({c['total_votos']:,} votantes de {c['electores']:,} empadronados)\n"

    report_content += """
---
*Documento generado automáticamente a partir de la base de datos oficial del TSJE.*
"""

    with open("INFORME_ANALISIS_ELECTORAL_PARAGUAY.md", "w", encoding="utf-8") as f:
        f.write(report_content)
    print("[OK] Generated INFORME_ANALISIS_ELECTORAL_PARAGUAY.md")

if __name__ == "__main__":
    main()
