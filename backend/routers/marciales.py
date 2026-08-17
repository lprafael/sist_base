from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import random
from typing import List, Dict
import json
from datetime import datetime

from database import get_session
from models_generales import (
    TorneoGeneralCreate, TorneoGeneralUpdate, TorneoGeneralResponse,
    ParticipanteInscripcion, CheckInParticipante, ConfiguracionAgrupacion,
    PuntuacionJuez, MultaParticipante, PenalidadCreate
)
from services.pkf_validation import validar_participante_pkf

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
    # Validaciones WKF
    if payload.modalidad == 'Para-Karate' and not payload.clase_deportiva:
        raise HTTPException(status_code=400, detail="Para-Karate requiere una clase deportiva (K10, K21, K22, K30).")
    if payload.clase_deportiva and payload.clase_deportiva not in ['K10', 'K21', 'K22', 'K30']:
        raise HTTPException(status_code=400, detail="Clase deportiva inválida. Use K10, K21, K22 o K30.")

    query = text("""
        INSERT INTO torneos_generales.participantes 
        (torneo_id, nombre, apellido, documento, fecha_nacimiento, genero, email, telefono,
         modalidad, nivel_experiencia, peso_declarado, estatura_declarada,
         categoria_edad, clase_deportiva, extra_score, estado)
        VALUES (:tid, :nom, :ape, :doc, :fnac, :gen, :email, :tel, :mod, :niv, :peso, :est,
                :cat_edad, :clase, :extra, 'Confirmado')
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
        "est": payload.estatura_declarada,
        "cat_edad": payload.categoria_edad,
        "clase": payload.clase_deportiva,
        "extra": payload.extra_score or 0.0
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
    # 1. Obtener datos del participante y del torneo
    query_part = text("""
        SELECT p.fecha_nacimiento, p.genero, p.estado, t.fecha_inicio, t.nombre as torneo_nombre
        FROM torneos_generales.participantes p
        JOIN torneos_generales.torneos t ON p.torneo_id = t.id
        WHERE p.id = :id
    """)
    res_part = await session.execute(query_part, {"id": participante_id})
    participante = res_part.fetchone()
    
    if not participante:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    
    if participante.estado != 'Confirmado':
        raise HTTPException(status_code=400, detail="El participante no está en estado 'Confirmado'")

    # 2. Validación PKF Dinámica (Si el torneo es de Karate PKF o aplica)
    # Por simplicidad, si el torneo contiene 'PKF' en el nombre o modalidad, lo validamos
    if 'pkf' in participante.torneo_nombre.lower():
        validacion = validar_participante_pkf(
            fecha_nacimiento=participante.fecha_nacimiento,
            genero=participante.genero,
            fecha_inicio_torneo=participante.fecha_inicio
        )
        if not validacion.is_valid:
            raise HTTPException(status_code=400, detail=validacion.mensaje_error)

    # 3. Proceder con el Check-In
    query_update = text("""
        UPDATE torneos_generales.participantes 
        SET peso_verificado = :peso, estatura_verificada = :estatura, pago_confirmado = :pago, estado = 'Habilitado'
        WHERE id = :id
        RETURNING id
    """)
    res_update = await session.execute(query_update, {
        "id": participante_id,
        "peso": payload.peso_verificado,
        "estatura": payload.estatura_verificada,
        "pago": payload.pago_confirmado
    })
    
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
                        INSERT INTO torneos_generales.divisiones (torneo_id, nombre, estado)
                        VALUES (:tid, :nombre, 'activa')
                        RETURNING id
                    """)
                    res_grupo = await session.execute(q_grupo, {
                        "tid": torneo_id, "nombre": nombre_cat
                    })
                    grupo_id = res_grupo.scalar()
                    
                    # Insertar los participantes a la división
                    q_vincular = text("INSERT INTO torneos_generales.divisiones_participantes (division_id, participante_id) VALUES (:gid, :pid)")
                    for competidor in lista_peso:
                        await session.execute(q_vincular, {"gid": grupo_id, "pid": competidor.id})
                    
                    grupos_creados += 1
    
    await session.commit()
    return {"mensaje": f"Agrupación completada exitosamente. Se crearon {grupos_creados} divisiones."}


