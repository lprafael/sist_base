# routers/academias.py
# Router principal para el Sistema de Gestión de Academias Deportivas (SAD-M)
# 
# Control de acceso por rol interno (RBAC):
#   dueño        → usuario con rol='academia' en sistema.usuarios
#   administrador, tesorero, profesor → miembros en academias.miembros

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
import os
import uuid
import base64
import traceback
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Union
from database import get_session
from security import get_current_user

router = APIRouter(tags=["Academias"])

def _guardar_foto_perfil(foto_raw: Optional[str]) -> Optional[str]:
    """Si la foto de perfil viene codificada en Base64 data:image, la guarda físicamente en disco y retorna la URL estática."""
    if not foto_raw or not isinstance(foto_raw, str):
        return None
    val = foto_raw.strip()
    if not val:
        return None
    if val.startswith("data:image/"):
        try:
            header, encoded = val.split(",", 1)
            ext = "png" if "png" in header else "jpg"
            data_bytes = base64.b64decode(encoded)
            upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "alumnos")
            os.makedirs(upload_dir, exist_ok=True)
            filename = f"alumno_{uuid.uuid4().hex[:12]}.{ext}"
            with open(os.path.join(upload_dir, filename), "wb") as f:
                f.write(data_bytes)
            return f"https://api.micancha.com.py/static/uploads/alumnos/{filename}"
        except Exception as e:
            print(f"[AVISO _guardar_foto_perfil]: {e}")
            return val
    return val

# ================================================================
# HELPER: Resolver academia_id y rol_interno del usuario actual
# ================================================================

async def get_academia_context(
    request: Union[Request, dict, None] = None,
    current_user: Optional[dict] = None,
    session: Optional[AsyncSession] = None
) -> dict:
    """
    Para un usuario autenticado, resuelve:
      - academia_id: UUID de la academia que gestiona
      - rol_interno: 'dueño' | 'administrador' | 'tesorero' | 'profesor'
      - sucursal_id: UUID de sucursal asignada (solo para profesores; None = acceso total)
    Lanza 403 si el usuario no tiene acceso a ninguna academia.
    """
    if isinstance(request, dict):
        session = current_user
        current_user = request
        request = None

    if not current_user or not isinstance(current_user, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado."
        )

    uid = current_user["user_id"]
    role = current_user.get("role", "")

    header_acad_id = None
    if request and hasattr(request, "headers"):
        header_acad_id = request.headers.get("X-Academia-Id") or request.headers.get("x-academia-id")
        if not header_acad_id and hasattr(request, "query_params"):
            header_acad_id = request.query_params.get("academia_id")
    if not header_acad_id and isinstance(current_user, dict):
        header_acad_id = current_user.get("academia_id")

    # Caso 0: Super Admin / Admin global -> acceso total a cualquier academia
    if role in ["super", "admin", "superadmin"]:
        if header_acad_id:
            try:
                target_uuid = uuid.UUID(str(header_acad_id))
                res = await session.execute(
                    text("SELECT id FROM academias.academias WHERE id = :aid"),
                    {"aid": str(target_uuid)}
                )
                row = res.fetchone()
                if row:
                    return {"academia_id": row[0], "rol_interno": "dueño", "sucursal_id": None}
            except Exception:
                pass
        
        res = await session.execute(text("SELECT id FROM academias.academias ORDER BY creado_en ASC LIMIT 1"))
        row = res.fetchone()
        if row:
            return {"academia_id": row[0], "rol_interno": "dueño", "sucursal_id": None}

    # Caso 1: dueño directo (rol='academia' en sistema.usuarios)
    if role == "academia":
        if header_acad_id:
            try:
                target_uuid = uuid.UUID(str(header_acad_id))
                res = await session.execute(
                    text("SELECT id FROM academias.academias WHERE id = :aid"),
                    {"aid": str(target_uuid)}
                )
                row = res.fetchone()
                if row:
                    return {"academia_id": row[0], "rol_interno": "dueño", "sucursal_id": None}
            except Exception:
                pass

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
    if header_acad_id:
        try:
            target_uuid = uuid.UUID(str(header_acad_id))
            res = await session.execute(
                text("""
                    SELECT m.academia_id, m.rol, m.sucursal_id
                    FROM academias.miembros m
                    WHERE m.usuario_id = :uid AND m.academia_id = :aid AND m.activo = TRUE
                    LIMIT 1
                """),
                {"uid": uid, "aid": str(target_uuid)}
            )
            row = res.fetchone()
            if row:
                return {"academia_id": row[0], "rol_interno": row[1], "sucursal_id": row[2]}
        except Exception:
            pass

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
        request: Request,
        current_user: dict = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
    ):
        ctx = await get_academia_context(request, current_user, session)
        if current_user.get("role") in ["super", "admin", "superadmin"] or ctx["rol_interno"] in allowed_roles:
            return {**current_user, **ctx}

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Se requiere uno de estos roles: {', '.join(allowed_roles)}"
        )
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


def _clean_str(val: Optional[str]) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _clean_date(val: Optional[Union[str, date]]) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date):
        return val
    s = _clean_str(str(val))
    if not s:
        return None
    if "T" in s:
        s = s.split("T")[0]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


def _clean_estado(val: Optional[str]) -> str:
    s = _clean_str(val)
    if not s:
        return "activo"
    s_lower = s.lower()
    if s_lower in ["activo", "inactivo", "prueba"]:
        return s_lower
    return "activo"



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
    alumno_id: Optional[str] = None


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
    monto: Optional[float] = None     # Si None → pago total; si float → pago parcial
    fecha_pago: Optional[str] = None  # YYYY-MM-DD; None = hoy
    notas: Optional[str] = None


class AnularPagoRequest(BaseModel):
    motivo_anulacion: Optional[str] = None


class MatriculaRequest(BaseModel):
    alumno_id: str
    monto: Optional[float] = None   # None = usar config.matricula_anual
    anio: Optional[int] = None      # None = año actual
    fecha_vencimiento: Optional[str] = None
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


class AcademiaAdminCreateRequest(BaseModel):
    nombre: str
    plan: Optional[str] = 'basico'
    usuario_email: Optional[str] = None
    habilitado: Optional[bool] = True


# ================================================================
# ENDPOINTS PÚBLICOS Y ADMINISTRACIÓN
# ================================================================

