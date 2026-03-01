import requests
import json

# Login as admin to get token
LOGIN_URL = "http://127.0.0.1:8002/api/auth/login"
payload = {"username": "admin", "password": "admin"}
r = requests.post(LOGIN_URL, json=payload)

if r.status_code != 200:
    print(f"Login failed: {r.text}")
    exit(1)

token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Try to register a voter (use the one we found earlier 1003219)
VOTER_URL = "http://127.0.0.1:8002/api/electoral/captacion"
voter_data = {
    "cedula_votante": "1003219",
    "parentesco": "Vecino",
    "grado_seguridad": 5,
    "observaciones": "Test de integracion"
}

print(f"Enviando captacion para 1003219...")
r2 = requests.post(VOTER_URL, headers=headers, json=voter_data)
print(f"Status: {r2.status_code}")
print(f"Response: {r2.text}")

# Check my voters
LIST_URL = "http://127.0.0.1:8002/api/electoral/mis-votantes"
r3 = requests.get(LIST_URL, headers=headers)
print(f"My Voters List: {r3.json()}")
