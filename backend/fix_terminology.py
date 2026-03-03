# fix_terminology.py
import asyncio
from sqlalchemy import text
from database import get_session

async def update_terminology():
    async for session in get_session():
        try:
            print("Iniciando migración de terminología: Caudillo -> Referente")
            
            # 1. Renombrar tabla y columnas
            sql_commands = [
                "ALTER TABLE electoral.caudillos RENAME TO referentes;",
                "ALTER TABLE electoral.referentes RENAME COLUMN nombre_caudillo TO nombre_referente;",
                "ALTER TABLE electoral.posibles_votantes RENAME COLUMN id_caudillo TO id_referente;",
                "ALTER TABLE electoral.referentes ALTER COLUMN rol_electoral SET DEFAULT 'referente';",
                "UPDATE sistema.usuarios SET rol = 'referente' WHERE rol = 'caudillo';",
                "UPDATE electoral.referentes SET rol_electoral = 'referente' WHERE rol_electoral = 'caudillo';",
                "COMMENT ON COLUMN electoral.referentes.id_superior IS 'Referente o candidato superior en la jerarquía (NULL si es el nivel más alto)';"
            ]
            
            for cmd in sql_commands:
                try:
                    await session.execute(text(cmd))
                    print(f"Ejecutado: {cmd}")
                except Exception as e:
                    print(f"Error en comando '{cmd}': {str(e)}")
            
            await session.commit()
            print("Migración completada exitosamente.")
        except Exception as e:
            await session.rollback()
            print(f"Error general en la migración: {str(e)}")
        finally:
            break

if __name__ == "__main__":
    asyncio.run(update_terminology())
