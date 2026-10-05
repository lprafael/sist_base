import requests
import re
import hashlib
import sys

def solve_sucuri(session, url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    }
    r = session.get(url, headers=headers)
    print(f"Initial GET status: {r.status_code}")
    
    if "Sucuri WebSite Firewall" not in r.text:
        print("Not blocked by Sucuri!")
        return r.text
        
    print("Sucuri challenge detected. Extracting PoW parameters...")
    cs_match = re.search(r'var _cs="([^"]+)";', r.text)
    cd_match = re.search(r'var _cd=(\d+);', r.text)
    ce_match = re.search(r'var _ce=(\d+);', r.text)
    cg_match = re.search(r'var _cg="([^"]+)";', r.text)
    
    if not (cs_match and cd_match and ce_match and cg_match):
        print("Could not extract PoW parameters!")
        print(r.text[:500])
        return None
        
    _cs = cs_match.group(1)
    _cd = int(cd_match.group(1))
    _ce = ce_match.group(1)
    _cg = cg_match.group(1)
    
    print(f"Parameters: cs={_cs}, cd={_cd}, ce={_ce}, cg={_cg}")
    prefix = "0" * _cd
    n = 0
    while True:
        s = f"{_cs}{n}".encode('utf-8')
        h = hashlib.sha256(s).hexdigest()
        if h.startswith(prefix):
            break
        n += 1
        
    token = f"{_cs}:{_cd}:{_ce}:{_cg}:{n}"
    print(f"Solved! n={n}, token={token}")
    
    # Now POST the token back
    post_headers = headers.copy()
    post_headers["Origin"] = "https://resultados.tsje.gov.py"
    post_headers["Referer"] = url
    post_headers["Content-Type"] = "application/x-www-form-urlencoded"
    
    data = {"cap-token": token}
    r2 = session.post(url, headers=post_headers, data=data, allow_redirects=True)
    print(f"Post response status: {r2.status_code}, length: {len(r2.text)}")
    print(f"Cookies in session: {session.cookies.get_dict()}")
    
    # After POST, do a GET to the target URL with the received cookies
    print("Performing subsequent GET with clearance cookie...")
    r3 = session.get(url, headers=headers)
    print(f"Subsequent GET status: {r3.status_code}, length: {len(r3.text)}")
    return r3.text

if __name__ == "__main__":
    s = requests.Session()
    target = "https://resultados.tsje.gov.py/publicacion/divulgacion.html"
    content = solve_sucuri(s, target)
    if content:
        with open("solved_page.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("Saved solved_page.html (first 500 chars):")
        print(content[:500])

