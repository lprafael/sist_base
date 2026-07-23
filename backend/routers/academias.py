# routers/academias.py
# Router principal para el Sistema de Gestión de Academias Deportivas (SAD-M)
# 
# Control de acceso por rol interno (RBAC):
#   dueño        → usuario con rol='academia' en sistema.usuarios
#   administrador, tesorero, profesor → miembros en academias.miembros

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
import os
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from database import get_session
from security import get_current_user

router = APIRouter(tags=["Academias"])

# ================================================================
# HELPER: Resolver academia_id y rol_interno del usuario actual
# ================================================================

async def get_academia_context(current_user: dict, session: AsyncSession) -> dict:
    """
    Para un usuario autenticado, resuelve:
      - academia_id: UUID de la academia que gestiona
      - rol_interno: 'dueño' | 'administrador' | 'tesorero' | 'profesor'
      - sucursal_id: UUID de sucursal asignada (solo para profesores; None = acceso total)
    Lanza 403 si el usuario no tiene acceso a ninguna academia.
    """
    uid = current_user["user_id"]
    role = current_user.get("role", "")

    # Caso 1: dueño directo (rol='academia' en sistema.usuarios)
    if role == "academia":
        res = await session.execute(
            text("SELECT id FROM academias.academias WHERE usuario_id = :uid"),
            {"uid": uid}
        )
        row = res.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró la academia asociada a este usuario."
            )
        return {"academia_id": row[0], "rol_interno": "dueño", "sucursal_id": None}

    # Caso 2: miembro invitado (administrador, tesorero, profesor)
    res = await session.execute(
        text("""
            SELECT m.academia_id, m.rol, m.sucursal_id
            FROM academias.miembros m
            WHERE m.usuario_id = :uid AND m.activo = TRUE
            LIMIT 1
        """),
        {"uid": uid}
    )
    row = res.fetchone()
    if row:
        return {"academia_id": row[0], "rol_interno": row[1], "sucursal_id": row[2]}

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tenés acceso a ninguna academia."
    )


def require_roles(*allowed_roles: str):
    """Decorador de dependencia que verifica el rol interno dentro de la academia."""
    async def checker(
        current_user: dict = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
    ):
        ctx = await get_academia_context(current_user, session)
        if ctx["rol_interno"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere uno de estos roles: {', '.join(allowed_roles)}"
            )
        return {**current_user, **ctx}
    return checker


# ================================================================
# SCHEMAS
# ================================================================

class PerfilAcademiaRequest(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    enlace_sitio: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    color_primario: Optional[str] = '#1e3a8a'
    acerca_de: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    pais: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    canal_comunicacion_habilitado: Optional[bool] = False


class SucursalRequest(BaseModel):
    nombre: str
    deporte: str
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class CategoriaRequest(BaseModel):
    sucursal_id: Optional[str] = None
    nombre: str
    edad_min: Optional[int] = 0
    edad_max: Optional[int] = 99
    descripcion: Optional[str] = None
    color: Optional[str] = '#3b82f6'


class TutorRequest(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    vinculo: Optional[str] = 'Padre'
    es_pagador: Optional[bool] = True
    alumno_id: Optional[str] = None


class VinculoTutorRequest(BaseModel):
    tutor_id: str
    alumno_id: str
    es_tutor_principal: Optional[bool] = False


class MiembroRequest(BaseModel):
    usuario_id: int
    rol: str  # 'administrador', 'tesorero', 'profesor'
    sucursal_id: Optional[str] = None  # UUID string, solo para profesores


class AlumnoRequest(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    sucursal_id: Optional[str] = None
    foto_perfil: Optional[str] = None
    tipo_sangre: Optional[str] = None
    alergias: Optional[str] = None
    condiciones_medicas: Optional[str] = None
    seguro_medico: Optional[str] = None
    contacto_emergencia: Optional[str] = None
    estado: Optional[str] = 'activo'
    notas: Optional[str] = None


class TutorRequest(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    vinculo: Optional[str] = None
    es_pagador: Optional[bool] = True


class VincularTutorRequest(BaseModel):
    tutor_id: str
    es_tutor_principal: Optional[bool] = False


class CategoriaRequest(BaseModel):
    sucursal_id: str
    nombre: str
    edad_min: Optional[int] = None
    edad_max: Optional[int] = None
    descripcion: Optional[str] = None
    color: Optional[str] = '#3B82F6'


class InscripcionRequest(BaseModel):
    alumno_id: str
    categoria_id: str
    fecha_inicio: str
    dias_por_semana: Optional[int] = 3
    cuota_mensual: float
    descuento_aplicado: Optional[float] = 0
    beca: Optional[bool] = False
    notas: Optional[str] = None


class PagarCuotaRequest(BaseModel):
    metodo_pago: str
    notas: Optional[str] = None


class AsistenciaItem(BaseModel):
    alumno_id: str
    estado: str  # presente, ausente_justificado, ausente, tarde, lesionado
    observaciones: Optional[str] = None


class AsistenciaMasivaRequest(BaseModel):
    categoria_id: str
    fecha: str
    asistencias: List[AsistenciaItem]


class ConfigCuotasRequest(BaseModel):
    descuento_2_hermanos: Optional[float] = 0
    descuento_3_hermanos: Optional[float] = 0
    permite_pago_anual: Optional[bool] = False
    descuento_pago_anual: Optional[float] = 0
    dia_vencimiento: Optional[int] = 10
    matricula_anual: Optional[float] = 0


class HorarioOficinaItem(BaseModel):
    dia: str
    hora_inicio: str
    hora_fin: str


class HorariosOficinaRequest(BaseModel):
    horarios: List[HorarioOficinaItem]


class HorarioPracticaRequest(BaseModel):
    categoria_id: Optional[str] = None
    sub_categoria: Optional[str] = None
    sucursal_id: Optional[str] = None
    cancha_nombre: Optional[str] = None
    dia_semana: str
    hora_inicio: str
    hora_fin: str
    mes_inicio_vigencia: Optional[int] = 1
    anio_inicio_vigencia: Optional[int] = 2026
    mes_fin_vigencia: Optional[int] = 12
    anio_fin_vigencia: Optional[int] = 2026
    periodo_vigencia: Optional[str] = '2026'
    activo: Optional[bool] = True


class TarifaCostoRequest(BaseModel):
    concepto: str
    tipo_costo: str  # 'matricula', 'cuota_mensual', 'indumentaria', 'otro'
    categoria_id: Optional[str] = None
    monto: float
    moneda: Optional[str] = 'GS'
    descripcion: Optional[str] = None
    mes_inicio_vigencia: Optional[int] = 1
    anio_inicio_vigencia: Optional[int] = 2026
    mes_fin_vigencia: Optional[int] = 12
    anio_fin_vigencia: Optional[int] = 2026
    periodo_vigencia: Optional[str] = '2026'
    activo: Optional[bool] = True


# ================================================================
# ENDPOINTS PÚBLICOS
# ================================================================

@router.get("/api/academias")
async def listar_academias_publicas(session: AsyncSession = Depends(get_session)):
    """Lista pública de academias habilitadas."""
    res = await session.execute(text("""
        SELECT a.id, a.nombre, a.enlace_sitio, a.logo_url, a.ciudad, a.departamento,
               a.color_primario, a.acerca_de,
               COUNT(DISTINCT s.id) AS total_sucursales,
               ARRAY_AGG(DISTINCT s.deporte) FILTER (WHERE s.deporte IS NOT NULL) AS deportes
        FROM academias.academias a
        LEFT JOIN academias.sucursales s ON s.academia_id = a.id AND s.activa = TRUE
        WHERE a.habilitada = TRUE
        GROUP BY a.id, a.nombre, a.enlace_sitio, a.logo_url, a.ciudad, a.departamento,
                 a.color_primario, a.acerca_de
        ORDER BY a.nombre
    """))
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]),
            "nombre": r[1],
            "enlace_sitio": r[2],
            "logo_url": r[3],
            "ciudad": r[4],
            "departamento": r[5],
            "color_primario": r[6],
            "acerca_de": r[7],
            "total_sucursales": r[8],
            "deportes": r[9] or [],
        }
        for r in rows
    ]


