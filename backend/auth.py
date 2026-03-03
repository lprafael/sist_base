# auth.py
# Endpoints de autenticación y gestión de usuarios

import secrets
import string
import os
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError

from models import Usuario, PasswordReset, LogAcceso, EquiposAutorizados
from schemas import (
    UserLogin, UserCreate, UserUpdate, UserResponse, Token, 
    PasswordChange, PasswordResetRequest, PasswordResetConfirm,
    LogAccesoCreate, LogAccesoResponse, RoleInfo, GoogleLogin,
    EquipoAutorizadoResponse, EquipoAutorizadoBase
)
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from security import (
    verify_password, get_password_hash, create_access_token, 
    verify_token, get_current_user, check_permission, ROLES
)
from email_service import email_service

# Importar get_session desde database.py
from database import get_session
from audit_utils import log_audit_action, get_client_ip, get_user_agent

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Función para generar contraseña aleatoria
def generate_random_password(length: int = 12) -> str:
    """Genera una contraseña aleatoria segura"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(characters) for _ in range(length))

# Función para registrar logs de acceso
async def log_access(session: AsyncSession, log_data: LogAccesoCreate):
    """Registra un log de acceso"""
    log = LogAcceso(**log_data.dict())
    session.add(log)
    await session.commit()

@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin, 
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """Inicio de sesión de usuario"""
    # Buscar usuario
    result = await session.execute(
        select(Usuario).where(Usuario.username == user_credentials.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo"
        )
    
    # --- Verificación de Restricción de Equipo ---
    if user.restriccion_equipo:
        print(f"DEBUG: Checking restriction for user {user.username}, provided device: {user_credentials.device_id}")
        if not user_credentials.device_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este usuario requiere inicio de sesión desde un equipo autorizado, pero no se detectó el identificador del equipo."
            )
        
        # Verificar si el device_id está autorizado para este usuario
        from sqlalchemy import and_
        res_device = await session.execute(
            select(EquiposAutorizados).where(
                and_(
                    EquiposAutorizados.usuario_id == user.id,
                    EquiposAutorizados.device_id == user_credentials.device_id
                )
            )
        )
        device_record = res_device.scalar_one_or_none()
        print(f"DEBUG: Device record found: {device_record.id if device_record else 'NONE'}, activo: {device_record.activo if device_record else 'N/A'}")
        
        if not device_record or not device_record.activo:
            if not device_record:
                print(f"DEBUG: No record found for device {user_credentials.device_id}, creating request...")
                # Registrar el intento como una solicitud pendiente
                new_request = EquiposAutorizados(
                    usuario_id=user.id,
                    device_id=user_credentials.device_id,
                    descripcion="Solicitud de Acceso",
                    user_agent=request.headers.get("user-agent"),
                    ip_solicitud=request.client.host,
                    activo=False
                )
                session.add(new_request)
                await session.commit()
                
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Este equipo no está autorizado. Se ha enviado una solicitud de habilitación al administrador."
                )
            else:
                print(f"DEBUG: Record found but NOT active. ID: {device_record.id}, Activo: {device_record.activo}")
                # Ya existe pero está inactivo (pendiente)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tu solicitud de acceso para este equipo aún está pendiente de aprobación por el administrador."
                )
    
    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    await session.commit()
    
    # Crear token
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "role": user.rol, 
            "user_id": user.id,
            "departamento_id": user.departamento_id,
            "distrito_id": user.distrito_id
        }
    )
    
    # Registrar log
    await log_access(session, LogAccesoCreate(
        usuario_id=user.id,
        username=user.username,
        accion="login",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    ))
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

@router.post("/google-login", response_model=Token)
async def google_login(
    data: GoogleLogin,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """Inicio de sesión con Google OAuth2"""
    try:
        # Verificar el token de Google
        id_info = id_token.verify_oauth2_token(
            data.credential, 
            google_requests.Request(), 
            os.getenv("GOOGLE_CLIENT_ID")
        )
        
        email = id_info['email']
        full_name = id_info.get('name', '')
        
        # Buscar usuario por email
        result = await session.execute(
            select(Usuario).where(Usuario.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Si el usuario no existe, lo creamos automáticamente
            # Generamos un username basado en el email
            username = email.split('@')[0]
            
            # Verificar si el username ya existe
            username_check = await session.execute(
                select(Usuario).where(Usuario.username == username)
            )
            if username_check.scalar_one_or_none():
                username = f"{username}_{secrets.token_hex(2)}"
            
            new_user = Usuario(
                username=username,
                email=email,
                hashed_password=get_password_hash(secrets.token_urlsafe(16)), # Password random inutilizable
                nombre_completo=full_name,
                rol="user",
                activo=False # El usuario se crea inactivo por defecto
            )
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            user = new_user

            # Enviar notificación al administrador
            # Usaremos el email configurado en el .env como remitente para recibir también la notificación
            admin_email = os.getenv("EMAIL_FROM")
            if admin_email:
                email_service.send_admin_notification_email(
                    admin_email=admin_email,
                    new_user_email=email,
                    new_user_name=full_name
                )
            
            # Registrar auditoría de creación
            await log_audit_action(
                session=session,
                username="SYSTEM",
                user_id=None,
                action="create",
                table="usuarios",
                record_id=user.id,
                new_data={"username": user.username, "email": user.email, "metodo": "google"},
                details=f"Usuario creado vía Google Login: {user.username}"
            )

        if not user.activo:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Su cuenta está pendiente de aprobación por un administrador"
            )
        
        # Actualizar último acceso
        user.ultimo_acceso = datetime.utcnow()
        await session.commit()
        
        # Crear token del sistema
        access_token = create_access_token(
            data={
                "sub": user.username, 
                "role": user.rol, 
                "user_id": user.id,
                "departamento_id": user.departamento_id,
                "distrito_id": user.distrito_id
            }
        )
        
        # Registrar log de acceso
        await log_access(session, LogAccesoCreate(
            usuario_id=user.id,
            username=user.username,
            accion="login_google",
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        ))
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.from_orm(user)
        )
        
    except ValueError as e:
        # Token inválido
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de Google inválido: {str(e)}"
        )
    except HTTPException:
        # Re-lanzar excepciones de FastAPI para que lleguen al frontend
        raise
    except Exception as e:
        print(f"Error en google_login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error procesando autenticación de Google"
        )

@router.post("/logout")
async def logout(
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Cerrar sesión"""
    # Registrar log
    await log_access(session, LogAccesoCreate(
        usuario_id=current_user["user_id"],
        username=current_user["sub"],
        accion="logout",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    ))
    
    return {"message": "Sesión cerrada exitosamente"}

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Crear nuevo usuario con validación de jerarquía y propagación de territorio"""
    from security import ROLES
    from hierarchy_utils import inherit_territory
    
    current_role = current_user.get("role")
    target_role = user_data.rol
    
    # Jerarquía de quién puede crear qué
    hierarchy = {
        "admin":      ["admin", "intendente", "concejal", "referente"],
        "intendente": ["concejal", "referente"],
        "concejal":   ["referente"],
        "referente":   []
    }
    
    user_permissions = ROLES.get(current_role, {}).get("permissions", [])
    can_manage = "manage_users" in user_permissions or "manage_subordinates" in user_permissions
    
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear usuarios"
        )
        
    if target_role not in hierarchy.get(current_role, []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Como {current_role}, no puedes crear usuarios con el rol {target_role}"
        )

    # Verificar si el usuario ya existe
    result = await session.execute(
        select(Usuario).where(
            (Usuario.username == user_data.username) | (Usuario.email == user_data.email)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario o email ya existe"
        )
    
    # Obtener datos del creador para heredar territorio si es necesario
    creator_result = await session.execute(select(Usuario).where(Usuario.id == current_user["user_id"]))
    creator = creator_result.scalar_one_or_none()
    
    # Determinar superior:
    # 1. Si el admin especificó un superior_usuario_id, usarlo
    # 2. Si el creador NO es admin, él mismo es el superior
    superior_user = None
    if user_data.superior_usuario_id:
        res_sup = await session.execute(select(Usuario).where(Usuario.id == user_data.superior_usuario_id))
        superior_user = res_sup.scalar_one_or_none()
        if not superior_user:
            raise HTTPException(status_code=404, detail="Superior jerárquico no encontrado")
    elif current_role != 'admin':
        superior_user = creator

    # Territorio: si hay superior, se HEREDA obligatoriamente para concejales y referentes
    departamento_id = user_data.departamento_id
    distrito_id = user_data.distrito_id
    
    if target_role in ["concejal", "referente"] and superior_user:
        departamento_id = superior_user.departamento_id
        distrito_id = superior_user.distrito_id
    elif not departamento_id or not distrito_id:
        # Fallback al creador si no se especificó y no hay superior explícito (admin creando sin superior)
        departamento_id = departamento_id or (creator.departamento_id if creator else None)
        distrito_id = distrito_id or (creator.distrito_id if creator else None)

    # Validaciones obligatorias
    if target_role in ["intendente", "concejal", "referente"] and not distrito_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El rol '{target_role}' requiere un distrito asignado (ya sea explícito o por herencia de su superior)"
        )
    
    if target_role == "referente" and not superior_user and current_role == 'admin':
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un referente siempre debe estar asociado a un Intendente o Concejal"
        )
    
    # Generar contraseña aleatoria
    password = generate_random_password()
    hashed_password = get_password_hash(password)
    
    # Crear usuario
    new_user = Usuario(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        nombre_completo=user_data.nombre_completo,
        rol=user_data.rol,
        creado_por=current_user["user_id"],
        departamento_id=departamento_id,
        distrito_id=distrito_id
    )
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    # Crear registro en electoral.referentes para roles electorales
    if target_role in ["intendente", "concejal", "referente"]:
        from models import Referente
        
        superior_referente_id = None
        if superior_user:
            res_c = await session.execute(
                select(Referente.id).where(Referente.id_usuario_sistema == superior_user.id)
            )
            row = res_c.first()
            if row:
                superior_referente_id = row[0]
        
        nuevo_referente = Referente(
            id_usuario_sistema=new_user.id,
            nombre_referente=new_user.nombre_completo,
            rol_electoral=target_role,
            id_superior=superior_referente_id,
            activo=True
        )
        session.add(nuevo_referente)
        await session.commit()


    
    # Enviar email con credenciales
    try:
        email_service.send_welcome_email(
            user_data.email, 
            user_data.username, 
            password, 
            user_data.rol
        )
    except Exception as e:
         print(f"Error enviando email: {str(e)}")
    
    await log_access(session, LogAccesoCreate(
        usuario_id=current_user["user_id"],
        username=current_user["sub"],
        accion="create_user",
        detalles={"mensaje": f"Usuario creado: {user_data.username} con rol {target_role}"}
    ))
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="usuarios",
        record_id=new_user.id,
        new_data={
            "username": new_user.username,
            "email": new_user.email,
            "rol": new_user.rol,
            "departamento_id": departamento_id,
            "distrito_id": distrito_id,
        },
        details=f"Usuario creado por {current_role}: {new_user.username}"
    )
    
    return UserResponse.from_orm(new_user)

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Listar usuarios con filtrado por jerarquía completa"""
    from security import ROLES
    from hierarchy_utils import get_visible_user_ids
    
    current_role = current_user.get("role")
    user_permissions = ROLES.get(current_role, {}).get("permissions", [])
    
    if "manage_users" not in user_permissions and "manage_subordinates" not in user_permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver la lista de usuarios"
        )
    
    visible_ids = await get_visible_user_ids(current_user["user_id"], current_role, session)
    
    if current_role == "admin":
        stmt = select(Usuario).order_by(Usuario.rol, Usuario.nombre_completo)
    else:
        if not visible_ids:
            return []
        stmt = select(Usuario).where(Usuario.id.in_(visible_ids)).order_by(Usuario.rol, Usuario.nombre_completo)
        
    result = await session.execute(stmt)
    users = result.scalars().all()
    return [UserResponse.from_orm(user) for user in users]

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: dict = Depends(check_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
):
    """Obtener usuario por ID"""
    result = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserResponse.from_orm(user)

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Actualizar usuario con validación de jerarquía"""
    from security import ROLES
    
    # Buscar el usuario a actualizar
    result = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    current_role = current_user.get("role")
    user_permissions = ROLES.get(current_role, {}).get("permissions", [])
    
    # Verificar si tengo permiso de gestión
    can_manage = "manage_users" in user_permissions or "manage_subordinates" in user_permissions
    if not can_manage:
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar usuarios")
    
    # Si no soy admin, solo puedo editar a mis propios subordinados
    if current_role != "admin" and user.creado_por != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Solo puedes editar usuarios creados por ti")

    # Actualizar campos
    update_data = user_data.dict(exclude_unset=True)
    
    # Validar cambio de rol si se intenta
    if "rol" in update_data:
        target_role = update_data["rol"]
        hierarchy = {
            "admin": ["admin", "intendente", "concejal", "referente"],
            "intendente": ["concejal", "referente"],
            "concejal": ["referente"],
            "referente": []
        }
        if target_role not in hierarchy.get(current_role, []):
            raise HTTPException(status_code=403, detail=f"No puedes asignar el rol {target_role}")

    for field, value in update_data.items():
        setattr(user, field, value)
        
    try:
        await session.commit()
        await session.refresh(user)
    except IntegrityError as e:
        await session.rollback()
        if 'email' in str(e.orig):
            raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
        raise HTTPException(status_code=400, detail="Error de integridad de datos")
        
    # Registrar logs
    await log_access(session, LogAccesoCreate(
        usuario_id=current_user["user_id"],
        username=current_user["sub"],
        accion="update_user",
        detalles={"mensaje": f"Usuario actualizado: {user.username}"}
    ))
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="usuarios",
        record_id=user.id,
        new_data={k: v for k, v in update_data.items() if k != "hashed_password"},
        details=f"Usuario actualizado: {user.username}"
    )
    return UserResponse.from_orm(user)

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Eliminar usuario (desactivar) con validación de jerarquía"""
    from security import ROLES
    
    result = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    current_role = current_user.get("role")
    user_permissions = ROLES.get(current_role, {}).get("permissions", [])
    
    # Proteger admin
    if user.username == 'admin' or user.rol == 'admin':
        if current_role != 'admin':
            raise HTTPException(status_code=403, detail="No puedes eliminar a un administrador")
        if user.username == 'admin':
             raise HTTPException(status_code=403, detail="No se puede eliminar el usuario principal admin")

    # Verificar si tengo permiso de gestión
    can_manage = "manage_users" in user_permissions or "manage_subordinates" in user_permissions
    if not can_manage:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar usuarios")
        
    # Si no soy admin, solo puedo eliminar a mis propios subordinados
    if current_role != "admin" and user.creado_por != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar usuarios creados por ti")

    # Desactivar usuario
    user.activo = False
    await session.commit()
    
    # Registrar logs
    await log_access(session, LogAccesoCreate(
        usuario_id=current_user["user_id"],
        username=current_user["sub"],
        accion="delete_user",
        detalles={"mensaje": f"Usuario desactivado: {user.username}"}
    ))
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="usuarios",
        record_id=user.id,
        previous_data={"username": user.username, "email": user.email, "rol": user.rol},
        details=f"Usuario desactivado: {user.username}"
    )
    return {"message": "Usuario desactivado exitosamente"}

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Cambiar contraseña del usuario actual"""
    result = await session.execute(
        select(Usuario).where(Usuario.id == current_user["user_id"])
    )
    user = result.scalar_one_or_none()
    
    if not verify_password(password_data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta"
        )
    
    user.hashed_password = get_password_hash(password_data.new_password)
    await session.commit()
    
    # Registrar log
    await log_access(session, LogAccesoCreate(
        usuario_id=current_user["user_id"],
        username=current_user["sub"],
        accion="change_password"
    ))
    
    return {"message": "Contraseña cambiada exitosamente"}

@router.post("/reset-password-request")
async def request_password_reset(
    reset_request: PasswordResetRequest,
    session: AsyncSession = Depends(get_session)
):
    """Solicitar restablecimiento de contraseña"""
    result = await session.execute(
        select(Usuario).where(Usuario.email == reset_request.email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # No revelar si el email existe o no
        return {"message": "Si el email existe, se enviará un enlace de restablecimiento"}
    
    # Generar token
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    
    # Guardar token
    reset_record = PasswordReset(
        email=reset_request.email,
        token=token,
        expira_en=expires
    )
    session.add(reset_record)
    await session.commit()
    
    # Enviar email
    email_service.send_password_reset_email(
        reset_request.email, 
        user.username, 
        token
    )
    
    return {"message": "Si el email existe, se enviará un enlace de restablecimiento"}

@router.post("/reset-password-confirm")
async def confirm_password_reset(
    reset_confirm: PasswordResetConfirm,
    session: AsyncSession = Depends(get_session)
):
    """Confirmar restablecimiento de contraseña"""
    result = await session.execute(
        select(PasswordReset).where(
            and_(
                PasswordReset.token == reset_confirm.token,
                PasswordReset.usado == False,
                PasswordReset.expira_en > datetime.utcnow()
            )
        )
    )
    reset_record = result.scalar_one_or_none()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado"
        )
    
    # Buscar usuario
    result = await session.execute(
        select(Usuario).where(Usuario.email == reset_record.email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Actualizar contraseña
    user.hashed_password = get_password_hash(reset_confirm.new_password)
    reset_record.usado = True
    await session.commit()
    
    return {"message": "Contraseña restablecida exitosamente"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Obtener información del usuario actual"""
    result = await session.execute(
        select(Usuario).where(Usuario.id == current_user["user_id"])
    )
    user = result.scalar_one_or_none()
    return UserResponse.from_orm(user)

