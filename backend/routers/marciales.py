from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import random
from typing import List, Dict
import json
from datetime import datetime

from database import get_session
from models_generales import CheckInParticipante, PuntuacionJuez, ConfiguracionAgrupacion, TorneoGeneralCreate, TorneoGeneralUpdate, TorneoGeneralResponse, ParticipanteInscripcion

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
# ENDPOINTS CRUD TORNEOS
# ==========================================

@router.get("/torneos")
async def listar_torneos(session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, nombre, lugar, fecha_inicio, fecha_fin, modalidades_permitidas, estado 
        FROM torneos_generales.torneos 
        ORDER BY fecha_inicio DESC
    """)
    res = await session.execute(query)
    return [dict(r._mapping) for r in res.fetchall()]

@router.post("/torneos")
async def crear_torneo(payload: TorneoGeneralCreate, session: AsyncSession = Depends(get_session)):
    query = text("""
        INSERT INTO torneos_generales.torneos 
        (nombre, lugar, fecha_inicio, fecha_fin, modalidades_permitidas, estado)
        VALUES (:nombre, :lugar, :ini, :fin, :mods, 'Borrador')
        RETURNING id
    """)
    res = await session.execute(query, {
        "nombre": payload.nombre,
        "lugar": payload.lugar,
        "ini": payload.fecha_inicio,
        "fin": payload.fecha_fin,
        "mods": payload.modalidades_permitidas
    })
    new_id = res.scalar()
    await session.commit()
    return {"id": new_id, "mensaje": "Torneo creado con éxito"}

@router.put("/torneos/{torneo_id}")
async def actualizar_torneo(torneo_id: str, payload: TorneoGeneralUpdate, session: AsyncSession = Depends(get_session)):
    updates = []
    params = {"tid": torneo_id}
    
    if payload.nombre is not None:
        updates.append("nombre = :nombre")
        params["nombre"] = payload.nombre
    if payload.lugar is not None:
        updates.append("lugar = :lugar")
        params["lugar"] = payload.lugar
    if payload.fecha_inicio is not None:
        updates.append("fecha_inicio = :ini")
        params["ini"] = payload.fecha_inicio
    if payload.fecha_fin is not None:
        updates.append("fecha_fin = :fin")
        params["fin"] = payload.fecha_fin
    if payload.modalidades_permitidas is not None:
        updates.append("modalidades_permitidas = :mods")
        params["mods"] = payload.modalidades_permitidas
    if payload.estado is not None:
        updates.append("estado = :estado")
        params["estado"] = payload.estado
        
    if not updates:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
        
    query = text(f"""
        UPDATE torneos_generales.torneos 
        SET {', '.join(updates)}
        WHERE id = :tid
    """)
    res = await session.execute(query, params)
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
        
    await session.commit()
    return {"mensaje": "Torneo actualizado"}

@router.delete("/torneos/{torneo_id}")
async def eliminar_torneo(torneo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("DELETE FROM torneos_generales.torneos WHERE id = :tid")
    res = await session.execute(query, {"tid": torneo_id})
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    await session.commit()
    return {"mensaje": "Torneo eliminado"}

# ==========================================
# ENDPOINTS OPERATIVOS
# ==========================================

@router.post("/torneos/{torneo_id}/inscripcion")
async def inscripcion_publica(torneo_id: str, payload: ParticipanteInscripcion, session: AsyncSession = Depends(get_session)):
    query = text("""
        INSERT INTO torneos_generales.participantes 
        (torneo_id, nombre, apellido, documento, fecha_nacimiento, genero, email, telefono, modalidad, nivel_experiencia, peso_declarado, estatura_declarada, estado)
        VALUES (:tid, :nom, :ape, :doc, :fnac, :gen, :email, :tel, :mod, :niv, :peso, :est, 'Confirmado')
        RETURNING id
    """)
    res = await session.execute(query, {
        "tid": torneo_id,
        "nom": payload.nombre,
        "ape": payload.apellido,
        "doc": payload.documento,
        "fnac": payload.fecha_nacimiento,
        "gen": payload.genero,
        "email": payload.email,
        "tel": payload.telefono,
        "mod": payload.modalidad,
        "niv": payload.nivel_experiencia,
        "peso": payload.peso_declarado,
        "est": payload.estatura_declarada
    })
    new_id = res.scalar()
    await session.commit()
    return {"id": new_id, "mensaje": "Inscripción confirmada con éxito. Listo para el check-in."}

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


@router.get("/torneos/{torneo_id}/grupos")
async def listar_grupos(torneo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, nombre_categoria, formato_competicion 
        FROM torneos_generales.grupos 
        WHERE torneo_id = :tid
    """)
    res = await session.execute(query, {"tid": torneo_id})
    return [dict(r._mapping) for r in res.fetchall()]

