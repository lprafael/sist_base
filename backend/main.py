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
    title="API Sistema Base - Poliverso",
    description="API para la gestión base de usuarios, roles y auditoría",
    version="1.0.0"
)

# Configuración de CORS - Debe estar antes de cualquier ruta
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.100.112:3001", 
        "http://127.0.0.1:3001", 
        "http://localhost:3001", 
        "http://localhost:5173",  # Vite default
        "http://192.168.100.84:3001",
        "http://172.16.222.222:3002"
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

# Montar los routers en la aplicación
app.include_router(auth_router)
app.include_router(reactivate_user_router)
app.include_router(delete_user_physical_router)
app.include_router(notify_admin_password_reset_router)
app.include_router(resend_user_password_router)



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
                SELECT COUNT(*) FROM usuario_rol ur
                JOIN rol_permiso rp ON ur.rol_id = rp.rol_id
                JOIN permisos p ON rp.permiso_id = p.id
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
                SELECT COUNT(*) FROM usuario_rol ur
                JOIN rol_permiso rp ON ur.rol_id = rp.rol_id
                JOIN permisos p ON rp.permiso_id = p.id
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
                SELECT COUNT(*) FROM usuario_rol ur
                JOIN rol_permiso rp ON ur.rol_id = rp.rol_id
                JOIN permisos p ON rp.permiso_id = p.id
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
        # Crear directorio temporal
        temp_dir = tempfile.mkdtemp()
        print(f"Directorio temporal creado: {temp_dir}")
        
        try:
            # Lista de todas las tablas incluyendo las geométricas
            tablas = [
                "usuarios", "logs_auditoria", "parametros_sistema", "roles", "permisos"
            ]
            
            # Procesar cada tabla usando SQL directo
            for tabla in tablas:
                try:
                    print(f"Procesando tabla: {tabla}")
                    
                    # Tablas normales - usar SQL directo
                    if tabla == "usuarios":
                        query = """
                            SELECT id, username, email, nombre_completo, rol, 
                                   activo, fecha_creacion, ultimo_acceso 
                            FROM usuarios
                        """
                    elif tabla == "logs_auditoria":
                        query = """
                            SELECT id, usuario_id, username, accion, tabla, 
                                   registro_id, datos_anteriores, datos_nuevos, 
                                   ip_address, user_agent, fecha, detalles 
                            FROM logs_auditoria
                        """
                    elif tabla == "parametros_sistema":
                        query = """
                            SELECT id, codigo, nombre, valor, tipo, descripcion, 
                                   categoria, editable, fecha_creacion 
                            FROM parametros_sistema
                        """
                    elif tabla == "roles":
                        query = "SELECT id, nombre, descripcion, activo, fecha_creacion FROM roles"
                    elif tabla == "permisos":
                        query = """
                            SELECT id, nombre, descripcion, modulo, accion, 
                                   activo, fecha_creacion 
                            FROM permisos
                        """

                    
                    # Ejecutar consulta SQL
                    print(f"  Ejecutando query para {tabla}...")
                    result = await session.execute(text(query))
                    rows = result.fetchall()
                    print(f"  {len(rows)} registros obtenidos")
                    
                    # Convertir a lista de diccionarios
                    data = []
                    for row in rows:
                        row_dict = {}
                        for i, column in enumerate(result.keys()):
                            value = row[i]
                            if value is not None:
                                row_dict[column] = str(value) if isinstance(value, (datetime, date)) else value
                            else:
                                row_dict[column] = None
                        data.append(row_dict)
                    
                    # Guardar datos en archivo JSON
                    tabla_file = os.path.join(temp_dir, f"{tabla}.json")
                    with open(tabla_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
                    
                    print(f"✅ Tabla {tabla} procesada: {len(data)} registros")
                        
                except Exception as e:
                    print(f"❌ Error procesando tabla {tabla}: {e}")
                    # Continuar con la siguiente tabla
                    continue
            
            # Crear archivo de metadatos
            print("Creando archivo de metadatos...")
            metadata = {
                "fecha_backup": datetime.utcnow().isoformat(),
                "usuario_backup": current_user["sub"],
                "sistema": "Sistema de Gestión de Información",
                "version": "1.0.0",
                "tablas_incluidas": tablas,
                "total_tablas": len(tablas),
                "notas": "Backup básico del sistema (tablas principales)"
            }
            
            metadata_file = os.path.join(temp_dir, "metadata.json")
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2, default=str)
            
            # Crear archivo ZIP
            print("Creando archivo ZIP...")
            zip_path = os.path.join(temp_dir, f"backup_completo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip")
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
                new_data={"tipo_backup": "completo", "tablas_incluidas": tablas},
                details=f"Backup completo del sistema realizado con {len(tablas)} tablas"
            )
            
            # Leer el archivo ZIP y retornarlo
            print("Leyendo archivo ZIP para respuesta...")
            with open(zip_path, 'rb') as f:
                zip_content = f.read()
            
            print(f"✅ Archivo ZIP leído: {len(zip_content)} bytes")
            
            # Limpiar archivos temporales
            print("Limpiando archivos temporales...")
            shutil.rmtree(temp_dir)
            
            print("✅ BACKUP COMPLETADO EXITOSAMENTE")
            return Response(
                content=zip_content,
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename=backup_completo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
                }
            )
            
        except Exception as e:
            print(f"❌ Error durante el procesamiento: {e}")
            # Limpiar en caso de error
            shutil.rmtree(temp_dir)
            raise e
            
    except Exception as e:
        print(f"❌ Error al crear backup completo: {e}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al crear backup completo: {str(e)}")



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

