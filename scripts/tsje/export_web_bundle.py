import json
import os

def main():
    print("Generating enriched web bundle with all 9,174 candidates...")
    with open("tsje_data/paraguay_distritos_optimizado.geojson", "r", encoding="utf-8") as f:
        geo = json.load(f)

    with open("tsje_data/consolidado_intendentes.json", "r", encoding="utf-8") as f:
        intendentes = json.load(f)

    with open("tsje_data/consolidado_juntas.json", "r", encoding="utf-8") as f:
        juntas = json.load(f)

    with open("tsje_data/concejales_electos_dhondt.json", "r", encoding="utf-8") as f:
        concejales_electos = json.load(f)

    with open("tsje_data/concejales_todos_con_estado.json", "r", encoding="utf-8") as f:
        concejales_todos = json.load(f)

    with open("tsje_data/resumen_nacional.json", "r", encoding="utf-8") as f:
        resumen = json.load(f)

    bundle_path = "tsje_data/bundle_electoral.js"
    with open(bundle_path, "w", encoding="utf-8") as f:
        f.write("window.PARAGUAY_GEOJSON = ")
        json.dump(geo, f, separators=(',', ':'), ensure_ascii=False)
        f.write(";\n\nwindow.INTENDENTES_DATA = ")
        json.dump(intendentes, f, separators=(',', ':'), ensure_ascii=False)
        f.write(";\n\nwindow.JUNTAS_DATA = ")
        json.dump(juntas, f, separators=(',', ':'), ensure_ascii=False)
        f.write(";\n\nwindow.CONCEJALES_DATA = ")
        json.dump(concejales_electos, f, separators=(',', ':'), ensure_ascii=False)
        f.write(";\n\nwindow.CONCEJALES_TODOS = ")
        json.dump(concejales_todos, f, separators=(',', ':'), ensure_ascii=False)
        f.write(";\n\nwindow.RESUMEN_DATA = ")
        json.dump(resumen, f, separators=(',', ':'), ensure_ascii=False)
        f.write(";\n")

    size_mb = os.path.getsize(bundle_path) / (1024 * 1024)
    print(f"Generated {bundle_path}: {size_mb:.2f} MB")

    # Also copy directly to frontend/public
    import shutil
    for target_dir in ["frontend/public/tsje_data"]:
        os.makedirs(target_dir, exist_ok=True)
        for fname in [
            "bundle_electoral.js",
            "concejales_todos_con_estado.csv",
            "concejales_no_electos.csv",
            "concejales_electos_dhondt.csv",
            "consolidado_intendentes.csv",
            "consolidado_juntas.csv",
            "consolidado_intendentes.json",
            "consolidado_juntas.json",
            "concejales_electos_dhondt.json",
            "concejales_todos_con_estado.json",
            "resumen_nacional.json",
            "paraguay_distritos_optimizado.geojson"
        ]:
            src = os.path.join("tsje_data", fname)
            if os.path.exists(src):
                shutil.copy(src, os.path.join(target_dir, fname))

    if os.path.exists("tablero_electoral.html"):
        shutil.copy("tablero_electoral.html", "frontend/public/tablero_electoral.html")
    print("[OK] Synchronized bundle and datasets to frontend/public/tsje_data/ and web/public/tsje_data/")

if __name__ == "__main__":
    main()
