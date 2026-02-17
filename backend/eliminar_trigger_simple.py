"""
Script simplificado para eliminar el trigger obsoleto trg_actualizar_estado_pagare
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def eliminar_trigger():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("\n" + "="*60)
            print("🔧 ELIMINANDO TRIGGER OBSOLETO")
            print("="*60 + "\n")
            
            # Verificar si existe
            result = await session.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_trigger t
                    JOIN pg_class c ON t.tgrelid = c.oid
                    JOIN pg_namespace n ON c.relnamespace = n.oid
                    WHERE n.nspname = 'playa'
                      AND c.relname = 'pagos'
                      AND t.tgname = 'trg_actualizar_estado_pagare'
                )
            """))
            trigger_exists = result.scalar()
            
            if not trigger_exists:
                print("✅ El trigger ya no existe. No es necesario eliminarlo.\n")
            else:
                print("⚠️  Trigger encontrado. Eliminando...\n")
                
                # Eliminar trigger
                await session.execute(text(
                    "DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON playa.pagos;"
                ))
                await session.commit()
                
                print("✅ Trigger eliminado exitosamente\n")
            
            # Mostrar triggers restantes
            result = await session.execute(text("""
                SELECT t.tgname, p.proname,
                       CASE t.tgenabled WHEN 'O' THEN 'ENABLED' ELSE 'DISABLED' END AS status
                FROM pg_trigger t
                JOIN pg_class c ON t.tgrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                LEFT JOIN pg_proc p ON t.tgfoid = p.oid
                WHERE n.nspname = 'playa' AND c.relname = 'pagos' AND NOT t.tgisinternal
            """))
            
            triggers = result.fetchall()
            
            print("="*60)
            print("📊 TRIGGERS RESTANTES EN 'playa.pagos'")
            print("="*60)
            
            if triggers:
                for t in triggers:
                    print(f"\n  • {t[0]}")
                    print(f"    Función: {t[1]}()")
                    print(f"    Estado: {t[2]}")
            else:
                print("\n  ✅ No hay triggers en la tabla 'pagos'\n")
            
            print("\n" + "="*60)
            print("✅ OPERACIÓN COMPLETADA")
            print("="*60 + "\n")
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}\n")
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(eliminar_trigger())