@router.get("/roles", response_model=List[RoleInfo])
async def get_roles():
    """Obtener información de roles disponibles"""
    return [
        RoleInfo(name=role, **info) 
        for role, info in ROLES.items()
    ]

@router.get("/logs", response_model=List[LogAccesoResponse])
async def get_logs(
    current_user: dict = Depends(check_permission("manage_users")),
    session: AsyncSession = Depends(get_session),
    limit: int = 100
):
    """Obtener logs de acceso (solo administradores)"""
    result = await session.execute(
        select(LogAcceso).order_by(LogAcceso.fecha.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [LogAccesoResponse.from_orm(log) for log in logs]

# ===== GESTIÓN DE EQUIPOS AUTORIZADOS =====

@router.get("/users/{user_id}/devices", response_model=List[EquipoAutorizadoResponse])
async def list_user_devices(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Listar equipos autorizados para un usuario"""
    # Solo admin puede ver de otros, o el mismo usuario
    if current_user["role"] != "admin" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver estos dispositivos")
        
    result = await session.execute(
        select(EquiposAutorizados).where(EquiposAutorizados.usuario_id == user_id)
    )
    return result.scalars().all()

@router.post("/users/{user_id}/devices", response_model=EquipoAutorizadoResponse)
async def authorize_device(
    user_id: int,
    device_data: EquipoAutorizadoBase,
    current_user: dict = Depends(check_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
):
    """Autorizar un nuevo equipo para un usuario"""
    # Verificar si ya existe
    res_exist = await session.execute(
        select(EquiposAutorizados).where(
            and_(
                EquiposAutorizados.usuario_id == user_id,
                EquiposAutorizados.device_id == device_data.device_id
            )
        )
    )
    if res_exist.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este equipo ya está registrado para este usuario")
        
    new_device = EquiposAutorizados(
        usuario_id=user_id,
        device_id=device_data.device_id,
        descripcion=device_data.descripcion or "Dispositivo sin nombre"
    )
    session.add(new_device)
    await session.commit()
    await session.refresh(new_device)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="equipos_autorizados",
        record_id=new_device.id,
        new_data={"usuario_id": user_id, "device_id": new_device.device_id},
        details=f"Equipo autorizado para usuario_id {user_id}"
    )
    
    return new_device

@router.delete("/devices/{device_id}")
async def deauthorize_device(
    device_id: int,
    current_user: dict = Depends(check_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
):
    """Eliminar autorización de un equipo"""
    result = await session.execute(select(EquiposAutorizados).where(EquiposAutorizados.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
    await session.delete(device)
    await session.commit()
    
    return {"message": "Autorización eliminada correctamente"}
@router.put("/devices/{device_id}/approve")
async def approve_device(
    device_id: int,
    current_user: dict = Depends(check_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
):
    """Aprobar un equipo pendiente"""
    result = await session.execute(select(EquiposAutorizados).where(EquiposAutorizados.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
    device.activo = True
    device.fecha_autorizacion = datetime.utcnow()
    await session.commit()
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="equipos_autorizados",
        record_id=device.id,
        new_data={"activo": True},
        details=f"Equipo aprobado para usuario_id {device.usuario_id}"
    )
    
    return {"message": "Equipo aprobado correctamente"}
