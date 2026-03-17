from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, text
from typing import List, Optional
from datetime import datetime

from database import get_session
from models import ResultadoMesa, Candidato, Usuario, PosibleVotante, RefLocal
from schemas import ResultadoMesaCreate, ResultadoMesaResponse, ResumenMesaComparativo
from security import get_current_user

router = APIRouter(prefix="/api/dia-d", tags=["Día D - Escrutinio"])

@router.post("/resultados", response_model=ResultadoMesaResponse)
async def registrar_resultado(
    data: ResultadoMesaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    # Verificar si ya existe un resultado para esa mesa y candidato
    stmt = select(ResultadoMesa).where(
        and_(
            ResultadoMesa.departamento_id == data.departamento_id,
            ResultadoMesa.distrito_id == data.distrito_id,
            ResultadoMesa.seccional_id == data.seccional_id,
            ResultadoMesa.local_id == data.local_id,
            ResultadoMesa.nro_mesa == data.nro_mesa,
            ResultadoMesa.id_candidato == data.id_candidato
        )
    )
    res = await session.execute(stmt)
    existente = res.scalar_one_or_none()
    
    if existente:
        # Actualizar existente
        for key, value in data.dict().items():
            setattr(existente, key, value)
        await session.commit()
        await session.refresh(existente)
        return existente

    nuevo = ResultadoMesa(
        **data.dict(),
        creado_por=current_user["user_id"]
    )
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo

@router.get("/comparativo/{candidato_id}", response_model=List[ResumenMesaComparativo])
async def get_comparativo_resultados(
    candidato_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Compara votos reales vs simpatizantes esperados por mesa.
    """
    
    # 1. Obtener simpatizantes esperados por mesa
    query_symp = text("""
        SELECT p.departamento, p.distrito, p.seccional, p.local, p.mesa, 
               l.descripcion as nombre_local, COUNT(pv.id) as simpatizantes
        FROM electoral.posibles_votantes pv
        JOIN electoral.anr_padron_2026 p ON pv.cedula_votante = p.cedula
        JOIN electoral.ref_locales l ON p.local = l.local_id 
             AND p.departamento = l.departamento_id 
             AND p.distrito = l.distrito_id
             AND p.seccional = l.seccional_id
        GROUP BY p.departamento, p.distrito, p.seccional, p.local, p.mesa, l.descripcion
    """)
    
    res_symp = await session.execute(query_symp)
    rows_symp = res_symp.fetchall()
    
    # 2. Obtener resultados reales
    stmt_real = select(ResultadoMesa).where(ResultadoMesa.id_candidato == candidato_id)
    res_real = await session.execute(stmt_real)
    resultados_reales = res_real.scalars().all()
    
    # Mapa de resultados reales [(dep, dist, secc, loc, mesa)] -> votos
    real_map = {
        (r.departamento_id, r.distrito_id, r.seccional_id, r.local_id, r.nro_mesa): r.votos_obtenidos 
        for r in resultados_reales
    }
    
    comparativo = []
    
    for row in rows_symp:
        key = (row.departamento, row.distrito, row.seccional, row.local, row.mesa)
        reales = real_map.get(key, 0)
        esperados = row.simpatizantes
        
        diferencia = reales - esperados
        efectividad = (reales / esperados * 100) if esperados > 0 else 0
        
        comparativo.append({
            "departamento_id": row.departamento,
            "distrito_id": row.distrito,
            "seccional_id": row.seccional,
            "local_id": row.local,
            "nombre_local": row.nombre_local,
            "nro_mesa": row.mesa,
            "votos_reales": reales,
            "simpatizantes_esperados": esperados,
            "diferencia": diferencia,
            "efectividad_porcentaje": round(efectividad, 2)
        })
        
    comparativo.sort(key=lambda x: x["efectividad_porcentaje"])
    return comparativo

@router.get("/locales-padron")
async def get_locales_padron(
    distrito_id: int,
    departamento_id: int,
    session: AsyncSession = Depends(get_session)
):
    """Obtiene los locales de votación que existen en el padrón para un distrito"""
    query = text("""
        SELECT DISTINCT p.local as id, l.descripcion as nombre, p.seccional
        FROM electoral.anr_padron_2026 p
        LEFT JOIN electoral.ref_locales l ON p.local = l.local_id 
             AND p.departamento = l.departamento_id 
             AND p.distrito = l.distrito_id
             AND p.seccional = l.seccional_id
        WHERE p.departamento = :dep AND p.distrito = :dist
        ORDER BY l.descripcion, p.local
    """)
    res = await session.execute(query, {"dep": departamento_id, "dist": distrito_id})
    return [{"id": f"{departamento_id}_{distrito_id}_{r.seccional}_{r.id}", "nombre": r.nombre or f"Local Nro {r.id}"} for r in res.fetchall()]

@router.get("/mesas-padron/{composite_id}")
async def get_mesas_padron(
    composite_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Obtiene las mesas disponibles en el padrón para un local específico"""
    try:
        dep, dist, secc, loc = map(int, composite_id.split('_'))
        query = text("""
            SELECT DISTINCT mesa 
            FROM electoral.anr_padron_2026 
            WHERE departamento = :dep AND distrito = :dist AND seccional = :secc AND local = :loc
            ORDER BY mesa
        """)
        res = await session.execute(query, {"dep": dep, "dist": dist, "secc": secc, "loc": loc})
        return [r.mesa for r in res.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=400, detail="Formato de ID de local inválido")
