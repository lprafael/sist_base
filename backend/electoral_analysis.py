from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any
from database import get_session
from security import get_current_user

router = APIRouter(prefix="/api/electoral/analisis", tags=["Análisis Electoral"])

@router.get("/historico/{dpto_id}/{dist_id}")
async def get_resultados_historicos(
    dpto_id: int, 
    dist_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Retorna resultados históricos comparativos para un distrito"""
    # Restricción de territorio
    if current_user.get("role") != "admin":
        u_dpto = current_user.get("departamento_id")
        u_dist = current_user.get("distrito_id")
        
        if u_dpto is None or u_dist is None:
            print(f"WARNING: User {current_user.get('sub')} has an OLD TOKEN without territory info.")
            raise HTTPException(status_code=403, detail="Tu sesión es antigua. Por favor cierra sesión y vuelve a entrar.")
            
        if int(dpto_id) != int(u_dpto) or int(dist_id) != int(u_dist):
            print(f"DENIED: User {current_user.get('sub')} ({u_dpto}/{u_dist}) tried to access {dpto_id}/{dist_id}")
            raise HTTPException(status_code=403, detail="No tienes permiso para ver datos de esta localidad")

    query = text("""
        SELECT anho, cargo_nombre, lista_siglas, lista_nombre, votos
        FROM electoral.resultados_historicos
        WHERE departamento_id = :dpto_id AND distrito_id = :dist_id
        AND cargo_nombre IN ('INTENDENTE', 'JUNTA MUNICIPAL')
        ORDER BY anho DESC, cargo_nombre, votos DESC
    """)
    
    try:
        result = await session.execute(query, {"dpto_id": dpto_id, "dist_id": dist_id})
        rows = result.fetchall()
        
        # Agrupar por año y cargo
        data = {}
        for r in rows:
            anho = r.anho
            cargo = r.cargo_nombre
            if anho not in data:
                data[anho] = {}
            if cargo not in data[anho]:
                data[anho][cargo] = []
            
            data[anho][cargo].append({
                "siglas": r.lista_siglas,
                "nombre": r.lista_nombre,
                "votos": r.votos
            })
            
        return data
    except Exception as e:
        print(f"Error fetching historical results: {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar datos históricos")

@router.get("/electos/{dpto_id}/{dist_id}")
async def get_electos_detalle(
    dpto_id: int, 
    dist_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Retorna la lista de personas electas en el distrito"""
    # Restricción de territorio
    if current_user.get("role") != "admin":
        u_dpto = current_user.get("departamento_id")
        u_dist = current_user.get("distrito_id")
        if u_dpto is None or u_dist is None or int(dpto_id) != int(u_dpto) or int(dist_id) != int(u_dist):
            raise HTTPException(status_code=403, detail="No tienes permiso territorial para esta consulta")

    query = text("""
        SELECT anho, cargo_nombre, lista_siglas, nombre, apellido, votos_lista, cociente, votos_preferenciales, orden_dhont
        FROM electoral.electos_historicos
        WHERE departamento_id = :dpto_id AND distrito_id = :dist_id
        ORDER BY anho DESC, cargo_nombre, orden_dhont
    """)
    
    try:
        result = await session.execute(query, {"dpto_id": dpto_id, "dist_id": dist_id})
        rows = result.fetchall()
        
        data = {}
        for r in rows:
            anho = r.anho
            if anho not in data: data[anho] = {}
            cargo = r.cargo_nombre
            if cargo not in data[anho]: data[anho][cargo] = []
            
            data[anho][cargo].append({
                "nombre": f"{r.nombre} {r.apellido}",
                "lista": r.lista_siglas,
                "votos": r.votos_lista,
                "votos_preferenciales": r.votos_preferenciales,
                "cociente": r.cociente,
                "orden": r.orden_dhont
            })
        return data
    except Exception as e:
        print(f"Error fetching electos: {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar electos históricos")

@router.get("/estimativo/{dpto_id}/{dist_id}")
async def get_estimativo_votos(
    dpto_id: int, 
    dist_id: int,
    bancas: int = 12,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Calcula estimativo de votos necesarios basado en datos reales de electos"""
    # Restricción de territorio
    if current_user.get("role") != "admin":
        u_dpto = current_user.get("departamento_id")
        u_dist = current_user.get("distrito_id")
        if u_dpto is None or u_dist is None or int(dpto_id) != int(u_dpto) or int(dist_id) != int(u_dist):
            raise HTTPException(status_code=403, detail="No tienes permiso territorial para esta consulta")

    try:
        # 1. Obtener el cociente del último electo de cada año (Umbral real)
        query_threshold = text("""
            SELECT anho, MIN(cociente) as umbral
            FROM electoral.electos_historicos
            WHERE departamento_id = :dpto_id AND distrito_id = :dist_id
            AND cargo_nombre = 'JUNTA MUNICIPAL' 
            AND tipo_eleccion = 'municipales'
            GROUP BY anho
            ORDER BY anho DESC
        """)
        
        # 2. Obtener votos del ganador para intendente
        query_intendente = text("""
            SELECT anho, votos_lista
            FROM electoral.electos_historicos
            WHERE departamento_id = :dpto_id AND distrito_id = :dist_id
            AND cargo_nombre = 'INTENDENTE'
            AND tipo_eleccion = 'municipales'
            ORDER BY anho DESC
        """)
        
        res_t = await session.execute(query_threshold, {"dpto_id": dpto_id, "dist_id": dist_id})
        thresholds = res_t.fetchall()
        
        res_i = await session.execute(query_intendente, {"dpto_id": dpto_id, "dist_id": dist_id})
        intendentes = res_i.fetchall()
        
        estimates = {}
        
        if intendentes:
            votos_i = [r.votos_lista for r in intendentes]
            avg_i = sum(votos_i) / len(votos_i)
            estimates['INTENDENTE'] = {
                "promedio_historico": int(avg_i),
                "ultimo_periodo": votos_i[0],
                "recomendado": int(max(avg_i, votos_i[0]) * 1.05)
            }
            
        if thresholds:
            votos_t = [r.umbral for r in thresholds]
            avg_t = sum(votos_t) / len(votos_t)
            estimates['JUNTA MUNICIPAL'] = {
                "promedio_historico": int(avg_t),
                "ultimo_periodo": int(votos_t[0]),
                "recomendado": int(max(avg_t, votos_t[0]) * 1.1),
                "bancas_simuladas": bancas # Nota: Aquí el histórico ya trae la banca real que entró
            }
        else:
            # Fallback a simulación manual si no hay electos cargados para ese distrito específico
            # (Repetimos la lógica de D'Hondt manual sobre resultados_historicos)
            pass

        return estimates
        
    except Exception as e:
        print(f"Error calculating D'Hondt estimates: {e}")
        raise HTTPException(status_code=500, detail="Error al calcular estimativos")