@router.post("/grupos/{grupo_id}/generar-llaves")
async def generar_llaves(grupo_id: str, session: AsyncSession = Depends(get_session)):
    # Obtener participantes del grupo
    q_part = text("""
        SELECT p.id, p.nombre, p.apellido 
        FROM torneos_generales.participantes p
        JOIN torneos_generales.grupo_participantes gp ON gp.participante_id = p.id
        WHERE gp.grupo_id = :gid
    """)
    res = await session.execute(q_part, {"gid": grupo_id})
    participantes = res.fetchall()

    if len(participantes) < 2:
        raise HTTPException(status_code=400, detail="No hay suficientes participantes para generar llaves")

    # Aleatorizar
    participantes = list(participantes)
    random.shuffle(participantes)

    # Determinar si hay bypasses (bye) si no es potencia de 2, pero para simplificar, 
    # si son 3, 1 pasa directo.
    import math
    num_jugadores = len(participantes)
    num_rondas = math.ceil(math.log2(num_jugadores))
    potencia = 2 ** num_rondas
    byes = potencia - num_jugadores
    
    # En esta versión simplificada creamos solo la primera ronda de Cuartos/Semis
    # Idealmente creariamos todos los brackets vacíos (null) y llenaríamos los de primera ronda.
    # Crearemos la ronda 1
    
    encuentros_creados = 0
    idx = 0
    # Jugadores que juegan ronda 1 (los que no tienen bye)
    jugadores_ronda_1 = num_jugadores - byes
    
    q_insert = text("""
        INSERT INTO torneos_generales.encuentros (grupo_id, participante1_id, participante2_id, ronda)
        VALUES (:gid, :p1, :p2, :ronda)
        RETURNING id
    """)

    while idx < jugadores_ronda_1:
        p1 = participantes[idx].id
        p2 = participantes[idx+1].id if idx+1 < jugadores_ronda_1 else None
        
        await session.execute(q_insert, {
            "gid": grupo_id,
            "p1": p1,
            "p2": p2,
            "ronda": "Ronda 1"
        })
        encuentros_creados += 1
        idx += 2

    # Los byes pasan a la Ronda 2 directamente, pero para la vista gráfica los mandamos con un NULL en p2 en ronda 1
    # para que se vea que avanzan directo.
    while idx < num_jugadores:
        p1 = participantes[idx].id
        await session.execute(q_insert, {
            "gid": grupo_id,
            "p1": p1,
            "p2": None, # Pasa directo
            "ronda": "Ronda 1"
        })
        encuentros_creados += 1
        idx += 1

    await session.commit()
    return {"mensaje": f"Se generaron {encuentros_creados} encuentros para la primera ronda."}

@router.get("/grupos/{grupo_id}/encuentros")
async def listar_encuentros(grupo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT e.id, e.ronda, e.estado, e.ganador_id,
               p1.id as p1_id, p1.nombre as p1_nombre, p1.apellido as p1_apellido,
               p2.id as p2_id, p2.nombre as p2_nombre, p2.apellido as p2_apellido
        FROM torneos_generales.encuentros e
        LEFT JOIN torneos_generales.participantes p1 ON e.participante1_id = p1.id
        LEFT JOIN torneos_generales.participantes p2 ON e.participante2_id = p2.id
        WHERE e.grupo_id = :gid
        ORDER BY e.ronda, e.id
    """)
    res = await session.execute(query, {"gid": grupo_id})
    return [dict(r._mapping) for r in res.fetchall()]



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
            "nota": payload.nota,
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
