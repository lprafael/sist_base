import asyncio
import os
import sys
import json
import urllib.request
import urllib.parse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OVERPASS_QUERY = """
[out:json];
(
  node["leisure"="pitch"](-25.40,-57.65,-25.25,-57.45);
  way["leisure"="pitch"](-25.40,-57.65,-25.25,-57.45);
  node["leisure"="park"](-25.40,-57.65,-25.25,-57.45);
  way["leisure"="park"](-25.40,-57.65,-25.25,-57.45);
);
out center;
"""

async def scrape_and_insert():
    print("Fetching data from Overpass API...")
    try:
        encoded = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode('utf-8')
        req = urllib.request.Request(OVERPASS_URL, data=encoded, headers={'User-Agent': 'MiCanchaApp/1.0'})
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching from Overpass: {e}")
        return

    elements = data.get("elements", [])
    print(f"Found {len(elements)} sports pitches in Paraguay.")
    
    async with SessionLocal() as session:
        try:
            # Clear old public courts to refresh data
            await session.execute(text("DELETE FROM cancha.complejos WHERE es_publico = true"))
            
            count = 0
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name")
                if not name:
                    continue # Skip unnamed pitches to avoid clutter
                
                lat = el.get("lat") or el.get("center", {}).get("lat")
                lon = el.get("lon") or el.get("center", {}).get("lon")
                
                if not lat or not lon:
                    continue
                
                # Check if it already exists
                check_sql = text("SELECT id FROM cancha.complejos WHERE nombre = :name AND es_publico = true")
                res = await session.execute(check_sql, {"name": name})
                if res.fetchone():
                    continue
                
                sport = tags.get("sport", "Desconocido")
                city = tags.get("addr:city", "Gran Asunción")
                street = tags.get("addr:street", "Cancha Pública")
                
                insert_sql = text("""
                    INSERT INTO cancha.complejos (nombre, descripcion, direccion, ciudad, ubicacion, es_publico)
                    VALUES (:name, :desc, :direccion, :ciudad, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), true)
                """)
                await session.execute(insert_sql, {
                    "name": name,
                    "desc": f"Cancha pública. Deporte: {sport}.",
                    "direccion": street,
                    "ciudad": city,
                    "lon": lon,
                    "lat": lat
                })
                count += 1
                
                if count >= 300: # Limit to 300 for performance reasons in this prototype
                    break

            await session.commit()
            print(f"Successfully inserted {count} new public courts.")
        except Exception as e:
            await session.rollback()
            print(f"Database error: {e}")

if __name__ == "__main__":
    asyncio.run(scrape_and_insert())
