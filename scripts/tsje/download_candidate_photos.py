import os
import glob
import json
import time
import requests
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath("."))
try:
    from solve_sucuri import solve_sucuri
except ImportError:
    from scripts.tsje.solve_sucuri import solve_sucuri

def collect_images_to_download():
    images = set()
    # 1. Intendentes candidates
    for f in glob.glob("tsje_data/raw_intendentes/*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                d = json.load(fp)
            for c in d.get("candidatos", []):
                img = c.get("imgCandidato")
                if img:
                    images.add(img.strip())
        except Exception as e:
            pass

    # 2. List logos from Juntas
    for f in glob.glob("tsje_data/raw_juntas/*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                d = json.load(fp)
            for c in d.get("candidatos", []):
                img = c.get("imgCandidato")
                if img:
                    images.add(img.strip())
                nl = c.get("numLista")
                if nl:
                    images.add(f"L{nl}".strip())
        except Exception as e:
            pass

    return sorted(list(images))

def main():
    imgs = collect_images_to_download()
    print(f"Total unique images to retrieve from TSJE: {len(imgs)}")

    out_dirs = [
        "tsje_data/fotos_candidatos",
        "frontend/public/tsje_data/fotos_candidatos"
    ]
    for od in out_dirs:
        os.makedirs(od, exist_ok=True)

    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://resultados.tsje.gov.py/publicacion/divulgacion.html",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
    session.headers.update(headers)

    base_url = "https://resultados.tsje.gov.py/publicacion/"
    solve_sucuri(session, base_url + "divulgacion.html")

    success = 0
    skipped = 0
    failed = 0

    base_img_url = "https://resultados.tsje.gov.py/publicacion/statics/img/img_candidatos/"

    for idx, img_id in enumerate(imgs, 1):
        filename = f"{img_id}.jpg"
        target_path = os.path.join(out_dirs[0], filename)

        if os.path.exists(target_path) and os.path.getsize(target_path) > 500:
            skipped += 1
            dest_front = os.path.join(out_dirs[1], filename)
            if not os.path.exists(dest_front) or os.path.getsize(dest_front) < 500:
                with open(target_path, "rb") as rf:
                    with open(dest_front, "wb") as wf:
                        wf.write(rf.read())
            continue

        url = f"{base_img_url}{filename}"
        try:
            r = session.get(url, timeout=10)
            if "Sucuri WebSite Firewall" in r.text or r.status_code == 403:
                print(f"Sucuri re-challenge detected on {filename}, refreshing clearance...")
                solve_sucuri(session, base_url + "divulgacion.html")
                r = session.get(url, timeout=10)

            if r.status_code == 200 and len(r.content) > 500:
                with open(target_path, "wb") as f:
                    f.write(r.content)
                dest_front = os.path.join(out_dirs[1], filename)
                with open(dest_front, "wb") as f:
                    f.write(r.content)
                success += 1
                if success % 25 == 0 or idx == len(imgs):
                    print(f"[{idx}/{len(imgs)}] Downloaded {filename} ({len(r.content)} bytes)")
            else:
                failed += 1
                if failed <= 10:
                    print(f"[{idx}/{len(imgs)}] Missing or empty {filename} (status {r.status_code}, {len(r.content)} bytes)")
        except Exception as e:
            failed += 1
            print(f"[{idx}/{len(imgs)}] Error on {filename}: {e}")

        time.sleep(0.04)

    print(f"\nDone! Success: {success}, Skipped (already exists): {skipped}, Failed/Missing: {failed}")

if __name__ == "__main__":
    main()
