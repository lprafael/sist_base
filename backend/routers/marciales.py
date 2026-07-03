from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict
import json
from datetime import datetime

from database import get_session
from models_generales import CheckInParticipante, PuntuacionJuez, ConfiguracionAgrupacion

router = APIRouter(prefix="/api/marciales", tags=["Torneos Marciales"])

# Manejo simple de WebSockets para la vista pública en vivo
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, torneo_id: str):
        await websocket.accept()
        if torneo_id not in self.active_connections:
            self.active_connections[torneo_id] = []
        self.active_connections[torneo_id].append(websocket)

    def disconnect(self, websocket: WebSocket, torneo_id: str):
        if torneo_id in self.active_connections:
            if websocket in self.active_connections[torneo_id]:
                self.active_connections[torneo_id].remove(websocket)

    async def broadcast(self, message: str, torneo_id: str):
        if torneo_id in self.active_connections:
            for connection in self.active_connections[torneo_id]:
                await connection.send_text(message)

manager = ConnectionManager()

# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/torneos/{torneo_id}/participantes/buscar")
async def buscar_participantes(torneo_id: str, q: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, nombre, apellido, documento, estado, modalidad, nivel_experiencia 
        FROM torneos_generales.participantes 
        WHERE torneo_id = :tid AND (nombre ILIKE :q OR apellido ILIKE :q OR documento ILIKE :q)
        LIMIT 10
    """)
    res = await session.execute(query, {"tid": torneo_id, "q": f"%{q}%"})
    rows = res.fetchall()
    return [{"id": r.id, "nombre": r.nombre, "apellido": r.apellido, "documento": r.documento, "estado": r.estado, "modalidad": r.modalidad, "nivel_experiencia": r.nivel_experiencia} for r in rows]


@router.post("/participantes/{participante_id}/check-in")
async def check_in_participante(participante_id: str, payload: CheckInParticipante, session: AsyncSession = Depends(get_session)):
    query = text("""
        UPDATE torneos_generales.participantes 
        SET peso_verificado = :peso, estatura_verificada = :estatura, pago_confirmado = :pago, estado = 'Habilitado'
        WHERE id = :id AND estado = 'Confirmado'
        RETURNING id
    """)
    res = await session.execute(query, {
        "id": participante_id,
        "peso": payload.peso_verificado,
        "estatura": payload.estatura_verificada,
        "pago": payload.pago_confirmado
    })
    if not res.scalar():
        raise HTTPException(status_code=400, detail="Participante no encontrado o no está en estado 'Confirmado'")
    
    await session.commit()
    return {"mensaje": "Check-in realizado con éxito. Participante Habilitado."}


@router.post("/torneos/{torneo_id}/agrupacion-dinamica")
async def agrupacion_dinamica(torneo_id: str, config: ConfiguracionAgrupacion, session: AsyncSession = Depends(get_session)):
    """
    Algoritmo de agrupación en cascada: Modalidad -> Género -> Nivel -> Rango Edad -> Rango Peso.
    """
    query_part = text("""
        SELECT id, modalidad, genero, nivel_experiencia, 
               EXTRACT(YEAR FROM age(CURRENT_DATE, fecha_nacimiento)) AS edad, 
               peso_verificado 
        FROM torneos_generales.participantes 
        WHERE torneo_id = :tid AND estado = 'Habilitado'
    """)
    res = await session.execute(query_part, {"tid": torneo_id})
    participantes = res.fetchall()

    if not participantes:
        return {"mensaje": "No hay participantes habilitados para agrupar."}

    # Agrupar por (modalidad, genero, nivel)
    categorias = {}
    for p in participantes:
        key = (p.modalidad, p.genero, p.nivel_experiencia)
        if key not in categorias:
            categorias[key] = []
        categorias[key].append(p)
    
    grupos_creados = 0
    
    # Procesar subgrupos por edad y peso
    for (mod, gen, niv), lista_cat in categorias.items():
        for r_edad in config.edades:
            edad_min, edad_max = r_edad
            lista_edad = [p for p in lista_cat if edad_min <= (p.edad or 0) <= edad_max]
            
            if not lista_edad: continue
            
            for r_peso in config.pesos:
                peso_min, peso_max = r_peso
                lista_peso = [p for p in lista_edad if p.peso_verificado is not None and peso_min <= float(p.peso_verificado) <= peso_max]
                
                if lista_peso:
                    # Crear Grupo en la BD
                    nombre_cat = f"{gen} - {mod} - {niv} ({edad_min}-{edad_max} años, {peso_min}-{peso_max} kg)"
                    q_grupo = text("""
                        INSERT INTO torneos_generales.grupos (torneo_id, nombre_categoria, rango_edad_min, rango_edad_max, rango_peso_min, rango_peso_max, genero, modalidad, nivel)
                        VALUES (:tid, :nombre, :emin, :emax, :pmin, :pmax, :gen, :mod, :niv)
                        RETURNING id
                    """)
                    res_grupo = await session.execute(q_grupo, {
                        "tid": torneo_id, "nombre": nombre_cat,
                        "emin": edad_min, "emax": edad_max,
                        "pmin": peso_min, "pmax": peso_max,
                        "gen": gen, "mod": mod, "niv": niv
                    })
                    grupo_id = res_grupo.scalar()
                    
                    # Insertar los participantes al grupo
                    q_vincular = text("INSERT INTO torneos_generales.grupo_participantes (grupo_id, participante_id) VALUES (:gid, :pid)")
                    for competidor in lista_peso:
                        await session.execute(q_vincular, {"gid": grupo_id, "pid": competidor.id})
                    
                    grupos_creados += 1
    
    await session.commit()
    return {"mensaje": f"Agrupación completada exitosamente. Se crearon {grupos_creados} grupos."}


@router.post("/encuentros/{encuentro_id}/puntuacion")
async def registrar_puntuacion(encuentro_id: str, payload: PuntuacionJuez, session: AsyncSession = Depends(get_session)):
    q = text("""
        INSERT INTO torneos_generales.puntuaciones_jueces (encuentro_id, participante_id, juez_id, valor_puntos, tipo_registro, nota)
        VALUES (:eid, :pid, :jid, :pts, :tipo, :nota)
        RETURNING id
    """)
    await session.execute(q, {
        "eid": encuentro_id,
        "pid": payload.participante_id,
        "jid": payload.juez_id,
        "pts": payload.valor_puntos,
        "tipo": payload.tipo_registro,
        "nota": payload.nota
    })
    await session.commit()
    
    # Aquí obtenemos el torneo_id asociado al encuentro para notificar vía WS
    q_torneo = text("""
        SELECT g.torneo_id FROM torneos_generales.encuentros e
        JOIN torneos_generales.grupos g ON e.grupo_id = g.id
        WHERE e.id = :eid
    """)
    t_res = await session.execute(q_torneo, {"eid": encuentro_id})
    torneo_id = t_res.scalar()

    if torneo_id:
        mensaje_ws = json.dumps({
            "encuentro_id": str(encuentro_id),
            "participante_id": str(payload.participante_id),
            "puntos_agregados": payload.valor_puntos,
            "tipo": payload.tipo_registro,
            "timestamp": datetime.now().isoformat()
        })
        await manager.broadcast(mensaje_ws, str(torneo_id))

    return {"mensaje": "Puntuación registrada."}


@router.websocket("/torneos/{torneo_id}/ws")
async def websocket_endpoint(websocket: WebSocket, torneo_id: str):
    await manager.connect(websocket, torneo_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Posible recepción de mensajes desde el cliente (heartbeats, etc.)
    except WebSocketDisconnect:
        manager.disconnect(websocket, torneo_id)
