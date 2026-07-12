from fastapi.testclient import TestClient
from main import app
from routers.auth import get_current_user
from database import get_session
import asyncio

# Mock user
mock_user = {"user_id": "a933f110-85f2-4b2a-8c17-48de5da40e44"} # Random UID

def override_get_current_user():
    return mock_user

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

response = client.put(
    "/futbol/jugadores/d82356a2-ef33-47cc-b788-030182d6330c", 
    json={
        "nombre": "Test",
        "fecha_nacimiento": "",
        "numero_camiseta": None
    }
)
print("Status Code:", response.status_code)
print("Response JSON:", response.json() if response.content else response.text)
