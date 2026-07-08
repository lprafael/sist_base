"""
Ejecutar el comando:
uvicorn main:app --reload
uvicorn main:app --reload --port 8001

main.py - Backend Base del Sistema (Poliverso)

Este módulo implementa la API REST base para el sistema, 
proporcionando funcionalidades core como:
- Gestión de usuarios y roles
- Autenticación y autorización (JWT)
- Auditoría de transacciones
- Gestión de parámetros del sistema
- Backups del sistema base

"""

# ============================================
# 1. IMPORTACIONES DE BIBLIOTECAS ESTÁNDAR
# ============================================
import os
import json
import shutil
import tempfile
import zipfile
import traceback
from typing import List, Dict, Any, Optional

# ============================================
# 2. IMPORTACIONES DE TERCEROS
# ============================================

from fastapi import FastAPI, HTTPException, Depends, Response, status, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import select, func, text, and_, or_, cast, String, distinct, case, desc, asc, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.exc import IntegrityError
from datetime import datetime, date
from dotenv import load_dotenv

# ============================================
# 3. IMPORTACIONES DE MÓDULOS LOCALES
# ============================================
# Modelos de base de datos
from models import (
    Base, Usuario, Rol, Permiso, LogAuditoria, LogAcceso, SesionUsuario
)

# Esquemas Pydantic
from schemas import (
    LogAuditoriaResponse, LogAccesoResponse, SesionUsuarioResponse
)

# Utilidades de seguridad
from security import check_permission, check_database_permission, get_current_user

# Utilidades de auditoría
from audit_utils import log_audit_action, log_activity, get_client_ip, get_user_agent

# ============================================
# 4. CONFIGURACIÓN INICIAL
# ============================================
# Cargar variables de entorno
load_dotenv()

# Configuración del servidor
PORT = int(os.getenv("PORT", "8001"))

# Importar configuración de base de datos desde el nuevo módulo
from database import engine, SessionLocal, get_session

# ============================================
# 5. INICIALIZACIÓN DE FASTAPI
# ============================================
app = FastAPI(
    title="API Sistema de Gestión de Vehículos",
    description="API para la gestión base de usuarios, roles y auditoría",
    version="1.0.0"
)
# Montar archivos estáticos (para imágenes de productos, etc.)
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(os.path.join(static_dir, "uploads/imagenes_productos"), exist_ok=True)
print(f"Mounting static files from: {static_dir}")
if os.path.exists(static_dir):
    print(f"Static directory exists. Contents: {os.listdir(static_dir)}")
else:
    print(f"WARNING: Static directory {static_dir} NOT FOUND!")

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Configuración de CORS - Debe estar antes de cualquier ruta
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.100.112:3001", 
        "http://127.0.0.1:3001", 
        "http://localhost:3001", 
        "http://localhost:3000", 
        "http://localhost:3008", 
        "http://localhost:5173",  # Vite default
        "http://192.168.100.84:3001",
        "http://172.16.222.222:3002",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://170.51.29.84.sslip.io:3002",
        "http://170.51.29.84.nip.io:3002",
        "http://187.77.247.23:3000",
        "http://187.77.247.23:3001",
        "http://187.77.247.23:3008",
        "http://187.77.247.23",
        "https://micancha.com.py",
        "https://www.micancha.com.py",
        "https://admin.micancha.com.py",
        "https://187.77.247.23:3000",
        "https://187.77.247.23:3001",
        "https://187.77.247.23:3008",
        "https://187.77.247.23",
        "https://micancha.com.py",
        "https://play.micancha.com.py",
        "https://admin.micancha.com.py",
        "https://api.micancha.com.py"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=600
)

# ============================================
# 6. FUNCIONES AUXILIARES
# ============================================

# El get_session se ha movido a database.py

# ============================================
# 7. INCLUSIÓN DE ROUTERS EXTERNOS
# ============================================
# Importar y montar los routers de autenticación y gestión de usuarios
from auth import router as auth_router
from reactivate_user import router as reactivate_user_router
from delete_user_physical import router as delete_user_physical_router
from notify_admin_password_reset import router as notify_admin_password_reset_router
from resend_user_password import router as resend_user_password_router
from routers.payments import router as payments_router
from routers.torneos import router as torneos_router
from routers.chat import router as chat_router
from routers.reservas import router as reservas_router
from routers.analytics import router as analytics_router

# Montar los routers en la aplicación
app.include_router(auth_router)
app.include_router(reactivate_user_router)
app.include_router(delete_user_physical_router)
app.include_router(notify_admin_password_reset_router)
app.include_router(resend_user_password_router)
app.include_router(payments_router)
app.include_router(torneos_router)
app.include_router(chat_router)
app.include_router(reservas_router)
app.include_router(analytics_router)
from routers.noticias import router as noticias_router
app.include_router(noticias_router)
from routers.reportes import router as reportes_router
app.include_router(reportes_router)

from routers.marciales import router as marciales_router
app.include_router(marciales_router)

from routers.deportes import router as deportes_router
app.include_router(deportes_router)

from routers.catalogos_futbol import router as catalogos_futbol_router
app.include_router(catalogos_futbol_router)

from routers.torneos_generales import router as torneos_generales_router
app.include_router(torneos_generales_router)

from routers.cancha_roles import router as cancha_roles_router
app.include_router(cancha_roles_router)

from routers.formatos_torneo import router as formatos_torneo_router
app.include_router(formatos_torneo_router)

from routers.categorias_org import router as categorias_org_router, torneo_cat_router
app.include_router(categorias_org_router)
app.include_router(torneo_cat_router)

from routers.divisiones import router as divisiones_router
app.include_router(divisiones_router)

from routers.organizador_deporte import router as organizador_deporte_router
app.include_router(organizador_deporte_router)

from routers.asam_scoring import router as asam_scoring_router
app.include_router(asam_scoring_router)

from routers.sorteos import router as sorteos_router
app.include_router(sorteos_router)

