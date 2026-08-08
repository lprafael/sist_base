from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List
from pydantic import BaseModel
from database import get_session
from security import get_current_user
from routers.academias import get_academia_context

router = APIRouter(prefix="/academias", tags=["Academias Mejoras"])

# ================================================================
# SCHEMAS
# ================================================================

class FeedbackRequest(BaseModel):
    tipo: str # 'encuesta', 'buzon', 'conversacion'
    asunto: str
    mensaje: str
    tutor_id: Optional[str] = None
    alumno_id: Optional[str] = None

class NoticiaRequest(BaseModel):
    titulo: str
    contenido: str
    imagen_url: Optional[str] = None
    activa: Optional[bool] = True

class AsistenciaTutorRequest(BaseModel):
    tutor_id: str
    fecha: str
    descripcion_reunion: str
    presente: bool

class ConfigMorasRequest(BaseModel):
    cobro_retraso_activo: bool
    monto_por_retraso: float
    dias_gracia_retraso: int

# ================================================================
# FEEDBACK DE SOCIOS
# ================================================================

@router.post("/{academia_id}/feedback")
async def enviar_feedback(
    academia_id: str,
    data: FeedbackRequest,
    session: AsyncSession = Depends(get_session)
):
    """Permite a un socio (desde portal público) enviar feedback o buzón."""
    await session.execute(text("""
        INSERT INTO academias.feedback_socios 
            (academia_id, tutor_id, alumno_id, tipo, asunto, mensaje)
        VALUES (:aid, :tid, :alid, :tipo, :asunto, :msg)
    """), {
        "aid": academia_id, "tid": data.tutor_id, "alid": data.alumno_id,
        "tipo": data.tipo, "asunto": data.asunto, "msg": data.mensaje
    })
    await session.commit()
    return {"message": "Feedback enviado con éxito."}

