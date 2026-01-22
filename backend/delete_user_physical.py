from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario, LogAcceso
from schemas import LogAccesoCreate
from database import get_session
from security import check_permission

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.delete("/users/{user_id}/hard")
async def delete_user_physical(
    user_id: int,
    current_user: dict = Depends(check_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
):
    """Elimina físicamente un usuario (borrado real, solo admin no puede eliminarse)"""
    result = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.username == 'admin' and user.rol == 'admin':
        raise HTTPException(status_code=403, detail="No se puede eliminar el usuario admin")
    await session.delete(user)
    await session.commit()
    # Registrar log
    await session.execute(
        LogAcceso.__table__.insert().values(
            usuario_id=current_user["user_id"],
            username=current_user["sub"],
            accion="hard_delete_user",
            detalles={"mensaje": f"Usuario eliminado físicamente: {user.username}"}
        )
    )
    await session.commit()
    return {"message": "Usuario eliminado permanentemente"}