from routers.multas import router as multas_router
app.include_router(multas_router)

from routers.perfil_organizador import router as perfil_organizador_router
app.include_router(perfil_organizador_router)

from routers.futbol_core import router as futbol_core_router
app.include_router(futbol_core_router)

from routers.futbol_live import router as futbol_live_router
app.include_router(futbol_live_router)

from routers.cancha_config import router as cancha_config_router
app.include_router(cancha_config_router)

from routers.pagos_futbol import router as pagos_futbol_router
app.include_router(pagos_futbol_router)

from routers.liga_publica import router as liga_publica_router
app.include_router(liga_publica_router)

# ============================================
# 11. ENDPOINTS DE AUDITORÍA
# ============================================
@app.get("/auditoria/logs", summary="Obtener logs de auditoría")
async def obtener_logs_auditoria(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("auditoria_read")),
    limit: int = 100,
    offset: int = 0,
    tabla: Optional[str] = None,
    accion: Optional[str] = None,
    username: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None
):
    """
    Obtiene los logs de auditoría con filtros opcionales.
    Solo usuarios con permiso 'auditoria_read' pueden acceder.
    """
    from models import LogAuditoria
    from datetime import datetime
    
    # Construir query base
    query = select(LogAuditoria)
    
    # Aplicar filtros
    if tabla:
        query = query.where(LogAuditoria.tabla == tabla)
    if accion:
        query = query.where(LogAuditoria.accion == accion)
    if username:
        query = query.where(LogAuditoria.username.ilike(f"%{username}%"))
    if fecha_desde:
        try:
            fecha_desde_dt = datetime.fromisoformat(fecha_desde.replace('Z', '+00:00'))
            query = query.where(LogAuditoria.fecha >= fecha_desde_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_desde inválido")
    if fecha_hasta:
        try:
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta.replace('Z', '+00:00'))
            query = query.where(LogAuditoria.fecha <= fecha_hasta_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_hasta inválido")
    
    # Ordenar por fecha descendente (más recientes primero)
    query = query.order_by(desc(LogAuditoria.fecha))
    
    # Aplicar paginación
    query = query.offset(offset).limit(limit)
    
    result = await session.execute(query)
    logs = result.scalars().all()
    
    return logs

@app.get("/auditoria/logs/{log_id}", summary="Obtener log de auditoría específico", response_model=LogAuditoriaResponse)
async def obtener_log_auditoria(
    log_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("auditoria_read"))
):
    """
    Obtiene un log de auditoría específico por ID.
    Solo usuarios con permiso 'auditoria_read' pueden acceder.
    """
    # La importación ya está arriba ahora
    result = await session.execute(select(LogAuditoria).where(LogAuditoria.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log de auditoría no encontrado")
    
    return log

@app.get("/auditoria/accesos", summary="Obtener logs de acceso", response_model=List[LogAccesoResponse])
async def obtener_logs_acceso(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("auditoria_read")),
    limit: int = 100,
    offset: int = 0,
    username: Optional[str] = None,
    accion: Optional[str] = None,
    exitoso: Optional[bool] = None
):
    """
    Obtiene los logs de acceso con filtros opcionales.
    Solo usuarios con permiso 'auditoria_read' pueden acceder.
    """
    query = select(LogAcceso)
    
    if username:
        query = query.where(LogAcceso.username.ilike(f"%{username}%"))
    if accion:
        query = query.where(LogAcceso.accion == accion)
    if exitoso is not None:
        query = query.where(LogAcceso.exitoso == exitoso)
        
    query = query.order_by(desc(LogAcceso.fecha)).offset(offset).limit(limit)
    
    result = await session.execute(query)
    logs = result.scalars().all()
    return logs

@app.get("/auditoria/sesiones", summary="Obtener sesiones de usuarios", response_model=List[SesionUsuarioResponse])
async def obtener_sesiones_usuarios(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_permission("auditoria_read")),
    limit: int = 100,
    offset: int = 0,
    activa: Optional[bool] = None
):
    """
    Obtiene el listado de sesiones de usuarios.
    Solo usuarios con permiso 'auditoria_read' pueden acceder.
    """
    # Usar query simple y cargar la relación o hacer join
    query = select(SesionUsuario, Usuario.username).join(Usuario)
    
    if activa is not None:
        query = query.where(SesionUsuario.activa == activa)
        
    query = query.order_by(desc(SesionUsuario.fecha_inicio)).offset(offset).limit(limit)
    
    result = await session.execute(query)
    # Re-mapear el resultado para que coincida con el esquema
    sesiones = []
    for s_obj, username in result.all():
        s_dict = {c.name: getattr(s_obj, c.name) for c in s_obj.__table__.columns}
        s_dict['username'] = username
        sesiones.append(s_dict)
        
    return sesiones