@router.get("/api/academias/{enlace}")
async def academia_publica(enlace: str, session: AsyncSession = Depends(get_session)):
    """Página pública de una academia por su enlace/slug."""
    res = await session.execute(text("""
        SELECT a.id, a.nombre, a.descripcion, a.logo_url, a.banner_url, a.color_primario,
               a.acerca_de, a.facebook, a.instagram, a.youtube, a.whatsapp, a.email,
               a.telefono, a.ciudad, a.departamento, a.pais, a.canal_comunicacion_habilitado,
               a.horarios_oficina
        FROM academias.academias a
        WHERE a.enlace_sitio = :enlace AND a.habilitada = TRUE
    """), {"enlace": enlace})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Academia no encontrada.")

    academia_id = str(row[0])
    horarios_oficina = row[17] or []

    # 1. Sucursales / Sedes
    res_suc = await session.execute(text("""
        SELECT id, nombre, deporte, ciudad, departamento, direccion, telefono, email
        FROM academias.sucursales
        WHERE academia_id = :aid AND activa = TRUE
        ORDER BY nombre
    """), {"aid": academia_id})
    sucursales = [
        {
            "id": str(s[0]), "nombre": s[1], "deporte": s[2],
            "ciudad": s[3], "departamento": s[4], "direccion": s[5],
            "telefono": s[6], "email": s[7],
        }
        for s in res_suc.fetchall()
    ]

    # 2. Categorías
    res_cat = await session.execute(text("""
        SELECT c.id, c.nombre, c.edad_min, c.edad_max, c.descripcion, c.color, s.nombre as sucursal_nombre
        FROM academias.categorias c
        JOIN academias.sucursales s ON s.id = c.sucursal_id
        WHERE s.academia_id = :aid AND c.activa = TRUE
        ORDER BY c.edad_min ASC, c.nombre ASC
    """), {"aid": academia_id})
    categorias = [
        {
            "id": str(c[0]), "nombre": c[1], "edad_min": c[2], "edad_max": c[3],
            "descripcion": c[4], "color": c[5], "sucursal_nombre": c[6],
        }
        for c in res_cat.fetchall()
    ]

    # 3. Horarios de práctica
    res_hp = await session.execute(text("""
        SELECT hp.id, hp.categoria_id, c.nombre AS categoria_nombre, c.color AS categoria_color,
               hp.sub_categoria, hp.sucursal_id, COALESCE(hp.cancha_nombre, s.nombre) AS cancha_nombre,
               hp.dia_semana, hp.hora_inicio, hp.hora_fin,
               hp.mes_inicio_vigencia, hp.anio_inicio_vigencia, hp.mes_fin_vigencia, hp.anio_fin_vigencia,
               hp.periodo_vigencia
        FROM academias.horarios_practica hp
        LEFT JOIN academias.categorias c ON c.id = hp.categoria_id
        LEFT JOIN academias.sucursales s ON s.id = hp.sucursal_id
        WHERE hp.academia_id = :aid AND hp.activo = TRUE
        ORDER BY 
          CASE hp.dia_semana 
            WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 
            WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 WHEN 'Domingo' THEN 7 
            ELSE 8 END,
          hp.hora_inicio ASC
    """), {"aid": academia_id})
    horarios_practica = [
        {
            "id": str(h[0]), "categoria_id": str(h[1]) if h[1] else None,
            "categoria_nombre": h[2], "categoria_color": h[3] or "#3b82f6",
            "sub_categoria": h[4], "sucursal_id": str(h[5]) if h[5] else None,
            "cancha_nombre": h[6], "dia_semana": h[7], "hora_inicio": h[8], "hora_fin": h[9],
            "mes_inicio_vigencia": h[10], "anio_inicio_vigencia": h[11],
            "mes_fin_vigencia": h[12], "anio_fin_vigencia": h[13],
            "periodo_vigencia": h[14] or "2026",
        }
        for h in res_hp.fetchall()
    ]

    # 4. Tarifas y Costos (Matrícula, Cuotas, Indumentaria, etc.)
    res_tc = await session.execute(text("""
        SELECT tc.id, tc.concepto, tc.tipo_costo, tc.categoria_id, c.nombre AS categoria_nombre,
               tc.monto, tc.moneda, tc.descripcion,
               tc.mes_inicio_vigencia, tc.anio_inicio_vigencia, tc.mes_fin_vigencia, tc.anio_fin_vigencia,
               tc.periodo_vigencia
        FROM academias.tarifas_costos tc
        LEFT JOIN academias.categorias c ON c.id = tc.categoria_id
        WHERE tc.academia_id = :aid AND tc.activo = TRUE
        ORDER BY 
          CASE tc.tipo_costo 
            WHEN 'matricula' THEN 1 WHEN 'cuota_mensual' THEN 2 WHEN 'indumentaria' THEN 3 ELSE 4 
          END, tc.monto ASC
    """), {"aid": academia_id})
    tarifas_costos = [
        {
            "id": str(t[0]), "concepto": t[1], "tipo_costo": t[2],
            "categoria_id": str(t[3]) if t[3] else None, "categoria_nombre": t[4],
            "monto": float(t[5]), "moneda": t[6] or "GS", "descripcion": t[7],
            "mes_inicio_vigencia": t[8], "anio_inicio_vigencia": t[9],
            "mes_fin_vigencia": t[10], "anio_fin_vigencia": t[11],
            "periodo_vigencia": t[12] or "2026",
        }
        for t in res_tc.fetchall()
    ]

    # Coleccionar periodos de vigencia únicos
    periodos_practica = set(h["periodo_vigencia"] for h in horarios_practica if h["periodo_vigencia"])
    periodos_costos = set(t["periodo_vigencia"] for t in tarifas_costos if t["periodo_vigencia"])
    periodos_vigencia = sorted(list(periodos_practica | periodos_costos))
    if not periodos_vigencia:
        periodos_vigencia = ["2026"]

    return {
        "id": academia_id, "nombre": row[1], "descripcion": row[2],
        "logo_url": row[3], "banner_url": row[4], "color_primario": row[5],
        "acerca_de": row[6], "facebook": row[7], "instagram": row[8],
        "youtube": row[9], "whatsapp": row[10], "email": row[11],
        "telefono": row[12], "ciudad": row[13], "departamento": row[14],
        "pais": row[15], "canal_comunicacion_habilitado": row[16],
        "horarios_oficina": horarios_oficina,
        "sucursales": sucursales,
        "categorias": categorias,
        "horarios_practica": horarios_practica,
        "tarifas_costos": tarifas_costos,
        "periodos_vigencia": periodos_vigencia,
    }


@router.get("/api/deportes")
async def listar_deportes(session: AsyncSession = Depends(get_session)):
    """Deportes únicos disponibles en el sistema (de canchas + academias)."""
    res = await session.execute(text("""
        SELECT DISTINCT deporte FROM (
            SELECT DISTINCT deporte FROM cancha.canchas WHERE activo = TRUE
            UNION
            SELECT DISTINCT deporte FROM academias.sucursales WHERE activa = TRUE
        ) d
        WHERE deporte IS NOT NULL
        ORDER BY deporte
    """))
    return [r[0] for r in res.fetchall()]


# ================================================================
# ENDPOINTS AUTENTICADOS — PERFIL
# ================================================================

