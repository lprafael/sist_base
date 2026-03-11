from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from database import get_session
from models import Usuario, Actividad, Rol
from schemas import UserResponse, ActividadResponse

router = APIRouter(prefix="/api/public/candidatos", tags=["Public"])

@router.get("/{slug}")
async def get_candidate_by_slug(slug: str, session: AsyncSession = Depends(get_session)):
    stmt = select(Usuario).where(Usuario.public_slug == slug)
    result = await session.execute(stmt)
    candidato = result.scalar_one_or_none()
    
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    
    # Podriamos querer retornar equipo (concejales si es intendente)
    equipo = []
    if candidato.rol == 'intendente' and candidato.distrito_id:
        stmt_equipo = select(Usuario).where(
            Usuario.rol == 'concejal',
            Usuario.distrito_id == candidato.distrito_id,
            Usuario.public_slug != None
        )
        res_equipo = await session.execute(stmt_equipo)
        equipo = [{"nombre": u.nombre_completo, "slug": u.public_slug, "foto": u.public_config.get('foto') if u.public_config else None} for u in res_equipo.scalars().all()]
        
    return {
        "id": candidato.id,
        "nombre_completo": candidato.nombre_completo,
        "rol": candidato.rol,
        "config": candidato.public_config or {},
        "equipo": equipo
    }

@router.get("/{slug}/actividades", response_model=List[ActividadResponse])
async def get_candidate_activities(slug: str, session: AsyncSession = Depends(get_session)):
    stmt = select(Usuario).where(Usuario.public_slug == slug)
    result = await session.execute(stmt)
    candidato = result.scalar_one_or_none()
    
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
        
    # Obtener actividades y cargar fotos
    stmt_act = select(Actividad).where(Actividad.creado_por == candidato.id).order_by(Actividad.fecha_programada.desc()).options(selectinload(Actividad.fotos))
    result_act = await session.execute(stmt_act)
    actividades = result_act.scalars().all()
    
    return actividades
