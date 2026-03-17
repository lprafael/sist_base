"""
geocoding_services.py

Servicios de geocodificación para obtener lat/lng a partir del nombre o dirección
de un local de votación. Soporta:

1. Google Maps Geocoding API (opcional)
   - Mejor precisión y cobertura.
   - Requiere API key y tiene costo por uso.
   - Variable de entorno: GOOGLE_MAPS_GEOCODING_API_KEY

2. Nominatim (OpenStreetMap) — gratuito
   - Sin API key. Límite de 1 petición/segundo.
   - Variable User-Agent obligatoria.

Uso desde otro script:
  from geocoding_services import geocode_address
  lat, lng = geocode_address("Escuela Nacional 123, Asunción, Paraguay")
"""

import json
import os
import re
import time
from typing import Optional, Tuple

# ─── Nominatim (siempre disponible) ────────────────────────────────────────
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "SIGEL-Electoral/2.0 (contacto@poliverso.com)"}
NOMINATIM_DELAY = 1.2  # segundos entre peticiones (política de uso)


def _clean_name_for_search(name: str) -> str:
    """Limpia el nombre del local para mejorar la búsqueda en cualquier proveedor."""
    if not name or not name.strip():
        return ""
    s = name.upper().strip()
    # Abreviaturas comunes
    s = re.sub(r"\bESC\.?\s*NAC\.?\s*N[·Oº°]?\s*\d+", "Escuela Nacional ", s, flags=re.IGNORECASE)
    s = re.sub(r"\bESC\.?\s*N[·Oº°]?\s*\d+", "Escuela ", s, flags=re.IGNORECASE)
    s = re.sub(r"\bCOL\.?\s*NAC\.?", "Colegio Nacional ", s, flags=re.IGNORECASE)
    s = s.replace("GRAL.", "General ").replace("ESC.", "Escuela ")
    s = re.sub(r"\bN[·Oº°]?\s*\d+\b", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.title() if s else name.strip()


def geocode_google(address: str, api_key: str) -> Optional[Tuple[float, float]]:
    """
    Geocodifica una dirección usando Google Maps Geocoding API.
    Devuelve (lat, lng) o None si no hay resultados o hay error.
    """
    try:
        import urllib.parse
        import urllib.request
        params = urllib.parse.urlencode({"address": address, "key": api_key})
        url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "SIGEL/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        if data.get("status") != "OK" or not data.get("results"):
            return None
        loc = data["results"][0]["geometry"]["location"]
        return (float(loc["lat"]), float(loc["lng"]))
    except Exception:
        return None


def geocode_nominatim(address: str, countrycodes: str = "py") -> Optional[Tuple[float, float]]:
    """
    Geocodifica usando Nominatim (OpenStreetMap). Gratuito; respetar 1 req/s.
    countrycodes: código ISO (py = Paraguay).
    """
    try:
        import urllib.parse
        import urllib.request
        params = urllib.parse.urlencode({
            "q": address,
            "format": "json",
            "limit": 1,
            "countrycodes": countrycodes,
        })
        url = f"{NOMINATIM_URL}?{params}"
        req = urllib.request.Request(url, headers=NOMINATIM_HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        if not data:
            return None
        return (float(data[0]["lat"]), float(data[0]["lon"]))
    except Exception:
        return None


def geocode_address(
    address: str,
    prefer_google: bool = True,
    google_api_key: Optional[str] = None,
) -> Optional[Tuple[float, float]]:
    """
    Geocodifica una dirección. Si prefer_google y hay google_api_key, usa Google;
    si no, usa Nominatim. Entre llamadas a Nominatim aplica un delay.
    """
    if not address or not address.strip():
        return None
    key = google_api_key or os.getenv("GOOGLE_MAPS_GEOCODING_API_KEY", "").strip()
    if prefer_google and key:
        result = geocode_google(address, key)
        if result:
            return result
    time.sleep(NOMINATIM_DELAY)
    return geocode_nominatim(address)


def build_queries_for_local(
    nombre_local: str,
    nombre_distrito: str,
    nombre_departamento: str,
    domicilio: Optional[str] = None,
) -> list:
    """
    Construye una lista de cadenas de búsqueda de más a menos específica
    para un local de votación (nombre, distrito, departamento, opcional domicilio).
    """
    clean = _clean_name_for_search(nombre_local)
    dpto = nombre_departamento.strip().title()
    if dpto.upper() == "CAPITAL":
        dpto = "Asunción"
    dist = nombre_distrito.strip().title()
    queries = [
        f"{clean}, {dist}, {dpto}, Paraguay",
        f"{clean}, {dist}, Paraguay",
        f"{clean}, {dpto}, Paraguay",
        f"{clean}, Paraguay",
    ]
    if domicilio and domicilio.strip():
        addr = domicilio.strip()
        if addr and addr not in queries:
            queries.insert(0, f"{addr}, {dist}, Paraguay")
    # Último recurso: nombre original
    if nombre_local.strip() != clean:
        queries.append(f"{nombre_local.strip()}, {dist}, Paraguay")
    return queries
