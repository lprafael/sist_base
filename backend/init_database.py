#!/usr/bin/env python3
# Para ejecutar este script:
# python init_database.py              # Inicializa todo (sistema + playa + migraciones)
# python init_database.py --playa     # Solo schema playa + migraciones
# python init_database.py --sistema    # Solo schema sistema
#
# Para reset total (borrar sistema y playa) antes de reinicializar:
#   python revert_init_database.py
#   python init_database.py
"""
Script para inicializar la base de datos con todas las tablas y datos por defecto.
Incluye: initBD.sql y migraciones (update_ventas_mora, update_ventas_gracia,
update_vendedores, update_productos_entrega).
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select
from models import Base, Usuario, Rol, Permiso, ParametroSistema, ConfiguracionEmail
from models_playa import CategoriaVehiculo, TipoGastoProducto, TipoGastoEmpresa, ConfigCalificacion
from security import get_password_hash
from datetime import datetime, timedelta

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no está configurada en el archivo .env")

async def init_sistema(session, engine):
    """Inicializa el schema sistema con usuarios, roles, permisos y configuración"""
    
    print("\n" + "="*60)
    print("INICIALIZANDO SCHEMA SISTEMA")
    print("="*60 + "\n")
    
    # Crear schemas (playa debe existir porque Base.metadata incluye tablas playa, ej. vendedores)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS sistema"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS playa"))
        await conn.run_sync(Base.metadata.create_all)
    
    # Verificar si ya existen datos
    result = await session.execute(select(Usuario).where(Usuario.id == 1))
    existing_admin = result.scalar_one_or_none()
    if existing_admin:
        print("⚠️  El schema sistema ya está inicializado.")
        return
    
    # ===== CREAR PERMISOS POR DEFECTO =====
    print("📋 Creando permisos...")
    permisos = [
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
        text("SELECT id, nombre FROM sistema.permisos")
    )
    permisos_dict = {nombre: id_ for id_, nombre in permisos_creados.all()}
    
    # ===== CREAR ROLES POR DEFECTO =====
    print("👥 Creando roles...")
    
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
            text("INSERT INTO sistema.rol_permiso (rol_id, permiso_id) VALUES (:rol_id, :permiso_id)"),
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
        "usuarios_read", "auditoria_read", "sistema_backup"
    ]
    
    for permiso_nombre in permisos_manager:
        if permiso_nombre in permisos_dict:
            await session.execute(
                text("INSERT INTO sistema.rol_permiso (rol_id, permiso_id) VALUES (:rol_id, :permiso_id)"),
                {"rol_id": rol_manager.id, "permiso_id": permisos_dict[permiso_nombre]}
            )
    
    # Rol User - Permisos básicos
    rol_user = Rol(
        nombre="user",
        descripcion="Usuario con permisos básicos de lectura y escritura"
    )
    session.add(rol_user)
    await session.commit()
    
    # Rol Viewer - Solo lectura
    rol_viewer = Rol(
        nombre="viewer",
        descripcion="Visualizador con permisos de solo lectura"
    )
    session.add(rol_viewer)
    await session.commit()
    
    await session.commit()
    
    # ===== CREAR USUARIO ADMINISTRADOR =====
    print("🔐 Creando usuario administrador...")
    
    admin_password = "Admin123!"
    admin_user = Usuario(
        username="admin",
        email="rafadevstack@gmail.com",
        hashed_password=get_password_hash(admin_password),
        nombre_completo="Administrador de Poliverso",
        rol="admin",
        activo=True,
        fecha_creacion=datetime.utcnow()
    )
    session.add(admin_user)
    await session.commit()
    
    # Asignar rol admin al usuario admin
    await session.execute(
        text("INSERT INTO sistema.usuario_rol (usuario_id, rol_id) VALUES (:usuario_id, :rol_id)"),
        {"usuario_id": admin_user.id, "rol_id": rol_admin.id}
    )
    
    # ===== CREAR PARÁMETROS DEL SISTEMA =====
    print("⚙️  Creando parámetros del sistema...")
    
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
            valor="Sistema de Gestión de Vehículos",
            tipo="string",
            descripcion="Nombre que aparece como remitente en los emails",
            categoria="email",
            editable=True
        ),
        
        # Parámetros del sistema
        ParametroSistema(
            codigo="SYSTEM_NAME",
            nombre="Nombre del sistema",
            valor="Sistema de Gestión de Vehículos",
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
    
    # ===== CREAR CONFIGURACIÓN DE EMAIL POR DEFECTO =====
    print("📧 Creando configuración de email por defecto...")
    config_email = ConfiguracionEmail(
        nombre="Configuración Principal",
        host="smtp.example.com",
        puerto=587,
        username="user@example.com",
        password="password",
        use_tls=True,
        from_email="no-reply@example.com",
        activo=False
    )
    session.add(config_email)
    await session.commit()
    
    print("\n✅ Schema sistema inicializado correctamente!")
    print(f"\n📝 Credenciales de acceso:")
    print(f"   Usuario: admin")
    print(f"   Contraseña: {admin_password}")
    print(f"   Email: rafadevstack@gmail.com")
    print(f"   Rol: admin")
    print(f"\n👥 Roles creados:")
    print("   - admin: Acceso completo al sistema")
    print("   - manager: Gestión y lectura")
    print("   - user: Operaciones básicas")
    print("   - viewer: Solo lectura")


async def init_playa(engine):
    """Inicializa el schema playa ejecutando el archivo initBD.sql"""
    
    print("\n" + "="*60)
    print("INICIALIZANDO SCHEMA PLAYA")
    print("="*60 + "\n")
    
    # Buscar el archivo initBD.sql
    sql_file = Path(__file__).parent / "initBD.sql"
    
    if not sql_file.exists():
        print(f"❌ Error: No se encontró el archivo {sql_file}")
        return
    
    print(f"📄 Leyendo archivo: {sql_file}")
    
    # Leer el contenido del archivo SQL
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Usar psycopg2 para ejecutar el SQL completo
    # Extraer la URL de conexión sin el prefijo asyncpg
    import re
    from urllib.parse import urlparse
    
    # Convertir la URL de asyncpg a psycopg2
    db_url = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    # Importar psycopg2
    try:
        import psycopg2
    except ImportError:
        print("❌ Error: psycopg2 no está instalado. Instalando...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2
    
    # Ejecutar el SQL usando psycopg2
    try:
        # Parsear la URL para obtener los componentes
        parsed = urlparse(db_url)
        
        print("🔧 Conectando a la base de datos...")
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],  # Remover el / inicial
            user=parsed.username,
            password=parsed.password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("🔧 Ejecutando script SQL...")
        cursor.execute(sql_content)
        print("✅ initBD.sql ejecutado correctamente.")

        # Migraciones posteriores (columnas y tablas añadidas con el tiempo)
        migraciones = [
            "update_ventas_mora.sql",
            "update_ventas_gracia.sql",
            "update_vendedores.sql",
            "update_productos_entrega.sql",
            "migration_add_precio_financiado_sugerido.sql",
            "update_escribanias.sql",
            "migration_documentos_importacion.sql",
        ]
        for nombre in migraciones:
            sql_path = Path(__file__).parent / nombre
            if sql_path.exists():
                print(f"📄 Ejecutando migración: {nombre}")
                with open(sql_path, "r", encoding="utf-8") as f:
                    cursor.execute(f.read())
            else:
                print(f"⚠️  No encontrado (se omite): {nombre}")

        cursor.close()
        conn.close()

        print("✅ Schema playa inicializado correctamente!")
        print("   - Tablas creadas")
        print("   - Datos iniciales insertados")
        print("   - Vistas y funciones creadas")
        print("   - Migraciones aplicadas")

    except Exception as e:
        print(f"❌ Error al ejecutar el script SQL: {e}")
        import traceback
        traceback.print_exc()
        raise


async def init_database(modo="all"):
    """
    Inicializa la base de datos según el modo especificado
    
    Args:
        modo: "all" (todo), "sistema" (solo sistema), "playa" (solo playa)
    """
    
    print("\n" + "="*60)
    print("INICIALIZACIÓN DE BASE DE DATOS - POLIVERSO")
    print("="*60)
    print(f"Modo: {modo.upper()}")
    print("="*60 + "\n")
    
    # Crear engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        if modo in ["all", "sistema"]:
            # Crear sesión para sistema
            async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            async with async_session() as session:
                try:
                    await init_sistema(session, engine)
                except Exception as e:
                    await session.rollback()
                    print(f"❌ Error al inicializar schema sistema: {e}")
                    raise
                finally:
                    await session.close()
        
        if modo in ["all", "playa"]:
            await init_playa(engine)
        
        print("\n" + "="*60)
        print("✅ INICIALIZACIÓN COMPLETADA EXITOSAMENTE")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error durante la inicialización: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    # Determinar el modo según los argumentos
    modo = "all"  # Por defecto inicializa todo
    
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg == "--playa":
            modo = "playa"
        elif arg == "--sistema":
            modo = "sistema"
        elif arg in ["--help", "-h"]:
            print("\nUso:")
            print("  python init_database.py              # Inicializa todo (sistema + playa + migraciones)")
            print("  python init_database.py --playa      # Solo schema playa + migraciones")
            print("  python init_database.py --sistema   # Solo schema sistema")
            print("  python init_database.py --help      # Muestra esta ayuda")
            print("\nMigraciones aplicadas tras initBD.sql:")
            print("  update_ventas_mora.sql, update_ventas_gracia.sql,")
            print("  update_vendedores.sql, update_productos_entrega.sql")
            print("\nPara reset total antes de reinicializar:")
            print("  python revert_init_database.py")
            print()
            sys.exit(0)
        else:
            print(f"❌ Argumento desconocido: {arg}")
            print("Usa --help para ver las opciones disponibles")
            sys.exit(1)
    
    asyncio.run(init_database(modo))