# ============================================
# 12. ENDPOINTS DE BACKUP
# ============================================
@app.post("/backup/{table_name}", summary="Crear backup de tabla específica")
async def crear_backup_tabla(
    table_name: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_database_permission("sistema_backup"))
):
    """
    Crea un backup de una tabla específica.
    Solo usuarios con permiso 'sistema_backup' pueden acceder.
    """
    import json
    from datetime import datetime
    
    # Verificar permisos desde la base de datos
    try:
        from models import Usuario
        from sqlalchemy import select
        
        result = await session.execute(
            select(Usuario).where(Usuario.username == current_user.get("sub"))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Verificar si el usuario tiene el permiso sistema_backup
        result = await session.execute(
            text("""
                SELECT COUNT(*) FROM sistema.usuario_rol ur
                JOIN sistema.rol_permiso rp ON ur.rol_id = rp.rol_id
                JOIN sistema.permisos p ON rp.permiso_id = p.id
                WHERE ur.usuario_id = :usuario_id AND p.nombre = :permiso
            """),
            {"usuario_id": user.id, "permiso": "sistema_backup"}
        )
        
        has_permission = result.scalar_one() > 0
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes el permiso 'sistema_backup' para realizar esta acción"
            )
        
        # Agregar información del usuario a current_user
        current_user["user_id"] = user.id
        current_user["role"] = user.rol
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error verificando permisos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
    
    # Validar tabla permitida
    tablas_permitidas = [
        "usuarios", "logs_auditoria", "parametros_sistema", "roles", "permisos"
    ]
    
    if table_name not in tablas_permitidas:
        raise HTTPException(status_code=400, detail=f"Tabla '{table_name}' no permitida para backup")
    
    try:
        # Obtener datos de la tabla
        if table_name == "usuarios":
            from models import Usuario
            result = await session.execute(select(Usuario))
            data = [{"id": item.id, "username": item.username, "email": item.email, "nombre_completo": item.nombre_completo, "rol": item.rol, "activo": item.activo, "fecha_creacion": str(item.fecha_creacion) if item.fecha_creacion else None, "ultimo_acceso": str(item.ultimo_acceso) if item.ultimo_acceso else None} for item in result.scalars().all()]
        elif table_name == "logs_auditoria":
            from models import LogAuditoria
            result = await session.execute(select(LogAuditoria))
            data = [{"id": item.id, "usuario_id": item.usuario_id, "username": item.username, "accion": item.accion, "tabla": item.tabla, "registro_id": item.registro_id, "datos_anteriores": item.datos_anteriores, "datos_nuevos": item.datos_nuevos, "ip_address": item.ip_address, "user_agent": item.user_agent, "fecha": str(item.fecha), "detalles": item.detalles} for item in result.scalars().all()]
        elif table_name == "parametros_sistema":
            from models import ParametroSistema
            result = await session.execute(select(ParametroSistema))
            data = [{"id": item.id, "codigo": item.codigo, "nombre": item.nombre, "valor": item.valor, "tipo": item.tipo, "descripcion": item.descripcion, "categoria": item.categoria, "editable": item.editable, "fecha_creacion": str(item.fecha_creacion) if item.fecha_creacion else None} for item in result.scalars().all()]
        elif table_name == "roles":
            from models import Rol
            result = await session.execute(select(Rol))
            data = [{"id": item.id, "nombre": item.nombre, "descripcion": item.descripcion, "activo": item.activo, "fecha_creacion": str(item.fecha_creacion) if item.fecha_creacion else None} for item in result.scalars().all()]
        elif table_name == "permisos":
            from models import Permiso
            result = await session.execute(select(Permiso))
            data = [{"id": item.id, "nombre": item.nombre, "descripcion": item.descripcion, "modulo": item.modulo, "accion": item.accion, "activo": item.activo, "fecha_creacion": str(item.fecha_creacion) if item.fecha_creacion else None} for item in result.scalars().all()]
        
        # Crear estructura del backup
        backup_data = {
            "tabla": table_name,

            "fecha_backup": datetime.utcnow().isoformat(),
            "usuario_backup": current_user["sub"],
            "total_registros": len(data),
            "datos": data
        }
        
        # Registrar log de auditoría
        await log_audit_action(
            session=session,
            username=current_user["sub"],
            user_id=current_user["user_id"],
            action="export",
            table="backup",
            new_data={"tabla_backup": table_name, "total_registros": len(data)},
            details=f"Backup creado para tabla {table_name} con {len(data)} registros"
        )
        
        # Retornar JSON como archivo descargable
        return JSONResponse(
            content=backup_data,
            headers={
                "Content-Disposition": f"attachment; filename=backup_{table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            }
        )
        
    except Exception as e:
        print(f"Error al crear backup de {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear backup de {table_name}: {str(e)}")

@app.post("/debug/backup-test", summary="Endpoint de prueba para backup")
async def test_backup(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_database_permission("sistema_backup"))
):
    """
    Endpoint de prueba para verificar que el sistema funciona
    """
    print(f"=== TEST BACKUP ENDPOINT ===")
    print(f"Usuario: {current_user.get('sub')}")
    print(f"Token válido: {'✅ SÍ' if current_user else '❌ NO'}")
    
    try:
        # Verificar permisos manualmente
        from models import Usuario
        from sqlalchemy import select
        
        print("Buscando usuario en base de datos...")
        result = await session.execute(
            select(Usuario).where(Usuario.username == current_user.get("sub"))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ Usuario no encontrado")
            return {"error": "Usuario no encontrado"}
        
        print(f"✅ Usuario encontrado: {user.username} (ID: {user.id})")
        
        # Verificar permisos
        print("Verificando permisos...")
        result = await session.execute(
            text("""
                SELECT COUNT(*) FROM sistema.usuario_rol ur
                JOIN sistema.rol_permiso rp ON ur.rol_id = rp.rol_id
                JOIN sistema.permisos p ON rp.permiso_id = p.id
                WHERE ur.usuario_id = :usuario_id AND p.nombre = :permiso
            """),
            {"usuario_id": user.id, "permiso": "sistema_backup"}
        )
        
        has_permission = result.scalar_one() > 0
        print(f"Permiso sistema_backup: {'✅ SÍ' if has_permission else '❌ NO'}")
        
        # Hacer commit de la transacción para evitar ROLLBACK
        await session.commit()
        
        print("✅ Test completado exitosamente")
        return {
            "status": "success",
            "usuario": user.username,
            "user_id": user.id,
            "tiene_permiso_backup": has_permission,
            "mensaje": "Endpoint de prueba funcionando correctamente"
        }
        
    except Exception as e:
        print(f"❌ Error en test: {e}")
        import traceback
        traceback.print_exc()
        # Hacer rollback en caso de error
        await session.rollback()
        return {"error": str(e)}

@app.post("/debug/simple-test", summary="Endpoint de prueba simple")
async def test_simple(
    current_user: dict = Depends(check_database_permission("sistema_backup"))
):
    """
    Endpoint de prueba simple con permiso sistema_backup
    """
    print(f"=== SIMPLE TEST ENDPOINT ===")
    print(f"Usuario: {current_user.get('sub')}")
    
    return {
        "status": "success",
        "usuario": current_user.get('sub'),
        "mensaje": "Test simple funcionando"
    }

@app.get("/backup/ping", summary="Endpoint de ping sin autenticación")
async def ping():
    """
    Endpoint de ping para verificar que el servidor responde
    """
    print("=== PING ENDPOINT ===")
    return {"message": "pong", "status": "ok"}

@app.post("/backup/ping-post", summary="Endpoint de ping POST sin autenticación")
async def ping_post():
    """
    Endpoint de ping POST para verificar que el servidor responde
    """
    print("=== PING POST ENDPOINT ===")
    return {"message": "pong post", "status": "ok"}

@app.post("/backup/auth-test", summary="Test de autenticación básico")
async def auth_test(
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint para probar solo la autenticación JWT
    """
    print(f"=== AUTH TEST ENDPOINT ===")
    print(f"Usuario: {current_user}")
    print(f"Tipo de current_user: {type(current_user)}")
    
    try:
        return {
            "status": "success",
            "usuario": current_user.get('sub') if current_user else None,
            "tipo_usuario": str(type(current_user)),
            "contenido_usuario": str(current_user),
            "mensaje": "Autenticación funcionando"
        }
    except Exception as e:
        print(f"❌ Error en auth_test: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.post("/debug/auth-test", summary="Debug de autenticación")
async def auth_debug(
    request: Request,
    current_user: dict = Depends(check_database_permission("sistema_backup"))
):
    """
    Endpoint para debuggear la autenticación con permiso sistema_backup
    """
    print(f"=== AUTH DEBUG ENDPOINT ===")
    print(f"Usuario autenticado: {current_user}")
    
    try:
        # Obtener headers manualmente
        auth_header = request.headers.get('authorization')
        print(f"Authorization header: {auth_header}")
        
        if not auth_header or not auth_header.startswith('Bearer '):
            print("❌ No hay token Bearer")
            return {"error": "No hay token Bearer", "header": auth_header}
        
        token = auth_header.split(' ')[1]
        print(f"Token extraído: {token[:20]}...")
        
        # Intentar decodificar el token manualmente
        try:
            from security import verify_token
            user = verify_token(token)
            print(f"✅ Token decodificado exitosamente: {user}")
            return {
                "status": "success",
                "usuario": user,
                "mensaje": "Token válido"
            }
        except Exception as token_error:
            print(f"❌ Error decodificando token: {token_error}")
            import traceback
            traceback.print_exc()
            return {"error": f"Error decodificando token: {token_error}"}
            
    except Exception as e:
        print(f"❌ Error general en auth_debug: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/backup/raw-debug", summary="Debug raw sin autenticación")
async def raw_debug():
    """
    Endpoint completamente sin autenticación para debug
    """
    print(f"=== RAW DEBUG ENDPOINT ===")
    return {"message": "Raw debug funcionando", "status": "ok"}

@app.post("/backup/raw-debug", summary="Debug raw POST sin autenticación")
async def raw_debug_post():
    """
    Endpoint POST completamente sin autenticación para debug
    """
    print(f"=== RAW DEBUG POST ENDPOINT ===")
    return {"message": "Raw debug POST funcionando", "status": "ok"}

@app.post("/system/backup", summary="Crear backup completo del sistema")
async def crear_backup_completo(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(check_database_permission("sistema_backup"))
):
    """
    Crea un backup completo de todas las tablas del sistema.
    Solo usuarios con permiso 'sistema_backup' pueden acceder.
    """
    import json
    import zipfile
    import tempfile
    import os
    from datetime import datetime
    
    print(f"=== INICIANDO BACKUP COMPLETO ===")
    print(f"Usuario: {current_user.get('sub')}")
    
    # Verificar permisos desde la base de datos
    try:
        from models import Usuario
        from sqlalchemy import select
        
        print("Buscando usuario en base de datos...")
        result = await session.execute(
            select(Usuario).where(Usuario.username == current_user.get("sub"))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ Usuario no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        print(f"✅ Usuario encontrado: {user.username} (ID: {user.id})")
        
        # Verificar si el usuario tiene el permiso sistema_backup
        print("Verificando permisos...")
        result = await session.execute(
            text("""
                SELECT COUNT(*) FROM sistema.usuario_rol ur
                JOIN sistema.rol_permiso rp ON ur.rol_id = rp.rol_id
                JOIN sistema.permisos p ON rp.permiso_id = p.id
                WHERE ur.usuario_id = :usuario_id AND p.nombre = :permiso
            """),
            {"usuario_id": user.id, "permiso": "sistema_backup"}
        )
        
        has_permission = result.scalar_one() > 0
        print(f"Permiso sistema_backup: {'✅ SÍ' if has_permission else '❌ NO'}")
        
        if not has_permission:
            print("❌ Usuario no tiene permiso sistema_backup")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes el permiso 'sistema_backup' para realizar esta acción"
            )
        
        # Agregar información del usuario a current_user
        current_user["user_id"] = user.id
        current_user["role"] = user.rol
        print(f"✅ Permisos verificados correctamente")
        
    except HTTPException:
        print("❌ Error HTTP durante verificación de permisos")
        raise
    except Exception as e:
        print(f"❌ Error verificando permisos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )
    
    try:
        print("Creando directorio temporal...")
        temp_dir = tempfile.mkdtemp()
        print(f"Directorio temporal creado: {temp_dir}")
        
        try:
            # Obtener todas las tablas de los esquemas 'public' y 'sistema'
            print("Descubriendo tablas en schemas 'public' y 'sistema'...")
            tables_query = text("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema IN ('public', 'sistema') 
                AND table_type = 'BASE TABLE'
                ORDER BY table_schema, table_name;
            """)
            result = await session.execute(tables_query)
            all_tables = result.fetchall()
            print(f"Se encontraron {len(all_tables)} tablas para respaldar")
            
            tablas_procesadas = []
            
            for schema, tabla in all_tables:
                try:
                    print(f"Procesando tabla: {schema}.{tabla}")
                    
                    # Ejecutar consulta SQL para obtener todos los datos
                    query = text(f'SELECT * FROM "{schema}"."{tabla}"')
                    result = await session.execute(query)
                    rows = result.fetchall()
                    keys = result.keys()
                    
                    # Convertir a lista de diccionarios
                    data = []
                    for row in rows:
                        row_dict = {}
                        for i, column in enumerate(keys):
                            value = row[i]
                            # Manejo de tipos especiales para JSON
                            if value is not None:
                                if isinstance(value, (datetime, date)):
                                    row_dict[column] = value.isoformat()
                                elif hasattr(value, '__str__') and not isinstance(value, (int, float, bool, str, list, dict)):
                                    row_dict[column] = str(value)
                                else:
                                    row_dict[column] = value
                            else:
                                row_dict[column] = None
                        data.append(row_dict)
                    
                    # Guardar datos en archivo JSON (un archivo por schema_tabla)
                    filename = f"{schema}_{tabla}.json"
                    tabla_file = os.path.join(temp_dir, filename)
                    with open(tabla_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
                    
                    tablas_procesadas.append(f"{schema}.{tabla}")
                    print(f"✅ Tabla {schema}.{tabla} procesada: {len(data)} registros")
                        
                except Exception as e:
                    print(f"❌ Error procesando tabla {schema}.{tabla}: {e}")
                    continue
            
            # Crear archivo de metadatos
            print("Creando archivo de metadatos...")
            metadata = {
                "fecha_backup": datetime.utcnow().isoformat(),
                "usuario_backup": current_user["sub"],
                "sistema": "Sistema de Gestión de Información",
                "version": "1.0.0",
                "tablas_incluidas": tablas_procesadas,
                "total_tablas": len(tablas_procesadas),
                "notas": "Backup completo de esquemas public y sistema"
            }
            
            metadata_file = os.path.join(temp_dir, "metadata.json")
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2, default=str)
            
            # Crear archivo ZIP
            print("Creando archivo ZIP...")
            zip_filename = f"backup_completo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
            zip_path = os.path.join(temp_dir, zip_filename)
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for filename in os.listdir(temp_dir):
                    if filename.endswith('.json'):
                        zipf.write(os.path.join(temp_dir, filename), filename)
            
            print(f"✅ Archivo ZIP creado: {zip_path}")
            
            # Registrar log de auditoría
            print("Registrando log de auditoría...")
            await log_audit_action(
                session=session,
                username=current_user["sub"],
                user_id=current_user["user_id"],
                action="export",
                table="backup",
                new_data={"tipo_backup": "completo", "total_tablas": len(tablas_procesadas)},
                details=f"Backup completo realizado ({len(tablas_procesadas)} tablas de public y sistema)"
            )
            
            # Leer el archivo ZIP y retornarlo
            print("Leyendo archivo ZIP para respuesta...")
            with open(zip_path, 'rb') as f:
                zip_content = f.read()
            
            print(f"✅ Archivo ZIP leído: {len(zip_content)} bytes")
            
            # Limpiar archivos temporales
            print("Limpiando archivos temporales...")
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            print("✅ BACKUP COMPLETADO EXITOSAMENTE")
            return Response(
                content=zip_content,
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename={zip_filename}"
                }
            )
            
        except Exception as e:
            print(f"❌ Error durante el procesamiento: {e}")
            # Limpiar en caso de error
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            raise e
            
    except Exception as e:
        print(f"❌ Error al crear backup completo: {e}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al crear backup completo: {str(e)}")



