from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario, LogAcceso
from schemas import LogAccesoCreate
from database import get_session
from security import check_permission

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: int,
    current_user: dict = Depends(check_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
):
    """Reactiva un usuario inactivo (activo=True)"""
    result = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.activo:
        raise HTTPException(status_code=400, detail="El usuario ya está activo")
    user.activo = True
    await session.commit()
    # Registrar log
    await session.execute(
        LogAcceso.__table__.insert().values(
            usuario_id=current_user["user_id"],
            username=current_user["sub"],
            accion="reactivate_user",
            detalles={"mensaje": f"Usuario reactivado: {user.username}"}
        )
    )
    await session.commit()
    return {"message": "Usuario reactivado exitosamente"}
