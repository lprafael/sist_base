import asyncio
import httpx
import uuid

async def main():
    base_url = "http://localhost:8001"
    
    async with httpx.AsyncClient() as client:
        print("0. Autenticando...")
        login_res = await client.post(f"{base_url}/auth/login", json={
            "username": "org_futbol",
            "password": "Futbol2026!"
        })
        
        if login_res.status_code != 200:
            print("Error en auth:", login_res.status_code, login_res.text)
            return
            
        token = login_res.json().get("access_token")
        print(f"Token obtenido: {token[:15]}...")
        
        headers = {
            "Authorization": f"Bearer {token}"
        }

        print("\n1. Creando Evento Principal...")
        ev_res = await client.post(f"{base_url}/cancha/torneos", json={
            "organizador_id": 1,
            "nombre": "Copa America Regional 2026",
            "deporte": "Futbol 5",
            "fecha_inicio": "2026-08-01"
        }, headers=headers)
        
        if ev_res.status_code in [307, 308]:
            ev_res = await client.post(f"{base_url}/cancha/torneos/", json={
                "organizador_id": 1,
                "nombre": "Copa America Regional 2026",
                "deporte": "Futbol 5",
                "fecha_inicio": "2026-08-01"
            }, headers=headers)

        print(f"POST /cancha/torneos Status: {ev_res.status_code}")
        if ev_res.status_code != 200: 
            print(ev_res.text)
            return
            
        evento_id = ev_res.json()["evento_id"]
        print(f"Evento Creado ID: {evento_id}")

        print("\n2. Creando Region y Ciudad...")
        reg_res = await client.post(f"{base_url}/cancha/torneos/eventos/{evento_id}/regiones", json={
            "evento_id": evento_id,
            "nombre": "Region Capital Central",
            "determinar_campeon_regional": True
        }, headers=headers)
        
        if reg_res.status_code in [307, 308]:
             reg_res = await client.post(f"{base_url}/cancha/torneos/eventos/{evento_id}/regiones/", json={
                "evento_id": evento_id,
                "nombre": "Region Capital Central",
                "determinar_campeon_regional": True
            }, headers=headers)

        print(f"POST /eventos/{evento_id}/regiones Status: {reg_res.status_code}")
        if reg_res.status_code != 200: 
            print(reg_res.text)
            return
            
        region_id = reg_res.json()["id"]

        ciu_res = await client.post(f"{base_url}/cancha/torneos/regiones/{region_id}/ciudades", json={
            "region_id": region_id,
            "nombre": "Asuncion Centro"
        }, headers=headers)
        
        if ciu_res.status_code in [307, 308]:
             ciu_res = await client.post(f"{base_url}/cancha/torneos/regiones/{region_id}/ciudades/", json={
                "region_id": region_id,
                "nombre": "Asuncion Centro"
            }, headers=headers)

        print(f"POST /regiones/{region_id}/ciudades Status: {ciu_res.status_code}")
        if ciu_res.status_code != 200:
            print(ciu_res.text)
            return
            
        ciudad_id = ciu_res.json()["id"]
        print(f"Region Creada ID: {region_id}")
        print(f"Ciudad Creada ID: {ciudad_id}")

        print("\nTest Completado Exitosamente. La Autenticación Funciona!")

if __name__ == "__main__":
    asyncio.run(main())