# ============================================
# 12. ENDPOINTS MICANCHA (COMPLEJOS, CANCHAS, RESERVAS Y TORNEOS)
# ============================================

@app.get("/cancha/complejos", summary="Obtener todos los complejos deportivos")
async def get_complejos(session: AsyncSession = Depends(get_session)):
    try:
        query = text("""
            SELECT id, nombre, descripcion, telefono, email, direccion, ciudad, departamento,
                   horario_apertura, horario_cierre, ST_Y(ubicacion::geometry) as lat, ST_X(ubicacion::geometry) as lng,
                   es_publico
            FROM cancha.complejos
        """)
        result = await session.execute(query)
        rows = result.fetchall()
        
        complejos = []
        for row in rows:
            complejos.append({
                "id": str(row[0]),
                "nombre": row[1],
                "descripcion": row[2],
                "telefono": row[3],
                "email": row[4],
                "direccion": row[5],
                "ciudad": row[6],
                "departamento": row[7],
                "horario_apertura": row[8].strftime("%H:%M:%S") if row[8] else "07:00:00",
                "horario_cierre": row[9].strftime("%H:%M:%S") if row[9] else "23:00:00",
                "lat": float(row[10]) if row[10] is not None else None,
                "lng": float(row[11]) if row[11] is not None else None,
                "es_publico": bool(row[12]) if len(row) > 12 else False
            })
        return complejos
    except Exception as e:
        print(f"Error in get_complejos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cancha/complejos/{complejo_id}", summary="Obtener un complejo deportivo por ID")
