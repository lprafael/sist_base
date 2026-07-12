from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from database import get_session
from security import get_current_user
import uuid
import face_recognition
import numpy as np
import base64
import io
from PIL import Image

router = APIRouter(tags=["Futbol Core"])

# ==========================================
# 1. Torneos y Categorías
# ==========================================

def map_formato(nombre: str) -> str:
    n = nombre.lower()
    if 'liga' in n or 'todos contra' in n: return 'liga'
    elif 'grupos' in n or 'mundial' in n: return 'grupos'
    elif 'doble' in n: return 'eliminacion_doble'
    elif 'eliminatoria' in n or 'directa' in n or 'simple' in n: return 'eliminacion_simple'
    elif 'suizo' in n: return 'suizo'
    return 'liga'

class DivisionCreate(BaseModel):
    nombre: str

class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    divisiones: List[DivisionCreate] = []

class TorneoFutbolCreate(BaseModel):
    nombre: str
    tipo_campeonato: str # "unico" o "categorias"
    deporte: str # Ej. "Fútbol 5", "Fútbol 7"
    formato: str # Ej. "Eliminación Directa", "Liga"
    categorias: List[CategoriaCreate] = [] # Vacio si es unico

@router.post("/futbol/torneos")
async def crear_torneo_futbol(data: TorneoFutbolCreate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    torneo_id = str(uuid.uuid4())
    
    # Obtener organizador_id real
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    if not row_org:
        raise HTTPException(status_code=400, detail="El usuario no es un organizador válido.")
    organizador_id = row_org[0]
    
    # Insert Torneo
    await session.execute(text("""
        INSERT INTO torneos_futbol.torneos 
            (id, nombre, tipo_campeonato, organizador_id, deporte, formato, estado, creado_en, fecha_inicio)
        VALUES 
            (:id, :nombre, :tipo, :oid, :deporte, :formato, 'abierto', NOW(), NOW())
    """), {
        "id": torneo_id, "nombre": data.nombre, 
        "tipo": data.tipo_campeonato, "oid": organizador_id,
        "deporte": data.deporte, "formato": map_formato(data.formato)
    })
    
    if data.tipo_campeonato == "categorias" and data.categorias:
        for cat in data.categorias:
            cat_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO torneos_futbol.categorias (id, torneo_id, nombre, descripcion)
                VALUES (:id, :tid, :nombre, :desc)
            """), {"id": cat_id, "tid": torneo_id, "nombre": cat.nombre, "desc": cat.descripcion})
            
            for div in cat.divisiones:
                div_id = str(uuid.uuid4())
                await session.execute(text("""
                    INSERT INTO torneos_futbol.divisiones (id, categoria_id, nombre)
                    VALUES (:id, :cid, :nombre)
                """), {"id": div_id, "cid": cat_id, "nombre": div.nombre})

    await session.commit()
    return {"message": "Torneo de Fútbol creado exitosamente", "id": torneo_id}

@router.get("/futbol/torneos")
async def get_torneos_futbol(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    if not row_org:
        return []
    
    organizador_id = row_org[0]
    
    query = text("""
        SELECT id, nombre, deporte, formato, tipo_campeonato, estado, creado_en
        FROM torneos_futbol.torneos
        WHERE organizador_id = :oid
        ORDER BY creado_en DESC
    """)
    result = await session.execute(query, {"oid": organizador_id})
    
    # Format date slightly
    torneos = []
    for r in result.fetchall():
        d = dict(r._mapping)
        if d.get("creado_en"):
            d["creado_en"] = d["creado_en"].isoformat() if hasattr(d["creado_en"], 'isoformat') else str(d["creado_en"])
        torneos.append(d)
        
    return torneos

class TorneoFutbolUpdate(BaseModel):
    nombre: Optional[str] = None
    subtitulo: Optional[str] = None
    descripcion: Optional[str] = None
    imagen_portada: Optional[str] = None
    tipo_ubicacion: Optional[str] = None
    privacidad: Optional[str] = None
    estado: Optional[str] = None

@router.get("/futbol/torneos/{torneo_id}")
async def get_torneo_futbol(torneo_id: str, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, nombre, deporte, formato, tipo_campeonato, estado, creado_en,
               subtitulo, descripcion, imagen_portada, tipo_ubicacion, privacidad
        FROM torneos_futbol.torneos
        WHERE id = CAST(:tid AS UUID)
    """)
    res = await session.execute(query, {"tid": torneo_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
        
    d = dict(row._mapping)
    if d.get("creado_en"):
        d["creado_en"] = d["creado_en"].isoformat() if hasattr(d["creado_en"], 'isoformat') else str(d["creado_en"])
    return d

@router.put("/futbol/torneos/{torneo_id}")
async def update_torneo_futbol(torneo_id: str, data: TorneoFutbolUpdate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Very basic ownership check could go here
    update_fields = []
    params = {"tid": torneo_id}
    
    if data.nombre is not None:
        update_fields.append("nombre = :nombre")
        params["nombre"] = data.nombre
    if data.subtitulo is not None:
        update_fields.append("subtitulo = :subtitulo")
        params["subtitulo"] = data.subtitulo
    if data.descripcion is not None:
        update_fields.append("descripcion = :descripcion")
        params["descripcion"] = data.descripcion
    if data.imagen_portada is not None:
        update_fields.append("imagen_portada = :imagen")
        params["imagen"] = data.imagen_portada
    if data.tipo_ubicacion is not None:
        update_fields.append("tipo_ubicacion = :ubicacion")
        params["ubicacion"] = data.tipo_ubicacion
    if data.privacidad is not None:
        update_fields.append("privacidad = :privacidad")
        params["privacidad"] = data.privacidad
    if data.estado is not None:
        update_fields.append("estado = :estado")
        params["estado"] = data.estado

    if not update_fields:
        return {"message": "Sin cambios"}

    set_clause = ", ".join(update_fields)
    await session.execute(text(f"UPDATE torneos_futbol.torneos SET {set_clause} WHERE id = CAST(:tid AS UUID)"), params)
    await session.commit()
    return {"message": "Torneo actualizado correctamente"}

@router.delete("/futbol/torneos/{torneo_id}")
async def delete_torneo_futbol(torneo_id: str, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    if not row_org:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    organizador_id = row_org[0]

    # Verify ownership
    check_query = text("SELECT id FROM torneos_futbol.torneos WHERE id = :tid AND organizador_id = :oid")
    res = await session.execute(check_query, {"tid": torneo_id, "oid": organizador_id})
    if not res.fetchone():
        raise HTTPException(status_code=404, detail="Torneo no encontrado o no tienes permisos")

    # DELETE
    await session.execute(text("DELETE FROM torneos_futbol.torneos WHERE id = :tid"), {"tid": torneo_id})
    await session.commit()
    return {"message": "Campeonato eliminado correctamente"}

# ==========================================
# 2. Equipos (con Logo) y Equipo Técnico
# ==========================================

class EquipoTecnico(BaseModel):
    nombre: str
    dni: str
    rol: str = 'Entrenador'
    foto_url: Optional[str] = None

class EquipoFutbolCreate(BaseModel):
    nombre: str
    capitan_nombre: Optional[str] = ""
    capitan_telefono: Optional[str] = ""
    logo_url: Optional[str] = None
    division_id: Optional[str] = None # Solo si el campeonato es por categorias
    torneo_id: str
    equipo_tecnico: List[EquipoTecnico] = []

@router.post("/futbol/equipos")
async def registrar_equipo(data: EquipoFutbolCreate, session: AsyncSession = Depends(get_session)):
    equipo_id = str(uuid.uuid4())
    
    # 1. Registrar Equipo
    await session.execute(text("""
        INSERT INTO torneos_futbol.equipos 
            (id, torneo_id, division_id, nombre, capitan_nombre, capitan_telefono, logo_url, estado_inscripcion)
        VALUES 
            (:id, :tid, :did, :nombre, :cn, :ct, :logo, 'pendiente')
    """), {
        "id": equipo_id, "tid": data.torneo_id, "did": data.division_id,
        "nombre": data.nombre, "cn": data.capitan_nombre, 
        "ct": data.capitan_telefono, "logo": data.logo_url
    })
    
    # 2. Registrar Equipo Técnico
    for et in data.equipo_tecnico:
        await session.execute(text("""
            INSERT INTO torneos_futbol.equipo_tecnico 
                (equipo_id, nombre, dni, rol, foto_url)
            VALUES 
                (:eid, :nombre, :dni, :rol, :foto)
        """), {
            "eid": equipo_id, "nombre": et.nombre, 
            "dni": et.dni, "rol": et.rol, "foto": et.foto_url
        })
        
    await session.commit()
    return {"message": "Equipo registrado con éxito", "id": equipo_id}


@router.get("/futbol/torneos/{torneo_id}/equipos")
async def get_equipos_torneo(torneo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, nombre, logo_url
        FROM torneos_futbol.equipos
        WHERE torneo_id = :tid
        ORDER BY creado_en DESC
    """)
    res = await session.execute(query, {"tid": torneo_id})
    equipos = []
    for r in res.fetchall():
        eq = dict(r._mapping)
        # Fetch jugadores
        q_j = text("SELECT nombre, nombre_abreviado, dni, fecha_nacimiento, numero_camiseta, posicion, telefono, foto_url FROM torneos_futbol.tournament_players WHERE torneo_equipo_id = :eid")
        res_j = await session.execute(q_j, {"eid": eq["id"]})
        eq["jugadores"] = []
        for j in res_j.fetchall():
            jd = dict(j._mapping)
            if jd.get("fecha_nacimiento"):
                jd["fecha_nacimiento"] = str(jd["fecha_nacimiento"])
            eq["jugadores"].append(jd)
        
        # Fetch tecnicos
        q_t = text("SELECT nombre, rol FROM torneos_futbol.equipo_tecnico WHERE equipo_id = :eid")
        res_t = await session.execute(q_t, {"eid": eq["id"]})
        eq["tecnicos"] = [dict(t._mapping) for t in res_t.fetchall()]
        
        # Entrenador string
        eq["entrenador"] = next((t["nombre"] for t in eq["tecnicos"] if t["rol"] == 'Entrenador'), "")
        
        equipos.append(eq)
    return equipos


class EquipoUpdate(BaseModel):
    nombre: str
    logo_url: Optional[str] = None

@router.put("/futbol/equipos/{equipo_id}")
async def update_equipo(equipo_id: str, data: EquipoUpdate, session: AsyncSession = Depends(get_session)):
    await session.execute(text("""
        UPDATE torneos_futbol.equipos
        SET nombre = :n, logo_url = :logo
        WHERE id = :eid
    """), {"n": data.nombre, "logo": data.logo_url, "eid": equipo_id})
    await session.commit()
    return {"message": "Equipo actualizado"}


@router.delete("/futbol/equipos/{equipo_id}")
async def delete_equipo(equipo_id: str, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    res = await session.execute(text("""
        SELECT e.id FROM torneos_futbol.equipos e
        JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
        WHERE e.id = :eid AND t.organizador_id = :oid
    """), {"eid": equipo_id, "oid": current_user["id"]})
    if not res.fetchone():
        raise HTTPException(status_code=403, detail="No autorizado o equipo no existe")
        
    await session.execute(text("DELETE FROM torneos_futbol.equipos WHERE id = :eid"), {"eid": equipo_id})
    await session.commit()
    return {"message": "Equipo eliminado con éxito"}


class PlantelSync(BaseModel):
    jugadores: List[dict] # {nombre: str}
    tecnicos: List[dict] # {nombre: str}
    entrenador: Optional[str] = ""

@router.post("/futbol/equipos/{equipo_id}/plantel")
async def sync_plantel(equipo_id: str, data: PlantelSync, session: AsyncSession = Depends(get_session)):
    # Delete old
    await session.execute(text("DELETE FROM torneos_futbol.tournament_players WHERE torneo_equipo_id = :eid"), {"eid": equipo_id})
    await session.execute(text("DELETE FROM torneos_futbol.equipo_tecnico WHERE equipo_id = :eid"), {"eid": equipo_id})
    
    # Insert new jugadores
    import uuid
    for j in data.jugadores:
        if not j.get("nombre"): continue
        dni = j.get("dni") or f"sd_{uuid.uuid4().hex[:8]}"
        await session.execute(text("""
            INSERT INTO torneos_futbol.tournament_players (
                torneo_equipo_id, nombre, nombre_abreviado, dni, fecha_nacimiento, 
                numero_camiseta, posicion, telefono, foto_url, estado
            )
            VALUES (
                :eid, :n, :na, :dni, :fn, :nc, :pos, :tel, :foto, 'habilitado'
            )
        """), {
            "eid": equipo_id, 
            "n": j.get("nombre", ""), 
            "na": j.get("nombre_abreviado") or None,
            "dni": dni,
            "fn": j.get("fecha_nacimiento") or None,
            "nc": int(j.get("numero_camiseta")) if j.get("numero_camiseta") else None,
            "pos": j.get("posicion") or None,
            "tel": j.get("telefono") or None,
            "foto": j.get("foto_url") or None
        })
        
    # Insert tecnicos + entrenador
    tecnicos = [t for t in data.tecnicos if t.get("nombre")]
    if data.entrenador and not any(t.get("nombre") == data.entrenador for t in tecnicos):
        tecnicos.append({"nombre": data.entrenador, "rol": "Entrenador"})
        
    for t in tecnicos:
        rol = t.get("rol", "Entrenador") if t.get("nombre") == data.entrenador else "Asistente"
        await session.execute(text("""
            INSERT INTO torneos_futbol.equipo_tecnico (equipo_id, nombre, dni, rol)
            VALUES (:eid, :n, '0', :r)
        """), {"eid": equipo_id, "n": t.get("nombre", ""), "r": rol})
        
    await session.commit()
    return {"message": "Plantel sincronizado"}

# ==========================================
# 3. Jugadores (con Biometría)
# ==========================================

class JugadorFutbol(BaseModel):
    nombre: str
    dni: str
    fecha_nacimiento: str # YYYY-MM-DD
    numero_camiseta: int
    posicion: str
    foto_url: Optional[str] = None
    biometria_hash: Optional[str] = None

@router.post("/futbol/equipos/{equipo_id}/jugadores")
async def registrar_jugadores(equipo_id: str, jugadores: List[JugadorFutbol], session: AsyncSession = Depends(get_session)):
    for j in jugadores:
        aprobado = True if j.biometria_hash else False
        await session.execute(text("""
            INSERT INTO torneos_futbol.tournament_players
                (torneo_equipo_id, nombre, dni, fecha_nacimiento, numero_camiseta, posicion, foto_url, biometria_hash, biometria_aprobada, estado, activo)
            VALUES
                (:eid, :nombre, :dni, :fecha, :num, :pos, :foto, :hash, :aprob, 'habilitado', true)
        """), {
            "eid": equipo_id, "nombre": j.nombre, "dni": j.dni,
            "fecha": j.fecha_nacimiento, "num": j.numero_camiseta,
            "pos": j.posicion, "foto": j.foto_url,
            "hash": j.biometria_hash, "aprob": aprobado
        })
        
    await session.commit()
    return {"message": f"{len(jugadores)} jugadores registrados."}

@router.get("/futbol/jugadores")
async def get_all_jugadores(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    if not row_org:
        return []
    organizador_id = row_org[0]

    q = text("""
        SELECT j.id, j.nombre, j.nombre_abreviado, j.dni, j.fecha_nacimiento, j.numero_camiseta, j.posicion, j.telefono, j.foto_url, j.biometria_aprobada, e.nombre as equipo_nombre
        FROM torneos_futbol.tournament_players j
        JOIN torneos_futbol.equipos e ON j.torneo_equipo_id = e.id
        JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
        WHERE t.organizador_id = :oid
        ORDER BY j.nombre ASC
    """)
    res = await session.execute(q, {"oid": organizador_id})
    jugadores = []
    for r in res.fetchall():
        jd = dict(r._mapping)
        if jd.get("fecha_nacimiento"):
            jd["fecha_nacimiento"] = str(jd["fecha_nacimiento"])
        jugadores.append(jd)
    return jugadores

@router.delete("/futbol/jugadores/{jugador_id}")
async def delete_jugador(jugador_id: str, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    if not row_org:
        raise HTTPException(status_code=403, detail="No autorizado")
    organizador_id = row_org[0]

    res = await session.execute(text("""
        SELECT j.id FROM torneos_futbol.tournament_players j
        JOIN torneos_futbol.equipos e ON j.torneo_equipo_id = e.id
        JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
        WHERE j.id = :jid AND t.organizador_id = :oid
    """), {"jid": jugador_id, "oid": organizador_id})
    if not res.fetchone():
        raise HTTPException(status_code=403, detail="No autorizado")
        
    await session.execute(text("DELETE FROM torneos_futbol.tournament_players WHERE id = :jid"), {"jid": jugador_id})
    await session.commit()
    return {"message": "Jugador eliminado"}

class JugadorUpdate(BaseModel):
    nombre: Optional[str] = None
    nombre_abreviado: Optional[str] = None
    dni: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    numero_camiseta: Optional[int] = None
    posicion: Optional[str] = None
    telefono: Optional[str] = None
    foto_url: Optional[str] = None
    biometria_aprobada: Optional[bool] = None

@router.put("/futbol/jugadores/{jugador_id}")
async def update_jugador(jugador_id: str, data: JugadorUpdate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    if not row_org:
        raise HTTPException(status_code=403, detail="No autorizado")
    organizador_id = row_org[0]

    # Verificar propiedad
    res = await session.execute(text("""
        SELECT j.id FROM torneos_futbol.tournament_players j
        JOIN torneos_futbol.equipos e ON j.torneo_equipo_id = e.id
        JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
        WHERE j.id = :jid AND t.organizador_id = :oid
    """), {"jid": jugador_id, "oid": organizador_id})
    if not res.fetchone():
        raise HTTPException(status_code=403, detail="No autorizado o jugador no existe")
        
    update_fields = []
    params = {"jid": jugador_id}
    
    if data.nombre is not None:
        update_fields.append("nombre = :nombre")
        params["nombre"] = data.nombre
    if data.nombre_abreviado is not None:
        update_fields.append("nombre_abreviado = :nombre_abreviado")
        params["nombre_abreviado"] = data.nombre_abreviado
    if data.dni is not None:
        update_fields.append("dni = :dni")
        params["dni"] = data.dni
    if data.fecha_nacimiento is not None:
        update_fields.append("fecha_nacimiento = CAST(:fecha_nacimiento AS DATE)")
        params["fecha_nacimiento"] = data.fecha_nacimiento if data.fecha_nacimiento else None
    if data.numero_camiseta is not None:
        update_fields.append("numero_camiseta = :numero_camiseta")
        params["numero_camiseta"] = data.numero_camiseta
    if data.posicion is not None:
        update_fields.append("posicion = :posicion")
        params["posicion"] = data.posicion
    if data.telefono is not None:
        update_fields.append("telefono = :telefono")
        params["telefono"] = data.telefono
    if data.foto_url is not None:
        update_fields.append("foto_url = :foto_url")
        params["foto_url"] = data.foto_url
    if data.biometria_aprobada is not None:
        update_fields.append("biometria_aprobada = :biometria_aprobada")
        params["biometria_aprobada"] = data.biometria_aprobada

    if update_fields:
        query = f"UPDATE torneos_futbol.tournament_players SET {', '.join(update_fields)} WHERE id = :jid"
        await session.execute(text(query), params)
        await session.commit()
    return {"message": "Jugador actualizado con éxito"}

# ==========================================
# 4. Reconocimiento Facial Biomédico (Prueba)
# ==========================================

def get_face_encoding_from_base64(b64_string):
    try:
        if "," in b64_string:
            b64_string = b64_string.split(",")[1]
        
        image_data = base64.b64decode(b64_string)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        image_np = np.array(image)
        
        encodings = face_recognition.face_encodings(image_np)
        if len(encodings) > 0:
            return encodings[0]
        return None
    except Exception as e:
        print("Error decodificando imagen:", e)
        return None

class BiometryScanRequest(BaseModel):
    imagen_base64: str

@router.post("/futbol/biometria/reconocer")
async def reconocer_jugador_global(data: BiometryScanRequest, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    if not row_org:
        raise HTTPException(status_code=403, detail="No autorizado")
    organizador_id = row_org[0]

    target_encoding = get_face_encoding_from_base64(data.imagen_base64)
    if target_encoding is None:
        raise HTTPException(status_code=400, detail="No se detectó ningún rostro en la captura. Acerca la cámara.")

    # Cargar jugadores con fotos
    q = text("""
        SELECT j.id, j.foto_url
        FROM torneos_futbol.tournament_players j
        JOIN torneos_futbol.equipos e ON j.torneo_equipo_id = e.id
        JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
        WHERE t.organizador_id = :oid AND j.biometria_aprobada = true AND j.foto_url IS NOT NULL
    """)
    res = await session.execute(q, {"oid": organizador_id})
    jugadores = res.fetchall()

    if not jugadores:
        raise HTTPException(status_code=404, detail="No hay jugadores registrados con foto aprobada para comparar.")

    best_match_id = None
    best_distance = 0.55  # Umbral estricto

    for j in jugadores:
        if not j.foto_url or not j.foto_url.startswith("data:image"):
            continue
            
        known_encoding = get_face_encoding_from_base64(j.foto_url)
        if known_encoding is not None:
            distances = face_recognition.face_distance([known_encoding], target_encoding)
            distance = distances[0]
            if distance < best_distance:
                best_distance = distance
                best_match_id = j.id
                
    if best_match_id:
        accuracy = round((1.0 - best_distance) * 100, 2)
        return {"match": True, "jugador_id": best_match_id, "precision": accuracy}
    else:
        return {"match": False}
