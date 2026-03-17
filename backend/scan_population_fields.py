import os
import json

cart_path = r"c:\Users\lpraf\OneDrive\Documentos\Desarrollos\Poliverso\SIGEL\backend\cartografia"

found_pop = []
no_pop = []

for folder in sorted(os.listdir(cart_path)):
    folder_path = os.path.join(cart_path, folder)
    if not os.path.isdir(folder_path): continue
    
    for f in os.listdir(folder_path):
        if f.lower().endswith(".geojson") and "barr" in f.lower():
            fpath = os.path.join(folder_path, f)
            try:
                with open(fpath, encoding="utf-8") as jf:
                    gj = json.load(jf)
                features = gj.get("features", [])
                if features:
                    props = features[0].get("properties", {})
                    keys = list(props.keys())
                    pop_keys = [k for k in keys if any(x in k.upper() for x in ["POB", "HAB", "TOTAL", "CENSO"])]
                    if pop_keys:
                        found_pop.append((folder, f, pop_keys))
                    else:
                        no_pop.append((folder, f, keys))
            except Exception as e:
                no_pop.append((folder, f, [f"ERROR: {e}"]))

with open("scan_result.txt", "w", encoding="utf-8") as out:
    out.write("=== FILES WITH POPULATION DATA ===\n")
    if found_pop:
        for folder, f, keys in found_pop:
            out.write(f"  FOUND: {folder}/{f} -> {keys}\n")
    else:
        out.write("  (none found)\n")
    
    out.write(f"\n=== ALL BARRIO FILES SCANNED ({len(no_pop)}) ===\n")
    for folder, f, keys in no_pop:
        out.write(f"  {folder}/{f}\n    props: {keys}\n")

print("Done. See scan_result.txt")
