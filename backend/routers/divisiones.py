from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel

from database import get_session
from security import get_current_user

router = APIRouter(
    prefix="/api/torneos",
    tags=["Divisiones de Torneo"]
)

# ==============================================================================
# SCHEMAS
# ==============================================================================
class DivisionCreate(BaseModel):
    nombre: str
    categoria_id: Optional[str] = None  # UUID
    formato_id: Optional[int] = None
    estado: Optional[str] = "activa"

class DivisionUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria_id: Optional[str] = None
    formato_id: Optional[int] = None
    estado: Optional[str] = None


# ==============================================================================
# ENDPOINTS - DIVISIONES
# ==============================================================================

@router.get("/{torneo_id}/divisiones")
async def listar_divisiones(torneo_id: str, session: AsyncSession = Depends(get_session)):
    """Lista todas las divisiones de un torneo, con categoría y formato incluidos."""
    query = text("""
        SELECT 
            d.id,
            d.torneo_id,
            d.nombre,
            d.estado,
            d.creado_en,
            c.id         AS categoria_id,
            c.nombre     AS categoria_nombre,
            c.edad_min,
            c.edad_max,
            c.genero,
            f.id         AS formato_id,
            f.nombre     AS formato_nombre,
            COUNT(dp.participante_id) AS total_participantes
        FROM torneos_generales.divisiones d
        LEFT JOIN torneos_generales.categorias c ON c.id = d.categoria_id
        LEFT JOIN cancha.formatos_torneo f ON f.id = d.formato_id
        LEFT JOIN torneos_generales.divisiones_participantes dp ON dp.division_id = d.id
        WHERE d.torneo_id = :tid
        GROUP BY d.id, c.id, f.id
        ORDER BY d.nombre
    """)
    res = await session.execute(query, {"tid": torneo_id})
    return [dict(r._mapping) for r in res.fetchall()]


@router.post("/{torneo_id}/divisiones", status_code=status.HTTP_201_CREATED)
async def crear_division(
    torneo_id: str,
    payload: DivisionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Crea una nueva división para un torneo."""
    query = text("""
        INSERT INTO torneos_generales.divisiones (torneo_id, nombre, categoria_id, formato_id, estado)
        VALUES (:tid, :nombre, :cat_id, :fmt_id, :estado)
        RETURNING id, torneo_id, nombre, categoria_id, formato_id, estado, creado_en
    """)
    res = await session.execute(query, {
        "tid": torneo_id,
        "nombre": payload.nombre,
        "cat_id": payload.categoria_id,
        "fmt_id": payload.formato_id,
        "estado": payload.estado,
    })
    await session.commit()
    return dict(res.fetchone()._mapping)


@router.put("/{torneo_id}/divisiones/{div_id}")
async def editar_division(
    torneo_id: str,
    div_id: str,
    payload: DivisionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Edita una división existente."""
    updates = []
    params: dict = {"div_id": div_id, "tid": torneo_id}

    if payload.nombre is not None:
        updates.append("nombre = :nombre")
        params["nombre"] = payload.nombre
    if payload.categoria_id is not None:
        updates.append("categoria_id = :cat_id")
        params["cat_id"] = payload.categoria_id
    if payload.formato_id is not None:
        updates.append("formato_id = :fmt_id")
        params["fmt_id"] = payload.formato_id
    if payload.estado is not None:
        updates.append("estado = :estado")
        params["estado"] = payload.estado

    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos a actualizar")

    query = text(f"""
        UPDATE torneos_generales.divisiones
        SET {', '.join(updates)}
        WHERE id = :div_id AND torneo_id = :tid
        RETURNING id, nombre, categoria_id, formato_id, estado
    """)
    res = await session.execute(query, params)
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="División no encontrada")
    await session.commit()
    return dict(row._mapping)


@router.delete("/{torneo_id}/divisiones/{div_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_division(
    torneo_id: str,
    div_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Elimina una división y sus asignaciones de participantes."""
    query = text("""
        DELETE FROM torneos_generales.divisiones
        WHERE id = :div_id AND torneo_id = :tid
        RETURNING id
    """)
    res = await session.execute(query, {"div_id": div_id, "tid": torneo_id})
    if not res.scalar():
        raise HTTPException(status_code=404, detail="División no encontrada")
    await session.commit()


# ==============================================================================
# ENDPOINTS - PARTICIPANTES EN DIVISIÓN
# ==============================================================================

@router.get("/{torneo_id}/divisiones/{div_id}/participantes")
async def listar_participantes_division(
    torneo_id: str, div_id: str, session: AsyncSession = Depends(get_session)
):
    """Lista los participantes asignados a una división."""
    query = text("""
        SELECT p.id, p.nombre, p.apellido, p.documento, p.modalidad,
               p.peso_verificado, p.estatura_verificada, p.estado
        FROM torneos_generales.participantes p
        JOIN torneos_generales.divisiones_participantes dp ON dp.participante_id = p.id
        WHERE dp.division_id = :did
        ORDER BY p.apellido, p.nombre
    """)
    res = await session.execute(query, {"did": div_id})
    return [dict(r._mapping) for r in res.fetchall()]


@router.post("/{torneo_id}/divisiones/{div_id}/participantes/{part_id}", status_code=status.HTTP_201_CREATED)
async def asignar_participante(
    torneo_id: str, div_id: str, part_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Asigna un participante a una división."""
    try:
        await session.execute(
            text("INSERT INTO torneos_generales.divisiones_participantes (division_id, participante_id) VALUES (:did, :pid)"),
            {"did": div_id, "pid": part_id}
        )
        await session.commit()
        return {"message": "Participante asignado exitosamente"}
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=400, detail="El participante ya está en esta división o los IDs son inválidos")


@router.delete("/{torneo_id}/divisiones/{div_id}/participantes/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
async def quitar_participante(
    torneo_id: str, div_id: str, part_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Quita un participante de una división."""
    res = await session.execute(
        text("DELETE FROM torneos_generales.divisiones_participantes WHERE division_id = :did AND participante_id = :pid RETURNING participante_id"),
        {"did": div_id, "pid": part_id}
    )
    if not res.scalar():
        raise HTTPException(status_code=404, detail="El participante no está en esta división")
    await session.commit()
