from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel, UUID4
from uuid import UUID

from database import get_session
from security import get_current_user

router = APIRouter(
    prefix="/api/organizadores",
    tags=["Categorías del Organizador"]
)

# Router adicional para acceso por torneo
torneo_cat_router = APIRouter(
    prefix="/api/torneos",
    tags=["Categorías por Torneo"]
)

# ==============================================================================
# SCHEMAS
# ==============================================================================
class CategoriaCreate(BaseModel):
    nombre: str
    torneo_id: Optional[UUID4] = None  # puede venir del body o de la URL
    edad_min: Optional[int] = None
    edad_max: Optional[int] = None
    genero: Optional[str] = None
    descripcion: Optional[str] = None

class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    torneo_id: Optional[UUID4] = None
    edad_min: Optional[int] = None
    edad_max: Optional[int] = None
    genero: Optional[str] = None
    descripcion: Optional[str] = None


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("/{organizador_id}/categorias")
async def listar_categorias(organizador_id: int, session: AsyncSession = Depends(get_session)):
    """Lista todas las categorías propias de un organizador."""
    query = text("""
        SELECT id, organizador_id, torneo_id, nombre, edad_min, edad_max, genero, descripcion, creado_en
        FROM torneos_generales.categorias
        WHERE organizador_id = :oid
        ORDER BY nombre
    """)
    res = await session.execute(query, {"oid": organizador_id})
    return [dict(r._mapping) for r in res.fetchall()]


@router.post("/{organizador_id}/categorias", status_code=status.HTTP_201_CREATED)
async def crear_categoria(
    organizador_id: int,
    payload: CategoriaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Crea una nueva categoría para un organizador."""
    query = text("""
        INSERT INTO torneos_generales.categorias 
            (organizador_id, torneo_id, nombre, edad_min, edad_max, genero, descripcion)
        VALUES 
            (:oid, :tid, :nombre, :emin, :emax, :genero, :desc)
        RETURNING id, organizador_id, torneo_id, nombre, edad_min, edad_max, genero, descripcion, creado_en
    """)
    res = await session.execute(query, {
        "oid": organizador_id,
        "tid": payload.torneo_id,
        "nombre": payload.nombre,
        "emin": payload.edad_min,
        "emax": payload.edad_max,
        "genero": payload.genero,
        "desc": payload.descripcion,
    })
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping)


@router.put("/{organizador_id}/categorias/{cat_id}")
async def editar_categoria(
    organizador_id: int,
    cat_id: str,
    payload: CategoriaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Edita una categoría existente del organizador."""
    updates = []
    params: dict = {"cat_id": cat_id, "oid": organizador_id}

    if payload.nombre is not None:
        updates.append("nombre = :nombre")
        params["nombre"] = payload.nombre
    if payload.torneo_id is not None:
        updates.append("torneo_id = :tid")
        params["tid"] = payload.torneo_id
    if payload.edad_min is not None:
        updates.append("edad_min = :emin")
        params["emin"] = payload.edad_min
    if payload.edad_max is not None:
        updates.append("edad_max = :emax")
        params["emax"] = payload.edad_max
    if payload.genero is not None:
        updates.append("genero = :genero")
        params["genero"] = payload.genero
    if payload.descripcion is not None:
        updates.append("descripcion = :desc")
        params["desc"] = payload.descripcion

    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos a actualizar")

    query = text(f"""
        UPDATE torneos_generales.categorias
        SET {', '.join(updates)}
        WHERE id = :cat_id AND organizador_id = :oid
        RETURNING id, torneo_id, nombre, edad_min, edad_max, genero, descripcion
    """)
    res = await session.execute(query, params)
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    await session.commit()
    return dict(row._mapping)


@router.delete("/{organizador_id}/categorias/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_categoria(
    organizador_id: int,
    cat_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Elimina una categoría del organizador."""
    query = text("""
        DELETE FROM torneos_generales.categorias
        WHERE id = :cat_id AND organizador_id = :oid
        RETURNING id
    """)
    res = await session.execute(query, {"cat_id": cat_id, "oid": organizador_id})
    if not res.scalar():
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    await session.commit()


# ==============================================================================
# ENDPOINTS POR TORNEO (alias)
# ==============================================================================

@torneo_cat_router.get("/{torneo_id}/categorias", summary="Listar categorías de un torneo")
async def listar_categorias_torneo(torneo_id: str, session: AsyncSession = Depends(get_session)):
    """Lista todas las categorías de un torneo específico."""
    query = text("""
        SELECT id, organizador_id, torneo_id, nombre, edad_min, edad_max, genero, descripcion, creado_en
        FROM torneos_generales.categorias
        WHERE torneo_id = :tid
        ORDER BY nombre
    """)
    res = await session.execute(query, {"tid": torneo_id})
    return [dict(r._mapping) for r in res.fetchall()]


@torneo_cat_router.post("/{torneo_id}/categorias", status_code=status.HTTP_201_CREATED,
                        summary="Crear categoría para un torneo")
async def crear_categoria_torneo(
    torneo_id: str,
    payload: CategoriaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Crea una nueva categoría asociada directamente a un torneo."""
    # El org_id se obtiene del torneo
    torneo_row = await session.execute(
        text("SELECT organizador_id FROM torneos_generales.torneos WHERE id = :tid"),
        {"tid": torneo_id}
    )
    torneo = torneo_row.fetchone()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    query = text("""
        INSERT INTO torneos_generales.categorias
            (organizador_id, torneo_id, nombre, edad_min, edad_max, genero, descripcion)
        VALUES
            (:oid, :tid, :nombre, :emin, :emax, :genero, :desc)
        RETURNING id, organizador_id, torneo_id, nombre, edad_min, edad_max, genero, descripcion, creado_en
    """)
    res = await session.execute(query, {
        "oid": torneo.organizador_id,
        "tid": torneo_id,
        "nombre": payload.nombre,
        "emin": payload.edad_min,
        "emax": payload.edad_max,
        "genero": payload.genero,
        "desc": payload.descripcion,
    })
    await session.commit()
    return dict(res.fetchone()._mapping)
