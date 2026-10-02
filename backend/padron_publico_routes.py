# padron_publico_routes.py
# Endpoint público y temporal para consulta de padrón en elecciones municipales
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func, distinct, desc, case
from sqlalchemy.orm import aliased
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

from database import get_session
from security import get_current_user
from models import (
    Persona, PadronElectoral, RefLocal, RefDistrito, RefDepartamento, 
    Eleccion, Padron, LogConsultaPadron, LogVisitaWeb, Usuario, 
    LogAcceso, EquiposAutorizados, LocalVotacion
)

router = APIRouter(prefix="/api/public/padron", tags=["Padrón Público"])

# Horario oficial Paraguay: UTC-3
PARAGUAY_TZ = timezone(timedelta(hours=-3))
INICIO_VIGENCIA = datetime(2026, 10, 2, 0, 0, 0, tzinfo=PARAGUAY_TZ)
FIN_VIGENCIA = datetime(2026, 10, 4, 23, 59, 59, 999999, tzinfo=PARAGUAY_TZ)

def validar_periodo_consulta():
    now_py = datetime.now(PARAGUAY_TZ)
    if now_py < INICIO_VIGENCIA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La consulta del padrón electoral estará disponible a partir del viernes 2 de octubre de 2026."
        )
    if now_py > FIN_VIGENCIA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El periodo especial de consulta del padrón para las elecciones municipales finalizó el domingo 4 de octubre de 2026 a las 23:59 hs."
        )

@router.get("/estado")
async def get_estado_consulta():
    """Devuelve si la consulta pública está activa según la ventana temporal configurada"""
    now_py = datetime.now(PARAGUAY_TZ)
    activo = (INICIO_VIGENCIA <= now_py <= FIN_VIGENCIA)
    return {
        "activo": activo,
        "ahora": now_py.isoformat(),
        "inicio": INICIO_VIGENCIA.isoformat(),
        "fin": FIN_VIGENCIA.isoformat(),
        "mensaje": (
            "Consulta de padrón electoral habilitada para las elecciones municipales hasta el domingo 4 de octubre." 
            if activo else 
            "El periodo especial de consulta del padrón para las elecciones municipales finalizó el domingo 4 de octubre a las 23:59 hs."
        )
    }

class VisitaDTO(BaseModel):
    device_id: str
    path: Optional[str] = "/"

