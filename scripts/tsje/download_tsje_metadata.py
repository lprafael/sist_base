import requests
import re
import hashlib
import json
import os

def solve_sucuri(session, url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    }
    r = session.get(url, headers=headers)
    if "Sucuri WebSite Firewall" not in r.text:
        return r.text
        
    cs_match = re.search(r'var _cs="([^"]+)";', r.text)
    cd_match = re.search(r'var _cd=(\d+);', r.text)
    ce_match = re.search(r'var _ce=(\d+);', r.text)
    cg_match = re.search(r'var _cg="([^"]+)";', r.text)
    
    _cs = cs_match.group(1)
    _cd = int(cd_match.group(1))
    _ce = ce_match.group(1)
    _cg = cg_match.group(1)
    
    prefix = "0" * _cd
    n = 0
    while True:
        s = f"{_cs}{n}".encode('utf-8')
        if hashlib.sha256(s).hexdigest().startswith(prefix):
            break
        n += 1
        
    token = f"{_cs}:{_cd}:{_ce}:{_cg}:{n}"
    post_headers = headers.copy()
    post_headers["Origin"] = "https://resultados.tsje.gov.py"
    post_headers["Referer"] = url
    post_headers["Content-Type"] = "application/x-www-form-urlencoded"
    
    session.post(url, headers=post_headers, data={"cap-token": token}, allow_redirects=True)
    r3 = session.get(url, headers=headers)
    return r3.text

def download_file(session, base_url, path, out_dir="tsje_data"):
    os.makedirs(out_dir, exist_ok=True)
    url = base_url + path
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://resultados.tsje.gov.py/publicacion/divulgacion.html",
    }
    r = session.get(url, headers=headers)
    out_path = os.path.join(out_dir, os.path.basename(path))
    with open(out_path, "wb") as f:
        f.write(r.content)
    print(f"Downloaded {path} -> {out_path} ({len(r.content)} bytes)")
    return r.text

if __name__ == "__main__":
    s = requests.Session()
    base_url = "https://resultados.tsje.gov.py/publicacion/"
    solve_sucuri(s, base_url + "divulgacion.html")
    
    files_to_get = [
        "statics/json/divulgacion/elecciones.js",
        "statics/json/divulgacion/candidaturas.js",
        "statics/json/divulgacion/departamentos.js",
        "statics/json/divulgacion/distritos.js",
        "statics/json/divulgacion/zonas.js",
        "statics/js/divulgacion.js"
    ]
    
    for f in files_to_get:
        txt = download_file(s, base_url, f)
        print(f"--- First 200 chars of {f}:")
        print(txt[:200])
        print("...")
