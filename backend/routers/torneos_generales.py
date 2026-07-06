from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import date
from pydantic import BaseModel, UUID4
from uuid import UUID

from database import get_session

router = APIRouter(
    prefix="/cancha/torneos_generales",
    tags=["Torneos Generales"]
)

class TorneoGeneralCreate(BaseModel):
    nombre: str
    lugar: str
    fecha_inicio: date
    fecha_fin: date
    modalidades_permitidas: List[str]
    deporte_id: Optional[int] = None

class TorneoGeneralUpdate(BaseModel):
    nombre: Optional[str] = None
    lugar: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    modalidades_permitidas: Optional[List[str]] = None
    estado: Optional[str] = None
    deporte_id: Optional[int] = None

@router.get("/", summary="Listar torneos generales")
async def get_torneos_generales(session: AsyncSession = Depends(get_session)):
    query = text("SELECT * FROM torneos_generales.torneos ORDER BY fecha_inicio DESC")
    result = await session.execute(query)
    torneos = []
    for row in result.fetchall():
        torneos.append({
            "id": row.id,
            "nombre": row.nombre,
            "descripcion": f"Lugar: {row.lugar}",
            "fecha_inicio": row.fecha_inicio,
            "fecha_fin": row.fecha_fin,
            "estado": row.estado,
            "deporte_id": row.deporte_id,
            "creado_en": row.creado_en,
            "categorias": [{
                "id": row.id,
                "categoria": "Categoría Única",
                "formato": "General"
            }]
        })
    return torneos

@router.post("/", summary="Crear torneo general")
async def create_torneo_general(data: TorneoGeneralCreate, session: AsyncSession = Depends(get_session)):
    query = text("""
        INSERT INTO torneos_generales.torneos 
        (nombre, lugar, fecha_inicio, fecha_fin, modalidades_permitidas, deporte_id)
        VALUES (:nombre, :lugar, :fecha_inicio, :fecha_fin, :modalidades, :deporte_id)
        RETURNING id
    """)
    result = await session.execute(query, {
        "nombre": data.nombre,
        "lugar": data.lugar,
        "fecha_inicio": data.fecha_inicio,
        "fecha_fin": data.fecha_fin,
        "modalidades": data.modalidades_permitidas,
        "deporte_id": data.deporte_id
    })
    await session.commit()
    new_id = result.scalar()
    return {"id": new_id, "message": "Torneo general creado exitosamente"}

@router.delete("/{torneo_id}", summary="Eliminar torneo general")
async def delete_torneo_general(torneo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("DELETE FROM torneos_generales.torneos WHERE id = :id RETURNING id")
    result = await session.execute(query, {"id": torneo_id})
    if not result.scalar():
        raise HTTPException(status_code=404, detail="Torneo general no encontrado")
    await session.commit()
    return {"message": "Torneo general eliminado"}