@router.post("/visita")
async def registrar_visita(
    payload: VisitaDTO,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """Registra una visita web anónima de un equipo/dispositivo"""
    try:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        visita = LogVisitaWeb(
            device_id=payload.device_id,
            path=payload.path or "/",
            ip_address=ip,
            user_agent=ua
        )
        session.add(visita)
        await session.commit()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

class ConsultaPadronDTO(BaseModel):
    cedula: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    device_id: Optional[str] = None

async def guardar_log_consulta(
    session: AsyncSession,
    cedula: str,
    fecha_nac: Optional[str],
    device_id: Optional[str],
    ip: Optional[str],
    ua: Optional[str],
    encontrado: bool,
    nombre: Optional[str] = None,
    mesa: Optional[int] = None,
    orden: Optional[int] = None,
    local: Optional[str] = None,
    distrito: Optional[str] = None,
    departamento: Optional[str] = None
):
    try:
        log = LogConsultaPadron(
            cedula_consultada=cedula,
            fecha_nacimiento_ingresada=fecha_nac,
            device_id=device_id,
            ip_address=ip,
            user_agent=ua,
            encontrado=encontrado,
            nombre_elector=nombre,
            mesa=mesa,
            orden=orden,
            local_votacion=local,
            distrito=distrito,
            departamento=departamento
        )
        session.add(log)
        await session.commit()
    except Exception as e:
        print(f"Aviso al guardar log de consulta: {e}")

@router.api_route("/consulta", methods=["GET", "POST"])
async def consultar_padron_general(
    request: Request,
    cedula: Optional[str] = Query(None, description="Número de Cédula de Identidad"),
    fecha_nacimiento: Optional[str] = Query(None, description="Fecha de Nacimiento (YYYY-MM-DD o DD/MM/YYYY)"),
    device_id: Optional[str] = Query(None, description="ID del dispositivo"),
    payload: Optional[ConsultaPadronDTO] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Consulta pública y temporal del padrón general para elecciones municipales.
    Requiere Número de Cédula y Fecha de Nacimiento.
    Válido únicamente hasta las 23:59:59 del domingo 4 de octubre de 2026.
    """
    # 1. Validar ventana temporal
    validar_periodo_consulta()

    # 2. Extraer parámetros y metadatos del cliente
    ip_cliente = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    ci_val = (payload.cedula if payload and payload.cedula else cedula) or ""
    fec_val = (payload.fecha_nacimiento if payload and payload.fecha_nacimiento else fecha_nacimiento) or ""
    dev_val = (payload.device_id if payload and payload.device_id else device_id) or "desconocido"

    ci_limpia = "".join(filter(str.isdigit, str(ci_val).strip()))
    if not ci_limpia:
        raise HTTPException(status_code=400, detail="Debe ingresar un número de cédula válido.")

    if not fec_val:
        raise HTTPException(status_code=400, detail="Debe ingresar su fecha de nacimiento.")

    # 3. Parsear fecha de nacimiento
    try:
        fec_str = fec_val.strip()
        if "/" in fec_str:
            fecha_nac_dt = datetime.strptime(fec_str, "%d/%m/%Y").date()
        else:
            fecha_nac_dt = datetime.strptime(fec_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail="Formato de fecha inválido. Utilice el formato AAAA-MM-DD o DD/MM/AAAA."
        )

    # 4. Buscar persona en electoral.personas
    stmt_persona = select(Persona).where(Persona.cedula == ci_limpia)
    res_persona = await session.execute(stmt_persona)
    persona = res_persona.scalar_one_or_none()

    # Si no está en electoral.personas, revisar en electoral.padron como fallback
    if not persona:
        stmt_padron_fb = select(Padron).where(Padron.cedula == ci_limpia)
        res_padron_fb = await session.execute(stmt_padron_fb)
        p_fb = res_padron_fb.scalar_one_or_none()
        if not p_fb:
            await guardar_log_consulta(
                session, ci_limpia, fec_val, dev_val, ip_cliente, user_agent, False
            )
            raise HTTPException(
                status_code=404,
                detail="No se encontró ningún elector registrado con la cédula ingresada en el padrón electoral."
            )
        if p_fb.fecha_nacimiento and p_fb.fecha_nacimiento != fecha_nac_dt:
            await guardar_log_consulta(
                session, ci_limpia, fec_val, dev_val, ip_cliente, user_agent, False,
                nombre=f"{p_fb.nombre} {p_fb.apellido_paterno}".strip()
            )
            raise HTTPException(
                status_code=400,
                detail="La fecha de nacimiento no coincide con el registro de la cédula ingresada. Verifique sus datos."
            )
        
        nombre_completo_fb = f"{p_fb.nombre} {p_fb.apellido_paterno} {p_fb.apellido_materno}".strip()
        await guardar_log_consulta(
            session, ci_limpia, fec_val, dev_val, ip_cliente, user_agent, True,
            nombre=nombre_completo_fb,
            mesa=p_fb.mesa_nro,
            orden=p_fb.orden_nro,
            local=p_fb.direccion_padron or "Local Asignado",
            distrito=p_fb.distrito,
            departamento=p_fb.departamento
        )
        return {
            "encontrado": True,
            "cedula": p_fb.cedula,
            "nombres": p_fb.nombre,
            "apellidos": f"{p_fb.apellido_paterno} {p_fb.apellido_materno}".strip(),
            "nombre_completo": nombre_completo_fb,
            "mesa": p_fb.mesa_nro,
            "orden": p_fb.orden_nro,
            "local_votacion": p_fb.direccion_padron or "Local Asignado",
            "direccion_local": p_fb.direccion_padron or "",
            "distrito": p_fb.distrito or "",
            "departamento": p_fb.departamento or "",
            "eleccion": "Elecciones Municipales"
        }

    # Verificar fecha de nacimiento si está registrada en personas
    if persona.fecha_nacimiento and persona.fecha_nacimiento != fecha_nac_dt:
        await guardar_log_consulta(
            session, ci_limpia, fec_val, dev_val, ip_cliente, user_agent, False,
            nombre=f"{persona.nombres} {persona.apellidos}".strip()
        )
        raise HTTPException(
            status_code=400,
            detail="La fecha de nacimiento no coincide con el registro de la cédula ingresada. Verifique sus datos."
        )

    # 5. Obtener los datos del padrón electoral con sus referencias y máxima prioridad a datos completos
    RefLocalExacto = aliased(RefLocal)
    RefLocalDistrito = aliased(RefLocal)

    stmt_padron = (
        select(
            PadronElectoral.eleccion_id,
            PadronElectoral.mesa,
            PadronElectoral.orden,
            PadronElectoral.local_id,
            PadronElectoral.distrito_id,
            PadronElectoral.departamento_id,
            func.coalesce(
                RefLocalExacto.descripcion,
                RefLocalDistrito.descripcion,
                LocalVotacion.nombre_local
            ).label("nombre_local"),
            func.coalesce(
                RefLocalExacto.domicilio,
                RefLocalDistrito.domicilio,
                LocalVotacion.direccion
            ).label("direccion_local"),
            RefDistrito.descripcion.label("nombre_distrito"),
            RefDepartamento.descripcion.label("nombre_departamento"),
            Eleccion.nombre.label("nombre_eleccion"),
            Eleccion.tipo.label("tipo_eleccion")
        )
        .outerjoin(
            RefLocalExacto,
            and_(
                PadronElectoral.departamento_id == RefLocalExacto.departamento_id,
                PadronElectoral.distrito_id == RefLocalExacto.distrito_id,
                PadronElectoral.seccional_id == RefLocalExacto.seccional_id,
                PadronElectoral.local_id == RefLocalExacto.local_id,
            ),
        )
        .outerjoin(
            RefLocalDistrito,
            and_(
                PadronElectoral.departamento_id == RefLocalDistrito.departamento_id,
                PadronElectoral.distrito_id == RefLocalDistrito.distrito_id,
                PadronElectoral.local_id == RefLocalDistrito.local_id,
            ),
        )
        .outerjoin(
            LocalVotacion,
            PadronElectoral.local_id == LocalVotacion.id
        )
        .outerjoin(
            RefDistrito,
            and_(
                PadronElectoral.departamento_id == RefDistrito.departamento_id,
                PadronElectoral.distrito_id == RefDistrito.id,
            ),
        )
        .outerjoin(
            RefDepartamento,
            PadronElectoral.departamento_id == RefDepartamento.id,
        )
        .outerjoin(
            Eleccion,
            PadronElectoral.eleccion_id == Eleccion.id
        )
        .where(PadronElectoral.cedula == ci_limpia)
        .order_by(
            # 1. Priorizar registros con número de mesa válido
            case(
                (and_(PadronElectoral.mesa.isnot(None), PadronElectoral.mesa > 0), 1),
                else_=2
            ),
            # 2. Priorizar registros con local de votación resuelto
            case(
                (func.coalesce(RefLocalExacto.descripcion, RefLocalDistrito.descripcion, LocalVotacion.nombre_local).isnot(None), 1),
                else_=2
            ),
            # 3. Priorizar Elección 3 (Padrón Nacional TSJE / Elecciones Municipales Generales)
            case(
                (PadronElectoral.eleccion_id == 3, 1),
                (Eleccion.tipo == 'Generales', 2),
                else_=3
            ),
            # 4. Elección más reciente
            PadronElectoral.eleccion_id.desc()
        )
    )
    res_padron = await session.execute(stmt_padron)
    padron_data = res_padron.first()

    nombre_completo = f"{persona.nombres} {persona.apellidos}".strip()

    # Extraer valores preliminares
    mesa_val = padron_data.mesa if (padron_data and padron_data.mesa and padron_data.mesa > 0) else None
    orden_val = padron_data.orden if (padron_data and padron_data.orden and padron_data.orden > 0) else None
    local_val = padron_data.nombre_local if (padron_data and padron_data.nombre_local) else None
    direccion_val = padron_data.direccion_local if (padron_data and padron_data.direccion_local) else ""
    distrito_val = padron_data.nombre_distrito if (padron_data and padron_data.nombre_distrito) else ""
    departamento_val = padron_data.nombre_departamento if (padron_data and padron_data.nombre_departamento) else ""
    eleccion_val = (
        padron_data.nombre_eleccion if (padron_data and padron_data.nombre_eleccion) else "Elecciones Municipales"
    )

    # Si aún no tenemos mesa o local, consultar fallback electoral.padron
    if not mesa_val or not local_val:
        stmt_fb = select(Padron).where(Padron.cedula == ci_limpia)
        res_fb = await session.execute(stmt_fb)
        p_fb = res_fb.scalar_one_or_none()
        if p_fb:
            if not mesa_val and p_fb.mesa_nro and p_fb.mesa_nro > 0:
                mesa_val = p_fb.mesa_nro
            if not orden_val and p_fb.orden_nro and p_fb.orden_nro > 0:
                orden_val = p_fb.orden_nro
            if not local_val and p_fb.direccion_padron:
                local_val = p_fb.direccion_padron
            if not distrito_val and p_fb.distrito:
                distrito_val = p_fb.distrito
            if not departamento_val and p_fb.departamento:
                departamento_val = p_fb.departamento

    # Si aún falta nombre de local pero tenemos distrito y departamento del elector
    if not local_val and padron_data and padron_data.departamento_id and padron_data.distrito_id and padron_data.local_id:
        stmt_loc_d = select(RefLocal.descripcion, RefLocal.domicilio).where(
            and_(
                RefLocal.departamento_id == padron_data.departamento_id,
                RefLocal.distrito_id == padron_data.distrito_id,
                RefLocal.local_id == padron_data.local_id
            )
        ).limit(1)
        res_loc_d = await session.execute(stmt_loc_d)
        row_loc_d = res_loc_d.first()
        if row_loc_d and row_loc_d[0]:
            local_val = row_loc_d[0]
            if not direccion_val:
                direccion_val = row_loc_d[1] or ""

    if not padron_data and not mesa_val and not local_val:
        await guardar_log_consulta(
            session, ci_limpia, fec_val, dev_val, ip_cliente, user_agent, False,
            nombre=nombre_completo
        )
        raise HTTPException(
            status_code=404,
            detail=f"La persona con Cédula N° {ci_limpia} figura en el registro pero no tiene mesa o local asignado para estas elecciones."
        )

    # Registrar log exitoso
    await guardar_log_consulta(
        session, ci_limpia, fec_val, dev_val, ip_cliente, user_agent, True,
        nombre=nombre_completo,
        mesa=mesa_val,
        orden=orden_val,
        local=local_val,
        distrito=distrito_val,
        departamento=departamento_val
    )

    return {
        "encontrado": True,
        "cedula": persona.cedula,
        "nombres": persona.nombres,
        "apellidos": persona.apellidos,
        "nombre_completo": nombre_completo,
        "mesa": mesa_val,
        "orden": orden_val,
        "local_votacion": local_val or "Local en proceso de asignación",
        "direccion_local": direccion_val,
        "distrito": distrito_val,
        "departamento": departamento_val,
        "eleccion": eleccion_val
    }

# =========================================================================
# ENDPOINTS ADMINISTRATIVOS: ESTADÍSTICAS DE EQUIPOS, VISITAS Y PADRÓN
# =========================================================================

@router.get("/estadisticas/admin")
async def get_estadisticas_control_admin(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna métricas ejecutivas para el Administrador:
    - Cantidad de usuarios registrados (por rol)
    - Cantidad de equipos únicos
    - Cantidad de visitas totales
    - Cuántas veces se consultó el padrón público
    - Cantidad de cédulas únicas consultadas
    - Cantidad de equipos únicos que consultaron el padrón
    - Últimas consultas al padrón registradas
    """
    rol = (current_user.get("rol") or "").lower()
    if rol not in ["admin", "candidato_principal", "equipo_electoral"]:
        raise HTTPException(status_code=403, detail="No autorizado para ver estadísticas de control")

    # 1. Total de usuarios registrados y por rol
    res_users = await session.execute(select(Usuario.rol, func.count(Usuario.id)).group_by(Usuario.rol))
    usuarios_por_rol = {row[0]: row[1] for row in res_users.all()}
    total_usuarios = sum(usuarios_por_rol.values())

    # 2. Total de visitas web registradas y accesos al sistema
    res_visitas = await session.execute(select(func.count(LogVisitaWeb.id)))
    total_visitas_web = res_visitas.scalar() or 0

    res_accesos = await session.execute(select(func.count(LogAcceso.id)))
    total_accesos_sistema = res_accesos.scalar() or 0
    total_accesos = total_visitas_web + total_accesos_sistema

    # 3. Cantidad de equipos únicos totales (device_id en visitas + consultas + autorizados)
    stmt_visitas_dev = select(LogVisitaWeb.device_id).where(LogVisitaWeb.device_id != None)
    stmt_consultas_dev = select(LogConsultaPadron.device_id).where(LogConsultaPadron.device_id != None)
    stmt_auth_dev = select(EquiposAutorizados.device_id).where(EquiposAutorizados.device_id != None)
    
    union_devices = stmt_visitas_dev.union(stmt_consultas_dev).union(stmt_auth_dev).subquery()
    res_devices = await session.execute(select(func.count(distinct(union_devices.c.device_id))))
    total_equipos_unicos = res_devices.scalar() or 0

    # 4. Métricas de Consulta del Padrón Público
    res_padron_total = await session.execute(select(func.count(LogConsultaPadron.id)))
    total_consultas_padron = res_padron_total.scalar() or 0

    res_padron_exitosas = await session.execute(
        select(func.count(LogConsultaPadron.id)).where(LogConsultaPadron.encontrado == True)
    )
    consultas_exitosas = res_padron_exitosas.scalar() or 0

    res_padron_fallidas = await session.execute(
        select(func.count(LogConsultaPadron.id)).where(LogConsultaPadron.encontrado == False)
    )
    consultas_fallidas = res_padron_fallidas.scalar() or 0

    res_cedulas_unicas = await session.execute(select(func.count(distinct(LogConsultaPadron.cedula_consultada))))
    cedulas_unicas_consultadas = res_cedulas_unicas.scalar() or 0

    res_equipos_padron = await session.execute(select(func.count(distinct(LogConsultaPadron.device_id))))
    equipos_consultaron_padron = res_equipos_padron.scalar() or 0

    # 5. Últimas 50 consultas realizadas al padrón
    stmt_ultimas = select(LogConsultaPadron).order_by(desc(LogConsultaPadron.fecha_consulta)).limit(50)
    res_ultimas = await session.execute(stmt_ultimas)
    ultimas_consultas = [
        {
            "id": c.id,
            "cedula": c.cedula_consultada,
            "fecha": c.fecha_consulta.isoformat() if c.fecha_consulta else None,
            "device_id": c.device_id,
            "ip_address": c.ip_address,
            "encontrado": c.encontrado,
            "nombre_elector": c.nombre_elector,
            "mesa": c.mesa,
            "orden": c.orden,
            "local_votacion": c.local_votacion,
            "distrito": c.distrito,
            "departamento": c.departamento
        }
        for c in res_ultimas.scalars().all()
    ]

    return {
        "usuarios": {
            "total": total_usuarios,
            "por_rol": usuarios_por_rol
        },
        "equipos": {
            "total_unicos": total_equipos_unicos,
            "en_padron": equipos_consultaron_padron
        },
        "visitas": {
            "total_accesos": total_accesos,
            "visitas_web": total_visitas_web,
            "accesos_usuarios": total_accesos_sistema
        },
        "padron_publico": {
            "total_consultas": total_consultas_padron,
            "cedulas_unicas": cedulas_unicas_consultadas,
            "equipos_unicos": equipos_consultaron_padron,
            "exitosas": consultas_exitosas,
            "fallidas": consultas_fallidas
        },
        "ultimas_consultas": ultimas_consultas
    }
