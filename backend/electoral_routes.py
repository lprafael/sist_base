from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from typing import List, Optional

from database import get_session
from models import Padron, Caudillo, PosibleVotante, Candidato, Usuario, AnrPadron, RefDepartamento, RefDistrito, RefSeccional, RefLocal
from schemas import PadronResponse, CaptacionCreate, PosibleVotanteResponse, DashboardCandidatoResponse, ResumenCaudillo, AnrPadronResponse
from security import get_current_user

router = APIRouter(prefix="/api/electoral", tags=["Gestión Electoral"])


@router.get("/padron/search", response_model=List[AnrPadronResponse])
async def search_padron(
    query: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Busca personas en el padrón por cédula o nombre con nombres descriptivos"""
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="La búsqueda requiere al menos 3 caracteres")
    
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
    ).where(
        or_(
            AnrPadron.cedula.ilike(f"%{query}%"),
            AnrPadron.nombres.ilike(f"%{query}%"),
            AnrPadron.apellidos.ilike(f"%{query}%")
        )
    ).limit(20)
    
    result = await session.execute(stmt)
    # result.all() devolverá filas que Pydantic puede mapear a AnrPadronResponse
    return result.all()




@router.post("/captacion", status_code=status.HTTP_201_CREATED)
async def registrar_captacion(
    data: CaptacionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Registra un simpatizante vinculado al caudillo actual"""
    print(f"DEBUG: Registrando captación para usuario_id={current_user.get('user_id')}")
    print(f"DEBUG: Datos recibidos: {data.dict()}")
    # Buscar el caudillo vinculado al usuario actual

    stmt = select(Caudillo).where(Caudillo.id_usuario_sistema == current_user["user_id"])
    result = await session.execute(stmt)
    caudillo = result.scalar_one_or_none()
    
    if not caudillo:
        print(f"DEBUG: ERROR - Caudillo no encontrado para usuario_id={current_user['user_id']}")
        raise HTTPException(status_code=403, detail="El usuario no tiene un perfil de caudillo asignado")

    print(f"DEBUG: Caudillo encontrado: id={caudillo.id}, nombre={caudillo.nombre_caudillo}")
    # Verificar si ya existe en su lista
    stmt_check = select(PosibleVotante).where(
        and_(
            PosibleVotante.id_caudillo == caudillo.id,
            PosibleVotante.cedula_votante == data.cedula_votante
        )
    )
    existing = await session.execute(stmt_check)
    if existing.scalar_one_or_none():
        print(f"DEBUG: El votante {data.cedula_votante} ya existe para este caudillo")
        raise HTTPException(status_code=400, detail="Este votante ya está en tu lista")

    try:
        nuevo_votante = PosibleVotante(
            id_caudillo=caudillo.id,
            cedula_votante=data.cedula_votante,
            parentesco=data.parentesco,
            grado_seguridad=data.grado_seguridad,
            observaciones=data.observaciones,
            latitud=data.latitud,
            longitud=data.longitud
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
    """Obtiene la lista de votantes según la jerarquía del usuario:
    - caudillo: solo su propia lista
    - concejal: su lista + la de sus caudillos
    - intendente: toda la rama (concejales + sus caudillos + caudillos propios)
    - admin: todos
    """
    from hierarchy_utils import get_visible_caudillo_ids
    
    user_id = current_user["user_id"]
    user_role = current_user.get("role", "caudillo")
    
    caudillo_ids = await get_visible_caudillo_ids(user_id, user_role, session)
    
    if not caudillo_ids:
        return []

    stmt = select(
        PosibleVotante.id,
        PosibleVotante.id_caudillo,
        PosibleVotante.cedula_votante,
        AnrPadron.nombres.label("nombre_votante"),
        AnrPadron.apellidos.label("apellido_votante"),
        PosibleVotante.parentesco,
        PosibleVotante.grado_seguridad,
        PosibleVotante.fecha_captacion,
        PosibleVotante.validacion_candidato
    ).outerjoin(AnrPadron, PosibleVotante.cedula_votante == AnrPadron.cedula).where(
        PosibleVotante.id_caudillo.in_(caudillo_ids)
    ).order_by(PosibleVotante.fecha_captacion.desc())
    
    result = await session.execute(stmt)
    items = []
    for row in result.all():
        items.append({
            "id": row.id,
            "id_caudillo": row.id_caudillo,
            "cedula_votante": row.cedula_votante,
            "nombre_votante": row.nombre_votante or "Sin Nombre",
            "apellido_votante": row.apellido_votante or "",
            "parentesco": row.parentesco,
            "grado_seguridad": row.grado_seguridad,
            "fecha_captacion": row.fecha_captacion,
            "validacion_candidato": row.validacion_candidato
        })
    return items

@router.get("/dashboard/candidato", response_model=DashboardCandidatoResponse)
async def get_dashboard_candidato(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene estadísticas basadas en la jerarquía del usuario:
    - caudillo: solo sus propios simpatizantes
    - concejal: sus simpatizantes + los de sus caudillos
    - intendente: toda su rama
    - admin: todo el sistema
    """
    from hierarchy_utils import get_visible_caudillo_ids

    user_id = current_user["user_id"]
    user_role = current_user.get("role", "caudillo")

    caudillo_ids = await get_visible_caudillo_ids(user_id, user_role, session)

    if not caudillo_ids:
        return {
            "total_votantes_unicos": 0,
            "total_votantes_bruto": 0,
            "caudillos": [],
            "puntos_calor": []
        }

    # Caudillos con datos completos para el ranking
    stmt_caudillos = select(Caudillo).where(Caudillo.id.in_(caudillo_ids))
    res_caudillos = await session.execute(stmt_caudillos)
    caudillos = res_caudillos.scalars().all()

    # Votantes únicos
    stmt_unicos = select(func.count(func.distinct(PosibleVotante.cedula_votante))).where(
        PosibleVotante.id_caudillo.in_(caudillo_ids)
    )
    res_unicos = await session.execute(stmt_unicos)
    total_unicos = res_unicos.scalar() or 0

    # Resumen por caudillo (ranking)
    resumen_caudillos = []
    total_bruto = 0
    for c in caudillos:
        stmt_count = select(func.count(PosibleVotante.id)).where(PosibleVotante.id_caudillo == c.id)
        count = (await session.execute(stmt_count)).scalar() or 0
        resumen_caudillos.append({
            "id_caudillo": c.id,
            "nombre_caudillo": c.nombre_caudillo,
            "cantidad_votantes": count
        })
        total_bruto += count
    
    resumen_caudillos.sort(key=lambda x: x["cantidad_votantes"], reverse=True)

    # Mapa de calor
    stmt_puntos = select(
        PosibleVotante.latitud, 
        PosibleVotante.longitud,
        PosibleVotante.grado_seguridad
    ).where(
        and_(
            PosibleVotante.id_caudillo.in_(caudillo_ids),
            PosibleVotante.latitud != None,
            PosibleVotante.longitud != None
        )
    )
    puntos_res = await session.execute(stmt_puntos)
    puntos_calor = [
        {"lat": p[0], "lng": p[1], "weight": p[2]} 
        for p in puntos_res.all()
    ]

    return {
        "total_votantes_unicos": total_unicos,
        "total_votantes_bruto": total_bruto,
        "caudillos": resumen_caudillos,
        "puntos_calor": puntos_calor
    }

# --- ENDPOINTS PARA CATÁLOGOS (CATÁLOGOS) ---

@router.get("/catalogos/departamentos")
async def get_catalog_departamentos(session: AsyncSession = Depends(get_session)):
    """Lista todos los departamentos registrados"""
    res = await session.execute(select(RefDepartamento.id, RefDepartamento.descripcion).order_by(RefDepartamento.descripcion))
    return [{"id": r[0], "descripcion": r[1]} for r in res.all()]

@router.get("/catalogos/distritos/{departamento_id}")
async def get_catalog_distritos(departamento_id: int, session: AsyncSession = Depends(get_session)):
    """Lista los distritos de un departamento específico"""
    res = await session.execute(
        select(RefDistrito.id, RefDistrito.descripcion)
        .where(RefDistrito.departamento_id == departamento_id)
        .order_by(RefDistrito.descripcion)
    )
    return [{"id": r[0], "descripcion": r[1]} for r in res.all()]

