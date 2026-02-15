import requests
import io
from PIL import Image

# Create a test image
img = Image.new('RGB', (100, 100), color='red')
img_bytes = io.BytesIO()
img.save(img_bytes, format='PNG')
img_bytes.seek(0)

# Get token (you'll need to replace with actual token)
token = input("Enter your JWT token: ")

# Upload image
url = "http://localhost:8002/playa/vehiculos/11239/imagenes"
files = {'imagenes': ('test_upload.png', img_bytes, 'image/png')}
headers = {'Authorization': f'Bearer {token}'}

response = requests.post(url, files=files, headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