@router.get("/feedback/listar")
async def listar_feedback(
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """El administrador lee el feedback recibido."""
    ctx = await get_academia_context(request, current_user, session)
    res = await session.execute(text("""
        SELECT f.id, f.tipo, f.asunto, f.mensaje, f.leido, f.creado_en,
               t.nombre || ' ' || COALESCE(t.apellido, '') AS tutor_nombre,
               a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno_nombre
        FROM academias.feedback_socios f
        LEFT JOIN academias.tutores t ON t.id = f.tutor_id
        LEFT JOIN academias.alumnos a ON a.id = f.alumno_id
        WHERE f.academia_id = :aid
        ORDER BY f.creado_en DESC
    """), {"aid": ctx["academia_id"]})
    return [dict(r._mapping) for r in res.fetchall()]

@router.put("/feedback/{feedback_id}/leer")
async def marcar_feedback_leido(
    feedback_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_academia_context(request, current_user, session)
    await session.execute(text("""
        UPDATE academias.feedback_socios 
        SET leido = TRUE 
        WHERE id = :fid AND academia_id = :aid
    """), {"fid": feedback_id, "aid": ctx["academia_id"]})
    await session.commit()
    return {"message": "Marcado como leído"}

# ================================================================
# NOTICIAS PUBLICAS Y CMS
# ================================================================

class IANoticiaRequest(BaseModel):
    contexto: str

@router.get("/noticias")
async def listar_noticias_admin(
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Listar todas las noticias (activas e inactivas) para la administración."""
    ctx = await get_academia_context(request, current_user, session)
    res = await session.execute(text("""
        SELECT id, titulo, contenido, imagen_url, fecha_publicacion, activa, creado_en, actualizado_en
        FROM academias.noticias_publicas
        WHERE academia_id = :aid
        ORDER BY fecha_publicacion DESC, creado_en DESC
    """), {"aid": ctx["academia_id"]})
    return [dict(r._mapping) for r in res.fetchall()]

@router.post("/noticias")
async def crear_noticia(
    data: NoticiaRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_academia_context(request, current_user, session)
    await session.execute(text("""
        INSERT INTO academias.noticias_publicas
            (academia_id, titulo, contenido, imagen_url, activa)
        VALUES (:aid, :tit, :cont, :img, :act)
    """), {
        "aid": ctx["academia_id"], "tit": data.titulo, "cont": data.contenido,
        "img": data.imagen_url, "act": data.activa if data.activa is not None else True
    })
    await session.commit()
    return {"message": "Noticia creada exitosamente"}

@router.put("/noticias/{noticia_id}")
async def actualizar_noticia(
    noticia_id: str,
    data: NoticiaRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_academia_context(request, current_user, session)
    res = await session.execute(text("""
        UPDATE academias.noticias_publicas
        SET titulo = :tit, contenido = :cont, imagen_url = :img, activa = :act
        WHERE id = :nid AND academia_id = :aid
    """), {
        "nid": noticia_id, "aid": ctx["academia_id"],
        "tit": data.titulo, "cont": data.contenido,
        "img": data.imagen_url, "act": data.activa if data.activa is not None else True
    })
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    await session.commit()
    return {"message": "Noticia actualizada exitosamente"}

@router.delete("/noticias/{noticia_id}")
async def eliminar_noticia(
    noticia_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_academia_context(request, current_user, session)
    res = await session.execute(text("""
        DELETE FROM academias.noticias_publicas
        WHERE id = :nid AND academia_id = :aid
    """), {"nid": noticia_id, "aid": ctx["academia_id"]})
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    await session.commit()
    return {"message": "Noticia eliminada exitosamente"}

@router.post("/noticias/generar-ia")
async def generar_noticia_ia_academia(
    data: IANoticiaRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Generar borrador de noticia redactado asistido por IA."""
    puntos = data.contexto.strip()
    if not puntos:
        raise HTTPException(status_code=400, detail="Debe ingresar detalles para la noticia")
    
    # Redacción estructurada estilo deportivo/comunicado institucional
    lineas = [l.strip() for l in puntos.split('\n') if l.strip()]
    titulo_sugerido = f"¡Novedades en la Academia! {lineas[0][:50]}" if lineas else "Comunicado Importante"
    
    contenido_redactado = (
        f"🏆 **NOVEDADES Y DESTACADOS DE LA SEMANA**\n\n"
        f"Compartimos con toda la comunidad, padres y alumnos las últimas noticias de nuestra academia:\n\n"
        + "\n".join([f"• {linea}" for linea in lineas]) + "\n\n"
        f"¡Agradecemos el compromiso constante de nuestros profesores, alumnos y familias! "
        f"Sigamos sumando logros juntos. 💪⚽🏀"
    )
    return {
        "titulo": titulo_sugerido,
        "contenido": contenido_redactado
    }

@router.get("/{academia_id}/noticias/publicas")
async def listar_noticias_publicas(
    academia_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Endpoint abierto para el portal de socios."""
    res = await session.execute(text("""
        SELECT id, titulo, contenido, imagen_url, fecha_publicacion
        FROM academias.noticias_publicas
        WHERE academia_id = :aid AND activa = TRUE
        ORDER BY fecha_publicacion DESC
    """), {"aid": academia_id})
    return [dict(r._mapping) for r in res.fetchall()]

# ================================================================
# CONFIGURACION MORAS Y PENALIZACIONES
# ================================================================

@router.put("/config/moras")
async def configurar_moras(
    data: ConfigMorasRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_academia_context(request, current_user, session)
    if ctx["rol_interno"] != "dueño" and ctx["rol_interno"] != "administrador":
        raise HTTPException(status_code=403, detail="Sin permisos para configurar finanzas.")
        
    await session.execute(text("""
        UPDATE academias.config_cuotas
        SET cobro_retraso_activo = :activo,
            monto_por_retraso = :monto,
            dias_gracia_retraso = :dias
        WHERE academia_id = :aid
    """), {
        "aid": ctx["academia_id"],
        "activo": data.cobro_retraso_activo,
        "monto": data.monto_por_retraso,
        "dias": data.dias_gracia_retraso
    })
    await session.commit()
    return {"message": "Configuración de moras actualizada."}

# ================================================================
# ASISTENCIA TUTORES
# ================================================================

@router.post("/asistencia/tutores")
async def registrar_asistencia_tutor(
    data: AsistenciaTutorRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_academia_context(request, current_user, session)
    await session.execute(text("""
        INSERT INTO academias.asistencia_tutor
            (tutor_id, academia_id, fecha, descripcion_reunion, presente)
        VALUES (:tid, :aid, :fecha, :desc, :pres)
    """), {
        "tid": data.tutor_id, "aid": ctx["academia_id"], 
        "fecha": data.fecha, "desc": data.descripcion_reunion, "pres": data.presente
    })
    await session.commit()
    return {"message": "Asistencia de tutor registrada."}
