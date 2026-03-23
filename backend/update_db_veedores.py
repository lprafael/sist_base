import asyncio
from sqlalchemy import text
from database import get_session

async def apply_db_changes():
    print("🚀 Iniciando actualización de estructura de base de datos...")
    async for session in get_session():
        try:
            # 1. Actualizar tabla sistema.usuarios
            print("--- Verificando esquema sistema.usuarios ---")
            queries_usuarios = [
                "ALTER TABLE sistema.usuarios ADD COLUMN IF NOT EXISTS veedor_local_id INTEGER",
                "ALTER TABLE sistema.usuarios ADD COLUMN IF NOT EXISTS veedor_seccional_id INTEGER",
                "ALTER TABLE sistema.usuarios ADD COLUMN IF NOT EXISTS veedor_mesas JSONB"
            ]
            for q in queries_usuarios:
                await session.execute(text(q))
            
            # 2. Actualizar tabla electoral.posibles_votantes
            print("--- Verificando esquema electoral.posibles_votantes ---")
            queries_votantes = [
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS fecha_destino TIMESTAMP",
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS veedor_id INTEGER REFERENCES sistema.usuarios(id)",
                "ALTER TABLE electoral.posibles_votantes ADD COLUMN IF NOT EXISTS fecha_voto TIMESTAMP"
            ]
            for q in queries_votantes:
                await session.execute(text(q))

            await session.commit()
            print("✅ Estructura de base de datos actualizada exitosamente.")
            break # Salir del generador
        except Exception as e:
            print(f"❌ Error al actualizar la base de datos: {e}")
            await session.rollback()
            break

if __name__ == "__main__":
    asyncio.run(apply_db_changes())
