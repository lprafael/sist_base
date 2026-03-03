import urllib.request
import json

def test_dist(id, name):
    try:
        url = f'http://localhost:8002/api/electoral/geo/cartografia/distrito/11/{id}'
        response = urllib.request.urlopen(url)
        data = json.loads(response.read())
        if data['features']:
            actual = data['features'][0]['properties']['DIST_DESC_']
            status = "OK" if actual == name else f"ERROR: Got {actual}"
            print(f"ID {id:2} ({name:<15}): {status} (Features: {len(data['features'])})")
        else:
            print(f"ID {id:2} ({name:<15}): NO FEATURES")
    except Exception as e:
        print(f"ID {id:2} ({name:<15}): API Error {e}")

if __name__ == "__main__":
    print("Verificando consistencia de mapeo unificado:")
    test_dist(17, "LUQUE")
    test_dist(33, "YPACARAI")
    test_dist(9, "ITAUGUA")
    test_dist(1, "CAPIATA")
    test_dist(13, "LAMBARE")
