"""
Script para eliminar el trigger obsoleto trg_actualizar_estado_pagare
de forma segura y registrar la acción en auditoría.
"""
import asyncio
import sys
from pathlib import Path

# Agregar el directorio backend al path para importar los módulos
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from datetime import datetime
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def eliminar_trigger():
    """Elimina el trigger obsoleto y registra en auditoría"""
    
    # Crear engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("\n" + "="*60)
            print("🔧 ELIMINANDO TRIGGER OBSOLETO")
            print("="*60 + "\n")
            
            # 1. Verificar si existe el trigger
            result = await session.execute(text("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM pg_trigger t
                    JOIN pg_class c ON t.tgrelid = c.oid
                    JOIN pg_namespace n ON c.relnamespace = n.oid
                    WHERE n.nspname = 'playa'
                      AND c.relname = 'pagos'
                      AND t.tgname = 'trg_actualizar_estado_pagare'
                ) AS trigger_exists
            """))
            trigger_exists = result.scalar()
            
            if not trigger_exists:
                print("✅ El trigger 'trg_actualizar_estado_pagare' ya no existe.")
                print("   No es necesario eliminarlo.\n")
                return
            
            print("⚠️  El trigger 'trg_actualizar_estado_pagare' está ACTIVO")
            print("   Procediendo a eliminarlo...\n")
            
            # 2. Eliminar el trigger
            await session.execute(text("""
                DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON playa.pagos;
            """))
            
            print("✅ Trigger eliminado exitosamente\n")
            
            # 3. Registrar en auditoría
            await session.execute(text("""
                INSERT INTO auditoria (
                    username,
                    user_id,
                    action,
                    table_name,
                    previous_data,
                    new_data,
                    details,
                    timestamp
                ) VALUES (
                    'system',
                    NULL,
                    'delete',
                    'pg_trigger',
                    '{"trigger_name": "trg_actualizar_estado_pagare", "table": "playa.pagos"}',
                    NULL,
                    'Trigger obsoleto eliminado. La lógica de estados ahora se maneja desde la aplicación. Eliminado por script de mantenimiento.',
                    :timestamp
                )
            """), {"timestamp": datetime.now()})
            
            print("📝 Acción registrada en auditoría\n")
            
            # 4. Commit
            await session.commit()
            
            # 5. Verificar triggers restantes
            result = await session.execute(text("""
                SELECT 
                    t.tgname AS trigger_name,
                    p.proname AS function_name,
                    CASE t.tgenabled
                        WHEN 'O' THEN 'ENABLED'
                        WHEN 'D' THEN 'DISABLED'
                    END AS status
                FROM pg_trigger t
                JOIN pg_class c ON t.tgrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                LEFT JOIN pg_proc p ON t.tgfoid = p.oid
                WHERE n.nspname = 'playa'
                  AND c.relname = 'pagos'
                  AND NOT t.tgisinternal
            """))
            
            triggers = result.fetchall()
            
            print("="*60)
            print("📊 TRIGGERS RESTANTES EN TABLA 'playa.pagos'")
            print("="*60)
            
            if triggers:
                for trigger in triggers:
                    print(f"\n  • {trigger.trigger_name}")
                    print(f"    Función: {trigger.function_name}()")
                    print(f"    Estado: {trigger.status}")
            else:
                print("\n  ✅ No hay triggers activos en la tabla 'pagos'\n")
            
            print("\n" + "="*60)
            print("✅ OPERACIÓN COMPLETADA EXITOSAMENTE")
            print("="*60 + "\n")
            print("La lógica de actualización de estados de pagarés ahora")
            print("se maneja completamente desde el código de la aplicación.")
            print("\n")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ ERROR: {str(e)}\n")
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(eliminar_trigger())
