from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, Integer, cast, update
from typing import List, Optional

from database import get_session
from models import Referente, PosibleVotante, Candidato, Usuario, RefDepartamento, RefDistrito, RefSeccional, RefLocal, Persona, Eleccion, PadronElectoral, PlraPadron, PersonaTelefono
from schemas import PadronResponse, CaptacionCreate, CaptacionUpdate, PosibleVotanteResponse, DashboardCandidatoResponse, ResumenReferente, AnrPadronResponse, PlraPadronResponse, EleccionResponse, EleccionCreate, EleccionUpdate, PersonaTelefonoCreate, PersonaTelefonoResponse, SimpatizantesReferenteResponse, SimpatizanteReferenteItem
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

    # Búsqueda inteligente por palabras (Cédula directa o nombre/apellido)
    if len(search_terms) == 1 and search_terms[0].isdigit():
        if len(search_terms[0]) >= 5:
            filters.append(Persona.cedula == search_terms[0])
        else:
            filters.append(Persona.cedula.like(f"{search_terms[0]}%"))
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

        # Si se proporcionó número de teléfono, guardarlo en el historial y sincronizar
        if data.telefono and data.telefono.strip():
            tel_limpio = data.telefono.strip()
            await session.execute(
                update(PersonaTelefono)
                .where(PersonaTelefono.cedula == data.cedula_votante)
                .values(es_actual=False)
            )
            nuevo_tel = PersonaTelefono(
                cedula=data.cedula_votante,
                telefono=tel_limpio,
                tipo=data.telefono_tipo or "Celular",
                observacion=data.telefono_observacion,
                id_usuario_registro=current_user.get("user_id"),
                fecha_registro=func.now(),
                es_actual=True
            )
            session.add(nuevo_tel)

            stmt_persona = select(Persona).where(Persona.cedula == data.cedula_votante)
            res_persona = await session.execute(stmt_persona)
            persona_obj = res_persona.scalar_one_or_none()
            if persona_obj:
                persona_obj.telefono = tel_limpio

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
    try:
        from hierarchy_utils import get_visible_referente_ids
        
        user_id = current_user["user_id"]
        user_role = current_user.get("role", "referente")
        
        referente_ids = await get_visible_referente_ids(user_id, user_role, session)
        
        if not referente_ids:
            return []

        rows = []
        has_subq = False

        try:
            total_tels_subq = (
                select(func.count(PersonaTelefono.id))
                .where(PersonaTelefono.cedula == PosibleVotante.cedula_votante)
                .scalar_subquery()
            )

            stmt = select(
                PosibleVotante.id,
                PosibleVotante.id_referente,
                PosibleVotante.cedula_votante,
                Persona.nombres.label("nombre_votante"),
                Persona.apellidos.label("apellido_votante"),
                PosibleVotante.parentesco,
                PosibleVotante.domicilio,
                PosibleVotante.observaciones,
                Persona.direccion_residencia.label("direccion_padron"),
                Persona.telefono.label("telefono"),
                PosibleVotante.grado_seguridad,
                PosibleVotante.fecha_captacion,
                PosibleVotante.validacion_candidato,
                PosibleVotante.movilidad_propia,
                total_tels_subq.label("total_telefonos")
            ).outerjoin(Persona, PosibleVotante.cedula_votante == Persona.cedula).where(
                PosibleVotante.id_referente.in_(referente_ids)
            ).order_by(PosibleVotante.fecha_captacion.desc().nullslast())
            
            result = await session.execute(stmt)
            rows = result.all()
            has_subq = True
        except Exception as query_err:
            await session.rollback()
            print(f"Aviso en subquery de teléfonos mis-votantes, usando fallback: {query_err}")
            stmt_fallback = select(
                PosibleVotante.id,
                PosibleVotante.id_referente,
                PosibleVotante.cedula_votante,
                Persona.nombres.label("nombre_votante"),
                Persona.apellidos.label("apellido_votante"),
                PosibleVotante.parentesco,
                PosibleVotante.domicilio,
                PosibleVotante.observaciones,
                Persona.direccion_residencia.label("direccion_padron"),
                Persona.telefono.label("telefono"),
                PosibleVotante.grado_seguridad,
                PosibleVotante.fecha_captacion,
                PosibleVotante.validacion_candidato,
                PosibleVotante.movilidad_propia
            ).outerjoin(Persona, PosibleVotante.cedula_votante == Persona.cedula).where(
                PosibleVotante.id_referente.in_(referente_ids)
            ).order_by(PosibleVotante.fecha_captacion.desc().nullslast())
            
            result = await session.execute(stmt_fallback)
            rows = result.all()
            has_subq = False

        items = []
        for row in rows:
            t_tel = getattr(row, "total_telefonos", 0) if has_subq else (1 if row.telefono else 0)
            items.append({
                "id": row.id,
                "id_referente": row.id_referente,
                "cedula_votante": str(row.cedula_votante or ""),
                "nombre_votante": str(row.nombre_votante or "Sin Nombre"),
                "apellido_votante": str(row.apellido_votante or ""),
                "parentesco": row.parentesco,
                "domicilio": row.domicilio or row.direccion_padron or "",
                "observaciones": row.observaciones,
                "grado_seguridad": row.grado_seguridad if row.grado_seguridad is not None else 3,
                "fecha_captacion": row.fecha_captacion,
                "validacion_candidato": bool(row.validacion_candidato) if row.validacion_candidato is not None else False,
                "movilidad_propia": bool(row.movilidad_propia) if row.movilidad_propia is not None else False,
                "telefono": row.telefono,
                "total_telefonos": t_tel or (1 if row.telefono else 0)
            })
        return items
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener votantes: {str(e)}")

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

    # Si se proporcionó un número de teléfono y es nuevo o modificado
    if data.telefono is not None and data.telefono.strip():
        tel_limpio = data.telefono.strip()
        stmt_curr_tel = select(Persona.telefono).where(Persona.cedula == votante.cedula_votante)
        curr_tel = (await session.execute(stmt_curr_tel)).scalar()
        if curr_tel != tel_limpio:
            await session.execute(
                update(PersonaTelefono)
                .where(PersonaTelefono.cedula == votante.cedula_votante)
                .values(es_actual=False)
            )
            nuevo_tel = PersonaTelefono(
                cedula=votante.cedula_votante,
                telefono=tel_limpio,
                tipo=data.telefono_tipo or "Celular",
                observacion=data.telefono_observacion,
                id_usuario_registro=current_user.get("user_id"),
                fecha_registro=func.now(),
                es_actual=True
            )
            session.add(nuevo_tel)
            
            stmt_p = select(Persona).where(Persona.cedula == votante.cedula_votante)
            p_obj = (await session.execute(stmt_p)).scalar_one_or_none()
            if p_obj:
                p_obj.telefono = tel_limpio
    
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

        # Identificar cédulas solapadas dentro de los referentes visibles
        stmt_solapadas = (
            select(PosibleVotante.cedula_votante)
            .where(PosibleVotante.id_referente.in_(referente_ids))
            .group_by(PosibleVotante.cedula_votante)
            .having(func.count(PosibleVotante.id) > 1)
        )
        res_solapadas = await session.execute(stmt_solapadas)
        cedulas_solapadas = set(res_solapadas.scalars().all())

        solapados_por_referente = {}
        if cedulas_solapadas:
            stmt_solapados_ref = (
                select(
                    PosibleVotante.id_referente,
                    func.count(PosibleVotante.id)
                )
                .where(
                    PosibleVotante.id_referente.in_(referente_ids),
                    PosibleVotante.cedula_votante.in_(cedulas_solapadas)
                )
                .group_by(PosibleVotante.id_referente)
            )
            res_sr = await session.execute(stmt_solapados_ref)
            for ref_id, c_solapados in res_sr.all():
                solapados_por_referente[ref_id] = c_solapados

        resumen_referentes = []
        total_bruto = 0
        for r in referentes:
            stmt_count = select(func.count(PosibleVotante.id)).where(PosibleVotante.id_referente == r.id)
            count = (await session.execute(stmt_count)).scalar() or 0
            c_solap = solapados_por_referente.get(r.id, 0)
            resumen_referentes.append({
                "id_referente": r.id,
                "nombre_referente": r.nombre_referente,
                "cantidad_votantes": count,
                "cantidad_solapados": c_solap
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

@router.get("/dashboard/candidato/referente/{id_referente}/simpatizantes", response_model=SimpatizantesReferenteResponse)
async def get_referente_simpatizantes(
    id_referente: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el listado detallado de simpatizantes cargados por un referente específico,
    con indicación clara de si están solapados con otros referentes del candidato/campaña.
    """
    from hierarchy_utils import get_visible_referente_ids

    user_id = current_user["user_id"]
    user_role = current_user.get("role", "referente")

    referente_ids = await get_visible_referente_ids(user_id, user_role, session)

    if id_referente not in referente_ids:
        raise HTTPException(
            status_code=403, 
            detail="No tienes autorización para acceder a los simpatizantes de este referente"
        )

    stmt_ref = select(Referente).where(Referente.id == id_referente)
    referente_obj = (await session.execute(stmt_ref)).scalar_one_or_none()
    if not referente_obj:
        raise HTTPException(status_code=404, detail="Referente no encontrado")

    stmt_votantes = (
        select(
            PosibleVotante.id,
            PosibleVotante.cedula_votante,
            Persona.nombres,
            Persona.apellidos,
            Persona.telefono,
            PosibleVotante.domicilio,
            Persona.direccion_residencia.label("direccion_padron"),
            PosibleVotante.parentesco,
            PosibleVotante.grado_seguridad,
            PosibleVotante.observaciones,
            PosibleVotante.fecha_captacion,
            PosibleVotante.movilidad_propia,
            PadronElectoral.mesa,
            PadronElectoral.orden,
            RefLocal.descripcion.label("nombre_local")
        )
        .outerjoin(Persona, PosibleVotante.cedula_votante == Persona.cedula)
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
        .where(PosibleVotante.id_referente == id_referente)
        .order_by(PosibleVotante.fecha_captacion.desc().nullslast())
    )
    res_votantes = await session.execute(stmt_votantes)
    raw_votantes = res_votantes.all()

    if not raw_votantes:
        return {
            "id_referente": id_referente,
            "nombre_referente": referente_obj.nombre_referente,
            "total_simpatizantes": 0,
            "total_solapados": 0,
            "simpatizantes": []
        }

    cedulas = [v.cedula_votante for v in raw_votantes if v.cedula_votante]

    # Detectar solapamiento con otros referentes de la campaña visible
    stmt_overlap = (
        select(
            PosibleVotante.cedula_votante,
            PosibleVotante.id_referente,
            Referente.nombre_referente
        )
        .join(Referente, PosibleVotante.id_referente == Referente.id)
        .where(
            PosibleVotante.cedula_votante.in_(cedulas),
            PosibleVotante.id_referente.in_(referente_ids)
        )
    )
    res_overlap = await session.execute(stmt_overlap)
    
    overlap_map = {}
    cargas_propias = {}
    for r in res_overlap.all():
        ced = r.cedula_votante
        r_id = r.id_referente
        r_nombre = r.nombre_referente
        if ced not in overlap_map:
            overlap_map[ced] = []
        if r_id != id_referente:
            if r_nombre not in overlap_map[ced]:
                overlap_map[ced].append(r_nombre)
        else:
            cargas_propias[ced] = cargas_propias.get(ced, 0) + 1

    simpatizantes = []
    total_solapados = 0

    for v in raw_votantes:
        ced = v.cedula_votante
        otros = overlap_map.get(ced, [])
        mismo_duplicado = cargas_propias.get(ced, 0) > 1
        
        es_solapado = len(otros) > 0 or mismo_duplicado
        if es_solapado:
            total_solapados += 1

        nombres_comp = f"{v.nombres or ''} {v.apellidos or ''}".strip()
        if not nombres_comp:
            nombres_comp = "Sin nombre registrado"

        simpatizantes.append({
            "id": v.id,
            "cedula": ced,
            "nombre_completo": nombres_comp,
            "telefono": v.telefono,
            "domicilio": v.domicilio or v.direccion_padron or "",
            "parentesco": v.parentesco,
            "grado_seguridad": v.grado_seguridad if v.grado_seguridad is not None else 3,
            "observaciones": v.observaciones,
            "fecha_captacion": v.fecha_captacion,
            "movilidad_propia": bool(v.movilidad_propia),
            "nombre_local": v.nombre_local or "Local no identificado",
            "mesa": v.mesa,
            "orden": v.orden,
            "solapado": es_solapado,
            "otros_referentes": otros,
            "duplicado_mismo_referente": mismo_duplicado
        })

    return {
        "id_referente": id_referente,
        "nombre_referente": referente_obj.nombre_referente,
        "total_simpatizantes": len(simpatizantes),
        "total_solapados": total_solapados,
        "simpatizantes": simpatizantes
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

# ===== GESTIÓN HISTÓRICA DE TELÉFONOS DE PERSONAS / SIMPATIZANTES =====

_PERSONA_TELEFONOS_TABLE_ENSURED = False

async def ensure_persona_telefonos_table(session: AsyncSession):
    """Garantiza que la tabla electoral.persona_telefonos e índices existan en la BD"""
    global _PERSONA_TELEFONOS_TABLE_ENSURED
    if _PERSONA_TELEFONOS_TABLE_ENSURED:
        return
    try:
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS electoral.persona_telefonos (
                id SERIAL PRIMARY KEY,
                cedula VARCHAR(20) NOT NULL REFERENCES electoral.personas(cedula) ON DELETE CASCADE,
                telefono VARCHAR(50) NOT NULL,
                tipo VARCHAR(50) DEFAULT 'Celular',
                observacion VARCHAR(255),
                id_usuario_registro INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
                fecha_registro TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                es_actual BOOLEAN DEFAULT TRUE
            );
            CREATE INDEX IF NOT EXISTS idx_persona_telefonos_cedula ON electoral.persona_telefonos(cedula);
            CREATE INDEX IF NOT EXISTS idx_persona_telefonos_fecha ON electoral.persona_telefonos(fecha_registro DESC);
            CREATE INDEX IF NOT EXISTS idx_persona_telefonos_actual ON electoral.persona_telefonos(cedula, es_actual);
        """))
        await session.commit()
        _PERSONA_TELEFONOS_TABLE_ENSURED = True
    except Exception as e:
        await session.rollback()
        print(f"Aviso al auto-crear tabla persona_telefonos: {e}")

@router.get("/personas/{cedula}/telefonos", response_model=List[PersonaTelefonoResponse])
async def get_persona_telefonos(
    cedula: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene el historial cronológico de números de teléfono registrados para una persona"""
    await ensure_persona_telefonos_table(session)
    stmt = (
        select(
            PersonaTelefono.id,
            PersonaTelefono.cedula,
            PersonaTelefono.telefono,
            PersonaTelefono.tipo,
            PersonaTelefono.observacion,
            PersonaTelefono.id_usuario_registro,
            Usuario.nombre_completo.label("nombre_usuario_registro"),
            PersonaTelefono.fecha_registro,
            PersonaTelefono.es_actual
        )
        .outerjoin(Usuario, PersonaTelefono.id_usuario_registro == Usuario.id)
        .where(PersonaTelefono.cedula == cedula)
        .order_by(PersonaTelefono.fecha_registro.desc())
    )
    try:
        result = await session.execute(stmt)
        items = []
        for r in result.all():
            items.append({
                "id": r.id,
                "cedula": r.cedula,
                "telefono": r.telefono,
                "tipo": r.tipo,
                "observacion": r.observacion,
                "id_usuario_registro": r.id_usuario_registro,
                "nombre_usuario_registro": r.nombre_usuario_registro or "Referente / Sistema",
                "fecha_registro": r.fecha_registro,
                "es_actual": r.es_actual
            })
        return items
    except Exception as e:
        await session.rollback()
        print(f"Aviso en get_persona_telefonos para cédula {cedula}: {e}")
        return []

@router.post("/personas/{cedula}/telefonos", response_model=PersonaTelefonoResponse)
async def add_persona_telefono(
    cedula: str,
    data: PersonaTelefonoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Agrega un nuevo número de teléfono para la persona y lo establece como el actual"""
    try:
        tel_limpio = data.telefono.strip()
        if not tel_limpio:
            raise HTTPException(status_code=400, detail="El número de teléfono no puede estar vacío")

        # 0. Asegurar que la tabla persona_telefonos existe en BD
        await ensure_persona_telefonos_table(session)

        # 1. Asegurar que la persona existe en electoral.personas para no violar la Foreign Key
        stmt_p = select(Persona).where(Persona.cedula == cedula)
        persona_obj = (await session.execute(stmt_p)).scalar_one_or_none()
        if not persona_obj:
            persona_obj = Persona(
                cedula=cedula,
                nombres="",
                apellidos="",
                telefono=tel_limpio[:20],
                fecha_registro=datetime.utcnow()
            )
            session.add(persona_obj)
            await session.flush()
        else:
            persona_obj.telefono = tel_limpio[:20]

        # 2. Desmarcar teléfonos anteriores como actuales
        await session.execute(
            update(PersonaTelefono)
            .where(PersonaTelefono.cedula == cedula)
            .values(es_actual=False)
        )

        # 3. Validar id_usuario_registro para evitar violar la Foreign Key de sistema.usuarios
        user_id = current_user.get("user_id")
        valid_user_id = None
        if user_id:
            try:
                stmt_u_chk = select(Usuario.id).where(Usuario.id == int(user_id))
                valid_user_id = (await session.execute(stmt_u_chk)).scalar()
            except Exception:
                valid_user_id = None

        # 4. Insertar nuevo teléfono
        ahora = datetime.utcnow()
        nuevo_tel = PersonaTelefono(
            cedula=cedula,
            telefono=tel_limpio[:50],
            tipo=data.tipo or "Celular",
            observacion=data.observacion,
            id_usuario_registro=valid_user_id,
            fecha_registro=ahora,
            es_actual=True
        )
        session.add(nuevo_tel)
        await session.commit()
        await session.refresh(nuevo_tel)

        # 5. Obtener nombre legible del usuario que registra
        nombre_user = current_user.get("nombre_completo") or "Referente"
        if valid_user_id:
            stmt_u = select(Usuario.nombre_completo).where(Usuario.id == valid_user_id)
            db_nombre = (await session.execute(stmt_u)).scalar()
            if db_nombre:
                nombre_user = db_nombre

        return {
            "id": nuevo_tel.id,
            "cedula": nuevo_tel.cedula,
            "telefono": nuevo_tel.telefono,
            "tipo": nuevo_tel.tipo or "Celular",
            "observacion": nuevo_tel.observacion,
            "id_usuario_registro": nuevo_tel.id_usuario_registro,
            "nombre_usuario_registro": nombre_user,
            "fecha_registro": nuevo_tel.fecha_registro or ahora,
            "es_actual": True
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        import traceback
        traceback.print_exc()
        print(f"Error al agregar teléfono para cédula {cedula}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al agregar teléfono: {str(e)}")

@router.delete("/personas/{cedula}/telefonos/{telefono_id}")
async def delete_persona_telefono(
    cedula: str,
    telefono_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Elimina un teléfono del historial de una persona"""
    try:
        await ensure_persona_telefonos_table(session)
        stmt = select(PersonaTelefono).where(
            and_(PersonaTelefono.id == telefono_id, PersonaTelefono.cedula == cedula)
        )
        tel = (await session.execute(stmt)).scalar_one_or_none()
        if not tel:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")

        estaba_actual = tel.es_actual
        await session.delete(tel)
        await session.flush()

        if estaba_actual:
            # Reasignar el más nuevo restante como actual
            stmt_next = (
                select(PersonaTelefono)
                .where(PersonaTelefono.cedula == cedula)
                .order_by(PersonaTelefono.fecha_registro.desc())
                .limit(1)
            )
            sig = (await session.execute(stmt_next)).scalar_one_or_none()
            nuevo_tel_val = None
            if sig:
                sig.es_actual = True
                nuevo_tel_val = sig.telefono
            
            stmt_p = select(Persona).where(Persona.cedula == cedula)
            persona_obj = (await session.execute(stmt_p)).scalar_one_or_none()
            if persona_obj:
                persona_obj.telefono = nuevo_tel_val[:20] if nuevo_tel_val else None

        await session.commit()
        return {"message": "Teléfono eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al eliminar teléfono: {str(e)}")

@router.put("/personas/{cedula}/telefonos/{telefono_id}/marcar-actual")
async def set_persona_telefono_actual(
    cedula: str,
    telefono_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Establece un teléfono existente como el actual"""
    try:
        await ensure_persona_telefonos_table(session)
        stmt = select(PersonaTelefono).where(
            and_(PersonaTelefono.id == telefono_id, PersonaTelefono.cedula == cedula)
        )
        target = (await session.execute(stmt)).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Teléfono no encontrado")

        # Desmarcar todos los teléfonos de esta cédula
        await session.execute(
            update(PersonaTelefono).where(PersonaTelefono.cedula == cedula).values(es_actual=False)
        )
        target.es_actual = True

        # Sincronizar en Persona.telefono
        stmt_p = select(Persona).where(Persona.cedula == cedula)
        persona_obj = (await session.execute(stmt_p)).scalar_one_or_none()
        if persona_obj:
            persona_obj.telefono = target.telefono[:20] if target.telefono else None

        await session.commit()
        return {"message": "Teléfono marcado como actual exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al marcar teléfono como actual: {str(e)}")


