#!/usr/bin/env python3
"""
Script para inicializar la base de datos con todas las tablas y datos por defecto
"""

import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from models import Base, Usuario, Rol, Permiso, ParametroSistema, ConfiguracionEmail
from security import get_password_hash
from datetime import datetime, timedelta

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no está configurada en el archivo .env")

async def init_database():
    """Inicializa la base de datos con todas las tablas y datos por defecto"""
    
    # Crear engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    # Crear todas las tablas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Crear sesión
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Verificar si ya existen datos
            existing_admin = await session.get(Usuario, 1)
            if existing_admin:
                print("La base de datos ya está inicializada.")
                return
            
            print("Inicializando base de datos...")
            
            # ===== CREAR PERMISOS POR DEFECTO =====
            print("Creando permisos...")
            permisos = [
                # Permisos para Gremios
                Permiso(nombre="gremios_read", descripcion="Leer gremios", modulo="gremios", accion="read"),
                Permiso(nombre="gremios_write", descripcion="Crear/editar gremios", modulo="gremios", accion="write"),
                Permiso(nombre="gremios_delete", descripcion="Eliminar gremios", modulo="gremios", accion="delete"),
                Permiso(nombre="gremios_export", descripcion="Exportar gremios", modulo="gremios", accion="export"),
                
                # Permisos para EOTs
                Permiso(nombre="eots_read", descripcion="Leer EOTs", modulo="eots", accion="read"),
                Permiso(nombre="eots_write", descripcion="Crear/editar EOTs", modulo="eots", accion="write"),
                Permiso(nombre="eots_delete", descripcion="Eliminar EOTs", modulo="eots", accion="delete"),
                Permiso(nombre="eots_export", descripcion="Exportar EOTs", modulo="eots", accion="export"),
                
                # Permisos para Feriados
                Permiso(nombre="feriados_read", descripcion="Leer feriados", modulo="feriados", accion="read"),
                Permiso(nombre="feriados_write", descripcion="Crear/editar feriados", modulo="feriados", accion="write"),
                Permiso(nombre="feriados_delete", descripcion="Eliminar feriados", modulo="feriados", accion="delete"),
                Permiso(nombre="feriados_export", descripcion="Exportar feriados", modulo="feriados", accion="export"),
                
                # Permisos para Usuarios
                Permiso(nombre="usuarios_read", descripcion="Leer usuarios", modulo="usuarios", accion="read"),
                Permiso(nombre="usuarios_write", descripcion="Crear/editar usuarios", modulo="usuarios", accion="write"),
                Permiso(nombre="usuarios_delete", descripcion="Eliminar usuarios", modulo="usuarios", accion="delete"),
                Permiso(nombre="usuarios_manage", descripcion="Gestionar usuarios", modulo="usuarios", accion="manage"),
                
                # Permisos para Roles
                Permiso(nombre="roles_read", descripcion="Leer roles", modulo="roles", accion="read"),
                Permiso(nombre="roles_write", descripcion="Crear/editar roles", modulo="roles", accion="write"),
                Permiso(nombre="roles_delete", descripcion="Eliminar roles", modulo="roles", accion="delete"),
                Permiso(nombre="roles_manage", descripcion="Gestionar roles", modulo="roles", accion="manage"),
                
                # Permisos para Auditoría
                Permiso(nombre="auditoria_read", descripcion="Ver logs de auditoría", modulo="auditoria", accion="read"),
                Permiso(nombre="auditoria_export", descripcion="Exportar logs de auditoría", modulo="auditoria", accion="export"),
                
                # Permisos para Sistema
                Permiso(nombre="sistema_config", descripcion="Configurar sistema", modulo="sistema", accion="config"),
                Permiso(nombre="sistema_backup", descripcion="Gestionar backups", modulo="sistema", accion="backup"),
                Permiso(nombre="sistema_reportes", descripcion="Generar reportes", modulo="sistema", accion="reportes"),
            ]
            
            for permiso in permisos:
                session.add(permiso)
            await session.commit()
            
            # Obtener los permisos creados
            permisos_creados = await session.execute(
                text("SELECT id, nombre FROM permisos")
            )
            permisos_dict = {nombre: id_ for id_, nombre in permisos_creados.all()}
            
            # ===== CREAR ROLES POR DEFECTO =====
            print("Creando roles...")
            
            # Rol Admin - Todos los permisos
            rol_admin = Rol(
                nombre="admin",
                descripcion="Administrador del sistema con acceso completo"
            )
            session.add(rol_admin)
            await session.commit()
            
            # Asignar todos los permisos al admin
            for permiso_id in permisos_dict.values():
                await session.execute(
                    text("INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (:rol_id, :permiso_id)"),
                    {"rol_id": rol_admin.id, "permiso_id": permiso_id}
                )
            
            # Rol Manager - Permisos de gestión
            rol_manager = Rol(
                nombre="manager",
                descripcion="Gerente con permisos de gestión y lectura"
            )
            session.add(rol_manager)
            await session.commit()
            
            # Permisos para manager
            permisos_manager = [
                "gremios_read", "gremios_write", "gremios_export",
                "eots_read", "eots_write", "eots_export",
                "feriados_read", "feriados_write", "feriados_export",
                "usuarios_read", "auditoria_read"
            ]
            
            for permiso_nombre in permisos_manager:
                if permiso_nombre in permisos_dict:
                    await session.execute(
                        text("INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (:rol_id, :permiso_id)"),
                        {"rol_id": rol_manager.id, "permiso_id": permisos_dict[permiso_nombre]}
                    )
            
            # Rol User - Permisos básicos
            rol_user = Rol(
                nombre="user",
                descripcion="Usuario con permisos básicos de lectura y escritura"
            )
            session.add(rol_user)
            await session.commit()
            
            # Permisos para user
            permisos_user = [
                "gremios_read", "gremios_write",
                "eots_read", "eots_write",
                "feriados_read", "feriados_write"
            ]
            
            for permiso_nombre in permisos_user:
                if permiso_nombre in permisos_dict:
                    await session.execute(
                        text("INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (:rol_id, :permiso_id)"),
                        {"rol_id": rol_user.id, "permiso_id": permisos_dict[permiso_nombre]}
                    )
            
            # Rol Viewer - Solo lectura
            rol_viewer = Rol(
                nombre="viewer",
                descripcion="Visualizador con permisos de solo lectura"
            )
            session.add(rol_viewer)
            await session.commit()
            
            # Permisos para viewer
            permisos_viewer = [
                "gremios_read", "eots_read", "feriados_read"
            ]
            
            for permiso_nombre in permisos_viewer:
                if permiso_nombre in permisos_dict:
                    await session.execute(
                        text("INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (:rol_id, :permiso_id)"),
                        {"rol_id": rol_viewer.id, "permiso_id": permisos_dict[permiso_nombre]}
                    )
            
            await session.commit()
            
            # ===== CREAR USUARIO ADMINISTRADOR =====
            print("Creando usuario administrador...")
            
            admin_password = "Admin123!"
            admin_user = Usuario(
                username="admin",
                email="admin@vmt-cid.com",
                hashed_password=get_password_hash(admin_password),
                nombre_completo="Administrador del Sistema",
                rol="admin",
                activo=True,
                fecha_creacion=datetime.utcnow()
            )
            session.add(admin_user)
            await session.commit()
            
            # Asignar rol admin al usuario admin
            await session.execute(
                text("INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (:usuario_id, :rol_id)"),
                {"usuario_id": admin_user.id, "rol_id": rol_admin.id}
            )
            
            # ===== CREAR PARÁMETROS DEL SISTEMA =====
            print("Creando parámetros del sistema...")
            
            parametros = [
                # Parámetros de seguridad
                ParametroSistema(
                    codigo="SESSION_TIMEOUT_MINUTES",
                    nombre="Tiempo de sesión (minutos)",
                    valor="480",
                    tipo="integer",
                    descripcion="Tiempo de expiración de sesión en minutos",
                    categoria="seguridad",
                    editable=True
                ),
                ParametroSistema(
                    codigo="MAX_LOGIN_ATTEMPTS",
                    nombre="Máximo intentos de login",
                    valor="5",
                    tipo="integer",
                    descripcion="Número máximo de intentos de login antes del bloqueo",
                    categoria="seguridad",
                    editable=True
                ),
                ParametroSistema(
                    codigo="PASSWORD_EXPIRY_DAYS",
                    nombre="Expiración de contraseña (días)",
                    valor="90",
                    tipo="integer",
                    descripcion="Días antes de que expire la contraseña",
                    categoria="seguridad",
                    editable=True
                ),
                
                # Parámetros de email
                ParametroSistema(
                    codigo="EMAIL_ENABLED",
                    nombre="Email habilitado",
                    valor="true",
                    tipo="boolean",
                    descripcion="Habilitar envío de emails",
                    categoria="email",
                    editable=True
                ),
                ParametroSistema(
                    codigo="EMAIL_FROM_NAME",
                    nombre="Nombre del remitente",
                    valor="Sistema VMT-CID",
                    tipo="string",
                    descripcion="Nombre que aparece como remitente en los emails",
                    categoria="email",
                    editable=True
                ),
                
                # Parámetros del sistema
                ParametroSistema(
                    codigo="SYSTEM_NAME",
                    nombre="Nombre del sistema",
                    valor="Sistema de Catálogos VMT-CID",
                    tipo="string",
                    descripcion="Nombre del sistema",
                    categoria="sistema",
                    editable=True
                ),
                ParametroSistema(
                    codigo="SYSTEM_VERSION",
                    nombre="Versión del sistema",
                    valor="1.0.0",
                    tipo="string",
                    descripcion="Versión actual del sistema",
                    categoria="sistema",
                    editable=False
                ),
                ParametroSistema(
                    codigo="BACKUP_RETENTION_DAYS",
                    nombre="Retención de backups (días)",
                    valor="30",
                    tipo="integer",
                    descripcion="Días que se mantienen los backups",
                    categoria="sistema",
                    editable=True
                ),
            ]
            
            for parametro in parametros:
                session.add(parametro)
            
            await session.commit()
            
            print("Base de datos inicializada correctamente!")
            print(f"Usuario administrador creado:")
            print(f"   Usuario: admin")
            print(f"   Contraseña: {admin_password}")
            print(f"   Email: admin@vmt-cid.com")
            print(f"   Rol: admin")
            print()
            print("Roles creados:")
            print("   - admin: Acceso completo al sistema")
            print("   - manager: Gestión y lectura")
            print("   - user: Operaciones básicas")
            print("   - viewer: Solo lectura")
            print()
            print("Permisos configurados para cada rol")
            print("Parámetros del sistema configurados")
            
        except Exception as e:
            await session.rollback()
            print(f"Error al inicializar la base de datos: {e}")
            raise
        finally:
            await session.close()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_database()) 