import urllib.request
import sys

def check_ci(ci):
    ci_str = str(ci).zfill(7)
    path = "/".join(list(ci_str[:4]))
    url = f"https://www.anr.org.py/assets/p2026/{path}/{ci}.json"
    try:
        resp = urllib.request.urlopen(url)
        print(f"CI {ci}: Found ({resp.getcode()})")
    except Exception as e:
        print(f"CI {ci}: {e}")

if __name__ == "__main__":
    check_ci(2790000)
    check_ci(3000000)
    check_ci(2702871)
