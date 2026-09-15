# mensajeria_routes.py
# Endpoints de API para el sistema de mensajería programada y masiva

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, text
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_session
from security import get_current_user, check_permission
from models import MensajeCampania, MensajeDestinatario, Persona, PadronElectoral, LocalVotacion, Referente, PosibleVotante
from schemas import (
    MensajeCampaniaCreate, MensajeCampaniaUpdate, MensajeCampaniaResponse, 
    MensajeDestinatarioResponse, CampaniaPreviewRequest
)
from scheduler import construir_mensaje_personalizado, enviar_mensaje_canal

router = APIRouter(prefix="/api/mensajeria", tags=["Mensajeria"])

@router.post("/campanias", response_model=MensajeCampaniaResponse, status_code=status.HTTP_201_CREATED)
async def crear_campania(
    camp_in: MensajeCampaniaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea y agenda una nueva campaña de mensajería (SMS, WhatsApp, Email, n8n).
    """
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    
    # Restricción de seguridad: Solo admin y candidato_principal pueden enviar al padrón completo
    if camp_in.tipo_destinatario == 'padron_completo' and user_role not in ['admin', 'candidato_principal']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores y candidatos principales pueden realizar envíos masivos al Padrón"
        )
        
    db_camp = MensajeCampania(
        nombre_campania=camp_in.nombre_campania,
        tipo_destinatario=camp_in.tipo_destinatario,
        canal=camp_in.canal,
        plantilla_mensaje=camp_in.plantilla_mensaje,
        fecha_programada=camp_in.fecha_programada,
        estado="pendiente",
        creado_por=user_id,
        eleccion_id=camp_in.eleccion_id,
        filtros=camp_in.filtros
    )
    
    session.add(db_camp)
    await session.commit()
    await session.refresh(db_camp)
    return db_camp

@router.get("/campanias", response_model=List[MensajeCampaniaResponse])
async def listar_campanias(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista todas las campañas creadas. Si no es admin, solo muestra las creadas por su rol o jerarquía.
    """
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    
    stmt = select(MensajeCampania)
    
    # Filtrado por permisos
    if user_role != 'admin':
        # Si no es admin, solo ve sus campañas creadas
        stmt = stmt.where(MensajeCampania.creado_por == user_id)
        
    stmt = stmt.order_by(MensajeCampania.fecha_programada.desc())
    result = await session.execute(stmt)
    return result.scalars().all()

@router.get("/campanias/{campania_id}", response_model=MensajeCampaniaResponse)
async def obtener_campania(
    campania_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el detalle y contadores de una campaña específica.
    """
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    
    db_camp = await session.get(MensajeCampania, campania_id)
    if not db_camp:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
        
    # Verificar accesos
    if user_role != 'admin' and db_camp.creado_por != user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver esta campaña")
        
    return db_camp

@router.put("/campanias/{campania_id}", response_model=MensajeCampaniaResponse)
async def actualizar_campania(
    campania_id: int,
    camp_in: MensajeCampaniaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza una campaña programada. Solo se permite si la campaña está en estado 'pendiente'.
    """
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    
    db_camp = await session.get(MensajeCampania, campania_id)
    if not db_camp:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
        
    # Verificar accesos
    if user_role != 'admin' and db_camp.creado_por != user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta campaña")
        
    if db_camp.estado != 'pendiente':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden modificar campañas que se encuentren en estado 'pendiente'"
        )
        
    # Restricción de seguridad: Solo admin y candidato_principal pueden enviar al padrón completo
    if camp_in.tipo_destinatario == 'padron_completo' and user_role not in ['admin', 'candidato_principal']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores y candidatos principales pueden realizar envíos masivos al Padrón"
        )
        
    # Actualizar campos
    update_data = camp_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_camp, field, value)
        
    await session.commit()
    await session.refresh(db_camp)
    return db_camp

