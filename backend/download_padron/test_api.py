import requests

URLS = [
    "https://www.anr.org.py/assets/p2026/3/5/5/8/3558002.json",
    "https://www.anr.org.py/assets/p2026/1/9/5/1/1951831.json"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.anr.org.py/",
    "Origin": "https://www.anr.org.py"
}

for url in URLS:
    print(f"Testing {url}...")
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print(f"Response: {r.text[:200]}")
        else:
            print(f"Error: {r.reason}")
    except Exception as e:
        print(f"Exception: {e}")
    print("-" * 20)
