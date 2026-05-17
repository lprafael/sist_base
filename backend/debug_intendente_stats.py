import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select, func
from dotenv import load_dotenv
from models import Usuario, Referente, PosibleVotante

load_dotenv()

async def run():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    async_session = sessionmaker(engine, class_=AsyncSession)
    async with async_session() as s:
        # 1. Buscar el usuario intendente_test
        res_u = await s.execute(select(Usuario).where(Usuario.username == 'intendente_test'))
        user = res_u.scalar()
        if not user:
            print("User intendente_test not found")
            return
            
        print(f"User: {user.username} (ID: {user.id}, Role: {user.rol})")
        
        from hierarchy_utils import get_visible_referente_ids
        referente_ids = await get_visible_referente_ids(user.id, user.rol, s)
        print(f"Visible Referente IDs: {referente_ids}")
        
        # 2. Conteo de Posibles Votantes para esos IDs
        stmt_count = select(func.count(PosibleVotante.id)).where(PosibleVotante.id_referente.in_(referente_ids))
        count = (await s.execute(stmt_count)).scalar() or 0
        print(f"Total Posibles Votantes (Bruto) en DB para estos IDs: {count}")
        
        # 3. Conteo de Unicos
        stmt_unicos = select(func.count(func.distinct(PosibleVotante.cedula_votante))).where(PosibleVotante.id_referente.in_(referente_ids))
        unicos = (await s.execute(stmt_unicos)).scalar() or 0
        print(f"Total Unicos en DB para estos IDs: {unicos}")
        
        # 4. Ver desglose por referente
        res_breakdown = await s.execute(
            select(PosibleVotante.id_referente, func.count(PosibleVotante.id))
            .where(PosibleVotante.id_referente.in_(referente_ids))
            .group_by(PosibleVotante.id_referente)
        )
        print("Desglose por referente visible:")
        for r in res_breakdown.fetchall():
            print(f"Referente {r[0]}: {r[1]} votantes")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
