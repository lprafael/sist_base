#!/usr/bin/env python3
"""
Script de prueba para verificar el registro de logs de auditoría
"""

import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models import LogAuditoria, Gremio, EOT, Feriado
from audit_utils import log_audit_action

# Cargar variables de entorno
load_dotenv()

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no está configurada en el archivo .env")

async def test_audit_logs():
    """Prueba el registro de logs de auditoría"""
    
    # Crear engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    # Crear sesión
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("=== PRUEBA DE LOGS DE AUDITORÍA ===")
            
            # 1. Verificar si hay logs existentes
            result = await session.execute(select(LogAuditoria))
            logs_existentes = result.scalars().all()
            print(f"Logs existentes en la base de datos: {len(logs_existentes)}")
            
            # 2. Crear un log de prueba
            print("\n--- Creando log de prueba ---")
            await log_audit_action(
                session=session,
                username="test_user",
                user_id=1,
                action="test",
                table="test_table",
                record_id=999,
                new_data={"test": "data"},
                ip_address="127.0.0.1",
                user_agent="Test Script",
                details="Log de prueba creado por script"
            )
            
            # 3. Verificar que el log se creó
            result = await session.execute(select(LogAuditoria).order_by(LogAuditoria.id.desc()).limit(1))
            ultimo_log = result.scalar_one_or_none()
            
            if ultimo_log:
                print(f"✅ Log creado exitosamente:")
                print(f"   ID: {ultimo_log.id}")
                print(f"   Usuario: {ultimo_log.username}")
                print(f"   Acción: {ultimo_log.accion}")
                print(f"   Tabla: {ultimo_log.tabla}")
                print(f"   Fecha: {ultimo_log.fecha}")
                print(f"   Detalles: {ultimo_log.detalles}")
            else:
                print("❌ No se pudo crear el log")
            
            # 4. Verificar logs por tabla
            print("\n--- Verificando logs por tabla ---")
            for tabla in ["gremios", "eots", "feriados"]:
                result = await session.execute(
                    select(LogAuditoria).where(LogAuditoria.tabla == tabla)
                )
                logs_tabla = result.scalars().all()
                print(f"Logs para tabla '{tabla}': {len(logs_tabla)}")
            
            # 5. Verificar logs por acción
            print("\n--- Verificando logs por acción ---")
            for accion in ["create", "update", "delete"]:
                result = await session.execute(
                    select(LogAuditoria).where(LogAuditoria.accion == accion)
                )
                logs_accion = result.scalars().all()
                print(f"Logs de acción '{accion}': {len(logs_accion)}")
            
            print("\n=== PRUEBA COMPLETADA ===")
            
        except Exception as e:
            print(f"Error durante la prueba: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_audit_logs())
