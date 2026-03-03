from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from typing import List, Optional

from database import get_session
from models import Padron, Referente, PosibleVotante, Candidato, Usuario, AnrPadron, RefDepartamento, RefDistrito, RefSeccional, RefLocal
from schemas import PadronResponse, CaptacionCreate, CaptacionUpdate, PosibleVotanteResponse, DashboardCandidatoResponse, ResumenReferente, AnrPadronResponse
from security import get_current_user

router = APIRouter(prefix="/api/electoral", tags=["Gestión Electoral"])

@router.get("/padron/search", response_model=List[AnrPadronResponse])
async def search_padron(
    query: str,
    departamento_id: Optional[int] = None,
    distrito_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Busca personas en el padrón por cédula o nombre con nombres descriptivos y filtros territoriales"""
    if len(query) < 3:
        return []

    # Construir la consulta con JOINs para obtener nombres descriptivos
    stmt = select(
        AnrPadron.cedula,
        AnrPadron.nombres,
        AnrPadron.apellidos,
        AnrPadron.nacimiento,
        AnrPadron.departamento,
        AnrPadron.distrito,
        AnrPadron.seccional,
        AnrPadron.local,
        AnrPadron.mesa,
        AnrPadron.orden,
        RefDepartamento.descripcion.label("nombre_departamento"),
        RefDistrito.descripcion.label("nombre_distrito"),
        RefSeccional.descripcion.label("nombre_seccional"),
        RefLocal.descripcion.label("nombre_local")
    ).outerjoin(
        RefDepartamento, AnrPadron.departamento == RefDepartamento.id
    ).outerjoin(
        RefDistrito, and_(AnrPadron.departamento == RefDistrito.departamento_id, AnrPadron.distrito == RefDistrito.id)
    ).outerjoin(
        RefSeccional, and_(
            AnrPadron.departamento == RefSeccional.departamento_id, 
            AnrPadron.distrito == RefSeccional.distrito_id,
            AnrPadron.seccional == RefSeccional.seccional_id
        )
    ).outerjoin(
        RefLocal, and_(
            AnrPadron.departamento == RefLocal.departamento_id, 
            AnrPadron.distrito == RefLocal.distrito_id,
            AnrPadron.seccional == RefLocal.seccional_id,
            AnrPadron.local == RefLocal.local_id
        )
    )
    search_terms = query.strip().split()
    if not search_terms:
        return []

    # Construir lista de filtros dinámicos
    filters = []

    # Búsqueda inteligente por palabras
    if len(search_terms) == 1 and search_terms[0].isdigit():
        filters.append(AnrPadron.cedula.ilike(f"%{search_terms[0]}%"))
    else:
        for term in search_terms:
            filters.append(or_(
                AnrPadron.nombres.ilike(f"%{term}%"),
                AnrPadron.apellidos.ilike(f"%{term}%")
            ))

    if departamento_id:
        filters.append(AnrPadron.departamento == departamento_id)
    if distrito_id:
        filters.append(AnrPadron.distrito == distrito_id)

    # Aplicar filtros
    stmt = stmt.where(and_(*filters)).limit(20)
    
    result = await session.execute(stmt)
    return result.all()

@router.post("/captacion")
async def register_captacion(
    data: CaptacionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Registra un simpatizante vinculado al referente actual"""
    print(f"DEBUG: Registrando captación para usuario_id={current_user.get('user_id')}")
    print(f"DEBUG: Datos recibidos: {data.dict()}")
    # Buscar el referente vinculado al usuario actual
    stmt = select(Referente).where(Referente.id_usuario_sistema == current_user["user_id"])
    result = await session.execute(stmt)
    referente = result.scalar_one_or_none()
    
    if not referente:
        print(f"DEBUG: ERROR - Referente no encontrado para usuario_id={current_user['user_id']}")
        raise HTTPException(status_code=403, detail="El usuario no tiene un perfil de referente asignado")

    print(f"DEBUG: Referente encontrado: id={referente.id}, nombre={referente.nombre_referente}")
    # Verificar si ya existe en su lista
    stmt_check = select(PosibleVotante).where(
        and_(
            PosibleVotante.id_referente == referente.id,
            PosibleVotante.cedula_votante == data.cedula_votante
        )
    )
    existing = await session.execute(stmt_check)
    if existing.scalar_one_or_none():
        print(f"DEBUG: El votante {data.cedula_votante} ya existe para este referente")
        raise HTTPException(status_code=400, detail="Este votante ya está en tu lista")

    try:
        nuevo_votante = PosibleVotante(
            id_referente=referente.id,
            cedula_votante=data.cedula_votante,
            parentesco=data.parentesco,
            grado_seguridad=data.grado_seguridad,
            observaciones=data.observaciones,
            domicilio=data.domicilio,
            latitud=data.latitud,
            longitud=data.longitud,
            movilidad_propia=data.movilidad_propia
        )
        
        session.add(nuevo_votante)
        await session.commit()
        print(f"DEBUG: Simpatizante registrado exitosamente en DB")
        return {"message": "Simpatizante registrado correctamente"}
    except Exception as e:
        await session.rollback()
        print(f"DEBUG: Error al guardar en DB: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al guardar: {str(e)}")

@router.get("/mis-votantes", response_model=List[PosibleVotanteResponse])
async def get_mis_votantes(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene la lista de votantes según la jerarquía del usuario"""
    from hierarchy_utils import get_visible_referente_ids
    
    user_id = current_user["user_id"]
    user_role = current_user.get("role", "referente")
    
    referente_ids = await get_visible_referente_ids(user_id, user_role, session)
    
    if not referente_ids:
        return []

    stmt = select(
        PosibleVotante.id,
        PosibleVotante.id_referente,
        PosibleVotante.cedula_votante,
        AnrPadron.nombres.label("nombre_votante"),
        AnrPadron.apellidos.label("apellido_votante"),
        PosibleVotante.parentesco,
        PosibleVotante.domicilio,
        PosibleVotante.grado_seguridad,
        PosibleVotante.fecha_captacion,
        PosibleVotante.validacion_candidato,
        PosibleVotante.movilidad_propia
    ).outerjoin(AnrPadron, PosibleVotante.cedula_votante == AnrPadron.cedula).where(
        PosibleVotante.id_referente.in_(referente_ids)
    ).order_by(PosibleVotante.fecha_captacion.desc())
    
    result = await session.execute(stmt)
    items = []
    for row in result.all():
        items.append({
            "id": row.id,
            "id_referente": row.id_referente,
            "cedula_votante": row.cedula_votante,
            "nombre_votante": row.nombre_votante or "Sin Nombre",
            "apellido_votante": row.apellido_votante or "",
            "parentesco": row.parentesco,
            "domicilio": row.domicilio,
            "grado_seguridad": row.grado_seguridad,
            "fecha_captacion": row.fecha_captacion,
            "validacion_candidato": row.validacion_candidato,
            "movilidad_propia": row.movilidad_propia
        })
    return items

@router.put("/votante/{id}")
async def update_votante(
    id: int,
    data: CaptacionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Actualiza los datos de un simpatizante registrado"""
    stmt = select(PosibleVotante).where(PosibleVotante.id == id)
    res = await session.execute(stmt)
    votante = res.scalar_one_or_none()
    
    if not votante:
        raise HTTPException(status_code=404, detail="Votante no encontrado")

    stmt_ref = select(Referente.id).where(Referente.id_usuario_sistema == current_user["user_id"])
    ref_id = (await session.execute(stmt_ref)).scalar()
    
    if votante.id_referente != ref_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este votante")

    if data.parentesco is not None: votante.parentesco = data.parentesco
    if data.grado_seguridad is not None: votante.grado_seguridad = data.grado_seguridad
    if data.observaciones is not None: votante.observaciones = data.observaciones
    if data.domicilio is not None: votante.domicilio = data.domicilio
    if data.latitud is not None: votante.latitud = data.latitud
    if data.longitud is not None: votante.longitud = data.longitud
    if data.movilidad_propia is not None: votante.movilidad_propia = data.movilidad_propia
    
    await session.commit()
    return {"message": "Datos actualizados correctamente"}

@router.delete("/votante/{id}")
async def delete_votante(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Elimina un simpatizante de la lista"""
    stmt = select(PosibleVotante).where(PosibleVotante.id == id)
    res = await session.execute(stmt)
    votante = res.scalar_one_or_none()
    
    if not votante:
        raise HTTPException(status_code=404, detail="Votante no encontrado")

    stmt_ref = select(Referente.id).where(Referente.id_usuario_sistema == current_user["user_id"])
    ref_id = (await session.execute(stmt_ref)).scalar()
    
    if votante.id_referente != ref_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este votante")

    await session.delete(votante)
    await session.commit()
    return {"message": "Votante eliminado de tu lista"}

@router.post("/votante/{id}/validar")
async def validar_votante(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Valida un simpatizante (solo para Candidatos/Intendentes o Administradores)"""
    user_role = current_user.get("role")
    if user_role not in ["intendente", "admin", "concejal"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para otorgar validaciones oficiales")

    stmt = select(PosibleVotante).where(PosibleVotante.id == id)
    res = await session.execute(stmt)
    votante = res.scalar_one_or_none()
    
    if not votante:
        raise HTTPException(status_code=404, detail="Votante no encontrado")

    # Si no es admin, verificar jerarquía
    if user_role != "admin":
        from hierarchy_utils import get_visible_referente_ids
        visibles = await get_visible_referente_ids(current_user["user_id"], user_role, session)
        if votante.id_referente not in visibles:
            raise HTTPException(status_code=403, detail="Este simpatizante no pertenece a tu red jerárquica")

    votante.validacion_candidato = True
    await session.commit()
    return {"message": "Simpatizante validado oficialmente", "status": "ok"}

@router.get("/padron/cercanias/{cedula}", response_model=List[AnrPadronResponse])
async def get_cercanias_padron(
    cedula: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Busca posibles parientes (mismos apellidos) y vecinos (mismo local/mesa)"""
    stmt_base = select(AnrPadron).where(AnrPadron.cedula == cedula)
    res_base = await session.execute(stmt_base)
    base = res_base.scalar_one_or_none()
    
    if not base:
        raise HTTPException(status_code=404, detail="Votante base no encontrado en el padrón")

    apellidos = base.apellidos.strip().split()
    
    stmt = select(
        AnrPadron.cedula,
        AnrPadron.nombres,
        AnrPadron.apellidos,
        AnrPadron.nacimiento,
        AnrPadron.departamento,
        AnrPadron.distrito,
        AnrPadron.seccional,
        AnrPadron.local,
        AnrPadron.mesa,
        AnrPadron.orden,
        RefLocal.descripcion.label("nombre_local")
    ).outerjoin(
        RefLocal, and_(
            AnrPadron.departamento == RefLocal.departamento_id,
            AnrPadron.distrito == RefLocal.distrito_id,
            AnrPadron.seccional == RefLocal.seccional_id,
            AnrPadron.local == RefLocal.local_id
        )
    ).where(AnrPadron.cedula != cedula)

    criterios = []
    if apellidos:
        criterios.append(
            and_(
                AnrPadron.distrito == base.distrito,
                or_(*[AnrPadron.apellidos.ilike(f"%{a}%") for a in apellidos])
            )
        )
    
    criterios.append(
        and_(
            AnrPadron.local == base.local,
            AnrPadron.mesa == base.mesa
        )
    )

    stmt = stmt.where(or_(*criterios)).limit(15)
    result = await session.execute(stmt)
    return result.all()

@router.get("/dashboard/candidato", response_model=DashboardCandidatoResponse)
async def get_dashboard_candidato(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene estadísticas de campaña"""
    from hierarchy_utils import get_visible_referente_ids

    user_id = current_user["user_id"]
    user_role = current_user.get("role", "referente")

    referente_ids = await get_visible_referente_ids(user_id, user_role, session)

    if not referente_ids:
        return {
            "total_votantes_unicos": 0,
            "total_votantes_bruto": 0,
            "referentes": [],
            "puntos_calor": []
        }

    stmt_referentes = select(Referente).where(Referente.id.in_(referente_ids))
    res_referentes = await session.execute(stmt_referentes)
    referentes = res_referentes.scalars().all()

    stmt_unicos = select(func.count(func.distinct(PosibleVotante.cedula_votante))).where(
        PosibleVotante.id_referente.in_(referente_ids)
    )
    res_unicos = await session.execute(stmt_unicos)
    total_unicos = res_unicos.scalar() or 0

    resumen_referentes = []
    total_bruto = 0
    for r in referentes:
        stmt_count = select(func.count(PosibleVotante.id)).where(PosibleVotante.id_referente == r.id)
        count = (await session.execute(stmt_count)).scalar() or 0
        resumen_referentes.append({
            "id_referente": r.id,
            "nombre_referente": r.nombre_referente,
            "cantidad_votantes": count
        })
        total_bruto += count
    
    resumen_referentes.sort(key=lambda x: x["cantidad_votantes"], reverse=True)

    stmt_puntos = select(
        PosibleVotante.latitud, 
        PosibleVotante.longitud,
        PosibleVotante.grado_seguridad
    ).where(
        and_(
            PosibleVotante.id_referente.in_(referente_ids),
            PosibleVotante.latitud != None,
            PosibleVotante.longitud != None
        )
    )
    puntos_res = await session.execute(stmt_puntos)
    puntos_calor = [{"lat": p[0], "lng": p[1], "weight": p[2]} for p in puntos_res.all()]

    # Resumen por Local y Mesa
    from models import AnrPadron, RefLocal
    
    # Locales
    stmt_locales = (
        select(RefLocal.descripcion, func.count(PosibleVotante.id))
        .join(AnrPadron, PosibleVotante.cedula_votante == AnrPadron.cedula)
        .join(RefLocal, and_(
            AnrPadron.departamento == RefLocal.departamento_id,
            AnrPadron.distrito == RefLocal.distrito_id,
            AnrPadron.seccional == RefLocal.seccional_id,
            AnrPadron.local == RefLocal.local_id
        ))
        .where(PosibleVotante.id_referente.in_(referente_ids))
        .group_by(RefLocal.descripcion)
        .order_by(func.count(PosibleVotante.id).desc())
    )
    res_locales = await session.execute(stmt_locales)
    resumen_locales = [{"nombre_local": r[0], "cantidad": r[1]} for r in res_locales.all()]

    # Mesas
    stmt_mesas = (
        select(RefLocal.descripcion, AnrPadron.mesa, func.count(PosibleVotante.id))
        .join(AnrPadron, PosibleVotante.cedula_votante == AnrPadron.cedula)
        .join(RefLocal, and_(
            AnrPadron.departamento == RefLocal.departamento_id,
            AnrPadron.distrito == RefLocal.distrito_id,
            AnrPadron.seccional == RefLocal.seccional_id,
            AnrPadron.local == RefLocal.local_id
        ))
        .where(PosibleVotante.id_referente.in_(referente_ids))
        .group_by(RefLocal.descripcion, AnrPadron.mesa)
        .order_by(func.count(PosibleVotante.id).desc())
        .limit(15) # Top 15 mesas con más captación
    )
    res_mesas = await session.execute(stmt_mesas)
    resumen_mesas = [{"nombre_local": r[0], "mesa": r[1], "cantidad": r[2]} for r in res_mesas.all()]

    # Centro del Mapa (basado en el distrito del usuario)
    map_center = {"lat": -25.2867, "lng": -57.6470} # Asunción por defecto
    from models import Usuario
    user_q = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = user_q.scalar()
    
    if user and user.distrito_id is not None:
        # Buscar el primer local de ese distrito para tener una referencia de coordenadas
        stmt_center = select(RefLocal.ubicacion).where(
            and_(
                RefLocal.departamento_id == user.departamento_id,
                RefLocal.distrito_id == user.distrito_id
            )
        ).limit(1)
        res_center = await session.execute(stmt_center)
        loc_center = res_center.scalar()
        if loc_center:
            # Si es un dict (JSON), extraer directamente
            if isinstance(loc_center, dict):
                map_center = {"lat": loc_center.get("lat", -25.2867), "lng": loc_center.get("lng", -57.6470)}
            elif loc_center:
                # Si es una geometría (WKBElement)
                from geoalchemy2.shape import to_shape
                center_shape = to_shape(loc_center)
                map_center = {"lat": center_shape.y, "lng": center_shape.x}

    return {
        "total_votantes_unicos": total_unicos,
        "total_votantes_bruto": total_bruto,
        "referentes": resumen_referentes,
        "resumen_locales": resumen_locales,
        "resumen_mesas": resumen_mesas,
        "puntos_calor": puntos_calor,
        "map_center": map_center
    }

@router.get("/catalogos/departamentos")
async def get_catalog_departamentos(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(RefDepartamento.id, RefDepartamento.descripcion).order_by(RefDepartamento.descripcion))
    return [{"id": r[0], "descripcion": r[1]} for r in res.all()]

@router.get("/catalogos/distritos/{departamento_id}")
async def get_catalog_distritos(departamento_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(
        select(RefDistrito.id, RefDistrito.descripcion)
        .where(RefDistrito.departamento_id == departamento_id)
        .order_by(RefDistrito.descripcion)
    )
    return [{"id": r[0], "descripcion": r[1]} for r in res.all()]
