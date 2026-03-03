import asyncio
from sqlalchemy import text, select
from database import get_session
from models import Referente

async def test_lookup(user_id):
    async for session in get_session():
        print(f"Buscando Referente para usuario_id={user_id}")
        
        # 1. Usando SQL directo (recomprobación)
        sql = text("SELECT id, id_usuario_sistema, nombre_referente FROM electoral.referentes WHERE id_usuario_sistema = :uid")
        res1 = await session.execute(sql, {"uid": user_id})
        row1 = res1.fetchone()
        print(f"  SQL Row: {row1}")
        
        # 2. Usando el modelo de SQLAlchemy
        stmt = select(Referente).where(Referente.id_usuario_sistema == user_id)
        res2 = await session.execute(stmt)
        ref = res2.scalar_one_or_none()
        print(f"  SQLAlchemy Result: {ref}")
        if ref:
            print(f"  ✅ Referente encontrado: ID={ref.id}, Nombre={ref.nombre_referente}")
        else:
            print(f"  ❌ Referente NO ENCONTRADO para user_id {user_id}")
        break

if __name__ == "__main__":
    asyncio.run(test_lookup(3))
