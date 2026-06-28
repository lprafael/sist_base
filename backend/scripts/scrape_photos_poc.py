import asyncio
import os
import sys
import urllib.request
import urllib.parse
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text

async def fetch_image_for_query(query: str) -> str:
    url = "https://images.search.yahoo.com/search/images?p=" + urllib.parse.quote(query)
    req = urllib.request.Request(
        url, 
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            matches = re.findall(r'imgurl=&quot;(https?://[^&]+(?:jpg|jpeg|png))&quot;', html)
            if matches:
                return matches[0]
    except Exception as e:
        print(f"Error searching {query}: {e}")
    return None

async def run_poc():
    async with SessionLocal() as session:
        # Extraer 10 canchas públicas para la prueba de concepto
        res = await session.execute(text("SELECT id, nombre, ciudad FROM cancha.complejos WHERE es_publico = true LIMIT 10"))
        courts = res.fetchall()
        
        if not courts:
            print("No se encontraron canchas públicas en la base de datos.")
            return

        for court in courts:
            court_id, nombre, ciudad = court
            query = f"{nombre} {ciudad} Paraguay parque cancha"
            print(f"Buscando foto para: {nombre} ({ciudad})...")
            
            img_url = await fetch_image_for_query(query)
            if img_url:
                print(f" -> Encontrada: {img_url}")
                # Guardar la URL en el campo foto_portada
                await session.execute(
                    text("UPDATE cancha.complejos SET foto_portada = :img_url WHERE id = :id"),
                    {"img_url": img_url, "id": court_id}
                )
            else:
                print(" -> No se encontró imagen.")
                
            # Pequeña pausa para no ser bloqueados de inmediato por Google
            await asyncio.sleep(2)
            
        await session.commit()
        print("\nPrueba de concepto finalizada. Se han actualizado las canchas en la base de datos.")

if __name__ == "__main__":
    asyncio.run(run_poc())