# ==========================================
# AGRUPACIÓN AUTOMÁTICA WKF
# ==========================================

# Tablas WKF de límites de peso por categoría y género
_WKF_KUMITE_PESOS = {
    "Senior":  {"Masculino": [60, 67, 75, 84], "Femenino": [50, 55, 61, 68]},
    "Sub-21":  {"Masculino": [60, 67, 75, 84], "Femenino": [50, 55, 61, 68]},
    "Junior":  {"Masculino": [55, 61, 68, 76], "Femenino": [48, 53, 59, 66]},
    "Cadete":  {"Masculino": [52, 57, 63, 70], "Femenino": [47, 54, 61]},
    "Sub-14":  {"Masculino": [40, 45, 50, 55], "Femenino": [42, 47, 52]},
}

_WKF_EDAD_A_CATEGORIA = [
    (12, 13, "Sub-14"),
    (14, 15, "Cadete"),
    (16, 17, "Junior"),
    (18, 20, "Sub-21"),   # Sénior 18+ puede declarar Sub-21 voluntariamente
    (18, 99, "Senior"),
]


def _calcular_categoria_wkf(edad: int, modalidad: str, genero: str, categoria_edad_declarada: str | None, peso: float | None) -> dict | None:
    """Determina la categoría WKF y la división de peso para un atleta."""
    modalidad_norm = (modalidad or '').strip()

    # -- Para-Karate: siempre Sénior Kata, la clase deportiva ya está en el participante
    if modalidad_norm == 'Para-Karate':
        if edad < 16:
            return None  # No elegible
        return {"categoria": "Senior", "division_peso": None}

    # -- Kata: solo edad + género, sin peso
    if modalidad_norm == 'Kata':
        if edad < 12:
            return None
        if edad <= 13: return {"categoria": "Sub-14", "division_peso": None}
        if edad <= 15: return {"categoria": "Cadete", "division_peso": None}
        if edad <= 17: return {"categoria": "Junior", "division_peso": None}
        # 18-20: respetar lo declarado (Sub-21 o Senior)
        if 18 <= edad <= 20:
            cat = categoria_edad_declarada if categoria_edad_declarada in ("Senior", "Sub-21") else "Sub-21"
            return {"categoria": cat, "division_peso": None}
        return {"categoria": "Senior", "division_peso": None}

    # -- Kumite: edad + género + peso
    if modalidad_norm == 'Kumite':
        if edad < 12:
            return None
        # Determinar categoría base por edad
        if edad <= 13:   cat = "Sub-14"
        elif edad <= 15: cat = "Cadete"
        elif edad <= 17: cat = "Junior"
        elif 18 <= edad <= 20:
            cat = categoria_edad_declarada if categoria_edad_declarada in ("Senior", "Sub-21") else "Sub-21"
        else:            cat = "Senior"

        # División de peso
        limites = _WKF_KUMITE_PESOS.get(cat, {}).get(genero, [])
        if not limites or peso is None:
            return {"categoria": cat, "division_peso": "Peso No Verificado"}

        for limite in limites:
            if peso <= limite:
                return {"categoria": cat, "division_peso": f"-{limite} kg"}
        ultimo = limites[-1]
        return {"categoria": cat, "division_peso": f"+{ultimo} kg"}

    return None