async def get_complejo(complejo_id: str, session: AsyncSession = Depends(get_session)):
    try:
        query = text("""
            SELECT id, nombre, descripcion, telefono, email, direccion, ciudad, departamento,
                   horario_apertura, horario_cierre, ST_Y(ubicacion::geometry) as lat, ST_X(ubicacion::geometry) as lng
            FROM cancha.complejos
            WHERE id = :complejo_id
        """)
        result = await session.execute(query, {"complejo_id": complejo_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Complejo no encontrado")
            
        return {
            "id": str(row[0]),
            "nombre": row[1],
            "descripcion": row[2],
            "telefono": row[3],
            "email": row[4],
            "direccion": row[5],
            "ciudad": row[6],
            "departamento": row[7],
            "horario_apertura": row[8].strftime("%H:%M:%S") if row[8] else "07:00:00",
            "horario_cierre": row[9].strftime("%H:%M:%S") if row[9] else "23:00:00",
            "lat": float(row[10]) if row[10] is not None else None,
            "lng": float(row[11]) if row[11] is not None else None
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cancha/complejos/{complejo_id}/canchas", summary="Obtener las canchas de un complejo")
async def get_canchas(complejo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT id, nombre, deporte, superficie, precio_hora, precio_hora_nocturna, numero_orden, color, activo
        FROM cancha.canchas
        WHERE complejo_id = :complejo_id AND activo = TRUE
        ORDER BY numero_orden ASC
    """)
    result = await session.execute(query, {"complejo_id": complejo_id})
    rows = result.fetchall()
    
    canchas = []
    for row in rows:
        canchas.append({
            "id": str(row[0]),
            "nombre": row[1],
            "deporte": row[2],
            "superficie": row[3],
            "precio_hora": float(row[4]) if row[4] else 0.0,
            "precio_hora_nocturna": float(row[5]) if row[5] else 0.0,
            "numero_orden": row[6],
            "color": row[7],
            "activo": row[8]
        })
    return canchas

from fastapi import WebSocket, WebSocketDisconnect

# Manejador de WebSockets simple (dummy para evitar errores 403/404 en el admin)
active_connections: list[WebSocket] = []

@app.websocket("/cancha/ws/{complejo_id}")
async def websocket_endpoint(websocket: WebSocket, complejo_id: str):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Esperar a que el cliente envíe mensajes (ej. 'ping')
            data = await websocket.receive_text()
            if data == 'ping':
                await websocket.send_text('pong')
    except WebSocketDisconnect:
        active_connections.remove(websocket)


@app.get("/cancha/complejos/{complejo_id}/reservas", summary="Obtener reservas de un complejo")
async def get_reservas(complejo_id: str, fecha: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    sql = """
        SELECT r.id, r.cancha_id, r.cliente_id, r.inicio, r.fin, r.precio_total, r.estado,
               c.nombre as cancha_nombre, cl.nombre as cliente_nombre
        FROM cancha.reservas r
        JOIN cancha.canchas c ON r.cancha_id = c.id
        LEFT JOIN cancha.clientes cl ON r.cliente_id = cl.id
        WHERE r.complejo_id = :complejo_id
    """
    params = {"complejo_id": complejo_id}
    if fecha:
        sql += " AND DATE(r.inicio) = DATE(:fecha)"
        params["fecha"] = datetime.strptime(fecha, "%Y-%m-%d").date()
        
    query = text(sql)
    result = await session.execute(query, params)
    rows = result.fetchall()
    
    reservas = []
    for row in rows:
        reservas.append({
            "id": str(row[0]),
            "cancha_id": str(row[1]),
            "cliente_id": str(row[2]) if row[2] else None,
            "inicio": row[3].isoformat() if row[3] else None,
            "fin": row[4].isoformat() if row[4] else None,
            "precio_total": float(row[5]) if row[5] else 0.0,
            "estado": row[6],
            "cancha_nombre": row[7],
            "cliente_nombre": row[8] if row[8] else "Cliente General"
        })
    return reservas


# Pydantic schemas para creación y modificación
from typing import Optional

class TorneoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    deporte: str
    formato: Optional[str] = "liga"
    fecha_inicio: str
    max_equipos: Optional[int] = 16
    costo_inscripcion: Optional[float] = 0
    complejo_id: str
    reglas: Optional[list[str]] = []
    premios: Optional[list[dict]] = []

class EquipoCreate(BaseModel):
    nombre: str
    capitan_nombre: Optional[str] = None
    capitan_telefono: Optional[str] = None
    capitan_email: Optional[str] = None

class PartidoUpdate(BaseModel):
    goles_local: Optional[int] = 0
    goles_visitante: Optional[int] = 0
    estado: Optional[str] = "finalizado"

class PagoEfectivoRequest(BaseModel):
    recibido_por: str

# NOTE: Tournament POST/PATCH endpoints have been modularized and moved to backend/routers/torneos.py.


# ENDPOINTS DE PAGOS Y WEBHOOKS
@app.post("/cancha/pagos/inscripcion/{torneo_equipo_id}", summary="Generar link de pago para la inscripción")
async def generate_payment_link(torneo_equipo_id: str, request: Request, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT t.costo_inscripcion, t.nombre, e.nombre, e.estado_inscripcion
        FROM torneos_futbol.equipos e
        JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
        WHERE e.id = :torneo_equipo_id
    """)
    res = await session.execute(query, {"torneo_equipo_id": torneo_equipo_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
        
    costo = float(row[0]) if row[0] else 0.0
    torneo_nombre = row[1]
    equipo_nombre = row[2]
    estado_insc = row[3]
    
    if estado_insc == "confirmado":
        return {"status": "already_paid", "message": "Esta inscripción ya está pagada y confirmada."}
        
    pref_id = f"pref_{torneo_equipo_id[:8]}"
    check_p = await session.execute(text("SELECT id FROM torneos_futbol.pagos WHERE torneo_equipo_id = :torneo_equipo_id AND estado = 'pendiente'"), {"torneo_equipo_id": torneo_equipo_id})
    existing = check_p.fetchone()
    
    if not existing:
        await session.execute(text("""
            INSERT INTO torneos_futbol.pagos
                (id, torneo_equipo_id, monto, moneda, proveedor, proveedor_preference_id, estado)
            VALUES
                (uuid_generate_v4(), :torneo_equipo_id, :monto, 'PYG', 'mercadopago', :pref_id, 'pendiente')
        """), {
            "torneo_equipo_id": torneo_equipo_id,
            "monto": costo,
            "pref_id": pref_id
        })
        await session.commit()
        
    checkout_url = f"{str(request.base_url).rstrip('/')}/cancha/pagos/checkout-simulado/{torneo_equipo_id}"
    return {
        "checkout_url": checkout_url,
        "monto": costo,
        "moneda": "PYG",
        "torneo": torneo_nombre,
        "equipo": equipo_nombre
    }

from fastapi.responses import HTMLResponse

@app.get("/cancha/pagos/checkout-simulado/{torneo_equipo_id}", response_class=HTMLResponse)
async def checkout_simulado(torneo_equipo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT t.nombre, e.nombre, t.costo_inscripcion, t.id
        FROM torneos_futbol.equipos e
        JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
        WHERE e.id = :torneo_equipo_id
    """)
    res = await session.execute(query, {"torneo_equipo_id": torneo_equipo_id})
    row = res.fetchone()
    if not row:
        return "<h3>Equipo no encontrado</h3>"
        
    torneo_nombre = row[0]
    equipo_nombre = row[1]
    costo = float(row[2]) if row[2] else 0.0
    torneo_id = str(row[3])
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mi Cancha Pay - Pasarela Simula</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg: #060913;
                --primary: #00D084;
                --primary-hover: #00b371;
                --card-bg: rgba(255, 255, 255, 0.03);
                --card-border: rgba(255, 255, 255, 0.08);
                --text: #ffffff;
                --text-secondary: #94A3B8;
            }}
            * {{
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: 'Outfit', sans-serif;
            }}
            body {{
                background-color: var(--bg);
                color: var(--text);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
                overflow: hidden;
            }}
            .container {{
                background: var(--card-bg);
                border: 1px solid var(--card-border);
                border-radius: 32px;
                padding: 40px;
                max-width: 450px;
                width: 100%;
                text-align: center;
                backdrop-blur: 20px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                position: relative;
            }}
            .logo {{
                font-size: 28px;
                font-weight: 800;
                color: var(--primary);
                margin-bottom: 30px;
                letter-spacing: -0.5px;
            }}
            .icon {{
                font-size: 48px;
                margin-bottom: 20px;
                animation: float 3s ease-in-out infinite;
            }}
            @keyframes float {{
                0%, 100% {{ transform: translateY(0); }}
                50% {{ transform: translateY(-10px); }}
            }}
            h2 {{
                font-size: 22px;
                font-weight: 600;
                margin-bottom: 8px;
            }}
            .subtitle {{
                font-size: 14px;
                color: var(--text-secondary);
                margin-bottom: 30px;
            }}
            .details-box {{
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid var(--card-border);
                border-radius: 20px;
                padding: 20px;
                margin-bottom: 30px;
                text-align: left;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 14px;
            }}
            .detail-row:last-child {{
                margin-bottom: 0;
                padding-top: 12px;
                border-top: 1px solid var(--card-border);
            }}
            .label {{
                color: var(--text-secondary);
            }}
            .value {{
                font-weight: 600;
            }}
            .amount {{
                font-size: 20px;
                color: var(--primary);
                font-weight: 800;
            }}
            .btn {{
                background: var(--primary);
                color: #000;
                border: none;
                border-radius: 100px;
                padding: 16px 32px;
                font-size: 16px;
                font-weight: 800;
                width: 100%;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 8px 24px rgba(0, 208, 132, 0.2);
            }}
            .btn:hover {{
                background: var(--primary-hover);
                transform: translateY(-2px);
                box-shadow: 0 12px 30px rgba(0, 208, 132, 0.3);
            }}
            .btn:active {{
                transform: translateY(0);
            }}
            .loading {{
                display: none;
                font-size: 14px;
                color: var(--primary);
                margin-top: 20px;
                font-weight: 600;
            }}
            .success-view {{
                display: none;
            }}
            .success-icon {{
                font-size: 64px;
                color: var(--primary);
                margin-bottom: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container" id="payment-card">
            <div class="logo">Mi Cancha <span style="color:#fff">Pay</span></div>
            <div class="icon">💳</div>
            <h2>Pasarela de Pago Simulado</h2>
            <p class="subtitle">Estás inscribiendo a tu equipo de forma segura</p>
            
            <div class="details-box">
                <div class="detail-row">
                    <span class="label">Torneo</span>
                    <span class="value">{torneo_nombre}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Equipo</span>
                    <span class="value">{equipo_nombre}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Método</span>
                    <span class="value">MercadoPago Simulado</span>
                </div>
                <div class="detail-row">
                    <span class="label">Total a pagar</span>
                    <span class="value amount">G. {costo:,.0f}</span>
                </div>
            </div>
            
            <button class="btn" id="pay-btn" onclick="processPayment()">CONFIRMAR PAGO SIMULADO</button>
            <div class="loading" id="loader">Procesando pago seguro...</div>
        </div>

        <div class="container success-view" id="success-card">
            <div class="success-icon">🏆</div>
            <h2>¡Inscripción Confirmada!</h2>
            <p class="subtitle" style="margin-bottom: 20px">Tu pago ha sido procesado de manera exitosa y tu equipo está habilitado para el sorteo.</p>
            <div class="details-box" style="text-align: center;">
                <span class="label">Monto Pagado</span>
                <div class="amount" style="font-size: 28px; margin-top: 5px;">G. {costo:,.0f}</div>
            </div>
            <p class="subtitle">Redirigiéndote al torneo en 3 segundos...</p>
        </div>

        <script>
            async function processPayment() {{
                const btn = document.getElementById('pay-btn');
                const loader = document.getElementById('loader');
                btn.style.display = 'none';
                loader.style.display = 'block';
                
                try {{
                    const response = await fetch('/cancha/pagos/webhook/mercadopago?torneo_equipo_id={torneo_equipo_id}&status=aprobado', {{
                        method: 'POST'
                    }});
                    
                    if (response.ok) {{
                        setTimeout(() => {{
                            document.getElementById('payment-card').style.display = 'none';
                            document.getElementById('success-card').style.display = 'block';
                            
                            setTimeout(() => {{
                                window.location.href = 'http://187.77.247.23:3000/torneos/{torneo_id}';
                            }}, 3000);
                        }}, 1500);
                    }} else {{
                        alert('Error al registrar el pago en el servidor.');
                        btn.style.display = 'block';
                        loader.style.display = 'none';
                    }}
                }} catch (e) {{
                    console.error(e);
                    alert('Error de conexión con la pasarela.');
                    btn.style.display = 'block';
                    loader.style.display = 'none';
                }}
            }}
        </script>
    </body>
    </html>
    """
    return html_content

@app.post("/cancha/pagos/webhook/mercadopago", summary="Webhook para MercadoPago (Simulado/Real)")
async def mercadopago_webhook(torneo_equipo_id: str, status: str = "aprobado", session: AsyncSession = Depends(get_session)):
    try:
        if status == "aprobado":
            update_team = text("""
                UPDATE torneos_futbol.equipos
                SET estado_inscripcion = 'confirmado'
                WHERE id = :torneo_equipo_id
                RETURNING torneo_id
            """)
            res_team = await session.execute(update_team, {"torneo_equipo_id": torneo_equipo_id})
            row_team = res_team.fetchone()
            if not row_team:
                raise HTTPException(status_code=404, detail="Equipo no encontrado")
                
            torneo_id = str(row_team[0])
            
            check_p = await session.execute(text("SELECT id, monto FROM torneos_futbol.pagos WHERE torneo_equipo_id = :torneo_equipo_id AND estado = 'pendiente'"), {"torneo_equipo_id": torneo_equipo_id})
            existing_p = check_p.fetchone()
            
            if existing_p:
                pago_id = existing_p[0]
                update_pago = text("""
                    UPDATE torneos_futbol.pagos
                    SET estado = 'aprobado', pagado_en = NOW(), actualizado_en = NOW()
                    WHERE id = :pago_id
                """)
                await session.execute(update_pago, {"pago_id": pago_id})
            else:
                t_query = text("SELECT costo_inscripcion FROM torneos_futbol.torneos WHERE id = :torneo_id")
                t_res = await session.execute(t_query, {"torneo_id": torneo_id})
                t_row = t_res.fetchone()
                costo = float(t_row[0]) if t_row and t_row[0] else 0.0
                
                insert_pago = text("""
                    INSERT INTO torneos_futbol.pagos
                        (id, torneo_equipo_id, monto, moneda, proveedor, estado, pagado_en)
                    VALUES
                        (uuid_generate_v4(), :torneo_equipo_id, :monto, 'PYG', 'mercadopago', 'aprobado', NOW())
                """)
                await session.execute(insert_pago, {"torneo_equipo_id": torneo_equipo_id, "monto": costo})
                
            await session.commit()
            return {"status": "success", "message": "Inscripción confirmada y pago aprobado."}
        else:
            update_team = text("""
                UPDATE torneos_futbol.equipos
                SET estado_inscripcion = 'pendiente'
                WHERE id = :torneo_equipo_id
            """)
            await session.execute(update_team, {"torneo_equipo_id": torneo_equipo_id})
            
            update_pago = text("""
                UPDATE torneos_futbol.pagos
                SET estado = 'rechazado', actualizado_en = NOW()
                WHERE torneo_equipo_id = :torneo_equipo_id AND estado = 'pendiente'
            """)
            await session.execute(update_pago, {"torneo_equipo_id": torneo_equipo_id})
            await session.commit()
            return {"status": "rejected", "message": "Pago rechazado o fallido."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/cancha/pagos/estado/{torneo_equipo_id}", summary="Consultar el estado del pago de un equipo")
async def get_payment_status(torneo_equipo_id: str, session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT estado, monto, pagado_en, proveedor
        FROM torneos_futbol.pagos
        WHERE torneo_equipo_id = :torneo_equipo_id
        ORDER BY creado_en DESC
        LIMIT 1
    """)
    result = await session.execute(query, {"torneo_equipo_id": torneo_equipo_id})
    row = result.fetchone()
    if not row:
        return {"status": "none", "message": "No se registran intenciones de pago para este equipo."}
        
    return {
        "status": row[0],
        "monto": float(row[1]) if row[1] else 0.0,
        "pagado_en": row[2].isoformat() if row[2] else None,
        "proveedor": row[3]
    }

@app.post("/cancha/pagos/efectivo/{torneo_equipo_id}", summary="Registrar un pago en efectivo (Manual)")
async def register_cash_payment(torneo_equipo_id: str, payload: PagoEfectivoRequest, session: AsyncSession = Depends(get_session)):
    try:
        query = text("""
            SELECT t.costo_inscripcion, e.torneo_id
            FROM torneos_futbol.equipos e
            JOIN torneos_futbol.torneos t ON e.torneo_id = t.id
            WHERE e.id = :torneo_equipo_id
        """)
        res = await session.execute(query, {"torneo_equipo_id": torneo_equipo_id})
        row = res.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
            
        costo = float(row[0]) if row[0] else 0.0
        
        await session.execute(text("""
            UPDATE torneos_futbol.equipos
            SET estado_inscripcion = 'confirmado'
            WHERE id = :torneo_equipo_id
        """), {"torneo_equipo_id": torneo_equipo_id})
        
        await session.execute(text("""
            INSERT INTO torneos_futbol.pagos
                (id, torneo_equipo_id, monto, moneda, proveedor, estado, pagado_en, recibido_por)
            VALUES
                (uuid_generate_v4(), :torneo_equipo_id, :monto, 'PYG', 'efectivo', 'aprobado', NOW(), :recibido_por)
        """), {
            "torneo_equipo_id": torneo_equipo_id,
            "monto": costo,
            "recibido_por": payload.recibido_por
        })
        
        await session.commit()
        return {"status": "success", "message": "Pago en efectivo registrado y equipo confirmado."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================
# 13. ENDPOINTS DE SALUD Y UTILIDADES
# ============================================

@app.get("/health")
async def health_check():
    """
    Endpoint de verificación de salud de la API.
    
    Returns:
        dict: Estado actual de la API
    """
    return {"status": "ok"}

