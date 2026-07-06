from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import date
from pydantic import BaseModel

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
    deporte_id: Optional[int] = None
    organizador_id: Optional[int] = None


class TorneoGeneralUpdate(BaseModel):
    nombre: Optional[str] = None
    lugar: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    estado: Optional[str] = None
    deporte_id: Optional[int] = None


@router.get("/", summary="Listar todos los torneos generales")
async def get_torneos_generales(session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT t.id, t.nombre, t.lugar, t.fecha_inicio, t.fecha_fin,
               t.estado, t.deporte_id, t.organizador_id, t.creado_en,
               d.nombre AS deporte_nombre
        FROM torneos_generales.torneos t
        LEFT JOIN cancha.deportes d ON d.id = t.deporte_id
        ORDER BY t.fecha_inicio DESC
    """)
    result = await session.execute(query)
    return [dict(r._mapping) for r in result.fetchall()]


@router.get("/organizador/{org_id}", summary="Listar torneos de un organizador")
async def get_torneos_by_organizador(org_id: int, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT t.id, t.nombre, t.lugar, t.fecha_inicio, t.fecha_fin,
               t.estado, t.deporte_id, t.organizador_id, t.creado_en,
               d.nombre AS deporte_nombre
        FROM torneos_generales.torneos t
        LEFT JOIN cancha.deportes d ON d.id = t.deporte_id
        WHERE t.organizador_id = :oid
        ORDER BY t.fecha_inicio DESC
    """)
    result = await session.execute(query, {"oid": org_id})
    return [dict(r._mapping) for r in result.fetchall()]


@router.post("/", summary="Crear torneo general", status_code=status.HTTP_201_CREATED)
async def create_torneo_general(
    data: TorneoGeneralCreate,
    session: AsyncSession = Depends(get_session)
):
    # Validar que el organizador tenga habilitado el deporte
    if data.organizador_id and data.deporte_id:
        chk = await session.execute(
            text("SELECT 1 FROM cancha.organizador_deporte WHERE organizador_id=:oid AND deporte_id=:did"),
            {"oid": data.organizador_id, "did": data.deporte_id}
        )
        if not chk.scalar():
            raise HTTPException(
                status_code=403,
                detail="El organizador no tiene habilitado ese deporte. Contacta al administrador."
            )

    query = text("""
        INSERT INTO torneos_generales.torneos
        (nombre, lugar, fecha_inicio, fecha_fin, deporte_id, organizador_id)
        VALUES (:nombre, :lugar, :fecha_inicio, :fecha_fin, :deporte_id, :organizador_id)
        RETURNING id
    """)
    result = await session.execute(query, {
        "nombre": data.nombre,
        "lugar": data.lugar,
        "fecha_inicio": data.fecha_inicio,
        "fecha_fin": data.fecha_fin,
        "deporte_id": data.deporte_id,
        "organizador_id": data.organizador_id,
    })
    await session.commit()
    new_id = result.scalar()
    return {"id": new_id, "message": "Torneo general creado exitosamente"}


@router.put("/{torneo_id}", summary="Actualizar torneo general")
async def update_torneo_general(
    torneo_id: str,
    data: TorneoGeneralUpdate,
    session: AsyncSession = Depends(get_session)
):
    updates = []
    params: dict = {"tid": torneo_id}
    if data.nombre is not None:
        updates.append("nombre = :nombre"); params["nombre"] = data.nombre
    if data.lugar is not None:
        updates.append("lugar = :lugar"); params["lugar"] = data.lugar
    if data.fecha_inicio is not None:
        updates.append("fecha_inicio = :fi"); params["fi"] = data.fecha_inicio
    if data.fecha_fin is not None:
        updates.append("fecha_fin = :ff"); params["ff"] = data.fecha_fin
    if data.estado is not None:
        updates.append("estado = :estado"); params["estado"] = data.estado
    if data.deporte_id is not None:
        updates.append("deporte_id = :did"); params["did"] = data.deporte_id
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos a actualizar")

    query = text(f"""
        UPDATE torneos_generales.torneos
        SET {', '.join(updates)}, actualizado_en = NOW()
        WHERE id = :tid
        RETURNING id, nombre, lugar, estado, deporte_id
    """)
    res = await session.execute(query, params)
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    await session.commit()
    return dict(row._mapping)


@router.delete("/{torneo_id}", summary="Eliminar torneo general")
async def delete_torneo_general(torneo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("DELETE FROM torneos_generales.torneos WHERE id = :id RETURNING id")
    result = await session.execute(query, {"id": torneo_id})
    if not result.scalar():
        raise HTTPException(status_code=404, detail="Torneo general no encontrado")
    await session.commit()
    return {"message": "Torneo general eliminado"}
