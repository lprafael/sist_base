from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from models import Usuario, LogAcceso, Referente, PosibleVotante, EquiposAutorizados, SesionUsuario
from schemas import LogAccesoCreate
from database import get_session
from security import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

@router.delete("/users/{user_id}/hard")
async def delete_user_physical(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Elimina físicamente un usuario y todos sus datos vinculados (incluyendo posibles votantes)"""
    current_role = current_user.get("role")
    
    result = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if user.username == 'admin' and user.rol == 'admin':
        raise HTTPException(status_code=403, detail="No se puede eliminar el usuario admin")

    # VALIDACIÓN DE JERARQUÍA: Solo admin o el creador de este usuario pueden eliminarlo físicamente
    # Un intendente o concejal solo puede eliminar a quienes él mismo haya creado (sus referentes)
    if current_role != "admin" and user.creado_por != current_user["user_id"]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permisos para eliminar físicamente a este usuario. Solo puedes eliminar a los miembros de tu propio equipo que tú mismo creaste."
        )

    # 1. Buscar si tiene un registro de referente asociado
    res_ref = await session.execute(select(Referente).where(Referente.id_usuario_sistema == user_id))
    referente = res_ref.scalar_one_or_none()
    
    if referente:
        # 2. ELIMINACIÓN EN CASCADA MANUAL: Borrar todos los posibles votantes de este referente
        # Según el requerimiento: "conllevará a la eliminación de todos los posibles votantes de ese referente"
        await session.execute(
            delete(PosibleVotante).where(PosibleVotante.id_referente == referente.id)
        )
        # 3. Borrar el registro de referente
        await session.delete(referente)
        
    # 3.5 Borrar otros datos vinculados para evitar errores de FK (Hard Purge)
    await session.execute(delete(EquiposAutorizados).where(EquiposAutorizados.usuario_id == user_id))
    await session.execute(delete(SesionUsuario).where(SesionUsuario.usuario_id == user_id))
    
    # 4. Finalmente, borrar el usuario del sistema
    await session.delete(user)
    
    # Registrar log de la operación
    await session.execute(
        LogAcceso.__table__.insert().values(
            usuario_id=current_user["user_id"],
            username=current_user["sub"],
            accion="hard_delete_user",
            detalles={"mensaje": f"Usuario y datos vinculados eliminados físicamente: {user.username} por {current_role}"}
        )
    )
    
    await session.commit()
    return {"message": "Usuario y todos sus registros vinculados (votantes) han sido eliminados de forma permanente."}

