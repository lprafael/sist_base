
import asyncio
from database import get_session
from models import Referente
from sqlalchemy import update

async def fix_candidate_link():
    async for session in get_session():
        # Link user 6 to candidate 2 in the Referentes table
        print("Linking User 6 to Candidate 2...")
        stmt = (
            update(Referente)
            .where(Referente.id_usuario_sistema == 6)
            .values(id_candidato=2)
        )
        await session.execute(stmt)
        await session.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(fix_candidate_link())
