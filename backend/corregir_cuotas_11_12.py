"""
Script para corregir las cuotas 11 y 12 del cliente 4933823
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

async def corregir_cuotas():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # ID 4918 (Cuota 11) y ID 4919 (Cuota 12)
        print("\n🔧 CORRIGIENDO CUOTAS 11 Y 12...")
        
        # 1. Obtener ID de estado PAGADO
        res = await session.execute(text("SELECT id_estado FROM playa.estados WHERE nombre = 'PAGADO'"))
        id_pagado = res.scalar()
        
        # 2. Corregir Cuota 11 (Desmarcar cancelado para mostrar botón)
        await session.execute(text("""
            UPDATE playa.pagares 
            SET cancelado = False, id_estado = :id_pagado 
            WHERE id_pagare = 4918
        """), {"id_pagado": id_pagado})
        
        # 3. Corregir Cuota 12 (Fijar estado y desmarcar cancelado)
        await session.execute(text("""
            UPDATE playa.pagares 
            SET cancelado = False, id_estado = :id_pagado 
            WHERE id_pagare = 4919
        """), {"id_pagado": id_pagado})
        
        await session.commit()
        print("✅ Cuotas 11 y 12 corregidas.")
        print("   - Se cambió el estado a PAGADO")
        print("   - Se quitó el bloqueo de 'CANCELADO'")
        print("   - Ahora el botón 'Agregar Pago' debería aparecer en el sistema.")
        
        await engine.dispose()

asyncio.run(corregir_cuotas())
