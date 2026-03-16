import traceback
import sys
import os

try:
    print("Iniciando importacion...")
    import backend.download_padron.download_anr_v2 as script
    print("Importacion exitosa.")
except BaseException as e:
    print(f"Fallo critico (tipo {type(e).__name__}):")
    traceback.print_exc()
