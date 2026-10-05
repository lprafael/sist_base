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

    # Also copy directly to web/public
    import shutil
    os.makedirs("web/public/tsje_data", exist_ok=True)
    shutil.copy("tsje_data/bundle_electoral.js", "web/public/tsje_data/bundle_electoral.js")
    shutil.copy("tsje_data/concejales_todos_con_estado.csv", "web/public/tsje_data/concejales_todos_con_estado.csv")
    shutil.copy("tsje_data/concejales_no_electos.csv", "web/public/tsje_data/concejales_no_electos.csv")
    print("[OK] Synchronized bundle and new CSVs to web/public/tsje_data/")

if __name__ == "__main__":
    main()
