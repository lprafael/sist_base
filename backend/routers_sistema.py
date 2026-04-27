from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from sqlalchemy import text
from database import get_session
from models import Playa, Usuario
from schemas import PlayaCreate, PlayaUpdate, PlayaResponse
from security import require_admin, verify_password, get_password_hash
from audit_utils import log_audit_action
from email_service import email_service
import secrets
import string
import os
import shutil
import uuid
from fastapi import File, UploadFile
from pydantic import BaseModel

# Directorio para logos
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads", "logos_playas")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DeletePhysicalRequest(BaseModel):
    admin_password: str

router = APIRouter(prefix="/sistema/playas", tags=["Administración de Playas"])

@router.get("", response_model=List[PlayaResponse])
async def list_playas(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Lista todas las playas registradas en el sistema."""
    result = await session.execute(select(Playa).order_by(Playa.nombre.asc()))
    return result.scalars().all()

@router.post("", response_model=PlayaResponse, status_code=status.HTTP_201_CREATED)
async def create_playa(
    playa_data: PlayaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Crea una nueva playa en el sistema."""
    # Verificar si ya existe el nombre o RUC
    existing = await session.execute(
        select(Playa).where((Playa.nombre == playa_data.nombre) | (Playa.ruc == playa_data.ruc))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una playa con ese nombre o RUC."
        )
    
    new_playa = Playa(**playa_data.model_dump())
    session.add(new_playa)
    await session.commit()
    await session.refresh(new_playa)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user.get("user_id"),
        action="create",
        table="playas",
        record_id=new_playa.id,
        new_data=playa_data.model_dump(),
        details=f"Nueva playa creada: {new_playa.nombre}"
    )
    
    return new_playa

@router.get("/{playa_id}", response_model=PlayaResponse)
async def get_playa(
    playa_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Obtiene los detalles de una playa específica."""
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Playa no encontrada")
    return playa

@router.put("/{playa_id}", response_model=PlayaResponse)
async def update_playa(
    playa_id: int,
    playa_data: PlayaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Actualiza los datos de una playa."""
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Playa no encontrada")
    
    old_data = {c.name: getattr(playa, c.name) for c in playa.__table__.columns}
    
    update_dict = playa_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(playa, key, value)
    
    await session.commit()
    await session.refresh(playa)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user.get("user_id"),
        action="update",
        table="playas",
        record_id=playa.id,
        previous_data=old_data,
        new_data=update_dict,
        details=f"Playa actualizada: {playa.nombre}"
    )
    
    return playa

@router.delete("/{playa_id}")
async def delete_playa(
    playa_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Desactiva una playa (Soft Delete)."""
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Playa no encontrada")
    
    playa.activo = False
    await session.commit()
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user.get("user_id"),
        action="delete",
        table="playas",
        record_id=playa.id,
        details=f"Playa desactivada: {playa.nombre}"
    )
    
    return {"message": "Playa desactivada correctamente"}

@router.post("/{playa_id}/logo")
async def upload_playa_logo(
    playa_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Sube o actualiza el logo de una playa."""
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Playa no encontrada")

    # Validar que sea imagen
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    # Crear nombre único
    ext = os.path.splitext(file.filename)[1]
    filename = f"logo_{playa_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Guardar archivo
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Borrar logo anterior si existe
    if playa.logo:
        old_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), playa.logo.lstrip('/'))
        if os.path.exists(old_path) and "logos_playas" in old_path:
            try:
                os.remove(old_path)
            except:
                pass

    # Actualizar base de datos
    playa.logo = f"/static/uploads/logos_playas/{filename}"
    await session.commit()
    await session.refresh(playa)

    return {"logo_url": playa.logo}

@router.post("/{playa_id}/resend-password")
async def resend_playa_password(
    playa_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Busca al usuario principal de la playa y le envía una nueva contraseña."""
    # Buscar el usuario de esa playa (el primero que encuentre, asumiendo que es el admin del tenant)
    result = await session.execute(
        select(Usuario).where(Usuario.id_playa == playa_id).order_by(Usuario.id.asc())
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="No se encontró un usuario asociado a esta empresa.")

    # Generar contraseña temporal
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    user.hashed_password = get_password_hash(temp_password)
    await session.commit()

    # Enviar email
    enviado = email_service.send_welcome_email(
        user.email,
        user.username,
        temp_password,
        user.rol
    )
    
    if not enviado:
        raise HTTPException(
            status_code=500,
            detail="Error al enviar el correo. Verifica la configuración SMTP."
        )
        
    return {"message": f"Se ha enviado una nueva contraseña a {user.email}"}

@router.post("/{playa_id}/delete-physical")
async def delete_playa_physical(
    playa_id: int,
    data: DeletePhysicalRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin)
):
    """Elimina físicamente una playa y TODOS sus datos asociados (CUIDADO)."""
    # 1. Verificar contraseña del admin que ejecuta la acción
    result = await session.execute(select(Usuario).where(Usuario.username == current_user["sub"]))
    admin_user = result.scalar_one_or_none()
    
    if not admin_user or not verify_password(data.admin_password, admin_user.hashed_password):
        raise HTTPException(status_code=401, detail="Contraseña de administrador incorrecta.")

    # 2. Verificar existencia de la playa
    result = await session.execute(select(Playa).where(Playa.id == playa_id))
    playa = result.scalar_one_or_none()
    if not playa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")

    nombre_playa = playa.nombre

    try:
        # 3. Eliminar datos en cascada manual (SQL directo para eficiencia en multitenancy)
        # Esto asume que las tablas tienen la columna id_playa
        tablas_a_limpiar = [
            "playa.productos", "playa.ventas", "playa.compras", 
            "playa.gastos", "playa.movimientos_caja", "playa.pagos",
            "playa.pagares", "playa.clientes", "playa.vendedores",
            "playa.historial_propietarios", "playa.catalogos"
        ]
        
        for tabla in tablas_a_limpiar:
            try:
                await session.execute(text(f"DELETE FROM {tabla} WHERE id_playa = :pid"), {"pid": playa_id})
            except Exception as e:
                print(f"Aviso: No se pudo limpiar tabla {tabla}: {e}")

        # 4. Eliminar usuarios de la playa
        await session.execute(text("DELETE FROM sistema.usuarios WHERE id_playa = :pid"), {"pid": playa_id})

        # 5. Eliminar la playa finalmente
        await session.delete(playa)
        
        await session.commit()

        # Auditoría
        await log_audit_action(
            session=session,
            username=current_user["sub"],
            user_id=admin_user.id,
            action="delete_physical",
            table="playas",
            record_id=playa_id,
            details=f"ELIMINACIÓN TOTAL de la empresa: {nombre_playa}"
        )

        return {"message": f"La empresa {nombre_playa} y todos sus datos han sido eliminados permanentemente."}

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error crítico durante la eliminación: {str(e)}")
