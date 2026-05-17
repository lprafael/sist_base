from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, Integer, cast
from typing import List, Optional

from database import get_session
from models import Referente, PosibleVotante, Candidato, Usuario, RefDepartamento, RefDistrito, RefSeccional, RefLocal, Persona, Eleccion, PadronElectoral, PlraPadron
from schemas import PadronResponse, CaptacionCreate, CaptacionUpdate, PosibleVotanteResponse, DashboardCandidatoResponse, ResumenReferente, AnrPadronResponse, PlraPadronResponse, EleccionResponse, EleccionCreate, EleccionUpdate
from security import get_current_user

router = APIRouter(prefix="/api/electoral", tags=["Gestión Electoral"])

@router.get("/elecciones", response_model=List[EleccionResponse])
async def list_elecciones(session: AsyncSession = Depends(get_session)):
    """Lista todas las elecciones disponibles"""
    stmt = select(Eleccion).order_by(Eleccion.fecha.desc())
    result = await session.execute(stmt)
    return result.scalars().all()

@router.post("/elecciones", response_model=EleccionResponse)
async def create_eleccion(
    data: EleccionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Crea una nueva elección (Solo Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    nueva = Eleccion(**data.dict())
    session.add(nueva)
    await session.commit()
    await session.refresh(nueva)
    return nueva

@router.put("/elecciones/{id}", response_model=EleccionResponse)
async def update_eleccion(
    id: int,
    data: EleccionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Actualiza una elección (Solo Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    stmt = select(Eleccion).where(Eleccion.id == id)
    result = await session.execute(stmt)
    eleccion = result.scalar_one_or_none()
    if not eleccion:
        raise HTTPException(status_code=404, detail="No encontrada")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(eleccion, key, value)
    
    await session.commit()
    await session.refresh(eleccion)
    return eleccion

@router.delete("/elecciones/{id}")
async def delete_eleccion(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Elimina una elección (Solo Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    stmt = select(Eleccion).where(Eleccion.id == id)
    result = await session.execute(stmt)
    eleccion = result.scalar_one_or_none()
    if not eleccion:
        raise HTTPException(status_code=404, detail="No encontrada")
    
    await session.delete(eleccion)
    await session.commit()
    return {"status": "deleted"}

@router.post("/padron/import")
async def import_padron(
    data: List[dict],
    eleccion_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Importa registros al padrón (Solo Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    count = 0
    for item in data:
        cedula = str(item.get("cedula"))
        if not cedula: continue
        
        # 1. Asegurar Persona
        stmt_p = select(Persona).where(Persona.cedula == cedula)
        persona = (await session.execute(stmt_p)).scalar_one_or_none()
        if not persona:
            persona = Persona(
                cedula=cedula,
                nombres=item.get("nombres", ""),
                apellidos=item.get("apellidos", ""),
                fecha_nacimiento=item.get("fecha_nacimiento")
            )
            session.add(persona)
        
        # 2. Asegurar PadronElectoral
        stmt_e = select(PadronElectoral).where(
            and_(PadronElectoral.cedula == cedula, PadronElectoral.eleccion_id == eleccion_id)
        )
        padron = (await session.execute(stmt_e)).scalar_one_or_none()
        if not padron:
            padron = PadronElectoral(
                cedula=cedula,
                eleccion_id=eleccion_id,
                departamento_id=item.get("departamento_id"),
                distrito_id=item.get("distrito_id"),
                local_id=item.get("local_id"),
                mesa=item.get("mesa"),
                orden=item.get("orden")
            )
            session.add(padron)
        else:
            # Update existing
            padron.departamento_id = item.get("departamento_id", padron.departamento_id)
            padron.distrito_id = item.get("distrito_id", padron.distrito_id)
            padron.local_id = item.get("local_id", padron.local_id)
            padron.mesa = item.get("mesa", padron.mesa)
            padron.orden = item.get("orden", padron.orden)
        
        count += 1
        if count % 100 == 0:
            await session.flush()
            
    await session.commit()
    return {"status": "success", "imported": count}

@router.get("/padron/search", response_model=List[AnrPadronResponse])
async def search_padron(
    query: str,
    eleccion_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    distrito_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Busca personas en el padrón unificado por cédula o nombre"""
    if len(query) < 3:
        return []

    # Si no se especifica elección, buscamos la primera activa (ej: ANR 2026)
    if eleccion_id is None:
        stmt_e = select(Eleccion.id).where(Eleccion.activo == True).limit(1)
        eleccion_id = (await session.execute(stmt_e)).scalar()

    # Construir la consulta con JOINs para obtener nombres descriptivos
    stmt = select(
        Persona.cedula,
        Persona.nombres,
        Persona.apellidos,
        Persona.fecha_nacimiento.label("nacimiento"),
        PadronElectoral.departamento_id.label("departamento"),
        PadronElectoral.distrito_id.label("distrito"),
        PadronElectoral.seccional_id.label("seccional"),
        PadronElectoral.local_id.label("local"),
        PadronElectoral.mesa,
        PadronElectoral.orden,
        Persona.direccion_residencia.label("direccion"),
        RefDepartamento.descripcion.label("nombre_departamento"),
        RefDistrito.descripcion.label("nombre_distrito"),
        RefSeccional.descripcion.label("nombre_seccional"),
        RefLocal.descripcion.label("nombre_local")
    ).join(
        PadronElectoral, Persona.cedula == PadronElectoral.cedula
    ).outerjoin(
        RefDepartamento, PadronElectoral.departamento_id == RefDepartamento.id
    ).outerjoin(
        RefDistrito, and_(PadronElectoral.departamento_id == RefDistrito.departamento_id, PadronElectoral.distrito_id == RefDistrito.id)
    ).outerjoin(
        RefSeccional, and_(
            PadronElectoral.departamento_id == RefSeccional.departamento_id, 
            PadronElectoral.distrito_id == RefSeccional.distrito_id,
            PadronElectoral.seccional_id == RefSeccional.seccional_id
        )
    ).outerjoin(
        RefLocal, and_(
            PadronElectoral.departamento_id == RefLocal.departamento_id, 
            PadronElectoral.distrito_id == RefLocal.distrito_id,
            PadronElectoral.seccional_id == RefLocal.seccional_id,
            PadronElectoral.local_id == RefLocal.local_id
        )
    )
    
    if eleccion_id:
        stmt = stmt.where(PadronElectoral.eleccion_id == eleccion_id)

    search_terms = query.strip().split()
    if not search_terms:
        return []

    # Construir lista de filtros dinámicos
    filters = []

    # Búsqueda inteligente por palabras
    if len(search_terms) == 1 and search_terms[0].isdigit():
        filters.append(Persona.cedula.ilike(f"%{search_terms[0]}%"))
    else:
        for term in search_terms:
            search_pattern = f"%{term}%"
            filters.append(or_(
                func.public.f_unaccent(func.lower(Persona.nombres)).ilike(func.public.f_unaccent(func.lower(search_pattern))),
                func.public.f_unaccent(func.lower(Persona.apellidos)).ilike(func.public.f_unaccent(func.lower(search_pattern)))
            ))

    # RESTRICCIÓN DE SEGURIDAD: Si no es admin, forzar su propio territorio y elección
    user_role = current_user.get("role")
    if user_role != "admin":
        user_dept = current_user.get("departamento_id")
        user_dist = current_user.get("distrito_id")
        user_elec = current_user.get("eleccion_id")
        
        if user_dept is not None:
            filters.append(PadronElectoral.departamento_id == user_dept)
        if user_dist is not None:
            filters.append(PadronElectoral.distrito_id == user_dist)
        if user_elec is not None:
            eleccion_id = user_elec # Forzar la elección asignada al usuario
    else:
        # Si es admin, puede usar los filtros opcionales
        if departamento_id:
            filters.append(PadronElectoral.departamento_id == departamento_id)
        if distrito_id:
            filters.append(PadronElectoral.distrito_id == distrito_id)
            
    # Asegurar que se filtre por la elección final determinada
    if eleccion_id:
        stmt = stmt.where(PadronElectoral.eleccion_id == eleccion_id)

    # Aplicar filtros
    stmt = stmt.where(and_(*filters)).limit(50)
    
    result = await session.execute(stmt)
    # Convertir a dict para que Pydantic lo mapee correctamente (nombres de columnas labels)
    return [dict(r._mapping) for r in result.all()]

@router.get("/plra/search", response_model=List[PlraPadronResponse])
async def search_plra(
    query: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Busca personas en el padrón PLRA por cédula o nombre"""
    if len(query) < 3:
        return []

    stmt = select(PlraPadron)
    search_terms = query.strip().split()
    if not search_terms:
        return []

    filters = []
    if len(search_terms) == 1 and search_terms[0].isdigit():
        filters.append(PlraPadron.cedula.ilike(f"%{search_terms[0]}%"))
    else:
        for term in search_terms:
            search_pattern = f"%{term}%"
            filters.append(or_(
                func.public.f_unaccent(func.lower(PlraPadron.nombre)).ilike(func.public.f_unaccent(func.lower(search_pattern))),
                func.public.f_unaccent(func.lower(PlraPadron.apellido)).ilike(func.public.f_unaccent(func.lower(search_pattern)))
            ))

    stmt = stmt.where(and_(*filters)).limit(50)
    result = await session.execute(stmt)
    return result.scalars().all()

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
    
    # Si no tiene perfil de referente pero es Candidato Principal, Equipo Electoral o Admin, se lo creamos automáticamente
    if not referente and current_user.get("role") in ["candidato_principal", "equipo_electoral", "admin"]:
        print(f"DEBUG: Auto-creando perfil de referente para {current_user['role']} {current_user['user_id']}")
        
        # Obtener los datos completos del usuario
        stmt_user = select(Usuario).where(Usuario.id == current_user["user_id"])
        res_user = await session.execute(stmt_user)
        user_db = res_user.scalar_one_or_none()
        
        if user_db:
            referente = Referente(
                id_usuario_sistema=user_db.id,
                rol_electoral=user_db.rol,
                nombre_referente=user_db.nombre_completo,
                activo=True
            )
            session.add(referente)
            await session.flush() # Para obtener el ID sin commitear aún
            print(f"DEBUG: Perfil de referente creado temporalmente con id={referente.id}")
    
    if not referente:
        print(f"DEBUG: ERROR - Referente no encontrado para usuario_id={current_user['user_id']}")
        raise HTTPException(status_code=403, detail="El usuario no tiene un perfil de referente asignado y su rol no permite auto-creación.")

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
            eleccion_id=current_user.get("eleccion_id", 1), # Usar elección del usuario o por defecto ID 1
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
        Persona.nombres.label("nombre_votante"),
        Persona.apellidos.label("apellido_votante"),
        PosibleVotante.parentesco,
        PosibleVotante.domicilio,
        Persona.direccion_residencia.label("direccion_padron"),
        PosibleVotante.grado_seguridad,
        PosibleVotante.fecha_captacion,
        PosibleVotante.validacion_candidato,
        PosibleVotante.movilidad_propia
    ).outerjoin(Persona, PosibleVotante.cedula_votante == Persona.cedula).where(
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
            "domicilio": row.domicilio or row.direccion_padron,
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
    """Valida un simpatizante (solo para Candidatos Principales o Administradores)"""
    user_role = current_user.get("role")
    if user_role not in ["candidato_principal", "admin", "equipo_electoral"]:
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
    stmt_base = select(Persona).where(Persona.cedula == cedula)
    res_base = await session.execute(stmt_base)
    base = res_base.scalar_one_or_none()
    
    if not base:
        raise HTTPException(status_code=404, detail="Votante base no encontrado en el padrón")

    apellidos_original = (base.apellidos or "").strip()
    cedula_int = int(base.cedula) if (base.cedula and base.cedula.strip().isdigit()) else None
    
    stmt = select(
        Persona.cedula,
        Persona.nombres,
        Persona.apellidos,
        Persona.fecha_nacimiento.label("nacimiento"),
        PadronElectoral.departamento_id.label("departamento"),
        PadronElectoral.distrito_id.label("distrito"),
        PadronElectoral.seccional_id.label("seccional"),
        PadronElectoral.local_id.label("local"),
        PadronElectoral.mesa,
        PadronElectoral.orden,
        Persona.direccion_residencia.label("direccion"),
        RefLocal.descripcion.label("nombre_local")
    ).join(
        PadronElectoral, Persona.cedula == PadronElectoral.cedula
    ).outerjoin(
        RefLocal, and_(
            PadronElectoral.departamento_id == RefLocal.departamento_id,
            PadronElectoral.distrito_id == RefLocal.distrito_id,
            PadronElectoral.seccional_id == RefLocal.seccional_id,
            PadronElectoral.local_id == RefLocal.local_id
        )
    ).where(Persona.cedula != base.cedula)

    # Filtro estricto solicitado: Mismos apellidos Y CI cercana (+/- 5)
    if cedula_int and apellidos_original:
        cedulas_rango = [str(cedula_int + i) for i in range(-5, 6) if i != 0]
        stmt = stmt.where(
            and_(
                func.trim(Persona.cedula).in_(cedulas_rango),
                func.public.f_unaccent(func.trim(Persona.apellidos)).ilike(
                    func.public.f_unaccent(func.trim(apellidos_original))
                )
            )
        )
    else:
        # Si no hay datos suficientes, no devolvemos nada para mantener la restricción
        return []
    stmt = stmt.limit(60)
    result = await session.execute(stmt)
    return [dict(r._mapping) for r in result.all()]

@router.get("/dashboard/candidato")
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene estadísticas de campaña"""
    try:
        from hierarchy_utils import get_visible_referente_ids

        user_id = current_user["user_id"]
        user_role = current_user.get("role", "referente")

        referente_ids = await get_visible_referente_ids(user_id, user_role, session)

        if not referente_ids:
            return {
                "total_votantes_unicos": 0,
                "total_votantes_bruto": 0,
                "referentes": [],
                "resumen_locales": [],
                "resumen_mesas": [],
                "puntos_calor": [],
                "map_center": {"lat": -25.2867, "lng": -57.6470}
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
        
        # Locales
        stmt_locales = (
            select(
                RefLocal.descripcion, 
                func.count(PosibleVotante.id)
            )
            .outerjoin(PadronElectoral, and_(
                PosibleVotante.cedula_votante == PadronElectoral.cedula,
                PadronElectoral.eleccion_id == 1
            ))
            .outerjoin(RefLocal, and_(
                PadronElectoral.departamento_id == RefLocal.departamento_id,
                PadronElectoral.distrito_id == RefLocal.distrito_id,
                PadronElectoral.seccional_id == RefLocal.seccional_id,
                PadronElectoral.local_id == RefLocal.local_id
            ))
            .where(PosibleVotante.id_referente.in_(referente_ids))
            .group_by(RefLocal.descripcion)
            .order_by(func.count(PosibleVotante.id).desc())
        )
        res_locales = await session.execute(stmt_locales)
        resumen_locales = [
            {"nombre_local": r[0] if r[0] else "Local no identificado", "cantidad": r[1]} 
            for r in res_locales.all()
        ]

        # Mesas
        stmt_mesas = (
            select(
                RefLocal.descripcion, 
                PadronElectoral.mesa, 
                func.count(PosibleVotante.id)
            )
            .outerjoin(PadronElectoral, and_(
                PosibleVotante.cedula_votante == PadronElectoral.cedula,
                PadronElectoral.eleccion_id == 1
            ))
            .outerjoin(RefLocal, and_(
                PadronElectoral.departamento_id == RefLocal.departamento_id,
                PadronElectoral.distrito_id == RefLocal.distrito_id,
                PadronElectoral.seccional_id == RefLocal.seccional_id,
                PadronElectoral.local_id == RefLocal.local_id
            ))
            .where(PosibleVotante.id_referente.in_(referente_ids))
            .group_by(RefLocal.descripcion, PadronElectoral.mesa)
            .order_by(func.count(PosibleVotante.id).desc())
            .limit(15) 
        )
        res_mesas = await session.execute(stmt_mesas)
        resumen_mesas = [
            {
                "nombre_local": r[0] if r[0] else "Local no identificado", 
                "mesa": r[1] if r[1] else "N/A", 
                "cantidad": r[2]
            } 
            for r in res_mesas.all()
        ]

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
                    try:
                        from geoalchemy2.shape import to_shape
                        center_shape = to_shape(loc_center)
                        map_center = {"lat": center_shape.y, "lng": center_shape.x}
                    except ImportError:
                        # Si no hay geoalchemy2, dejamos el centro por defecto
                        pass
                    except Exception:
                        # Cualquier otro error de parseo geométrico
                        pass

        return {
            "total_votantes_unicos": total_unicos,
            "total_votantes_bruto": total_bruto,
            "referentes": resumen_referentes,
            "resumen_locales": resumen_locales,
            "resumen_mesas": resumen_mesas,
            "puntos_calor": puntos_calor,
            "map_center": map_center
        }
    except Exception as e:
        return {"error": str(e)}

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

# Nuevos endpoints para Reporte de Padrón e Impresión
@router.get("/departamentos")
async def list_departamentos(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(RefDepartamento.id, RefDepartamento.descripcion).order_by(RefDepartamento.descripcion))
    return [{"id": r[0], "nombre": r[1]} for r in res.all()]

@router.get("/distritos")
async def list_distritos(departamento_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(
        select(RefDistrito.id, RefDistrito.descripcion)
        .where(RefDistrito.departamento_id == departamento_id)
        .order_by(RefDistrito.descripcion)
    )
    return [{"id": r[0], "nombre": r[1]} for r in res.all()]

@router.get("/distritos/{distrito_id}/stats")
async def get_distrito_stats(
    distrito_id: int, 
    departamento_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session)
):
    """Obtiene estadísticas rápidas de un distrito: votantes, locales y mesas"""
    # Filtros base
    filters_padron = [PadronElectoral.distrito_id == distrito_id]
    filters_locales = [RefLocal.distrito_id == distrito_id]
    
    if departamento_id:
        filters_padron.append(PadronElectoral.departamento_id == departamento_id)
        filters_locales.append(RefLocal.departamento_id == departamento_id)

    # Cantidad de votantes
    stmt_voters = select(func.count(PadronElectoral.cedula)).where(and_(*filters_padron))
    voters_count = (await session.execute(stmt_voters)).scalar() or 0

    # Cantidad de locales
    stmt_locales = select(func.count(RefLocal.local_id)).where(and_(*filters_locales))
    locales_count = (await session.execute(stmt_locales)).scalar() or 0

    # Cantidad de mesas (agrupando por local y mesa para obtener el número real)
    subq = (
        select(PadronElectoral.seccional_id, PadronElectoral.local_id, PadronElectoral.mesa)
        .where(and_(*filters_padron))
        .group_by(PadronElectoral.seccional_id, PadronElectoral.local_id, PadronElectoral.mesa)
    ).subquery()
    
    stmt_mesas = select(func.count()).select_from(subq)
    mesas_count = (await session.execute(stmt_mesas)).scalar() or 0

    return {
        "total_votantes": voters_count,
        "total_locales": locales_count,
        "total_mesas": mesas_count
    }

@router.get("/locales")
async def list_locales(distrito_id: int, departamento_id: Optional[int] = None, session: AsyncSession = Depends(get_session)):
    stmt = select(RefLocal.local_id, RefLocal.descripcion, RefLocal.seccional_id, RefLocal.departamento_id, RefLocal.distrito_id).where(RefLocal.distrito_id == distrito_id)
    if departamento_id:
        stmt = stmt.where(RefLocal.departamento_id == departamento_id)
    res = await session.execute(stmt.order_by(RefLocal.descripcion))
    # Para locales, el ID de cara al frontend será una clave compuesta o usaremos el local_id si es único en el distrito
    return [{"id": f"{r[3]}_{r[4]}_{r[2]}_{r[0]}", "nombre": r[1]} for r in res.all()]

@router.get("/locales/{composite_id}/mesas")
async def list_mesas(composite_id: str, session: AsyncSession = Depends(get_session)):
    # Descomponer la clave compuesta [dep]_[dist]_[secc]_[local]
    try:
        dep, dist, secc, loc = map(int, composite_id.split('_'))
    except:
        raise HTTPException(status_code=400, detail="Formato de ID de local inválido")
        
    res = await session.execute(
        select(func.distinct(PadronElectoral.mesa))
        .where(and_(
            PadronElectoral.departamento_id == dep,
            PadronElectoral.distrito_id == dist,
            PadronElectoral.seccional_id == secc,
            PadronElectoral.local_id == loc
        ))
        .order_by(PadronElectoral.mesa)
    )
    return [r[0] for r in res.all()]

@router.get("/padron/reporte")
async def get_padron_reporte(
    distrito_id: int,
    departamento_id: Optional[int] = None,
    local_id: Optional[str] = None,
    mesa: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene una lista filtrada del padrón para reportes o impresión"""
    stmt = select(
        PadronElectoral.orden,
        Persona.cedula,
        Persona.nombres,
        Persona.apellidos,
        PadronElectoral.mesa,
        RefLocal.descripcion.label("nombre_local")
    ).join(
        Persona, PadronElectoral.cedula == Persona.cedula
    ).outerjoin(
        RefLocal, and_(
            PadronElectoral.departamento_id == RefLocal.departamento_id,
            PadronElectoral.distrito_id == RefLocal.distrito_id,
            PadronElectoral.seccional_id == RefLocal.seccional_id,
            PadronElectoral.local_id == RefLocal.local_id
        )
    ).where(PadronElectoral.distrito_id == distrito_id)
    
    if departamento_id:
        stmt = stmt.where(PadronElectoral.departamento_id == departamento_id)
    
    if local_id:
        try:
            dep, dist, secc, loc = map(int, local_id.split('_'))
            stmt = stmt.where(and_(
                PadronElectoral.departamento_id == dep,
                PadronElectoral.distrito_id == dist,
                PadronElectoral.seccional_id == secc,
                PadronElectoral.local_id == loc
            ))
        except:
            pass
            
    if mesa:
        stmt = stmt.where(PadronElectoral.mesa == mesa)
        
    # Limitar el reporte para evitar saturación (opcional, pero recomendado para impresión)
    stmt = stmt.order_by(PadronElectoral.mesa, PadronElectoral.orden).limit(5000)
    
    result = await session.execute(stmt)
    return [dict(r._mapping) for r in result.all()]