@router.get("/academia/perfil")
async def obtener_perfil(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Obtiene el perfil de la academia. Accesible por dueño y administrador."""
    ctx = await get_academia_context(current_user, session)
    if ctx["rol_interno"] not in ("dueño", "administrador"):
        raise HTTPException(status_code=403, detail="Acceso restringido.")

    res = await session.execute(text("""
        SELECT nombre, descripcion, enlace_sitio, logo_url, banner_url, color_primario,
               acerca_de, facebook, instagram, youtube, whatsapp, email, telefono,
               pais, departamento, ciudad, plan, habilitada, canal_comunicacion_habilitado
        FROM academias.academias
        WHERE id = :aid
    """), {"aid": ctx["academia_id"]})
    row = res.fetchone()
    if not row:
        return {}
    return {
        "academia_id": str(ctx["academia_id"]),
        "rol_interno": ctx["rol_interno"],
        "nombre": row[0], "descripcion": row[1], "enlace_sitio": row[2],
        "logo_url": row[3], "banner_url": row[4], "color_primario": row[5],
        "acerca_de": row[6], "facebook": row[7], "instagram": row[8],
        "youtube": row[9], "whatsapp": row[10], "email": row[11],
        "telefono": row[12], "pais": row[13], "departamento": row[14],
        "ciudad": row[15], "plan": row[16], "habilitada": row[17],
        "canal_comunicacion_habilitado": row[18],
    }


@router.post("/academia/perfil")
async def guardar_perfil(
    data: PerfilAcademiaRequest,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza el perfil de la academia. Solo el dueño."""
    academia_id = current_user["academia_id"]

    if data.enlace_sitio:
        check = await session.execute(text("""
            SELECT id FROM academias.academias
            WHERE enlace_sitio = :enlace AND id != :aid
        """), {"enlace": data.enlace_sitio, "aid": academia_id})
        if check.fetchone():
            raise HTTPException(status_code=400, detail="El enlace ya está en uso por otra academia.")

    await session.execute(text("""
        UPDATE academias.academias SET
            nombre         = COALESCE(:nombre, nombre),
            descripcion    = :descripcion,
            enlace_sitio   = :enlace,
            logo_url       = :logo,
            banner_url     = :banner,
            color_primario = COALESCE(:color, color_primario),
            acerca_de      = :acerca_de,
            facebook       = :facebook,
            instagram      = :instagram,
            youtube        = :youtube,
            whatsapp       = :whatsapp,
            email          = :email,
            telefono       = :telefono,
            pais           = :pais,
            departamento   = :departamento,
            ciudad         = :ciudad,
            canal_comunicacion_habilitado = COALESCE(:canal, canal_comunicacion_habilitado)
        WHERE id = :aid
    """), {
        "aid": academia_id,
        "nombre": data.nombre, "descripcion": data.descripcion,
        "enlace": data.enlace_sitio, "logo": data.logo_url, "banner": data.banner_url,
        "color": data.color_primario, "acerca_de": data.acerca_de,
        "facebook": data.facebook, "instagram": data.instagram,
        "youtube": data.youtube, "whatsapp": data.whatsapp,
        "email": data.email, "telefono": data.telefono,
        "pais": data.pais, "departamento": data.departamento, "ciudad": data.ciudad,
        "canal": data.canal_comunicacion_habilitado,
    })
    await session.commit()
    return {"message": "Perfil actualizado exitosamente."}


@router.post("/academia/perfil/logo")
async def subir_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Sube el logo de la academia."""
    ctx = await get_academia_context(current_user, session)
    if ctx["rol_interno"] != "dueño":
        raise HTTPException(status_code=403, detail="Solo el dueño puede cambiar el logo.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "academias")
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"logo_academia_{ctx['academia_id']}_{uuid.uuid4().hex[:8]}.{ext}"
    with open(os.path.join(upload_dir, filename), "wb") as f:
        f.write(await file.read())

    url = f"https://api.micancha.com.py/static/uploads/academias/{filename}"
    return {"url": url}


@router.post("/academia/perfil/banner")
async def subir_banner(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Sube el banner de la academia."""
    ctx = await get_academia_context(current_user, session)
    if ctx["rol_interno"] != "dueño":
        raise HTTPException(status_code=403, detail="Solo el dueño puede cambiar el banner.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "academias")
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"banner_academia_{ctx['academia_id']}_{uuid.uuid4().hex[:8]}.{ext}"
    with open(os.path.join(upload_dir, filename), "wb") as f:
        f.write(await file.read())

    url = f"https://api.micancha.com.py/static/uploads/academias/{filename}"
    return {"url": url}


# ================================================================
# ENDPOINTS — MIEMBROS (Staff)
# ================================================================

@router.get("/academia/miembros")
async def listar_miembros(
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Lista el staff de la academia."""
    res = await session.execute(text("""
        SELECT m.id, m.usuario_id, u.nombre_completo, u.email, u.username,
               m.rol, m.sucursal_id, s.nombre AS sucursal_nombre, m.activo, m.creado_en
        FROM academias.miembros m
        JOIN sistema.usuarios u ON u.id = m.usuario_id
        LEFT JOIN academias.sucursales s ON s.id = m.sucursal_id
        WHERE m.academia_id = :aid
        ORDER BY m.rol, u.nombre_completo
    """), {"aid": current_user["academia_id"]})
    return [
        {
            "id": str(r[0]), "usuario_id": r[1],
            "nombre_completo": r[2], "email": r[3], "username": r[4],
            "rol": r[5], "sucursal_id": str(r[6]) if r[6] else None,
            "sucursal_nombre": r[7], "activo": r[8],
            "creado_en": r[9].isoformat() if r[9] else None,
        }
        for r in res.fetchall()
    ]


@router.post("/academia/miembros")
async def invitar_miembro(
    data: MiembroRequest,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session)
):
    """Invita a un usuario del sistema como miembro del staff."""
    if data.rol not in ("administrador", "tesorero", "profesor"):
        raise HTTPException(status_code=400, detail="Rol inválido. Opciones: administrador, tesorero, profesor.")

    # Verificar que el usuario existe
    check = await session.execute(
        text("SELECT id FROM sistema.usuarios WHERE id = :uid AND activo = TRUE"),
        {"uid": data.usuario_id}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Usuario no encontrado o inactivo.")

    # Verificar que no sea el propio dueño
    academia_res = await session.execute(
        text("SELECT usuario_id FROM academias.academias WHERE id = :aid"),
        {"aid": current_user["academia_id"]}
    )
    academia = academia_res.fetchone()
    if academia and academia[0] == data.usuario_id:
        raise HTTPException(status_code=400, detail="El dueño no puede ser invitado como miembro.")

    await session.execute(text("""
        INSERT INTO academias.miembros (academia_id, usuario_id, rol, sucursal_id)
        VALUES (:aid, :uid, :rol, :sucursal_id)
        ON CONFLICT (academia_id, usuario_id) DO UPDATE SET
            rol = EXCLUDED.rol,
            sucursal_id = EXCLUDED.sucursal_id,
            activo = TRUE
    """), {
        "aid": current_user["academia_id"],
        "uid": data.usuario_id,
        "rol": data.rol,
        "sucursal_id": data.sucursal_id,
    })
    await session.commit()
    return {"message": f"Usuario invitado como {data.rol} exitosamente."}


@router.delete("/academia/miembros/{miembro_id}")
async def revocar_miembro(
    miembro_id: str,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session)
):
    """Revoca el acceso de un miembro del staff."""
    await session.execute(text("""
        UPDATE academias.miembros SET activo = FALSE
        WHERE id = :mid AND academia_id = :aid
    """), {"mid": miembro_id, "aid": current_user["academia_id"]})
    await session.commit()
    return {"message": "Acceso revocado exitosamente."}


# ================================================================
# ENDPOINTS — SUCURSALES
# ================================================================

@router.get("/academia/sucursales")
async def listar_sucursales(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Lista las sucursales de la academia."""
    ctx = await get_academia_context(current_user, session)
    aid = ctx["academia_id"]

    # Los profesores solo ven su sucursal asignada
    if ctx["rol_interno"] == "profesor" and ctx["sucursal_id"]:
        where = "WHERE s.academia_id = :aid AND s.id = :sid"
        params = {"aid": aid, "sid": ctx["sucursal_id"]}
    else:
        where = "WHERE s.academia_id = :aid"
        params = {"aid": aid}

    res = await session.execute(text(f"""
        SELECT s.id, s.nombre, s.deporte, s.ciudad, s.departamento,
               s.direccion, s.telefono, s.email, s.activa, s.creado_en,
               COUNT(DISTINCT c.id) AS total_categorias,
               COUNT(DISTINCT a.id) AS total_alumnos
        FROM academias.sucursales s
        LEFT JOIN academias.categorias c ON c.sucursal_id = s.id AND c.activa = TRUE
        LEFT JOIN academias.alumnos a ON a.sucursal_id = s.id AND a.estado = 'activo'
        {where}
        GROUP BY s.id, s.nombre, s.deporte, s.ciudad, s.departamento,
                 s.direccion, s.telefono, s.email, s.activa, s.creado_en
        ORDER BY s.nombre
    """), params)
    return [
        {
            "id": str(r[0]), "nombre": r[1], "deporte": r[2],
            "ciudad": r[3], "departamento": r[4], "direccion": r[5],
            "telefono": r[6], "email": r[7], "activa": r[8],
            "creado_en": r[9].isoformat() if r[9] else None,
            "total_categorias": r[10], "total_alumnos": r[11],
        }
        for r in res.fetchall()
    ]


@router.post("/academia/sucursales")
async def crear_sucursal(
    data: SucursalRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Crea una nueva sucursal."""
    ubicacion = None
    if data.lat is not None and data.lon is not None:
        ubicacion = f"POINT({data.lon} {data.lat})"

    res = await session.execute(text("""
        INSERT INTO academias.sucursales
            (academia_id, nombre, deporte, direccion, ciudad, departamento, telefono, email, ubicacion)
        VALUES
            (:aid, :nombre, :deporte, :direccion, :ciudad, :departamento, :telefono, :email,
             CASE WHEN :ubicacion IS NOT NULL THEN ST_GeogFromText(:ubicacion) ELSE NULL END)
        RETURNING id
    """), {
        "aid": current_user["academia_id"],
        "nombre": data.nombre, "deporte": data.deporte,
        "direccion": data.direccion, "ciudad": data.ciudad,
        "departamento": data.departamento, "telefono": data.telefono,
        "email": data.email, "ubicacion": ubicacion,
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Sucursal creada.", "id": str(new_id)}


@router.put("/academia/sucursales/{sucursal_id}")
async def actualizar_sucursal(
    sucursal_id: str,
    data: SucursalRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza una sucursal."""
    ubicacion = None
    if data.lat is not None and data.lon is not None:
        ubicacion = f"POINT({data.lon} {data.lat})"

    await session.execute(text("""
        UPDATE academias.sucursales SET
            nombre       = :nombre,
            deporte      = :deporte,
            direccion    = :direccion,
            ciudad       = :ciudad,
            departamento = :departamento,
            telefono     = :telefono,
            email        = :email,
            ubicacion    = CASE WHEN :ubicacion IS NOT NULL THEN ST_GeogFromText(:ubicacion) ELSE ubicacion END
        WHERE id = :sid AND academia_id = :aid
    """), {
        "sid": sucursal_id, "aid": current_user["academia_id"],
        "nombre": data.nombre, "deporte": data.deporte,
        "direccion": data.direccion, "ciudad": data.ciudad,
        "departamento": data.departamento, "telefono": data.telefono,
        "email": data.email, "ubicacion": ubicacion,
    })
    await session.commit()
    return {"message": "Sucursal actualizada."}


@router.delete("/academia/sucursales/{sucursal_id}")
async def desactivar_sucursal(
    sucursal_id: str,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session)
):
    """Desactiva una sucursal."""
    await session.execute(text("""
        UPDATE academias.sucursales SET activa = FALSE
        WHERE id = :sid AND academia_id = :aid
    """), {"sid": sucursal_id, "aid": current_user["academia_id"]})
    await session.commit()
    return {"message": "Sucursal desactivada."}


# ================================================================
# ENDPOINTS — CATEGORÍAS DE LA ACADEMIA
# ================================================================

@router.get("/academia/categorias")
async def listar_categorias(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Lista todas las categorías de la academia."""
    res = await session.execute(text("""
        SELECT c.id, c.nombre, c.edad_min, c.edad_max, c.descripcion, c.color,
               c.sucursal_id, s.nombre AS sucursal_nombre, c.activa
        FROM academias.categorias c
        LEFT JOIN academias.sucursales s ON s.id = c.sucursal_id
        WHERE (s.academia_id = :aid OR c.sucursal_id IS NULL) AND c.activa = TRUE
        ORDER BY c.edad_min ASC, c.nombre ASC
    """), {"aid": current_user["academia_id"]})
    return [
        {
            "id": str(r[0]), "nombre": r[1], "edad_min": r[2], "edad_max": r[3],
            "descripcion": r[4], "color": r[5] or "#3b82f6",
            "sucursal_id": str(r[6]) if r[6] else None,
            "sucursal_nombre": r[7] or "General",
            "activa": r[8],
        }
        for r in res.fetchall()
    ]


@router.post("/academia/categorias")
async def crear_categoria(
    data: CategoriaRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Crea una nueva categoría para la academia."""
    suc_id = data.sucursal_id if data.sucursal_id and data.sucursal_id.strip() else None

    if not suc_id:
        res_suc = await session.execute(text("""
            SELECT id FROM academias.sucursales WHERE academia_id = :aid AND activa = TRUE LIMIT 1
        """), {"aid": current_user["academia_id"]})
        row_suc = res_suc.fetchone()
        if row_suc:
            suc_id = str(row_suc[0])

    res = await session.execute(text("""
        INSERT INTO academias.categorias
            (sucursal_id, nombre, edad_min, edad_max, descripcion, color, activa)
        VALUES
            (:sucursal_id, :nombre, :edad_min, :edad_max, :descripcion, :color, TRUE)
        RETURNING id
    """), {
        "sucursal_id": suc_id,
        "nombre": data.nombre,
        "edad_min": data.edad_min or 0,
        "edad_max": data.edad_max or 99,
        "descripcion": data.descripcion,
        "color": data.color or "#3b82f6",
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Categoría creada exitosamente.", "id": str(new_id)}


@router.put("/academia/categorias/{categoria_id}")
async def actualizar_categoria(
    categoria_id: str,
    data: CategoriaRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza una categoría."""
    suc_id = data.sucursal_id if data.sucursal_id and data.sucursal_id.strip() else None

    await session.execute(text("""
        UPDATE academias.categorias SET
            nombre      = :nombre,
            edad_min    = :edad_min,
            edad_max    = :edad_max,
            descripcion = :descripcion,
            color       = :color,
            sucursal_id = COALESCE(:sucursal_id, sucursal_id)
        WHERE id = :cid
    """), {
        "cid": categoria_id,
        "nombre": data.nombre,
        "edad_min": data.edad_min or 0,
        "edad_max": data.edad_max or 99,
        "descripcion": data.descripcion,
        "color": data.color or "#3b82f6",
        "sucursal_id": suc_id,
    })
    await session.commit()
    return {"message": "Categoría actualizada exitosamente."}


@router.delete("/academia/categorias/{categoria_id}")
async def desactivar_categoria(
    categoria_id: str,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Desactiva una categoría."""
    await session.execute(text("""
        UPDATE academias.categorias SET activa = FALSE WHERE id = :cid
    """), {"cid": categoria_id})
    await session.commit()
    return {"message": "Categoría desactivada."}


# ================================================================
# ENDPOINTS — ALUMNOS
# ================================================================

@router.get("/academia/alumnos")
async def listar_alumnos(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    sucursal_id: Optional[str] = None,
    estado: Optional[str] = None,
):
    """Lista alumnos. Profesores ven solo su sucursal."""
    ctx = await get_academia_context(current_user, session)

    # Restricción de sucursal para profesores
    effective_sucursal = ctx["sucursal_id"] if ctx["rol_interno"] == "profesor" else sucursal_id

    conditions = ["a.academia_id = :aid"]
    params = {"aid": ctx["academia_id"]}

    if effective_sucursal:
        conditions.append("a.sucursal_id = :sid")
        params["sid"] = effective_sucursal
    if estado:
        conditions.append("a.estado = :estado")
        params["estado"] = estado

    where = " AND ".join(conditions)
    res = await session.execute(text(f"""
        SELECT a.id, a.nombre, a.apellido, a.fecha_nacimiento, a.foto_perfil,
               a.estado, a.sucursal_id, s.nombre AS sucursal_nombre,
               a.creado_en
        FROM academias.alumnos a
        LEFT JOIN academias.sucursales s ON s.id = a.sucursal_id
        WHERE {where}
        ORDER BY a.apellido, a.nombre
    """), params)
    return [
        {
            "id": str(r[0]), "nombre": r[1], "apellido": r[2],
            "fecha_nacimiento": r[3].isoformat() if r[3] else None,
            "foto_perfil": r[4], "estado": r[5],
            "sucursal_id": str(r[6]) if r[6] else None,
            "sucursal_nombre": r[7],
            "creado_en": r[8].isoformat() if r[8] else None,
        }
        for r in res.fetchall()
    ]


@router.post("/academia/alumnos")
async def registrar_alumno(
    data: AlumnoRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Registra un nuevo alumno."""
    res = await session.execute(text("""
        INSERT INTO academias.alumnos
            (academia_id, sucursal_id, nombre, apellido, fecha_nacimiento, foto_perfil,
             tipo_sangre, alergias, condiciones_medicas, seguro_medico,
             contacto_emergencia, estado, notas)
        VALUES
            (:aid, :sucursal_id, :nombre, :apellido, :fecha_nacimiento, :foto_perfil,
             :tipo_sangre, :alergias, :condiciones_medicas, :seguro_medico,
             :contacto_emergencia, :estado, :notas)
        RETURNING id
    """), {
        "aid": current_user["academia_id"],
        "sucursal_id": data.sucursal_id, "nombre": data.nombre,
        "apellido": data.apellido, "fecha_nacimiento": data.fecha_nacimiento,
        "foto_perfil": data.foto_perfil, "tipo_sangre": data.tipo_sangre,
        "alergias": data.alergias, "condiciones_medicas": data.condiciones_medicas,
        "seguro_medico": data.seguro_medico, "contacto_emergencia": data.contacto_emergencia,
        "estado": data.estado or "activo", "notas": data.notas,
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Alumno registrado.", "id": str(new_id)}


@router.get("/academia/alumnos/{alumno_id}")
async def detalle_alumno(
    alumno_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Detalle completo de un alumno, incluyendo tutores e inscripciones."""
    ctx = await get_academia_context(current_user, session)
    res = await session.execute(text("""
        SELECT a.id, a.nombre, a.apellido, a.fecha_nacimiento, a.foto_perfil,
               a.tipo_sangre, a.alergias, a.condiciones_medicas, a.seguro_medico,
               a.contacto_emergencia, a.estado, a.notas, a.sucursal_id,
               s.nombre AS sucursal_nombre, a.creado_en
        FROM academias.alumnos a
        LEFT JOIN academias.sucursales s ON s.id = a.sucursal_id
        WHERE a.id = :aid AND a.academia_id = :academia_id
    """), {"aid": alumno_id, "academia_id": ctx["academia_id"]})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    # Tutores
    res_t = await session.execute(text("""
        SELECT t.id, t.nombre, t.apellido, t.telefono, t.email, t.vinculo,
               t.es_pagador, at2.es_tutor_principal
        FROM academias.tutores t
        JOIN academias.alumno_tutores at2 ON at2.tutor_id = t.id
        WHERE at2.alumno_id = :aid
    """), {"aid": alumno_id})
    tutores = [
        {
            "id": str(t[0]), "nombre": t[1], "apellido": t[2],
            "telefono": t[3], "email": t[4], "vinculo": t[5],
            "es_pagador": t[6], "es_tutor_principal": t[7],
        }
        for t in res_t.fetchall()
    ]

    # Inscripciones activas
    res_i = await session.execute(text("""
        SELECT i.id, c.nombre AS categoria, s.nombre AS sucursal, s.deporte,
               i.dias_por_semana, i.cuota_mensual, i.descuento_aplicado,
               i.estado, i.fecha_inicio
        FROM academias.inscripciones i
        JOIN academias.categorias c ON c.id = i.categoria_id
        JOIN academias.sucursales s ON s.id = c.sucursal_id
        WHERE i.alumno_id = :aid AND i.estado = 'activa'
    """), {"aid": alumno_id})
    inscripciones = [
        {
            "id": str(i[0]), "categoria": i[1], "sucursal": i[2], "deporte": i[3],
            "dias_por_semana": i[4], "cuota_mensual": float(i[5]),
            "descuento_aplicado": float(i[6]), "estado": i[7],
            "fecha_inicio": i[8].isoformat() if i[8] else None,
        }
        for i in res_i.fetchall()
    ]

    return {
        "id": str(row[0]), "nombre": row[1], "apellido": row[2],
        "fecha_nacimiento": row[3].isoformat() if row[3] else None,
        "foto_perfil": row[4], "tipo_sangre": row[5], "alergias": row[6],
        "condiciones_medicas": row[7], "seguro_medico": row[8],
        "contacto_emergencia": row[9], "estado": row[10], "notas": row[11],
        "sucursal_id": str(row[12]) if row[12] else None,
        "sucursal_nombre": row[13],
        "creado_en": row[14].isoformat() if row[14] else None,
        "tutores": tutores,
        "inscripciones": inscripciones,
    }


@router.put("/academia/alumnos/{alumno_id}")
async def actualizar_alumno(
    alumno_id: str,
    data: AlumnoRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza los datos de un alumno."""
    await session.execute(text("""
        UPDATE academias.alumnos SET
            nombre               = COALESCE(:nombre, nombre),
            apellido             = :apellido,
            fecha_nacimiento     = :fecha_nacimiento,
            foto_perfil          = :foto_perfil,
            tipo_sangre          = :tipo_sangre,
            alergias             = :alergias,
            condiciones_medicas  = :condiciones_medicas,
            seguro_medico        = :seguro_medico,
            contacto_emergencia  = :contacto_emergencia,
            estado               = COALESCE(:estado, estado),
            notas                = :notas,
            sucursal_id          = :sucursal_id
        WHERE id = :alumno_id AND academia_id = :academia_id
    """), {
        "alumno_id": alumno_id, "academia_id": current_user["academia_id"],
        "nombre": data.nombre, "apellido": data.apellido,
        "fecha_nacimiento": data.fecha_nacimiento, "foto_perfil": data.foto_perfil,
        "tipo_sangre": data.tipo_sangre, "alergias": data.alergias,
        "condiciones_medicas": data.condiciones_medicas, "seguro_medico": data.seguro_medico,
        "contacto_emergencia": data.contacto_emergencia, "estado": data.estado,
        "notas": data.notas, "sucursal_id": data.sucursal_id,
    })
    await session.commit()
    return {"message": "Alumno actualizado."}


# ================================================================
# ENDPOINTS — TUTORES
# ================================================================

@router.get("/academia/tutores")
async def listar_tutores(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Lista todos los tutores registrados."""
    res = await session.execute(text("""
        SELECT t.id, t.nombre, t.apellido, t.telefono, t.email, t.vinculo,
               t.es_pagador, t.creado_en,
               COUNT(DISTINCT at2.alumno_id) AS total_alumnos
        FROM academias.tutores t
        LEFT JOIN academias.alumno_tutores at2 ON at2.tutor_id = t.id
        WHERE t.academia_id = :aid
        GROUP BY t.id, t.nombre, t.apellido, t.telefono, t.email, t.vinculo, t.es_pagador, t.creado_en
        ORDER BY t.apellido, t.nombre
    """), {"aid": current_user["academia_id"]})
    return [
        {
            "id": str(r[0]), "nombre": r[1], "apellido": r[2],
            "telefono": r[3], "email": r[4], "vinculo": r[5],
            "es_pagador": r[6], "creado_en": r[7].isoformat() if r[7] else None,
            "total_alumnos": r[8],
        }
        for r in res.fetchall()
    ]


@router.post("/academia/tutores")
async def registrar_tutor(
    data: TutorRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Registra un tutor/padre de familia."""
    res = await session.execute(text("""
        INSERT INTO academias.tutores (academia_id, nombre, apellido, telefono, email, vinculo, es_pagador)
        VALUES (:aid, :nombre, :apellido, :telefono, :email, :vinculo, :es_pagador)
        RETURNING id
    """), {
        "aid": current_user["academia_id"],
        "nombre": data.nombre, "apellido": data.apellido,
        "telefono": data.telefono, "email": data.email,
        "vinculo": data.vinculo, "es_pagador": data.es_pagador,
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Tutor registrado.", "id": str(new_id)}


@router.post("/academia/alumnos/{alumno_id}/tutores")
async def vincular_tutor(
    alumno_id: str,
    data: VincularTutorRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Vincula un tutor existente a un alumno."""
    await session.execute(text("""
        INSERT INTO academias.alumno_tutores (alumno_id, tutor_id, es_tutor_principal)
        VALUES (:alumno_id, :tutor_id, :principal)
        ON CONFLICT (alumno_id, tutor_id) DO UPDATE SET es_tutor_principal = EXCLUDED.es_tutor_principal
    """), {"alumno_id": alumno_id, "tutor_id": data.tutor_id, "principal": data.es_tutor_principal})
    await session.commit()
    return {"message": "Tutor vinculado al alumno."}


# ================================================================
# ENDPOINTS — CATEGORÍAS
# ================================================================

@router.get("/academia/categorias")
async def listar_categorias(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    sucursal_id: Optional[str] = None
):
    """Lista categorías. Los profesores ven solo su sucursal."""
    ctx = await get_academia_context(current_user, session)
    effective_sucursal = ctx["sucursal_id"] if ctx["rol_interno"] == "profesor" else sucursal_id

    conditions = ["c.sucursal_id IN (SELECT id FROM academias.sucursales WHERE academia_id = :aid)"]
    params = {"aid": ctx["academia_id"]}

    if effective_sucursal:
        conditions.append("c.sucursal_id = :sid")
        params["sid"] = effective_sucursal

    where = " AND ".join(conditions)
    res = await session.execute(text(f"""
        SELECT c.id, c.nombre, c.sucursal_id, s.nombre AS sucursal_nombre, s.deporte,
               c.edad_min, c.edad_max, c.descripcion, c.color, c.activa, c.creado_en,
               COUNT(DISTINCT i.id) AS total_inscritos
        FROM academias.categorias c
        JOIN academias.sucursales s ON s.id = c.sucursal_id
        LEFT JOIN academias.inscripciones i ON i.categoria_id = c.id AND i.estado = 'activa'
        WHERE {where}
        GROUP BY c.id, c.nombre, c.sucursal_id, s.nombre, s.deporte,
                 c.edad_min, c.edad_max, c.descripcion, c.color, c.activa, c.creado_en
        ORDER BY s.nombre, c.nombre
    """), params)
    return [
        {
            "id": str(r[0]), "nombre": r[1],
            "sucursal_id": str(r[2]), "sucursal_nombre": r[3], "deporte": r[4],
            "edad_min": r[5], "edad_max": r[6], "descripcion": r[7],
            "color": r[8], "activa": r[9],
            "creado_en": r[10].isoformat() if r[10] else None,
            "total_inscritos": r[11],
        }
        for r in res.fetchall()
    ]


@router.post("/academia/categorias")
async def crear_categoria(
    data: CategoriaRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Crea un grupo/categoría dentro de una sucursal."""
    # Verificar que la sucursal pertenece a esta academia
    check = await session.execute(text("""
        SELECT id FROM academias.sucursales WHERE id = :sid AND academia_id = :aid
    """), {"sid": data.sucursal_id, "aid": current_user["academia_id"]})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Sucursal no encontrada en esta academia.")

    res = await session.execute(text("""
        INSERT INTO academias.categorias (sucursal_id, nombre, edad_min, edad_max, descripcion, color)
        VALUES (:sid, :nombre, :edad_min, :edad_max, :descripcion, :color)
        RETURNING id
    """), {
        "sid": data.sucursal_id, "nombre": data.nombre,
        "edad_min": data.edad_min, "edad_max": data.edad_max,
        "descripcion": data.descripcion, "color": data.color or '#3B82F6',
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Categoría creada.", "id": str(new_id)}


# ================================================================
# ENDPOINTS — INSCRIPCIONES
# ================================================================

@router.get("/academia/inscripciones")
async def listar_inscripciones(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    categoria_id: Optional[str] = None,
    estado: Optional[str] = "activa"
):
    """Lista inscripciones activas."""
    ctx = await get_academia_context(current_user, session)

    conditions = ["s.academia_id = :aid"]
    params = {"aid": ctx["academia_id"]}

    if ctx["rol_interno"] == "profesor" and ctx["sucursal_id"]:
        conditions.append("s.id = :sid")
        params["sid"] = ctx["sucursal_id"]
    if categoria_id:
        conditions.append("i.categoria_id = :cid")
        params["cid"] = categoria_id
    if estado:
        conditions.append("i.estado = :estado")
        params["estado"] = estado

    where = " AND ".join(conditions)
    res = await session.execute(text(f"""
        SELECT i.id, a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno_nombre,
               a.id AS alumno_id, c.nombre AS categoria, s.nombre AS sucursal, s.deporte,
               i.dias_por_semana, i.cuota_mensual, i.descuento_aplicado,
               i.estado, i.fecha_inicio, i.beca
        FROM academias.inscripciones i
        JOIN academias.alumnos a ON a.id = i.alumno_id
        JOIN academias.categorias c ON c.id = i.categoria_id
        JOIN academias.sucursales s ON s.id = c.sucursal_id
        WHERE {where}
        ORDER BY a.apellido, a.nombre
    """), params)
    return [
        {
            "id": str(r[0]), "alumno_nombre": r[1].strip(),
            "alumno_id": str(r[2]), "categoria": r[3],
            "sucursal": r[4], "deporte": r[5],
            "dias_por_semana": r[6], "cuota_mensual": float(r[7]),
            "descuento_aplicado": float(r[8]), "estado": r[9],
            "fecha_inicio": r[10].isoformat() if r[10] else None,
            "beca": r[11],
        }
        for r in res.fetchall()
    ]


@router.post("/academia/inscripciones")
async def inscribir_alumno(
    data: InscripcionRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Inscribe un alumno en una categoría."""
    res = await session.execute(text("""
        INSERT INTO academias.inscripciones
            (alumno_id, categoria_id, fecha_inicio, dias_por_semana,
             cuota_mensual, descuento_aplicado, beca, notas)
        VALUES
            (:alumno_id, :categoria_id, :fecha_inicio, :dias_por_semana,
             :cuota_mensual, :descuento_aplicado, :beca, :notas)
        RETURNING id
    """), {
        "alumno_id": data.alumno_id, "categoria_id": data.categoria_id,
        "fecha_inicio": data.fecha_inicio, "dias_por_semana": data.dias_por_semana,
        "cuota_mensual": data.cuota_mensual, "descuento_aplicado": data.descuento_aplicado,
        "beca": data.beca, "notas": data.notas,
    })
    new_id = res.fetchone()[0]
    await session.commit()
    return {"message": "Alumno inscrito exitosamente.", "id": str(new_id)}


# ================================================================
# ENDPOINTS — CUOTAS (Módulo Financiero)
# ================================================================

@router.get("/academia/cuotas")
async def listar_cuotas(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
    periodo: Optional[str] = None,
    estado: Optional[str] = None,
):
    """Lista las cuotas de la academia. Filtros: periodo (YYYY-MM), estado."""
    conditions = ["q.academia_id = :aid"]
    params = {"aid": current_user["academia_id"]}
    if periodo:
        conditions.append("q.periodo = :periodo")
        params["periodo"] = periodo
    if estado:
        conditions.append("q.estado = :estado")
        params["estado"] = estado

    where = " AND ".join(conditions)
    res = await session.execute(text(f"""
        SELECT q.id, a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno,
               a.id AS alumno_id, q.periodo,
               q.monto_original, q.descuento, q.monto_final,
               q.estado, q.fecha_vencimiento, q.fecha_pago, q.metodo_pago, q.notas
        FROM academias.cuotas q
        JOIN academias.alumnos a ON a.id = q.alumno_id
        WHERE {where}
        ORDER BY q.periodo DESC, a.apellido, a.nombre
    """), params)
    return [
        {
            "id": str(r[0]), "alumno": r[1].strip(), "alumno_id": str(r[2]),
            "periodo": r[3],
            "monto_original": float(r[4]), "descuento": float(r[5]),
            "monto_final": float(r[6]), "estado": r[7],
            "fecha_vencimiento": r[8].isoformat() if r[8] else None,
            "fecha_pago": r[9].isoformat() if r[9] else None,
            "metodo_pago": r[10], "notas": r[11],
        }
        for r in res.fetchall()
    ]


@router.post("/academia/cuotas/generar")
async def generar_cuotas(
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session),
    periodo: Optional[str] = None,
):
    """
    Genera las cuotas del mes para todas las inscripciones activas.
    Si no se especifica periodo, usa el mes actual (YYYY-MM).
    Aplica descuentos por hermanos automáticamente.
    """
    from datetime import date
    import calendar

    if not periodo:
        hoy = date.today()
        periodo = hoy.strftime("%Y-%m")

    year, month = int(periodo.split("-")[0]), int(periodo.split("-")[1])
    last_day = calendar.monthrange(year, month)[1]

    # Obtener config de descuentos
    config_res = await session.execute(text("""
        SELECT descuento_2_hermanos, descuento_3_hermanos, dia_vencimiento
        FROM academias.config_cuotas
        WHERE academia_id = :aid
    """), {"aid": current_user["academia_id"]})
    config = config_res.fetchone()
    desc_2 = float(config[0]) if config else 0
    desc_3 = float(config[1]) if config else 0
    dia_vcto = int(config[2]) if config else 10
    dia_vcto = min(dia_vcto, last_day)
    fecha_vencimiento = date(year, month, dia_vcto)

    # Contar hermanos por tutor (para descuentos automáticos)
    hermanos_res = await session.execute(text("""
        SELECT t.id AS tutor_id, COUNT(DISTINCT i.alumno_id) AS cant_hijos_activos
        FROM academias.tutores t
        JOIN academias.alumno_tutores at2 ON at2.tutor_id = t.id AND at2.es_tutor_principal = TRUE
        JOIN academias.inscripciones i ON i.alumno_id = at2.alumno_id AND i.estado = 'activa'
        WHERE t.academia_id = :aid
        GROUP BY t.id
    """), {"aid": current_user["academia_id"]})
    hermanos_map = {str(r[0]): int(r[1]) for r in hermanos_res.fetchall()}

    # Obtener inscripciones activas sin cuota en este periodo
    inscripciones_res = await session.execute(text("""
        SELECT i.id, i.alumno_id, i.cuota_mensual, i.descuento_aplicado, i.beca,
               (SELECT at2.tutor_id FROM academias.alumno_tutores at2
                WHERE at2.alumno_id = i.alumno_id AND at2.es_tutor_principal = TRUE LIMIT 1) AS tutor_id
        FROM academias.inscripciones i
        JOIN academias.categorias c ON c.id = i.categoria_id
        JOIN academias.sucursales s ON s.id = c.sucursal_id
        WHERE s.academia_id = :aid AND i.estado = 'activa'
          AND NOT EXISTS (
              SELECT 1 FROM academias.cuotas q
              WHERE q.inscripcion_id = i.id AND q.periodo = :periodo
          )
    """), {"aid": current_user["academia_id"], "periodo": periodo})

    generadas = 0
    for row in inscripciones_res.fetchall():
        insc_id, alumno_id, cuota_base, desc_ya, beca, tutor_id = row

        if beca:
            monto_final = 0
            descuento_gs = float(cuota_base)
        else:
            # Descuento automático por hermanos
            cant_hijos = hermanos_map.get(str(tutor_id), 1) if tutor_id else 1
            if cant_hijos >= 3:
                pct = max(float(desc_ya), desc_3)
            elif cant_hijos == 2:
                pct = max(float(desc_ya), desc_2)
            else:
                pct = float(desc_ya)

            descuento_gs = round(float(cuota_base) * pct / 100)
            monto_final = float(cuota_base) - descuento_gs

        await session.execute(text("""
            INSERT INTO academias.cuotas
                (inscripcion_id, alumno_id, academia_id, periodo,
                 monto_original, descuento, monto_final, fecha_vencimiento,
                 estado, registrado_por)
            VALUES
                (:iid, :alumno_id, :academia_id, :periodo,
                 :monto_original, :descuento, :monto_final, :fecha_vencimiento,
                 CASE WHEN :beca THEN 'becada' ELSE 'pendiente' END, :reg_por)
            ON CONFLICT (inscripcion_id, periodo) DO NOTHING
        """), {
            "iid": insc_id, "alumno_id": alumno_id,
            "academia_id": current_user["academia_id"],
            "periodo": periodo, "monto_original": float(cuota_base),
            "descuento": descuento_gs, "monto_final": monto_final,
            "fecha_vencimiento": fecha_vencimiento, "beca": beca,
            "reg_por": current_user["user_id"],
        })
        generadas += 1

    await session.commit()
    return {"message": f"Cuotas generadas para el período {periodo}.", "generadas": generadas}


@router.put("/academia/cuotas/{cuota_id}/pagar")
async def registrar_pago(
    cuota_id: str,
    data: PagarCuotaRequest,
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Registra el pago de una cuota."""
    from datetime import datetime
    await session.execute(text("""
        UPDATE academias.cuotas SET
            estado        = 'pagada',
            fecha_pago    = :fecha_pago,
            metodo_pago   = :metodo_pago,
            notas         = :notas,
            registrado_por = :reg_por
        WHERE id = :cuota_id AND academia_id = :aid AND estado IN ('pendiente','vencida')
    """), {
        "cuota_id": cuota_id, "aid": current_user["academia_id"],
        "fecha_pago": datetime.utcnow(), "metodo_pago": data.metodo_pago,
        "notas": data.notas, "reg_por": current_user["user_id"],
    })
    await session.commit()
    return {"message": "Pago registrado exitosamente."}


# ================================================================
# ENDPOINTS — CONFIG CUOTAS
# ================================================================

@router.get("/academia/config-cuotas")
async def obtener_config_cuotas(
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Obtiene la configuración del motor de descuentos."""
    res = await session.execute(text("""
        SELECT descuento_2_hermanos, descuento_3_hermanos, permite_pago_anual,
               descuento_pago_anual, dia_vencimiento, matricula_anual
        FROM academias.config_cuotas
        WHERE academia_id = :aid
    """), {"aid": current_user["academia_id"]})
    row = res.fetchone()
    if not row:
        return {
            "descuento_2_hermanos": 0, "descuento_3_hermanos": 0,
            "permite_pago_anual": False, "descuento_pago_anual": 0,
            "dia_vencimiento": 10, "matricula_anual": 0,
        }
    return {
        "descuento_2_hermanos": float(row[0]), "descuento_3_hermanos": float(row[1]),
        "permite_pago_anual": row[2], "descuento_pago_anual": float(row[3]),
        "dia_vencimiento": row[4], "matricula_anual": float(row[5]),
    }


@router.put("/academia/config-cuotas")
async def actualizar_config_cuotas(
    data: ConfigCuotasRequest,
    current_user: dict = Depends(require_roles("dueño")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza la configuración del motor de descuentos."""
    await session.execute(text("""
        INSERT INTO academias.config_cuotas
            (academia_id, descuento_2_hermanos, descuento_3_hermanos,
             permite_pago_anual, descuento_pago_anual, dia_vencimiento, matricula_anual)
        VALUES
            (:aid, :d2, :d3, :pago_anual, :desc_anual, :dia_vcto, :matricula)
        ON CONFLICT (academia_id) DO UPDATE SET
            descuento_2_hermanos = EXCLUDED.descuento_2_hermanos,
            descuento_3_hermanos = EXCLUDED.descuento_3_hermanos,
            permite_pago_anual   = EXCLUDED.permite_pago_anual,
            descuento_pago_anual = EXCLUDED.descuento_pago_anual,
            dia_vencimiento      = EXCLUDED.dia_vencimiento,
            matricula_anual      = EXCLUDED.matricula_anual,
            actualizado_en       = NOW()
    """), {
        "aid": current_user["academia_id"],
        "d2": data.descuento_2_hermanos, "d3": data.descuento_3_hermanos,
        "pago_anual": data.permite_pago_anual, "desc_anual": data.descuento_pago_anual,
        "dia_vcto": data.dia_vencimiento, "matricula": data.matricula_anual,
    })
    await session.commit()
    return {"message": "Configuración de cuotas actualizada."}


# ================================================================
# ENDPOINTS — ASISTENCIAS
# ================================================================

@router.post("/academia/asistencias")
async def registrar_asistencia(
    data: AsistenciaMasivaRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Registra asistencia masiva para una fecha y categoría.
    Los profesores solo pueden registrar en su sucursal asignada.
    """
    ctx = await get_academia_context(current_user, session)

    # Verificar que la categoría pertenece a la academia (y a la sucursal del profesor)
    cat_res = await session.execute(text("""
        SELECT c.id, c.sucursal_id FROM academias.categorias c
        JOIN academias.sucursales s ON s.id = c.sucursal_id
        WHERE c.id = :cid AND s.academia_id = :aid
    """), {"cid": data.categoria_id, "aid": ctx["academia_id"]})
    cat = cat_res.fetchone()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    if ctx["rol_interno"] == "profesor" and ctx["sucursal_id"]:
        if str(cat[1]) != str(ctx["sucursal_id"]):
            raise HTTPException(status_code=403, detail="Solo podés registrar asistencia en tu sucursal asignada.")

    registradas = 0
    for item in data.asistencias:
        await session.execute(text("""
            INSERT INTO academias.asistencias
                (alumno_id, categoria_id, fecha, estado, observaciones, registrado_por_id)
            VALUES (:alumno_id, :cat_id, :fecha, :estado, :obs, :reg_por)
            ON CONFLICT (alumno_id, categoria_id, fecha) DO UPDATE SET
                estado = EXCLUDED.estado,
                observaciones = EXCLUDED.observaciones,
                registrado_por_id = EXCLUDED.registrado_por_id,
                registrado_en = NOW()
        """), {
            "alumno_id": item.alumno_id, "cat_id": data.categoria_id,
            "fecha": data.fecha, "estado": item.estado,
            "obs": item.observaciones, "reg_por": current_user["user_id"],
        })
        registradas += 1

    await session.commit()
    return {"message": f"Asistencia registrada para {registradas} alumnos.", "fecha": data.fecha}


@router.get("/academia/asistencias")
async def ver_asistencias(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    categoria_id: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
):
    """Consulta el historial de asistencias."""
    ctx = await get_academia_context(current_user, session)

    conditions = ["s.academia_id = :aid"]
    params = {"aid": ctx["academia_id"]}

    if ctx["rol_interno"] == "profesor" and ctx["sucursal_id"]:
        conditions.append("c.sucursal_id = :sid")
        params["sid"] = ctx["sucursal_id"]
    if categoria_id:
        conditions.append("as2.categoria_id = :cid")
        params["cid"] = categoria_id
    if fecha_desde:
        conditions.append("as2.fecha >= :desde")
        params["desde"] = fecha_desde
    if fecha_hasta:
        conditions.append("as2.fecha <= :hasta")
        params["hasta"] = fecha_hasta

    where = " AND ".join(conditions)
    res = await session.execute(text(f"""
        SELECT as2.id, a.nombre || ' ' || COALESCE(a.apellido,'') AS alumno,
               a.id AS alumno_id, c.nombre AS categoria, as2.fecha, as2.estado,
               as2.observaciones, as2.registrado_en
        FROM academias.asistencias as2
        JOIN academias.alumnos a ON a.id = as2.alumno_id
        JOIN academias.categorias c ON c.id = as2.categoria_id
        JOIN academias.sucursales s ON s.id = c.sucursal_id
        WHERE {where}
        ORDER BY as2.fecha DESC, a.apellido
        LIMIT 500
    """), params)
    return [
        {
            "id": str(r[0]), "alumno": r[1].strip(), "alumno_id": str(r[2]),
            "categoria": r[3], "fecha": r[4].isoformat() if r[4] else None,
            "estado": r[5], "observaciones": r[6],
            "registrado_en": r[7].isoformat() if r[7] else None,
        }
        for r in res.fetchall()
    ]


# ================================================================
# ENDPOINTS — HORARIOS DE OFICINA, PRÁCTICA Y TARIFAS/COSTOS
# ================================================================

@router.put("/academia/horarios-oficina")
async def guardar_horarios_oficina(
    data: HorariosOficinaRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Guarda la lista de horarios de oficina de la academia."""
    import json
    aid = current_user["academia_id"]
    horarios_json = json.dumps([h.dict() for h in data.horarios])

    await session.execute(text("""
        UPDATE academias.academias
        SET horarios_oficina = CAST(:hjson AS JSONB)
        WHERE id = :aid
    """), {"aid": aid, "hjson": horarios_json})
    await session.commit()
    return {"message": "Horarios de oficina guardados exitosamente."}


@router.get("/academia/horarios-practica")
async def listar_horarios_practica(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Obtiene todos los horarios de práctica de la academia."""
    aid = current_user["academia_id"]
    try:
        res = await session.execute(text("""
            SELECT hp.id, hp.categoria_id, c.nombre AS categoria_nombre, c.color AS categoria_color,
                   hp.sub_categoria, hp.sucursal_id, COALESCE(hp.cancha_nombre, s.nombre) AS cancha_nombre,
                   hp.dia_semana, hp.hora_inicio, hp.hora_fin,
                   hp.mes_inicio_vigencia, hp.anio_inicio_vigencia, hp.mes_fin_vigencia, hp.anio_fin_vigencia,
                   hp.periodo_vigencia, hp.activo
            FROM academias.horarios_practica hp
            LEFT JOIN academias.categorias c ON c.id = hp.categoria_id
            LEFT JOIN academias.sucursales s ON s.id = hp.sucursal_id
            WHERE hp.academia_id = :aid
            ORDER BY hp.periodo_vigencia DESC, hp.dia_semana, hp.hora_inicio
        """), {"aid": aid})
        return [
            {
                "id": str(r[0]), "categoria_id": str(r[1]) if r[1] else None,
                "categoria_nombre": r[2], "categoria_color": r[3] or "#3b82f6",
                "sub_categoria": r[4], "sucursal_id": str(r[5]) if r[5] else None,
                "cancha_nombre": r[6], "dia_semana": r[7], "hora_inicio": r[8], "hora_fin": r[9],
                "mes_inicio_vigencia": r[10], "anio_inicio_vigencia": r[11],
                "mes_fin_vigencia": r[12], "anio_fin_vigencia": r[13],
                "periodo_vigencia": r[14], "activo": r[15],
            }
            for r in res.fetchall()
        ]
    except Exception as e:
        print(f"Error cargando horarios_practica: {e}")
        return []


@router.post("/academia/horarios-practica")
async def crear_horario_practica(
    data: HorarioPracticaRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Crea una entrada de horario de práctica."""
    aid = current_user["academia_id"]
    cat_id = data.categoria_id if data.categoria_id and data.categoria_id.strip() else None
    suc_id = data.sucursal_id if data.sucursal_id and data.sucursal_id.strip() else None

    await session.execute(text("""
        INSERT INTO academias.horarios_practica (
            academia_id, categoria_id, sub_categoria, sucursal_id, cancha_nombre,
            dia_semana, hora_inicio, hora_fin,
            mes_inicio_vigencia, anio_inicio_vigencia, mes_fin_vigencia, anio_fin_vigencia,
            periodo_vigencia, activo
        ) VALUES (
            :aid, :cat_id, :sub_cat, :suc_id, :cancha,
            :dia, :inicio, :fin,
            :mes_ini, :anio_ini, :mes_fin, :anio_fin,
            :periodo, :activo
        )
    """), {
        "aid": aid, "cat_id": cat_id, "sub_cat": data.sub_categoria,
        "suc_id": suc_id, "cancha": data.cancha_nombre,
        "dia": data.dia_semana, "inicio": data.hora_inicio, "fin": data.hora_fin,
        "mes_ini": data.mes_inicio_vigencia, "anio_ini": data.anio_inicio_vigencia,
        "mes_fin": data.mes_fin_vigencia, "anio_fin": data.anio_fin_vigencia,
        "periodo": data.periodo_vigencia or "2026", "activo": data.activo if data.activo is not None else True,
    })
    await session.commit()
    return {"message": "Horario de práctica registrado exitosamente."}


@router.delete("/academia/horarios-practica/{hid}")
async def eliminar_horario_practica(
    hid: str,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Elimina un horario de práctica."""
    aid = current_user["academia_id"]
    await session.execute(text("""
        DELETE FROM academias.horarios_practica WHERE id = :hid AND academia_id = :aid
    """), {"hid": hid, "aid": aid})
    await session.commit()
    return {"message": "Horario de práctica eliminado."}


@router.get("/academia/tarifas-costos")
async def listar_tarifas_costos(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Obtiene las tarifas y costos de la academia."""
    aid = current_user["academia_id"]
    try:
        res = await session.execute(text("""
            SELECT tc.id, tc.concepto, tc.tipo_costo, tc.categoria_id, c.nombre AS categoria_nombre,
                   tc.monto, tc.moneda, tc.descripcion,
                   tc.mes_inicio_vigencia, tc.anio_inicio_vigencia, tc.mes_fin_vigencia, tc.anio_fin_vigencia,
                   tc.periodo_vigencia, tc.activo
            FROM academias.tarifas_costos tc
            LEFT JOIN academias.categorias c ON c.id = tc.categoria_id
            WHERE tc.academia_id = :aid
            ORDER BY tc.periodo_vigencia DESC, tc.monto ASC
        """), {"aid": aid})
        return [
            {
                "id": str(r[0]), "concepto": r[1], "tipo_costo": r[2],
                "categoria_id": str(r[3]) if r[3] else None, "categoria_nombre": r[4],
                "monto": float(r[5]), "moneda": r[6] or "GS", "descripcion": r[7],
                "mes_inicio_vigencia": r[8], "anio_inicio_vigencia": r[9],
                "mes_fin_vigencia": r[10], "anio_fin_vigencia": r[11],
                "periodo_vigencia": r[12], "activo": r[13],
            }
            for r in res.fetchall()
        ]
    except Exception as e:
        print(f"Error cargando tarifas_costos: {e}")
        return []


@router.post("/academia/tarifas-costos")
async def crear_tarifa_costo(
    data: TarifaCostoRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Crea un concepto de costo/tarifa (matrícula, cuota, indumentaria, etc.)."""
    aid = current_user["academia_id"]
    cat_id = data.categoria_id if data.categoria_id and data.categoria_id.strip() else None

    await session.execute(text("""
        INSERT INTO academias.tarifas_costos (
            academia_id, concepto, tipo_costo, categoria_id, monto, moneda, descripcion,
            mes_inicio_vigencia, anio_inicio_vigencia, mes_fin_vigencia, anio_fin_vigencia,
            periodo_vigencia, activo
        ) VALUES (
            :aid, :concepto, :tipo, :cat_id, :monto, :moneda, :desc,
            :mes_ini, :anio_ini, :mes_fin, :anio_fin,
            :periodo, :activo
        )
    """), {
        "aid": aid, "concepto": data.concepto, "tipo": data.tipo_costo,
        "cat_id": cat_id, "monto": data.monto, "moneda": data.moneda or "GS",
        "desc": data.descripcion, "mes_ini": data.mes_inicio_vigencia,
        "anio_ini": data.anio_inicio_vigencia, "mes_fin": data.mes_fin_vigencia,
        "anio_fin": data.anio_fin_vigencia, "periodo": data.periodo_vigencia or "2026",
        "activo": data.activo if data.activo is not None else True,
    })
    await session.commit()
    return {"message": "Tarifa o costo registrado exitosamente."}


@router.delete("/academia/tarifas-costos/{tid}")
async def eliminar_tarifa_costo(
    tid: str,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Elimina una tarifa o costo."""
    aid = current_user["academia_id"]
    await session.execute(text("""
        DELETE FROM academias.tarifas_costos WHERE id = :tid AND academia_id = :aid
    """), {"tid": tid, "aid": aid})
    await session.commit()
    return {"message": "Tarifa eliminada."}


# ================================================================
# ENDPOINTS — REPORTES Y IMPRESIÓN DE CARNETS
# ================================================================

@router.get("/academia/reportes/alumnos")
async def reporte_alumnos(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """Genera el reporte consolidado de todos los alumnos registrados."""
    aid = current_user["academia_id"]
    res = await session.execute(text("""
        SELECT a.id, a.nombre, a.apellido, a.fecha_nacimiento, a.foto_perfil,
               a.tipo_sangre, a.alergias, a.contacto_emergencia, a.estado,
               s.nombre AS sucursal_nombre,
               cat.nombre AS categoria_nombre, cat.color AS categoria_color,
               t.nombre AS tutor_nombre, t.apellido AS tutor_apellido, t.telefono AS tutor_telefono, t.email AS tutor_email
        FROM academias.alumnos a
        LEFT JOIN academias.sucursales s ON s.id = a.sucursal_id
        LEFT JOIN academias.inscripciones i ON i.alumno_id = a.id AND i.estado = 'activa'
        LEFT JOIN academias.categorias cat ON cat.id = i.categoria_id
        LEFT JOIN academias.alumno_tutores at2 ON at2.alumno_id = a.id AND at2.es_tutor_principal = TRUE
        LEFT JOIN academias.tutores t ON t.id = at2.tutor_id
        WHERE a.academia_id = :aid
        ORDER BY a.apellido, a.nombre
    """), {"aid": aid})
    return [
        {
            "id": str(r[0]),
            "nombre_completo": f"{r[1]} {r[2] or ''}".strip(),
            "fecha_nacimiento": r[3].isoformat() if r[3] else None,
            "foto_perfil": r[4],
            "tipo_sangre": r[5] or "O+",
            "alergias": r[6] or "Ninguna",
            "contacto_emergencia": r[7] or "No registrado",
            "estado": r[8],
            "sucursal_nombre": r[9] or "Sede principal",
            "categoria_nombre": r[10] or "Sin categoría",
            "categoria_color": r[11] or "#3b82f6",
            "tutor_nombre": f"{r[12]} {r[13] or ''}".strip() if r[12] else "Sin tutor",
            "tutor_telefono": r[14] or "",
            "tutor_email": r[15] or "",
        }
        for r in res.fetchall()
    ]


@router.get("/academia/reportes/deudores")
async def reporte_deudores(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Genera el reporte consolidado de deudores / morosos con saldos pendientes."""
    aid = current_user["academia_id"]
    res = await session.execute(text("""
        SELECT c.id, c.alumno_id, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
               s.nombre AS sucursal_nombre, cat.nombre AS categoria_nombre,
               c.concepto, c.monto_final, c.fecha_vencimiento, c.estado,
               t.nombre AS tutor_nombre, t.apellido AS tutor_apellido, t.telefono AS tutor_telefono, t.email AS tutor_email
        FROM academias.cuotas c
        JOIN academias.alumnos a ON a.id = c.alumno_id
        LEFT JOIN academias.sucursales s ON s.id = a.sucursal_id
        LEFT JOIN academias.inscripciones i ON i.alumno_id = a.id AND i.estado = 'activa'
        LEFT JOIN academias.categorias cat ON cat.id = i.categoria_id
        LEFT JOIN academias.alumno_tutores at2 ON at2.alumno_id = a.id AND at2.es_tutor_principal = TRUE
        LEFT JOIN academias.tutores t ON t.id = at2.tutor_id
        WHERE c.academia_id = :aid AND c.estado IN ('pendiente', 'vencida')
        ORDER BY c.fecha_vencimiento ASC, a.apellido, a.nombre
    """), {"aid": aid})
    return [
        {
            "cuota_id": str(r[0]),
            "alumno_id": str(r[1]),
            "alumno_nombre": f"{r[2]} {r[3] or ''}".strip(),
            "sucursal_nombre": r[4] or "Sede principal",
            "categoria_nombre": r[5] or "General",
            "concepto": r[6],
            "monto": float(r[7]),
            "fecha_vencimiento": r[8].isoformat() if r[8] else None,
            "estado": r[9],
            "tutor_nombre": f"{r[10]} {r[11] or ''}".strip() if r[10] else "No asignado",
            "tutor_telefono": r[12] or "",
            "tutor_email": r[13] or "",
        }
        for r in res.fetchall()
    ]

