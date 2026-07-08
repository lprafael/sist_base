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

class DivisionCreate(BaseModel):
    nombre: str

class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    divisiones: List[DivisionCreate] = []

class TorneoFutbolCreate(BaseModel):
    nombre: str
    tipo_campeonato: str # "unico" o "categorias"
    categorias: List[CategoriaCreate] = [] # Vacio si es unico

@router.post("/futbol/torneos")
async def crear_torneo_futbol(data: TorneoFutbolCreate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    torneo_id = str(uuid.uuid4())
    
    # Insert Torneo
    await session.execute(text("""
        INSERT INTO torneos_futbol.torneos 
            (id, nombre, tipo_campeonato, organizador_id, deporte, estado, creado_en)
        VALUES 
            (:id, :nombre, :tipo, :oid, 'Fútbol', 'borrador', NOW())
    """), {
        "id": torneo_id, "nombre": data.nombre, 
        "tipo": data.tipo_campeonato, "oid": current_user["usuario_id"]
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
    capitan_nombre: str
    capitan_telefono: str
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
