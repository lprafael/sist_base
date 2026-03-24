from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario
from database import get_session
from email_service import email_service
from pydantic import BaseModel
from security import get_password_hash, get_current_user
import secrets
import string

router = APIRouter(prefix="/api/notify", tags=["Notificaciones"])

class ResendPasswordRequest(BaseModel):
    username: str

@router.post("/resend-password")
async def resend_user_password(
    data: ResendPasswordRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Genera una nueva contraseña temporal y la envía al usuario por email"""
    current_role = current_user.get("role")
    
    # Redundant but safe check at high level
    if current_role not in ["admin", "intendente", "concejal"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")

    username = data.username
    result = await session.execute(select(Usuario).where(Usuario.username == username))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificación de Jerarquía: Solo admin o el creador pueden reenviar contraseña
    if current_role != "admin" and user.creado_por != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Solo puedes gestionar contraseñas de usuarios creados por ti")
    
    # Generar contraseña temporal
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    user.hashed_password = get_password_hash(temp_password)
    await session.commit()
    # Enviar email en segundo plano
    background_tasks.add_task(
        email_service.send_welcome_email,
        user.email,
        user.username,
        temp_password,
        user.rol
    )
    return {"message": "Se ha enviado una nueva contraseña temporal al usuario por email."}
