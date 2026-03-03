import httpx
import asyncio
import json

async def test():
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get("http://localhost:8001/api/electoral/geo/barrios/11")
            data = r.json()
            features = data.get('features', [])
            
            captados = [f['properties'] for f in features if f['properties'].get('captados_count', 0) > 0]
            print(f"Barrios con simpatizantes (captados_count > 0): {len(captados)}")
            if captados:
                print(f"Ejemplos: {captados[:3]}")
            else:
                # Ver uno al azar para ver si tiene el campo
                if features:
                    print(f"Campos presentes en props: {list(features[0]['properties'].keys())}")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test())