@router.post("/torneos/{torneo_id}/agrupacion-wkf")
async def agrupacion_wkf(torneo_id: str, session: AsyncSession = Depends(get_session)):
    """
    Agrupa automáticamente los inscriptos de un torneo en las categorías
    oficiales de la World Karate Federation (WKF):
    - Kumite: por modalidad, género, categoría de edad y división de peso.
    - Kata: por modalidad, género y categoría de edad (sin peso).
    - Para-Karate: por clase deportiva y género (siempre Sénior Kata).
    """
    # 1. Obtener la fecha de inicio del torneo para calcular edad oficial
    q_torneo = text("SELECT fecha_inicio FROM torneos_generales.torneos WHERE id = :tid")
    res_torneo = await session.execute(q_torneo, {"tid": torneo_id})
    torneo = res_torneo.fetchone()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    # 2. Obtener participantes habilitados
    q_part = text("""
        SELECT id, nombre, apellido, genero, modalidad,
               EXTRACT(YEAR FROM age(:fecha_torneo, fecha_nacimiento))::int AS edad,
               peso_verificado,
               categoria_edad,
               clase_deportiva,
               extra_score
        FROM torneos_generales.participantes
        WHERE torneo_id = :tid AND estado = 'Habilitado'
    """)
    res_part = await session.execute(q_part, {"tid": torneo_id, "fecha_torneo": torneo.fecha_inicio})
    participantes = res_part.fetchall()

    if not participantes:
        return {"mensaje": "No hay participantes habilitados para agrupar.", "divisiones_creadas": 0, "sin_categoria": []}

    # 3. Clasificar cada participante
    grupos: dict[str, list] = {}
    sin_categoria = []

    for p in participantes:
        resultado = _calcular_categoria_wkf(
            edad=p.edad,
            modalidad=p.modalidad,
            genero=p.genero,
            categoria_edad_declarada=p.categoria_edad,
            peso=float(p.peso_verificado) if p.peso_verificado is not None else None
        )

        if resultado is None:
            sin_categoria.append({"id": str(p.id), "nombre": f"{p.nombre} {p.apellido}", "razon": "Edad fuera de rango WKF"})
            continue

        modalidad_norm = (p.modalidad or '').strip()
        cat = resultado["categoria"]
        div_peso = resultado["division_peso"]

        if modalidad_norm == 'Para-Karate':
            nombre_grupo = f"Para-Karate | {p.genero} | {p.clase_deportiva or 'Sin clase'}"
        elif modalidad_norm == 'Kata':
            nombre_grupo = f"Kata | {p.genero} | {cat}"
        else:  # Kumite
            nombre_grupo = f"Kumite | {p.genero} | {cat} | {div_peso}"

        if nombre_grupo not in grupos:
            grupos[nombre_grupo] = []
        grupos[nombre_grupo].append(p)

    # 4. Crear divisiones en la BD
    divisiones_creadas = 0
    for nombre_grupo, lista in grupos.items():
        q_div = text("""
            INSERT INTO torneos_generales.divisiones (torneo_id, nombre, estado)
            VALUES (:tid, :nombre, 'activa')
            RETURNING id
        """)
        res_div = await session.execute(q_div, {"tid": torneo_id, "nombre": nombre_grupo})
        division_id = res_div.scalar()

        q_vincular = text("""
            INSERT INTO torneos_generales.divisiones_participantes (division_id, participante_id)
            VALUES (:did, :pid)
            ON CONFLICT DO NOTHING
        """)
        for comp in lista:
            await session.execute(q_vincular, {"did": division_id, "pid": comp.id})

        divisiones_creadas += 1

    await session.commit()

    resumen = [
        {"categoria": nombre, "atletas": len(lista)}
        for nombre, lista in grupos.items()
    ]
    return {
        "mensaje": f"Agrupación WKF completada. Se crearon {divisiones_creadas} categorías.",
        "divisiones_creadas": divisiones_creadas,
        "resumen": resumen,
        "sin_categoria": sin_categoria
    }


@router.get("/torneos/{torneo_id}/grupos")
async def listar_divisiones_compat(torneo_id: str, session: AsyncSession = Depends(get_session)):
    """Alias de compatibilidad: apunta a divisiones."""
    query = text("""
        SELECT id, nombre AS nombre_categoria, estado AS formato_competicion 
        FROM torneos_generales.divisiones 
        WHERE torneo_id = :tid
    """)
    res = await session.execute(query, {"tid": torneo_id})
    return [dict(r._mapping) for r in res.fetchall()]

