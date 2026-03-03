import requests
import json

url = "http://localhost:8001/api/electoral/geo/barrios/11?distrito_id=27"
try:
    # Como no tengo token de auth facil aqui, voy a intentar pedirlo sin auth o ver si puedo saltarlo
    # Pero mejor lo hago desde dentro del contenedor usando curl y lo guardo a un archivo
    pass
except:
    pass