@router.get("/api/academias")
async def listar_academias_publicas(session: AsyncSession = Depends(get_session)):
    """Lista de academias (públicas y para administración)."""
    res = await session.execute(text("""
        SELECT a.id, a.nombre, a.enlace_sitio, a.logo_url, a.ciudad, a.departamento,
               a.color_primario, a.acerca_de,
               COUNT(DISTINCT s.id) AS total_sucursales,
               ARRAY_AGG(DISTINCT s.deporte) FILTER (WHERE s.deporte IS NOT NULL) AS deportes,
               a.plan, a.habilitada, COALESCE(a.email, u.email) as usuario_email
        FROM academias.academias a
        LEFT JOIN sistema.usuarios u ON u.id = a.usuario_id
        LEFT JOIN academias.sucursales s ON s.academia_id = a.id AND s.activa = TRUE
        GROUP BY a.id, a.nombre, a.enlace_sitio, a.logo_url, a.ciudad, a.departamento,
                 a.color_primario, a.acerca_de, a.plan, a.habilitada, a.email, u.email
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
            "plan": r[10] or 'basico',
            "habilitado": r[11] if r[11] is not None else True,
            "usuario_email": r[12] or ''
        }
        for r in rows
    ]


@router.post("/api/academias")
async def crear_academia(req: AcademiaAdminCreateRequest, session: AsyncSession = Depends(get_session)):
    import re
    import random
    import string

    usuario_id = None
    if req.usuario_email:
        res_usr = await session.execute(
            text("SELECT id FROM sistema.usuarios WHERE email = :email"),
            {"email": req.usuario_email}
        )
        row_usr = res_usr.fetchone()
        if row_usr:
            usuario_id = row_usr[0]
        else:
            from security import get_password_hash
            temp_pass = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            pass_hash = get_password_hash(temp_pass)
            username = req.usuario_email.split('@')[0]
            res_exist = await session.execute(text("SELECT id FROM sistema.usuarios WHERE username = :u"), {"u": username})
            if res_exist.fetchone():
                username = f"{username}_{random.randint(100, 999)}"
            
            res_new = await session.execute(text("""
                INSERT INTO sistema.usuarios (username, email, password_hash, rol, activo, nombre_completo)
                VALUES (:u, :e, :p, 'academia', TRUE, :nom)
                RETURNING id
            """), {"u": username, "e": req.usuario_email, "p": pass_hash, "nom": req.nombre})
            usuario_id = res_new.fetchone()[0]

    if not usuario_id:
        from security import get_password_hash
        username = f"acad_{uuid.uuid4().hex[:8]}"
        email = f"{username}@micancha.com.py"
        pass_hash = get_password_hash("Academia123!")
        res_new = await session.execute(text("""
            INSERT INTO sistema.usuarios (username, email, password_hash, rol, activo, nombre_completo)
            VALUES (:u, :e, :p, 'academia', TRUE, :nom)
            RETURNING id
        """), {"u": username, "e": email, "p": pass_hash, "nom": req.nombre})
        usuario_id = res_new.fetchone()[0]

    clean_name = re.sub(r'[^a-z0-9]+', '-', req.nombre.lower()).strip('-')
    slug = f"{clean_name}-{uuid.uuid4().hex[:4]}" if clean_name else f"academia-{uuid.uuid4().hex[:6]}"

    res_acad = await session.execute(text("""
        INSERT INTO academias.academias (usuario_id, nombre, plan, habilitada, email, enlace_sitio)
        VALUES (:uid, :nom, :plan, :hab, :email, :slug)
        ON CONFLICT (usuario_id) DO UPDATE 
        SET nombre = EXCLUDED.nombre, plan = EXCLUDED.plan, habilitada = EXCLUDED.habilitada, email = EXCLUDED.email
        RETURNING id, nombre, plan, habilitada
    """), {
        "uid": usuario_id,
        "nom": req.nombre,
        "plan": req.plan or 'basico',
        "hab": req.habilitado if req.habilitado is not None else True,
        "email": req.usuario_email or f"{slug}@micancha.com.py",
        "slug": slug
    })
    await session.commit()
    row = res_acad.fetchone()
    return {"id": str(row[0]), "nombre": row[1], "plan": row[2], "habilitado": row[3], "usuario_email": req.usuario_email}


@router.put("/api/academias/{academia_id}")
async def actualizar_academia(academia_id: str, req: AcademiaAdminCreateRequest, session: AsyncSession = Depends(get_session)):
    await session.execute(text("""
        UPDATE academias.academias
        SET nombre = COALESCE(:nom, nombre),
            plan = COALESCE(:plan, plan),
            habilitada = COALESCE(:hab, habilitada),
            email = COALESCE(:email, email),
            actualizado_en = NOW()
        WHERE id = :aid
    """), {
        "aid": academia_id,
        "nom": req.nombre,
        "plan": req.plan,
        "hab": req.habilitado,
        "email": req.usuario_email
    })

    if req.usuario_email:
        res_usr = await session.execute(
            text("SELECT usuario_id FROM academias.academias WHERE id = :aid"),
            {"aid": academia_id}
        )
        row_usr = res_usr.fetchone()
        if row_usr and row_usr[0]:
            await session.execute(
                text("UPDATE sistema.usuarios SET email = :e WHERE id = :uid"),
                {"e": req.usuario_email, "uid": row_usr[0]}
            )
            
    await session.commit()
    return {"status": "ok", "message": "Academia actualizada correctamente"}


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
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Obtiene el perfil de la academia. Accesible por dueño y administrador."""
    ctx = await get_academia_context(request, current_user, session)
    if ctx["rol_interno"] not in ("dueño", "administrador"):
        raise HTTPException(status_code=403, detail="Acceso restringido.")

    res = await session.execute(text("""
        SELECT nombre, descripcion, enlace_sitio, logo_url, banner_url, color_primario,
               acerca_de, facebook, instagram, youtube, whatsapp, email, telefono,
               pais, departamento, ciudad, plan, habilitada, canal_comunicacion_habilitado,
               horarios_oficina
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
        "horarios_oficina": row[19] or [],
    }


@router.post("/academia/perfil")
async def guardar_perfil(
    data: PerfilAcademiaRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza el perfil de la academia. Accesible por dueño y administrador."""
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
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Sube el logo de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    if ctx["rol_interno"] not in ("dueño", "administrador"):
        raise HTTPException(status_code=403, detail="Acceso restringido. Se requiere rol de dueño o administrador.")

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
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Sube el banner de la academia."""
    ctx = await get_academia_context(request, current_user, session)
    if ctx["rol_interno"] not in ("dueño", "administrador"):
        raise HTTPException(status_code=403, detail="Acceso restringido. Se requiere rol de dueño o administrador.")

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
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Lista las sucursales de la academia."""
    ctx = await get_academia_context(request, current_user, session)
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

    aid = str(current_user["academia_id"])

    if ubicacion:
        sql = text("""
            INSERT INTO academias.sucursales
                (academia_id, nombre, deporte, direccion, ciudad, departamento, telefono, email, ubicacion)
            VALUES
                (:aid, :nombre, :deporte, :direccion, :ciudad, :departamento, :telefono, :email, ST_GeogFromText(:ubicacion))
            RETURNING id
        """)
        params = {
            "aid": aid,
            "nombre": data.nombre, "deporte": data.deporte,
            "direccion": data.direccion, "ciudad": data.ciudad,
            "departamento": data.departamento, "telefono": data.telefono,
            "email": data.email, "ubicacion": ubicacion,
        }
    else:
        sql = text("""
            INSERT INTO academias.sucursales
                (academia_id, nombre, deporte, direccion, ciudad, departamento, telefono, email)
            VALUES
                (:aid, :nombre, :deporte, :direccion, :ciudad, :departamento, :telefono, :email)
            RETURNING id
        """)
        params = {
            "aid": aid,
            "nombre": data.nombre, "deporte": data.deporte,
            "direccion": data.direccion, "ciudad": data.ciudad,
            "departamento": data.departamento, "telefono": data.telefono,
            "email": data.email,
        }

    res = await session.execute(sql, params)
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

    aid = str(current_user["academia_id"])

    if ubicacion:
        sql = text("""
            UPDATE academias.sucursales SET
                nombre       = :nombre,
                deporte      = :deporte,
                direccion    = :direccion,
                ciudad       = :ciudad,
                departamento = :departamento,
                telefono     = :telefono,
                email        = :email,
                ubicacion    = ST_GeogFromText(:ubicacion)
            WHERE id = :sid AND academia_id = :aid
        """)
        params = {
            "sid": str(sucursal_id), "aid": aid,
            "nombre": data.nombre, "deporte": data.deporte,
            "direccion": data.direccion, "ciudad": data.ciudad,
            "departamento": data.departamento, "telefono": data.telefono,
            "email": data.email, "ubicacion": ubicacion,
        }
    else:
        sql = text("""
            UPDATE academias.sucursales SET
                nombre       = :nombre,
                deporte      = :deporte,
                direccion    = :direccion,
                ciudad       = :ciudad,
                departamento = :departamento,
                telefono     = :telefono,
                email        = :email
            WHERE id = :sid AND academia_id = :aid
        """)
        params = {
            "sid": str(sucursal_id), "aid": aid,
            "nombre": data.nombre, "deporte": data.deporte,
            "direccion": data.direccion, "ciudad": data.ciudad,
            "departamento": data.departamento, "telefono": data.telefono,
            "email": data.email,
        }

    await session.execute(sql, params)
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
    aid_str = str(current_user["academia_id"])
    suc_id = data.sucursal_id if data.sucursal_id and data.sucursal_id.strip() else None

    if not suc_id:
        res_suc = await session.execute(text("""
            SELECT id FROM academias.sucursales WHERE academia_id = :aid AND activa = TRUE ORDER BY creado_en ASC LIMIT 1
        """), {"aid": aid_str})
        row_suc = res_suc.fetchone()
        if row_suc:
            suc_id = str(row_suc[0])
        else:
            res_new_suc = await session.execute(text("""
                INSERT INTO academias.sucursales (academia_id, nombre, deporte, activa)
                VALUES (:aid, 'Sede Principal', 'General', TRUE)
                RETURNING id
            """), {"aid": aid_str})
            suc_id = str(res_new_suc.fetchone()[0])

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
        "cid": str(categoria_id),
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
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    sucursal_id: Optional[str] = None,
    categoria_id: Optional[str] = None,
    estado: Optional[str] = None,
):
    """Lista alumnos. Profesores ven solo su sucursal."""
    ctx = await get_academia_context(request, current_user, session)

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
    if categoria_id:
        conditions.append("EXISTS (SELECT 1 FROM academias.inscripciones i WHERE i.alumno_id = a.id AND i.categoria_id = CAST(:cid AS UUID) AND i.estado = 'activa')")
        params["cid"] = categoria_id

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
    try:
        raw_aid = current_user.get("academia_id")
        if not raw_aid or str(raw_aid).strip() == "" or str(raw_aid).lower() == "none":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró una academia válida vinculada a tu usuario."
            )

        new_id = str(uuid.uuid4())
        aid = str(raw_aid).strip()
        sucursal_id = _clean_str(data.sucursal_id)
        fecha_nac = _clean_date(data.fecha_nacimiento)
        estado = _clean_estado(data.estado)

        await session.execute(text("""
            INSERT INTO academias.alumnos
                (id, academia_id, sucursal_id, nombre, apellido, fecha_nacimiento, foto_perfil,
                 tipo_sangre, alergias, condiciones_medicas, seguro_medico,
                 contacto_emergencia, estado, notas)
            VALUES
                (CAST(:id AS UUID), CAST(:aid AS UUID), CAST(:sucursal_id AS UUID), :nombre, :apellido, CAST(:fecha_nacimiento AS DATE), :foto_perfil,
                 :tipo_sangre, :alergias, :condiciones_medicas, :seguro_medico,
                 :contacto_emergencia, :estado, :notas)
        """), {
            "id": new_id,
            "aid": aid,
            "sucursal_id": sucursal_id,
            "nombre": data.nombre.strip() if data.nombre else "",
            "apellido": _clean_str(data.apellido),
            "fecha_nacimiento": fecha_nac,
            "foto_perfil": _guardar_foto_perfil(data.foto_perfil),
            "tipo_sangre": _clean_str(data.tipo_sangre),
            "alergias": _clean_str(data.alergias),
            "condiciones_medicas": _clean_str(data.condiciones_medicas),
            "seguro_medico": _clean_str(data.seguro_medico),
            "contacto_emergencia": _clean_str(data.contacto_emergencia),
            "estado": estado,
            "notas": _clean_str(data.notas),
        })
        await session.commit()
        return {"message": "Alumno registrado.", "id": new_id}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        if "StringDataRightTruncationError" in str(e) or "value too long" in str(e):
            try:
                await session.execute(text("ALTER TABLE academias.alumnos ALTER COLUMN foto_perfil TYPE TEXT;"))
                await session.commit()
                await session.execute(text("""
                    INSERT INTO academias.alumnos
                        (id, academia_id, sucursal_id, nombre, apellido, fecha_nacimiento, foto_perfil,
                         tipo_sangre, alergias, condiciones_medicas, seguro_medico,
                         contacto_emergencia, estado, notas)
                    VALUES
                        (CAST(:id AS UUID), CAST(:aid AS UUID), CAST(:sucursal_id AS UUID), :nombre, :apellido, CAST(:fecha_nacimiento AS DATE), :foto_perfil,
                         :tipo_sangre, :alergias, :condiciones_medicas, :seguro_medico,
                         :contacto_emergencia, :estado, :notas)
                """), {
                    "id": new_id, "aid": aid, "sucursal_id": sucursal_id,
                    "nombre": data.nombre.strip() if data.nombre else "",
                    "apellido": _clean_str(data.apellido), "fecha_nacimiento": fecha_nac,
                    "foto_perfil": _guardar_foto_perfil(data.foto_perfil),
                    "tipo_sangre": _clean_str(data.tipo_sangre), "alergias": _clean_str(data.alergias),
                    "condiciones_medicas": _clean_str(data.condiciones_medicas),
                    "seguro_medico": _clean_str(data.seguro_medico),
                    "contacto_emergencia": _clean_str(data.contacto_emergencia),
                    "estado": estado, "notas": _clean_str(data.notas),
                })
                await session.commit()
                return {"message": "Alumno registrado.", "id": new_id}
            except Exception as retry_err:
                await session.rollback()
                print(f"[ERROR retry registrar_alumno]: {retry_err}")

        print(f"[ERROR registrar_alumno]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar alumno: {str(e)}"
        )


@router.get("/academia/alumnos/{alumno_id}")
async def detalle_alumno(
    alumno_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Detalle completo de un alumno, incluyendo tutores e inscripciones."""
    ctx = await get_academia_context(request, current_user, session)
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
    try:
        raw_aid = current_user.get("academia_id")
        if not raw_aid or str(raw_aid).strip() == "" or str(raw_aid).lower() == "none":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró una academia válida vinculada a tu usuario."
            )

        aid = str(raw_aid).strip()
        foto_final = _guardar_foto_perfil(data.foto_perfil)
        await session.execute(text("""
            UPDATE academias.alumnos SET
                nombre               = COALESCE(:nombre, nombre),
                apellido             = :apellido,
                fecha_nacimiento     = CAST(:fecha_nacimiento AS DATE),
                foto_perfil          = :foto_perfil,
                tipo_sangre          = :tipo_sangre,
                alergias             = :alergias,
                condiciones_medicas  = :condiciones_medicas,
                seguro_medico        = :seguro_medico,
                contacto_emergencia  = :contacto_emergencia,
                estado               = COALESCE(:estado, estado),
                notas                = :notas,
                sucursal_id          = CAST(:sucursal_id AS UUID)
            WHERE id = CAST(:alumno_id AS UUID) AND academia_id = CAST(:academia_id AS UUID)
        """), {
            "alumno_id": alumno_id, "academia_id": aid,
            "nombre": data.nombre.strip() if data.nombre else None,
            "apellido": _clean_str(data.apellido),
            "fecha_nacimiento": _clean_date(data.fecha_nacimiento),
            "foto_perfil": foto_final,
            "tipo_sangre": _clean_str(data.tipo_sangre),
            "alergias": _clean_str(data.alergias),
            "condiciones_medicas": _clean_str(data.condiciones_medicas),
            "seguro_medico": _clean_str(data.seguro_medico),
            "contacto_emergencia": _clean_str(data.contacto_emergencia),
            "estado": _clean_estado(data.estado),
            "notas": _clean_str(data.notas),
            "sucursal_id": _clean_str(data.sucursal_id),
        })
        await session.commit()
        return {"message": "Alumno actualizado."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        if "StringDataRightTruncationError" in str(e) or "value too long" in str(e):
            try:
                await session.execute(text("ALTER TABLE academias.alumnos ALTER COLUMN foto_perfil TYPE TEXT;"))
                await session.commit()
                foto_final = _guardar_foto_perfil(data.foto_perfil)
                await session.execute(text("""
                    UPDATE academias.alumnos SET
                        nombre               = COALESCE(:nombre, nombre),
                        apellido             = :apellido,
                        fecha_nacimiento     = CAST(:fecha_nacimiento AS DATE),
                        foto_perfil          = :foto_perfil,
                        tipo_sangre          = :tipo_sangre,
                        alergias             = :alergias,
                        condiciones_medicas  = :condiciones_medicas,
                        seguro_medico        = :seguro_medico,
                        contacto_emergencia  = :contacto_emergencia,
                        estado               = COALESCE(:estado, estado),
                        notas                = :notas,
                        sucursal_id          = CAST(:sucursal_id AS UUID)
                    WHERE id = CAST(:alumno_id AS UUID) AND academia_id = CAST(:academia_id AS UUID)
                """), {
                    "alumno_id": alumno_id, "academia_id": aid,
                    "nombre": data.nombre.strip() if data.nombre else None,
                    "apellido": _clean_str(data.apellido),
                    "fecha_nacimiento": _clean_date(data.fecha_nacimiento),
                    "foto_perfil": foto_final,
                    "tipo_sangre": _clean_str(data.tipo_sangre),
                    "alergias": _clean_str(data.alergias),
                    "condiciones_medicas": _clean_str(data.condiciones_medicas),
                    "seguro_medico": _clean_str(data.seguro_medico),
                    "contacto_emergencia": _clean_str(data.contacto_emergencia),
                    "estado": _clean_estado(data.estado),
                    "notas": _clean_str(data.notas),
                    "sucursal_id": _clean_str(data.sucursal_id),
                })
                await session.commit()
                return {"message": "Alumno actualizado."}
            except Exception as retry_err:
                await session.rollback()
                print(f"[ERROR retry actualizar_alumno]: {retry_err}")

        print(f"[ERROR actualizar_alumno]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar alumno: {str(e)}"
        )


@router.post("/academia/alumnos/{alumno_id}/foto")
async def subir_foto_alumno(
    alumno_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Sube y actualiza la foto de perfil de un alumno."""
    try:
        raw_aid = current_user.get("academia_id")
        if not raw_aid or str(raw_aid).strip() == "" or str(raw_aid).lower() == "none":
            raise HTTPException(status_code=400, detail="No se encontró una academia válida vinculada a tu usuario.")
        aid = str(raw_aid).strip()

        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

        upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "alumnos")
        os.makedirs(upload_dir, exist_ok=True)
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"alumno_{alumno_id}_{uuid.uuid4().hex[:8]}.{ext}"
        with open(os.path.join(upload_dir, filename), "wb") as f:
            f.write(await file.read())

        url = f"https://api.micancha.com.py/static/uploads/alumnos/{filename}"

        await session.execute(text("""
            UPDATE academias.alumnos SET foto_perfil = :foto_perfil
            WHERE id = CAST(:alumno_id AS UUID) AND academia_id = CAST(:academia_id AS UUID)
        """), {"alumno_id": alumno_id, "academia_id": aid, "foto_perfil": url})
        await session.commit()

        return {"message": "Foto del alumno actualizada.", "url": url}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al subir foto del alumno: {str(e)}")


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
               STRING_AGG(CONCAT(a.nombre, ' ', a.apellido), ', ') AS alumnos_vinculados,
               COUNT(DISTINCT at2.alumno_id) AS total_alumnos
        FROM academias.tutores t
        LEFT JOIN academias.alumno_tutores at2 ON at2.tutor_id = t.id
        LEFT JOIN academias.alumnos a ON a.id = at2.alumno_id
        WHERE t.academia_id = CAST(:aid AS UUID)
        GROUP BY t.id, t.nombre, t.apellido, t.telefono, t.email, t.vinculo, t.es_pagador, t.creado_en
        ORDER BY t.apellido, t.nombre
    """), {"aid": str(current_user["academia_id"])})
    return [
        {
            "id": str(r[0]), "nombre": r[1], "apellido": r[2],
            "telefono": r[3], "email": r[4], "vinculo": r[5],
            "es_pagador": r[6], "creado_en": r[7].isoformat() if r[7] else None,
            "alumnos_vinculados": r[8] or "Sin alumnos",
            "total_alumnos": r[9],
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
    try:
        new_id = str(uuid.uuid4())
        aid = str(current_user["academia_id"])
        
        await session.execute(text("""
            INSERT INTO academias.tutores (id, academia_id, nombre, apellido, telefono, email, vinculo, es_pagador)
            VALUES (CAST(:id AS UUID), CAST(:aid AS UUID), :nombre, :apellido, :telefono, :email, :vinculo, :es_pagador)
        """), {
            "id": new_id,
            "aid": aid,
            "nombre": data.nombre.strip() if data.nombre else "",
            "apellido": _clean_str(data.apellido),
            "telefono": _clean_str(data.telefono),
            "email": _clean_str(data.email),
            "vinculo": _clean_str(data.vinculo),
            "es_pagador": data.es_pagador if data.es_pagador is not None else True,
        })
        
        alumno_id = _clean_str(data.alumno_id)
        if alumno_id:
            await session.execute(text("""
                INSERT INTO academias.alumno_tutores (alumno_id, tutor_id, es_tutor_principal)
                VALUES (CAST(:alumno_id AS UUID), CAST(:tutor_id AS UUID), TRUE)
                ON CONFLICT (alumno_id, tutor_id) DO UPDATE SET es_tutor_principal = TRUE
            """), {"alumno_id": alumno_id, "tutor_id": new_id})

        await session.commit()
        return {"message": "Tutor registrado.", "id": new_id}
    except Exception as e:
        await session.rollback()
        print(f"[ERROR registrar_tutor]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar tutor: {str(e)}"
        )


@router.put("/academia/tutores/{tutor_id}")
async def actualizar_tutor(
    tutor_id: str,
    data: TutorRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza datos de un tutor/padre de familia."""
    try:
        aid = str(current_user["academia_id"])
        await session.execute(text("""
            UPDATE academias.tutores SET
                nombre     = COALESCE(:nombre, nombre),
                apellido   = :apellido,
                telefono   = :telefono,
                email      = :email,
                vinculo    = :vinculo,
                es_pagador = :es_pagador
            WHERE id = CAST(:tutor_id AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {
            "tutor_id": tutor_id, "aid": aid,
            "nombre": data.nombre.strip() if data.nombre else None,
            "apellido": _clean_str(data.apellido),
            "telefono": _clean_str(data.telefono),
            "email": _clean_str(data.email),
            "vinculo": _clean_str(data.vinculo),
            "es_pagador": data.es_pagador if data.es_pagador is not None else True,
        })
        
        alumno_id = _clean_str(data.alumno_id)
        if alumno_id:
            await session.execute(text("""
                INSERT INTO academias.alumno_tutores (alumno_id, tutor_id, es_tutor_principal)
                VALUES (CAST(:alumno_id AS UUID), CAST(:tutor_id AS UUID), TRUE)
                ON CONFLICT (alumno_id, tutor_id) DO UPDATE SET es_tutor_principal = TRUE
            """), {"alumno_id": alumno_id, "tutor_id": tutor_id})

        await session.commit()
        return {"message": "Tutor actualizado."}
    except Exception as e:
        await session.rollback()
        print(f"[ERROR actualizar_tutor]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar tutor: {str(e)}"
        )


@router.delete("/academia/tutores/{tutor_id}")
async def eliminar_tutor(
    tutor_id: str,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Elimina un tutor registrado."""
    try:
        aid = str(current_user["academia_id"])
        await session.execute(text("""
            DELETE FROM academias.tutores
            WHERE id = CAST(:tutor_id AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"tutor_id": tutor_id, "aid": aid})
        await session.commit()
        return {"message": "Tutor eliminado."}
    except Exception as e:
        await session.rollback()
        print(f"[ERROR eliminar_tutor]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al eliminar tutor: {str(e)}"
        )


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
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    sucursal_id: Optional[str] = None
):
    """Lista categorías. Los profesores ven solo su sucursal."""
    ctx = await get_academia_context(request, current_user, session)
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
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    categoria_id: Optional[str] = None,
    estado: Optional[str] = "activa"
):
    """Lista inscripciones activas."""
    ctx = await get_academia_context(request, current_user, session)

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
    try:
        new_id = str(uuid.uuid4())
        fecha_ini = _clean_date(data.fecha_inicio) or date.today()
        
        await session.execute(text("""
            INSERT INTO academias.inscripciones
                (id, alumno_id, categoria_id, fecha_inicio, dias_por_semana,
                 cuota_mensual, descuento_aplicado, beca, notas)
            VALUES
                (CAST(:id AS UUID), CAST(:alumno_id AS UUID), CAST(:categoria_id AS UUID), CAST(:fecha_inicio AS DATE), :dias_por_semana,
                 :cuota_mensual, :descuento_aplicado, :beca, :notas)
        """), {
            "id": new_id,
            "alumno_id": str(data.alumno_id).strip(),
            "categoria_id": str(data.categoria_id).strip(),
            "fecha_inicio": fecha_ini,
            "dias_por_semana": data.dias_por_semana or 3,
            "cuota_mensual": float(data.cuota_mensual) if data.cuota_mensual is not None else 0.0,
            "descuento_aplicado": float(data.descuento_aplicado) if data.descuento_aplicado is not None else 0.0,
            "beca": data.beca if data.beca is not None else False,
            "notas": _clean_str(data.notas),
        })
        await session.commit()
        return {"message": "Alumno inscrito exitosamente.", "id": new_id}
    except Exception as e:
        await session.rollback()
        print(f"[ERROR inscribir_alumno]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al inscribir alumno: {str(e)}"
        )


@router.put("/academia/inscripciones/{inscripcion_id}")
async def actualizar_inscripcion(
    inscripcion_id: str,
    data: InscripcionRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Actualiza una inscripción."""
    try:
        fecha_ini = _clean_date(data.fecha_inicio)
        await session.execute(text("""
            UPDATE academias.inscripciones SET
                categoria_id       = CAST(:categoria_id AS UUID),
                fecha_inicio       = CAST(:fecha_inicio AS DATE),
                dias_por_semana    = :dias_por_semana,
                cuota_mensual      = :cuota_mensual,
                descuento_aplicado = :descuento_aplicado,
                beca               = :beca,
                notas              = :notas
            WHERE id = CAST(:inscripcion_id AS UUID)
        """), {
            "inscripcion_id": inscripcion_id,
            "categoria_id": str(data.categoria_id).strip(),
            "fecha_inicio": fecha_ini,
            "dias_por_semana": data.dias_por_semana or 3,
            "cuota_mensual": float(data.cuota_mensual) if data.cuota_mensual is not None else 0.0,
            "descuento_aplicado": float(data.descuento_aplicado) if data.descuento_aplicado is not None else 0.0,
            "beca": data.beca if data.beca is not None else False,
            "notas": _clean_str(data.notas),
        })
        await session.commit()
        return {"message": "Inscripción actualizada."}
    except Exception as e:
        await session.rollback()
        print(f"[ERROR actualizar_inscripcion]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar inscripción: {str(e)}"
        )


@router.delete("/academia/inscripciones/{inscripcion_id}")
async def cancelar_inscripcion(
    inscripcion_id: str,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Cancela o elimina una inscripción."""
    try:
        await session.execute(text("""
            UPDATE academias.inscripciones SET estado = 'cancelada'
            WHERE id = CAST(:inscripcion_id AS UUID)
        """), {"inscripcion_id": inscripcion_id})
        await session.commit()
        return {"message": "Inscripción cancelada."}
    except Exception as e:
        await session.rollback()
        print(f"[ERROR cancelar_inscripcion]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al cancelar inscripción: {str(e)}"
        )


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
               q.estado, q.fecha_vencimiento, q.fecha_pago, q.metodo_pago, q.notas,
               COALESCE(q.monto_pagado, 0) AS monto_pagado,
               COALESCE(q.tipo_cuota, 'mensual') AS tipo_cuota
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
            "monto_pagado": float(r[12]), "tipo_cuota": r[13],
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
    """
    Registra pago de una cuota. Soporta pago total y pago parcial.
    - Si 'monto' no se especifica → pago total del saldo pendiente.
    - Si 'monto' < monto_final restante → pago parcial, estado queda 'parcial'.
    - Si pago parcial cubre o supera el total → estado pasa a 'pagada'.
    """
    try:
        aid = str(current_user["academia_id"])
        fecha_pago = _clean_date(data.fecha_pago) or date.today()
        metodo = _clean_str(data.metodo_pago) or "efectivo"

        # Leer cuota actual
        res = await session.execute(text("""
            SELECT id, monto_final, monto_pagado, estado
            FROM academias.cuotas
            WHERE id = CAST(:cid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"cid": cuota_id, "aid": aid})
        cuota = res.fetchone()
        if not cuota:
            raise HTTPException(status_code=404, detail="Cuota no encontrada.")

        _, monto_final, monto_ya_pagado, estado_actual = cuota
        monto_final = float(monto_final)
        monto_ya_pagado = float(monto_ya_pagado)

        if estado_actual in ("pagada", "anulada", "becada"):
            raise HTTPException(status_code=400, detail=f"La cuota ya está en estado '{estado_actual}', no se puede pagar.")

        saldo_pendiente = max(monto_final - monto_ya_pagado, 0)
        monto_a_pagar = float(data.monto) if data.monto is not None else saldo_pendiente

        if monto_a_pagar <= 0:
            raise HTTPException(status_code=400, detail="El monto a pagar debe ser mayor a 0.")
        if monto_a_pagar > saldo_pendiente + 0.01:
            raise HTTPException(status_code=400, detail=f"El monto ({monto_a_pagar}) supera el saldo pendiente ({saldo_pendiente:.0f}).")

        monto_pagado_nuevo = monto_ya_pagado + monto_a_pagar
        estado_nuevo = "pagada" if monto_pagado_nuevo >= monto_final - 0.01 else "parcial"

        # Registrar pago individual en tabla pagos
        pago_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO academias.pagos
                (id, cuota_id, alumno_id, academia_id, monto, metodo_pago, fecha_pago, notas, registrado_por)
            SELECT CAST(:pago_id AS UUID), CAST(:cid AS UUID), alumno_id,
                   CAST(:aid AS UUID), :monto, :metodo, CAST(:fecha AS DATE), :notas, :reg_por
            FROM academias.cuotas WHERE id = CAST(:cid AS UUID)
        """), {
            "pago_id": pago_id, "cid": cuota_id, "aid": aid,
            "monto": monto_a_pagar, "metodo": metodo,
            "fecha": fecha_pago, "notas": _clean_str(data.notas),
            "reg_por": current_user["user_id"],
        })

        # Actualizar estado de la cuota
        await session.execute(text("""
            UPDATE academias.cuotas SET
                estado         = :estado,
                monto_pagado   = :monto_pagado,
                metodo_pago    = :metodo,
                fecha_pago     = CASE WHEN :estado = 'pagada' THEN NOW() ELSE fecha_pago END,
                registrado_por = :reg_por
            WHERE id = CAST(:cid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {
            "cid": cuota_id, "aid": aid, "estado": estado_nuevo,
            "monto_pagado": monto_pagado_nuevo,
            "metodo": metodo, "reg_por": current_user["user_id"],
        })

        await session.commit()

        # ── Facturación electrónica automática ──────────────────────────────
        factura_result = None
        if estado_nuevo == "pagada":
            try:
                from services.facturacion_service import intentar_emision_automatica
                # Obtener datos para el concepto de la factura
                info_res = await session.execute(text("""
                    SELECT a.nombre || ' ' || COALESCE(a.apellido,'') AS alumno,
                           cat.nombre AS categoria, c.anio, c.mes, i.alumno_id
                    FROM academias.cuotas c
                    JOIN academias.inscripciones i ON i.id = c.inscripcion_id
                    JOIN academias.alumnos a ON a.id = i.alumno_id
                    LEFT JOIN academias.categorias cat ON cat.id = i.categoria_id
                    WHERE c.id = CAST(:cid AS UUID)
                """), {"cid": cuota_id})
                info = info_res.fetchone()
                meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
                mes_nombre = meses[int(info[3])-1] if info and info[3] and 1<=int(info[3])<=12 else str(info[3] if info else "")
                concepto = f"Cuota {mes_nombre} {info[2] if info else ''} - {info[0].strip() if info else ''} - {info[1] if info else 'Sin categoría'}"
                alumno_id_str = str(info[4]) if info else None
                factura_result = await intentar_emision_automatica(
                    academia_id=aid,
                    cuota_id=cuota_id,
                    monto_gs=int(monto_final),
                    concepto=concepto,
                    alumno_id=alumno_id_str,
                    session=session,
                    creado_por=current_user["user_id"],
                )
            except Exception as fe:
                print(f"[AVISO facturación automática cuota {cuota_id}]: {fe}")
        # ────────────────────────────────────────────────────────────────────

        return {
            "message": f"Pago de Gs. {monto_a_pagar:,.0f} registrado. Estado: {estado_nuevo}.",
            "pago_id": pago_id,
            "monto_pagado": monto_pagado_nuevo,
            "saldo_pendiente": max(monto_final - monto_pagado_nuevo, 0),
            "estado": estado_nuevo,
            "factura": factura_result,
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR registrar_pago]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al registrar pago: {str(e)}")


@router.get("/academia/cuotas/{cuota_id}/pagos")
async def listar_pagos_cuota(
    cuota_id: str,
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Lista el historial de pagos de una cuota específica."""
    res = await session.execute(text("""
        SELECT p.id, p.monto, p.metodo_pago, p.fecha_pago, p.notas,
               p.anulado, p.anulado_en, p.motivo_anulacion,
               u.nombre || ' ' || COALESCE(u.apellido,'') AS registrado_por,
               p.creado_en
        FROM academias.pagos p
        LEFT JOIN sistema.usuarios u ON u.id = p.registrado_por
        WHERE p.cuota_id = CAST(:cid AS UUID) AND p.academia_id = CAST(:aid AS UUID)
        ORDER BY p.fecha_pago, p.creado_en
    """), {"cid": cuota_id, "aid": str(current_user["academia_id"])})
    return [
        {
            "id": str(r[0]), "monto": float(r[1]), "metodo_pago": r[2],
            "fecha_pago": r[3].isoformat() if r[3] else None,
            "notas": r[4], "anulado": r[5],
            "anulado_en": r[6].isoformat() if r[6] else None,
            "motivo_anulacion": r[7],
            "registrado_por": r[8].strip() if r[8] else None,
            "creado_en": r[9].isoformat() if r[9] else None,
        }
        for r in res.fetchall()
    ]


@router.put("/academia/pagos/{pago_id}/anular")
async def anular_pago(
    pago_id: str,
    data: AnularPagoRequest,
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Anula un pago individual. Revierte el monto_pagado en la cuota
    y recalcula el estado (pendiente / parcial).
    """
    try:
        aid = str(current_user["academia_id"])

        # Leer pago
        res_p = await session.execute(text("""
            SELECT id, cuota_id, monto, anulado
            FROM academias.pagos
            WHERE id = CAST(:pid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"pid": pago_id, "aid": aid})
        pago = res_p.fetchone()
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado.")
        if pago[3]:
            raise HTTPException(status_code=400, detail="Este pago ya fue anulado.")

        cuota_id = str(pago[1])
        monto_devuelto = float(pago[2])

        # Anular el pago
        await session.execute(text("""
            UPDATE academias.pagos SET
                anulado = TRUE, anulado_en = NOW(),
                anulado_por = :por, motivo_anulacion = :motivo
            WHERE id = CAST(:pid AS UUID)
        """), {"pid": pago_id, "por": current_user["user_id"], "motivo": _clean_str(data.motivo_anulacion)})

        # Recalcular monto_pagado de la cuota (sumando solo pagos no anulados)
        res_c = await session.execute(text("""
            SELECT monto_final, COALESCE(SUM(p.monto), 0) AS pagado_valido
            FROM academias.cuotas q
            LEFT JOIN academias.pagos p ON p.cuota_id = q.id AND p.anulado = FALSE
            WHERE q.id = CAST(:cid AS UUID)
            GROUP BY q.monto_final
        """), {"cid": cuota_id})
        row_c = res_c.fetchone()
        if row_c:
            monto_final = float(row_c[0])
            pagado_valido = float(row_c[1])
            if pagado_valido <= 0:
                nuevo_estado = "pendiente"
            elif pagado_valido >= monto_final - 0.01:
                nuevo_estado = "pagada"
            else:
                nuevo_estado = "parcial"

            await session.execute(text("""
                UPDATE academias.cuotas SET
                    monto_pagado = :pagado, estado = :estado
                WHERE id = CAST(:cid AS UUID)
            """), {"cid": cuota_id, "pagado": pagado_valido, "estado": nuevo_estado})

        await session.commit()
        return {
            "message": f"Pago de Gs. {monto_devuelto:,.0f} anulado. Saldo revertido a la cuota.",
            "monto_devuelto": monto_devuelto,
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR anular_pago]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al anular pago: {str(e)}")


@router.put("/academia/cuotas/{cuota_id}/anular")
async def anular_cuota(
    cuota_id: str,
    data: AnularPagoRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Anula completamente una cuota (sin importar su estado actual)."""
    try:
        aid = str(current_user["academia_id"])
        # Anular todos los pagos activos de la cuota
        await session.execute(text("""
            UPDATE academias.pagos SET
                anulado = TRUE, anulado_en = NOW(),
                anulado_por = :por, motivo_anulacion = :motivo
            WHERE cuota_id = CAST(:cid AS UUID) AND anulado = FALSE
        """), {"cid": cuota_id, "por": current_user["user_id"], "motivo": _clean_str(data.motivo_anulacion)})

        await session.execute(text("""
            UPDATE academias.cuotas SET
                estado = 'anulada', monto_pagado = 0
            WHERE id = CAST(:cid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"cid": cuota_id, "aid": aid})

        await session.commit()
        return {"message": "Cuota anulada. Todos los pagos asociados fueron revertidos."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR anular_cuota]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al anular cuota: {str(e)}")


@router.put("/academia/cuotas/{cuota_id}/editar")
async def editar_cuota(
    cuota_id: str,
    monto_final: float,
    descuento: Optional[float] = 0,
    notas: Optional[str] = None,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Edita el monto y descuento de una cuota pendiente o parcial."""
    try:
        aid = str(current_user["academia_id"])
        await session.execute(text("""
            UPDATE academias.cuotas SET
                monto_final = :monto_final,
                descuento   = :descuento,
                notas       = COALESCE(:notas, notas)
            WHERE id = CAST(:cid AS UUID) AND academia_id = CAST(:aid AS UUID)
              AND estado IN ('pendiente', 'vencida', 'parcial')
        """), {
            "cid": cuota_id, "aid": aid,
            "monto_final": float(monto_final),
            "descuento": float(descuento or 0),
            "notas": _clean_str(notas),
        })
        await session.commit()
        return {"message": "Cuota actualizada correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR editar_cuota]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al editar cuota: {str(e)}")


# ----------------------------------------------------------------
# MATRÍCULAS ANUALES
# ----------------------------------------------------------------

@router.post("/academia/matriculas/generar")
async def generar_matriculas(
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session),
    anio: Optional[int] = None,
):
    """
    Genera la matrícula anual para todos los alumnos activos
    usando el monto configurado en config_cuotas.
    Respeta alumnos con beca (genera en estado 'becada' con monto 0).
    Si el alumno ya tiene matrícula para ese año → la omite.
    """
    try:
        aid = str(current_user["academia_id"])
        anio_target = anio or date.today().year

        # Leer config
        cfg_res = await session.execute(text("""
            SELECT matricula_anual FROM academias.config_cuotas
            WHERE academia_id = CAST(:aid AS UUID)
        """), {"aid": aid})
        cfg = cfg_res.fetchone()
        monto_config = float(cfg[0]) if cfg and cfg[0] else 0

        if monto_config <= 0:
            raise HTTPException(status_code=400, detail="La matrícula anual configurada es 0. Configurala en Ajustes → Config Cuotas.")

        # Obtener alumnos activos sin matrícula en este año
        alumnos_res = await session.execute(text("""
            SELECT a.id, a.academia_id,
                   EXISTS(SELECT 1 FROM academias.inscripciones i WHERE i.alumno_id = a.id AND i.beca = TRUE AND i.estado = 'activa') AS tiene_beca
            FROM academias.alumnos a
            WHERE a.academia_id = CAST(:aid AS UUID) AND a.estado = 'activo'
              AND NOT EXISTS (
                  SELECT 1 FROM academias.matriculas m
                  WHERE m.alumno_id = a.id AND m.anio = :anio AND m.estado != 'anulada'
              )
        """), {"aid": aid, "anio": anio_target})
        alumnos = alumnos_res.fetchall()

        generadas = 0
        for a in alumnos:
            alumno_id, _, tiene_beca = a
            mat_id = str(uuid.uuid4())
            monto = 0 if tiene_beca else monto_config
            estado = "becada" if tiene_beca else "pendiente"
            fecha_vcto = date(anio_target, 1, 31)

            await session.execute(text("""
                INSERT INTO academias.matriculas
                    (id, alumno_id, academia_id, anio, monto, estado, fecha_vencimiento, registrado_por)
                VALUES
                    (CAST(:id AS UUID), CAST(:alumno_id AS UUID), CAST(:aid AS UUID),
                     :anio, :monto, :estado, CAST(:fecha AS DATE), :reg_por)
                ON CONFLICT (alumno_id, anio) DO NOTHING
            """), {
                "id": mat_id, "alumno_id": str(alumno_id), "aid": aid,
                "anio": anio_target, "monto": monto, "estado": estado,
                "fecha": fecha_vcto, "reg_por": current_user["user_id"],
            })
            generadas += 1

        await session.commit()
        return {
            "message": f"Matrículas {anio_target} generadas.",
            "generadas": generadas,
            "monto_por_alumno": monto_config,
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR generar_matriculas]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al generar matrículas: {str(e)}")


@router.get("/academia/matriculas")
async def listar_matriculas(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session),
    anio: Optional[int] = None,
    estado: Optional[str] = None,
):
    """Lista matrículas anuales de la academia."""
    aid = str(current_user["academia_id"])
    conditions = ["m.academia_id = CAST(:aid AS UUID)"]
    params: dict = {"aid": aid}
    if anio:
        conditions.append("m.anio = :anio")
        params["anio"] = anio
    if estado:
        conditions.append("m.estado = :estado")
        params["estado"] = estado
    where = " AND ".join(conditions)

    res = await session.execute(text(f"""
        SELECT m.id, m.anio, m.monto, m.estado, m.fecha_vencimiento, m.notas,
               a.nombre || ' ' || COALESCE(a.apellido,'') AS alumno, a.id AS alumno_id
        FROM academias.matriculas m
        JOIN academias.alumnos a ON a.id = m.alumno_id
        WHERE {where}
        ORDER BY m.anio DESC, a.apellido, a.nombre
    """), params)
    return [
        {
            "id": str(r[0]), "anio": r[1], "monto": float(r[2]), "estado": r[3],
            "fecha_vencimiento": r[4].isoformat() if r[4] else None,
            "notas": r[5], "alumno": r[6].strip(), "alumno_id": str(r[7]),
        }
        for r in res.fetchall()
    ]


@router.put("/academia/matriculas/{matricula_id}/pagar")
async def pagar_matricula(
    matricula_id: str,
    data: PagarCuotaRequest,
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Registra el pago de una matrícula anual."""
    try:
        aid = str(current_user["academia_id"])
        fecha_pago = _clean_date(data.fecha_pago) or date.today()

        res = await session.execute(text("""
            SELECT estado FROM academias.matriculas
            WHERE id = CAST(:mid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"mid": matricula_id, "aid": aid})
        mat = res.fetchone()
        if not mat:
            raise HTTPException(status_code=404, detail="Matrícula no encontrada.")
        if mat[0] in ("pagada", "anulada", "becada"):
            raise HTTPException(status_code=400, detail=f"Matrícula ya está '{mat[0]}'.")

        res_mat = await session.execute(text("""
            SELECT monto, alumno_id FROM academias.matriculas
            WHERE id = CAST(:mid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"mid": matricula_id, "aid": aid})
        mat_data = res_mat.fetchone()

        await session.execute(text("""
            UPDATE academias.matriculas SET
                estado = 'pagada', notas = COALESCE(:notas, notas)
            WHERE id = CAST(:mid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"mid": matricula_id, "aid": aid, "notas": _clean_str(data.notas)})

        await session.commit()

        # ── Facturación electrónica automática ──────────────────────────────
        factura_result = None
        try:
            from services.facturacion_service import intentar_emision_automatica
            monto_mat = int(mat_data[0]) if mat_data else 0
            alumno_id_str = str(mat_data[1]) if mat_data else None
            if monto_mat > 0:
                info_res = await session.execute(text("""
                    SELECT a.nombre || ' ' || COALESCE(a.apellido,'') AS alumno, m.anio
                    FROM academias.matriculas m
                    JOIN academias.alumnos a ON a.id = m.alumno_id
                    WHERE m.id = CAST(:mid AS UUID)
                """), {"mid": matricula_id})
                info = info_res.fetchone()
                concepto = f"Matrícula {info[1] if info else ''} - {info[0].strip() if info else ''}"
                factura_result = await intentar_emision_automatica(
                    academia_id=aid,
                    matricula_id=matricula_id,
                    monto_gs=monto_mat,
                    concepto=concepto,
                    alumno_id=alumno_id_str,
                    session=session,
                    creado_por=current_user["user_id"],
                )
        except Exception as fe:
            print(f"[AVISO facturación automática matrícula {matricula_id}]: {fe}")
        # ────────────────────────────────────────────────────────────────────

        return {"message": "Matrícula pagada exitosamente.", "factura": factura_result}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR pagar_matricula]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al pagar matrícula: {str(e)}")


@router.put("/academia/matriculas/{matricula_id}/anular")
async def anular_matricula(
    matricula_id: str,
    data: AnularPagoRequest,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Anula una matrícula anual."""
    try:
        aid = str(current_user["academia_id"])
        await session.execute(text("""
            UPDATE academias.matriculas SET estado = 'anulada',
                notas = COALESCE(:motivo, notas)
            WHERE id = CAST(:mid AS UUID) AND academia_id = CAST(:aid AS UUID)
        """), {"mid": matricula_id, "aid": aid, "motivo": _clean_str(data.motivo_anulacion)})
        await session.commit()
        return {"message": "Matrícula anulada."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Error al anular matrícula: {str(e)}")


# ----------------------------------------------------------------
# PAGO ANUAL (12 cuotas con descuento)
# ----------------------------------------------------------------

@router.post("/academia/cuotas/pago-anual/{alumno_id}")
async def registrar_pago_anual(
    alumno_id: str,
    metodo_pago: str,
    periodo_inicio: Optional[str] = None,
    notas: Optional[str] = None,
    current_user: dict = Depends(require_roles("dueño", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Registra un pago anual (12 meses) con descuento configurado.
    Genera las 12 cuotas mensuales del año con estado 'pagada' y descuento aplicado.
    """
    try:
        import calendar as cal
        aid = str(current_user["academia_id"])
        hoy = date.today()
        inicio_str = periodo_inicio or hoy.strftime("%Y-%m")
        year, month_ini = int(inicio_str.split("-")[0]), int(inicio_str.split("-")[1])

        # Leer config
        cfg_res = await session.execute(text("""
            SELECT descuento_pago_anual, permite_pago_anual, dia_vencimiento
            FROM academias.config_cuotas WHERE academia_id = CAST(:aid AS UUID)
        """), {"aid": aid})
        cfg = cfg_res.fetchone()
        if not cfg or not cfg[1]:
            raise HTTPException(status_code=400, detail="El pago anual no está habilitado. Activalo en Configuración.")
        desc_pct = float(cfg[0])
        dia_vcto = int(cfg[2]) if cfg[2] else 10

        # Inscripciones activas del alumno
        insc_res = await session.execute(text("""
            SELECT i.id, i.cuota_mensual, i.categoria_id, i.beca, i.descuento_aplicado
            FROM academias.inscripciones i
            WHERE i.alumno_id = CAST(:alumno_id AS UUID) AND i.estado = 'activa'
        """), {"alumno_id": alumno_id})
        inscripciones = insc_res.fetchall()

        if not inscripciones:
            raise HTTPException(status_code=400, detail="El alumno no tiene inscripciones activas.")

        generadas = 0
        total_pagado = 0.0
        for ins in inscripciones:
            insc_id, cuota_base, _, beca, desc_ya = ins
            cuota_base = float(cuota_base)

            for i in range(12):
                m = ((month_ini - 1 + i) % 12) + 1
                y = year + ((month_ini - 1 + i) // 12)
                periodo = f"{y:04d}-{m:02d}"
                last_day = cal.monthrange(y, m)[1]
                dia = min(dia_vcto, last_day)
                fecha_vcto = date(y, m, dia)

                if beca:
                    monto_final = 0
                    descuento_gs = cuota_base
                    estado_cuota = "becada"
                else:
                    # Aplicar descuento anual sobre el mayor entre desc individual y desc hermanos
                    pct_total = max(float(desc_ya), 0) + desc_pct
                    pct_total = min(pct_total, 100)
                    descuento_gs = round(cuota_base * pct_total / 100)
                    monto_final = cuota_base - descuento_gs
                    estado_cuota = "pagada"

                cuota_id = str(uuid.uuid4())
                await session.execute(text("""
                    INSERT INTO academias.cuotas
                        (id, inscripcion_id, alumno_id, academia_id, periodo,
                         monto_original, descuento, monto_final, monto_pagado,
                         estado, fecha_vencimiento, metodo_pago, registrado_por, notas, tipo_cuota)
                    VALUES
                        (CAST(:id AS UUID), CAST(:iid AS UUID), CAST(:alid AS UUID), CAST(:aid AS UUID), :periodo,
                         :monto_original, :descuento, :monto_final, :monto_final,
                         :estado, CAST(:fecha_vcto AS DATE), :metodo, :reg_por, :notas, 'mensual')
                    ON CONFLICT (inscripcion_id, periodo) DO UPDATE SET
                        estado       = EXCLUDED.estado,
                        descuento    = EXCLUDED.descuento,
                        monto_final  = EXCLUDED.monto_final,
                        monto_pagado = EXCLUDED.monto_pagado,
                        metodo_pago  = EXCLUDED.metodo_pago
                """), {
                    "id": cuota_id, "iid": str(insc_id), "alid": alumno_id, "aid": aid,
                    "periodo": periodo, "monto_original": cuota_base,
                    "descuento": descuento_gs, "monto_final": monto_final,
                    "estado": estado_cuota, "fecha_vcto": fecha_vcto,
                    "metodo": _clean_str(metodo_pago),
                    "reg_por": current_user["user_id"],
                    "notas": _clean_str(notas),
                })
                generadas += 1
                total_pagado += monto_final

        await session.commit()
        return {
            "message": f"Pago anual registrado: {generadas} cuotas con {desc_pct:.0f}% de descuento.",
            "cuotas_generadas": generadas,
            "total_pagado": total_pagado,
            "descuento_aplicado_pct": desc_pct,
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR registrar_pago_anual]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error al registrar pago anual: {str(e)}")


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
    current_user: dict = Depends(require_roles("dueño", "administrador")),
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
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Registra asistencia masiva para una fecha y categoría.
    Los profesores solo pueden registrar en su sucursal asignada.
    """
    try:
        ctx = await get_academia_context(request, current_user, session)
        cat_id = str(data.categoria_id).strip()
        fecha_obj = _clean_date(data.fecha) or date.today()

        # Verificar que la categoría pertenece a la academia (y a la sucursal del profesor)
        cat_res = await session.execute(text("""
            SELECT c.id, c.sucursal_id FROM academias.categorias c
            JOIN academias.sucursales s ON s.id = c.sucursal_id
            WHERE c.id = CAST(:cid AS UUID) AND s.academia_id = CAST(:aid AS UUID)
        """), {"cid": cat_id, "aid": str(ctx["academia_id"])})
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
                VALUES (CAST(:alumno_id AS UUID), CAST(:cat_id AS UUID), CAST(:fecha AS DATE), :estado, :obs, :reg_por)
                ON CONFLICT (alumno_id, categoria_id, fecha) DO UPDATE SET
                    estado = EXCLUDED.estado,
                    observaciones = EXCLUDED.observaciones,
                    registrado_por_id = EXCLUDED.registrado_por_id,
                    registrado_en = NOW()
            """), {
                "alumno_id": str(item.alumno_id).strip(),
                "cat_id": cat_id,
                "fecha": fecha_obj,
                "estado": item.estado or "presente",
                "obs": _clean_str(item.observaciones),
                "reg_por": current_user["user_id"],
            })
            registradas += 1

        await session.commit()
        return {"message": f"Asistencia registrada para {registradas} alumnos.", "fecha": fecha_obj.isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[ERROR registrar_asistencia]: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar asistencia: {str(e)}"
        )


@router.get("/academia/asistencias")
async def ver_asistencias(
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    categoria_id: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
):
    """Consulta el historial de asistencias."""
    ctx = await get_academia_context(request, current_user, session)

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
    try:
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
    except Exception as err:
        print(f"Error en reporte_alumnos: {err}")
        return []


@router.get("/academia/reportes/deudores")
async def reporte_deudores(
    current_user: dict = Depends(require_roles("dueño", "administrador", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """Genera el reporte consolidado de deudores / morosos con saldos pendientes."""
    aid = current_user["academia_id"]
    try:
        res = await session.execute(text("""
            SELECT c.id, c.alumno_id, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
                   s.nombre AS sucursal_nombre, cat.nombre AS categoria_nombre,
                   ('Cuota ' || COALESCE(c.periodo, '')) AS concepto,
                   c.monto_final, c.fecha_vencimiento, c.estado,
                   t.nombre AS tutor_nombre, t.apellido AS tutor_apellido, t.telefono AS tutor_telefono, t.email AS tutor_email
            FROM academias.cuotas c
            JOIN academias.alumnos a ON a.id = c.alumno_id
            LEFT JOIN academias.sucursales s ON s.id = a.sucursal_id
            LEFT JOIN academias.inscripciones i ON i.id = c.inscripcion_id
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
                "concepto": r[6] or "Cuota Mensual",
                "monto": float(r[7] or 0),
                "fecha_vencimiento": r[8].isoformat() if r[8] else None,
                "estado": r[9],
                "tutor_nombre": f"{r[10]} {r[11] or ''}".strip() if r[10] else "No asignado",
                "tutor_telefono": r[12] or "",
                "tutor_email": r[13] or "",
            }
            for r in res.fetchall()
        ]
    except Exception as err:
        print(f"Error en reporte_deudores: {err}")
        return []

