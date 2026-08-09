"""
sifen/config.py
Configuración del módulo SIFEN para mi_cancha.
Lee variables de entorno con prefijo SIFEN_.
"""
from __future__ import annotations
import os

# Namespace XML oficial SIFEN
SIFEN_XMLNS: str = "http://ekuatia.set.gov.py/sifen/xsd"

# Versión del formato DE
D_VER_FOR: int = int(os.getenv("SIFEN_D_VER_FOR", "150"))

# URL base para código QR (test o prod según ambiente)
SIFEN_AMBIENTE: str = os.getenv("SIFEN_AMBIENTE", "test")

QR_BASE_URL: str = (
    "https://ekuatia.set.gov.py/consultas-test/qr"
    if SIFEN_AMBIENTE == "test"
    else "https://ekuatia.set.gov.py/consultas/qr"
)

# CSC por defecto (se sobreescribe con el de cada academia)
ID_CSC_DEFAULT: str = os.getenv("SIFEN_ID_CSC_DEFAULT", "0001")
CSC_SECRETO: str = os.getenv("SIFEN_CSC_SECRETO", "")

# Directorio donde se almacenan los certificados .p12 de cada academia
CERTS_DIR: str = os.getenv("SIFEN_CERTS_DIR", "./certs/sifen")

# Ruta al XSD oficial (opcional — si no existe se advierte pero no bloquea)
XSD_PATH: str = os.getenv("SIFEN_XSD_PATH", "./sifen/xsd/siRecepDE_v150.xsd")

# Clave Fernet para cifrar contraseñas de certificados en la BD
FERNET_KEY: str = os.getenv("SIFEN_FERNET_KEY", "")
