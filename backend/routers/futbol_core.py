from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from database import get_session
from security import get_current_user
import uuid

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
        q_j = text("SELECT nombre, dni FROM torneos_futbol.tournament_players WHERE torneo_equipo_id = :eid")
        res_j = await session.execute(q_j, {"eid": eq["id"]})
        eq["jugadores"] = [dict(j._mapping) for j in res_j.fetchall()]
        
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
        await session.execute(text("""
            INSERT INTO torneos_futbol.tournament_players (torneo_equipo_id, nombre, dni, estado)
            VALUES (:eid, :n, :dni, 'habilitado')
        """), {"eid": equipo_id, "n": j.get("nombre", ""), "dni": f"sd_{uuid.uuid4().hex[:8]}"})
        
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