@router.post("/grupos/{grupo_id}/generar-llaves")
async def generar_llaves(grupo_id: str, session: AsyncSession = Depends(get_session)):
    # Obtener participantes de la división
    q_part = text("""
        SELECT p.id, p.nombre, p.apellido 
        FROM torneos_generales.participantes p
        JOIN torneos_generales.divisiones_participantes dp ON dp.participante_id = p.id
        WHERE dp.division_id = :gid
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
        INSERT INTO torneos_generales.encuentros (division_id, participante1_id, participante2_id, ronda)
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
        WHERE e.division_id = :gid
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
    
    # Obtener el torneo_id asociado al encuentro para notificar vía WS
    q_torneo = text("""
        SELECT d.torneo_id FROM torneos_generales.encuentros e
        JOIN torneos_generales.divisiones d ON e.division_id = d.id
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


# ==========================================
# ENDPOINTS MULTAS Y PAGOS
# ==========================================

@router.get("/torneos/{torneo_id}/penalidades")
async def listar_penalidades(torneo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, nombre, descripcion, monto_gs 
        FROM torneos_generales.penalidades_catalogo 
        WHERE torneo_id = :tid
        ORDER BY creado_en ASC
    """)
    res = await session.execute(query, {"tid": torneo_id})
    return [dict(r._mapping) for r in res.fetchall()]

@router.post("/torneos/{torneo_id}/penalidades")
async def crear_penalidad(torneo_id: str, payload: PenalidadCreate, session: AsyncSession = Depends(get_session)):
    query = text("""
        INSERT INTO torneos_generales.penalidades_catalogo (torneo_id, nombre, descripcion, monto_gs)
        VALUES (:tid, :nom, :desc, :monto)
        RETURNING id
    """)
    res = await session.execute(query, {
        "tid": torneo_id,
        "nom": payload.nombre,
        "desc": payload.descripcion,
        "monto": payload.monto_gs
    })
    await session.commit()
    return {"id": res.scalar(), "mensaje": "Penalidad creada exitosamente."}

@router.get("/participantes/{participante_id}/multas")
async def listar_multas_participante(participante_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT pm.id as multa_id, pm.estado_pago, pc.nombre, pc.descripcion, pc.monto_gs, pm.creado_en
        FROM torneos_generales.participantes_multas pm
        JOIN torneos_generales.penalidades_catalogo pc ON pc.id = pm.penalidad_id
        WHERE pm.participante_id = :pid
        ORDER BY pm.creado_en DESC
    """)
    res = await session.execute(query, {"pid": participante_id})
    return [dict(r._mapping) for r in res.fetchall()]

@router.post("/participantes/{participante_id}/multas")
async def asignar_multa(participante_id: str, payload: MultaParticipante, session: AsyncSession = Depends(get_session)):
    if str(payload.participante_id) != participante_id:
        raise HTTPException(status_code=400, detail="ID de participante no coincide.")
    
    query = text("""
        INSERT INTO torneos_generales.participantes_multas (participante_id, penalidad_id, estado_pago)
        VALUES (:pid, :penid, 'Pendiente')
        RETURNING id
    """)
    res = await session.execute(query, {
        "pid": participante_id,
        "penid": str(payload.penalidad_id)
    })
    await session.commit()
    return {"id": res.scalar(), "mensaje": "Multa asignada exitosamente."}

@router.put("/multas/{multa_id}/pagar")
async def pagar_multa(multa_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        UPDATE torneos_generales.participantes_multas
        SET estado_pago = 'Pagado'
        WHERE id = :mid
        RETURNING id
    """)
    res = await session.execute(query, {"mid": multa_id})
    if not res.scalar():
        raise HTTPException(status_code=404, detail="Multa no encontrada.")
    
    await session.commit()
    return {"mensaje": "Multa pagada exitosamente."}


@router.websocket("/torneos/{torneo_id}/ws")
async def websocket_endpoint(websocket: WebSocket, torneo_id: str):
    await manager.connect(websocket, torneo_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Posible recepción de mensajes desde el cliente (heartbeats, etc.)
    except WebSocketDisconnect:
        manager.disconnect(websocket, torneo_id)
