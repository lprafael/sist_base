import urllib.request
import re
import json

base_url = "https://resultados.tsje.gov.py/publicacion/"
url = base_url + "divulgacion.html"

req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
        print("HTML length:", len(html))
        scripts = re.findall(r'<script[^>]*src=[\'"]([^\'"]+)[\'"]', html)
        print("Scripts found:")
        for s in scripts:
            print(" -", s)
        
        # Also check entire HTML for interesting variables or urls
        with open("page_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Wrote page_dump.html")
except Exception as e:
    print("Error:", e)
