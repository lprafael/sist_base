import urllib.request
import json

try:
    url = 'http://localhost:8002/api/electoral/geo/cartografia/distrito/11/17'
    response = urllib.request.urlopen(url)
    data = json.loads(response.read())
    print(f"Features found: {len(data['features'])}")
    if data['features']:
        print(f"First feature dist: {data['features'][0]['properties']['DIST_DESC_']}")
        print(f"Sample properties: {data['features'][0]['properties']}")
except Exception as e:
    print(f"Error: {e}")
