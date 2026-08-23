import asyncio
import urllib.request
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from database import SessionLocal
from routers.ajedrez import lichess_sync_torneo, SyncTorneoLichessPayload

async def poll_lichess_tournaments():
    """
    Tarea en segundo plano que se ejecuta cada 2 minutos (120 seg).
    Busca torneos marcados con auto_sync = TRUE, chequea su estado en Lichess,
    y si están iniciados los sincroniza.
    """
    while True:
        try:
            await asyncio.sleep(120)
            
            async with SessionLocal() as session:
                q = await session.execute(text("""
                    SELECT torneo_id, lichess_id FROM torneos_generales.ajedrez_lichess_sync 
                    WHERE auto_sync = TRUE
                """))
                torneos_a_sincronizar = q.fetchall()
                
                for t in torneos_a_sincronizar:
                    torneo_id = str(t.torneo_id)
                    lichess_id = t.lichess_id
                    
                    # 1. Consultar estado en Lichess
                    url_info = f"https://lichess.org/api/swiss/{lichess_id}"
                    req_info = urllib.request.Request(url_info, headers={"Accept": "application/json"})
                    try:
                        with urllib.request.urlopen(req_info, timeout=10.0) as resp:
                            t_data = json.loads(resp.read().decode("utf-8"))
                            status = t_data.get("status")
                    except Exception as e:
                        print(f"Error consultando metadata para torneo {lichess_id} en worker: {e}")
                        continue
                        
                    # 2. Sincronizar si está iniciado o acaba de finalizar
                    if status in ["started", "finished"]:
                        try:
                            payload = SyncTorneoLichessPayload(
                                lichess_id=lichess_id,
                                crear_usuarios_faltantes=True,
                                auto_sync=False # Ya está en la base de datos, no necesitamos reinsertar
                            )
                            # Creamos una transacción y le pasamos la sesión (aunque lichess_sync_torneo hace commit)
                            await lichess_sync_torneo(torneo_id=torneo_id, payload=payload, session=session)
                            print(f"[Lichess Worker] Torneo {torneo_id} (Lichess: {lichess_id}) sincronizado.")
                        except Exception as e:
                            print(f"[Lichess Worker] Error sincronizando torneo {torneo_id}: {e}")
                            
                        # Si ya terminó en Lichess, desactivar el auto-sync para no seguir consultando indefinidamente
                        if status == "finished":
                            await session.execute(text("""
                                UPDATE torneos_generales.ajedrez_lichess_sync 
                                SET auto_sync = FALSE 
                                WHERE torneo_id = :tid
                            """), {"tid": torneo_id})
                            await session.commit()
                            print(f"[Lichess Worker] Torneo {torneo_id} marcado como completado y desactivado auto_sync.")
                            
        except Exception as e:
            print(f"[Lichess Worker] Error grave en el bucle: {e}")
            await asyncio.sleep(60) # Esperar un minuto antes de reintentar en caso de fallo general

def start_lichess_worker():
    """Inicia la tarea en segundo plano sin bloquear el hilo principal."""
    asyncio.create_task(poll_lichess_tournaments())
