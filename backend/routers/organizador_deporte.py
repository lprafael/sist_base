from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List

from database import get_session
from security import get_current_user

router = APIRouter(
    prefix="/api/organizadores",
    tags=["Organizador — Deportes Habilitados"]
)


@router.get("/{org_id}/deportes", summary="Listar deportes habilitados del organizador")
async def listar_deportes_org(org_id: int, session: AsyncSession = Depends(get_session)):
    """Devuelve los deportes que el organizador puede usar para crear torneos."""
    query = text("""
        SELECT d.id, d.nombre, td.nombre AS tipo
        FROM cancha.organizador_deporte od
        JOIN cancha.deportes d ON d.id = od.deporte_id
        JOIN cancha.tipos_deporte td ON td.id = d.tipo_id
        WHERE od.organizador_id = :org_id
        ORDER BY d.nombre
    """)
    res = await session.execute(query, {"org_id": org_id})
    return [dict(r._mapping) for r in res.fetchall()]


@router.post("/{org_id}/deportes/{deporte_id}", status_code=status.HTTP_201_CREATED,
             summary="Habilitar un deporte para el organizador")
async def habilitar_deporte(
    org_id: int,
    deporte_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    try:
        await session.execute(
            text("INSERT INTO cancha.organizador_deporte (organizador_id, deporte_id) VALUES (:oid, :did)"),
            {"oid": org_id, "did": deporte_id}
        )
        await session.commit()
        return {"message": "Deporte habilitado para el organizador"}
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=400, detail="El deporte ya está habilitado o los IDs son inválidos")


@router.delete("/{org_id}/deportes/{deporte_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Deshabilitar un deporte del organizador")
async def deshabilitar_deporte(
    org_id: int,
    deporte_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    res = await session.execute(
        text("DELETE FROM cancha.organizador_deporte WHERE organizador_id = :oid AND deporte_id = :did RETURNING organizador_id"),
        {"oid": org_id, "did": deporte_id}
    )
    if not res.scalar():
        raise HTTPException(status_code=404, detail="Relación no encontrada")
    await session.commit()
