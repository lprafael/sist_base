import requests
import re
import hashlib
import json
import time

class TSJEClient:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = "https://resultados.tsje.gov.py/publicacion/"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        }
        self.ensure_clearance()

    def ensure_clearance(self):
        url = self.base_url + "divulgacion.html"
        r = self.session.get(url, headers=self.headers)
        if "Sucuri WebSite Firewall" in r.text:
            print("Solving Sucuri challenge...")
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
            print("Sucuri clearance obtained!")

    def get_results(self, eleccion="47", candidatura="1", departamento="0", distrito="0", retries=3):
        api_url = self.base_url + "dinamics/divulgacion.ajax.php"
        headers = self.headers.copy()
        headers.update({
            "Referer": self.base_url + "divulgacion.html",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01"
        })
        params = {
            "codeleccion": str(eleccion),
            "candidatura": str(candidatura),
            "departamento": str(departamento),
            "distrito": str(distrito)
        }
        for attempt in range(retries):
            try:
                r = self.session.get(api_url, headers=headers, params=params, timeout=15)
                if "Sucuri WebSite Firewall" in r.text:
                    print("Sucuri challenge reappeared, resolving...")
                    self.ensure_clearance()
                    continue
                if not r.text.strip():
                    print(f"Empty response for dept {departamento}, dist {distrito}")
                    return None
                return r.json()
            except Exception as e:
                print(f"Error on dept {departamento}, dist {distrito} (attempt {attempt+1}): {e}")
                time.sleep(1)
        return None

if __name__ == "__main__":
    client = TSJEClient()
    # Test Concepcion (dept 1, dist 0) for Intendente (cand 1) and Junta (cand 2)
    res_int = client.get_results(candidatura="1", departamento="1", distrito="0")
    print("Intendente Concepcion candidates:", len(res_int.get("candidatos", [])) if res_int else "None")
    
    res_junta = client.get_results(candidatura="2", departamento="1", distrito="0")
    if res_junta and res_junta.get("candidatos"):
        print("Junta Concepcion lists:", len(res_junta["candidatos"]))
        for c in res_junta["candidatos"]:
            prefs = c.get("candidatosPref") or []
            print(f" - List {c.get('numLista')} ({c.get('desPartido')}): {c.get('votos')} votes, {len(prefs)} candidates in list")
