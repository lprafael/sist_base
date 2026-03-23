import asyncio
from sqlalchemy import text
from database import get_session

async def apply_db_changes():
    print("🚀 Verificando integridad de la estructura logistica...")
    async for session in get_session():
        try:
            # Usuarios
            q_u = [
                "ALTER TABLE sistema.usuarios ADD COLUMN IF NOT EXISTS veedor_local_id INTEGER",
                "ALTER TABLE sistema.usuarios ADD COLUMN IF NOT EXISTS veedor_seccional_id INTEGER",
                "ALTER TABLE sistema.usuarios ADD COLUMN IF NOT EXISTS veedor_mesas JSONB"
            ]
            for q in q_u: await session.execute(text(q))
            
            # Posibles Votantes
            q_v = [
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS logistica_estado VARCHAR(20) DEFAULT 'pendiente'",
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS chofer_id INTEGER",
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS veedor_id INTEGER REFERENCES sistema.usuarios(id)",
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS fecha_traslado TIMESTAMP",
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS fecha_destino TIMESTAMP",
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS fecha_voto TIMESTAMP"
            ]
            for q in q_v: await session.execute(text(q))

            await session.commit()
            print("✅ Estructura final verificada y aplicada.")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            await session.rollback()
            break

if __name__ == "__main__":
    asyncio.run(apply_db_changes())