@router.delete("/campanias/{campania_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_o_cancelar_campania(
    campania_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela o elimina una campaña. Si está pendiente se puede cancelar/eliminar.
    """
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    
    db_camp = await session.get(MensajeCampania, campania_id)
    if not db_camp:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
        
    # Verificar accesos
    if user_role != 'admin' and db_camp.creado_por != user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta campaña")
        
    # Si está pendiente, se elimina físicamente de la BD
    if db_camp.estado == 'pendiente':
        await session.delete(db_camp)
        await session.commit()
    else:
        # Si ya se envió o está en progreso, no se puede eliminar físicamente para auditar
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar una campaña que ya se encuentra en progreso o finalizada"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/campanias/{campania_id}/destinatarios", response_model=List[MensajeDestinatarioResponse])
async def obtener_destinatarios_campania(
    campania_id: int,
    limit: int = 100,
    offset: int = 0,
    estado: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene la lista detallada de los logs de envío de destinatarios individuales para una campaña.
    """
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    
    db_camp = await session.get(MensajeCampania, campania_id)
    if not db_camp:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
        
    # Verificar accesos
    if user_role != 'admin' and db_camp.creado_por != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a los datos de esta campaña")
        
    stmt = select(MensajeDestinatario).where(MensajeDestinatario.campania_id == campania_id)
    if estado:
        stmt = stmt.where(MensajeDestinatario.estado == estado)
        
    stmt = stmt.offset(offset).limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()

@router.post("/preview")
async def obtener_preview_mensaje(
    req: CampaniaPreviewRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un ejemplo de mensaje renderizado reemplazando variables para un votante de prueba.
    """
    user_id = current_user.get("user_id")
    
    # Buscar el nombre del candidato asociado al creador
    cand_name = "Candidato de Prueba"
    res_cand = await session.execute(text("""
        SELECT c.nombre_candidato FROM electoral.referentes r
        JOIN electoral.candidatos c ON r.id_candidato = c.id
        WHERE r.id_usuario_sistema = :user_id LIMIT 1
    """), {"user_id": user_id})
    cand_row = res_cand.fetchone()
    if cand_row:
        cand_name = cand_row[0]
        
    # Datos de prueba del simulador
    persona_mock = {
        "nombres": "Juan",
        "apellidos": "Pérez Gómez",
        "mesa": 12,
        "nombre_local": "Escuela Básica Nº 15 - San Lorenzo",
        "nombre_candidato": cand_name
    }
    
    mensaje_renderizado = construir_mensaje_personalizado(req.plantilla_mensaje, persona_mock)
    
    return {
        "mensaje_preview": mensaje_renderizado,
        "datos_mock_utilizados": persona_mock
    }

class CampaniaTestRequest(BaseModel):
    canal: str
    plantilla_mensaje: str
    destinatario_contacto: str
    n8n_webhook_url: Optional[str] = None
    eleccion_id: int

@router.post("/test-send")
async def enviar_mensaje_prueba(
    req: CampaniaTestRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Envía un mensaje de prueba individual de forma inmediata.
    """
    user_id = current_user.get("user_id")
    
    # Buscar el nombre del candidato asociado al creador
    cand_name = "Candidato de Prueba"
    res_cand = await session.execute(text("""
        SELECT c.nombre_candidato FROM electoral.referentes r
        JOIN electoral.candidatos c ON r.id_candidato = c.id
        WHERE r.id_usuario_sistema = :user_id LIMIT 1
    """), {"user_id": user_id})
    cand_row = res_cand.fetchone()
    if cand_row:
        cand_name = cand_row[0]
        
    persona_mock = {
        "nombres": "Juan (Prueba)",
        "apellidos": "Votante Test",
        "mesa": 99,
        "nombre_local": "Local de Prueba SIGEL",
        "nombre_candidato": cand_name
    }
    
    msg_personalizado = construir_mensaje_personalizado(req.plantilla_mensaje, persona_mock)
    
    # Crear un objeto temporal de MensajeDestinatario (no se guarda en la base de datos)
    dest_obj = MensajeDestinatario(
        campania_id=0,
        cedula="0000000",
        telefono=req.destinatario_contacto if req.canal in ['sms', 'whatsapp'] else None,
        email=req.destinatario_contacto if req.canal == 'email' else None,
        mensaje_personalizado=msg_personalizado,
        estado='pendiente'
    )
    
    ok, err_msg = await enviar_mensaje_canal(dest_obj, req.canal, "Envío de Prueba", req.n8n_webhook_url)
    
    if ok:
        return {"success": True, "message": "Mensaje de prueba enviado correctamente."}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al enviar mensaje: {err_msg}"
        )

