import asyncio
from sqlalchemy import text
from database import get_session

async def sync_referentes():
    async for session in get_session():
        try:
            print("Sincronizando tabla electoral.referentes con sistema.usuarios...")
            
            # 1. Obtener usuarios huérfanos (que no tienen entrada en referentes)
            sql_orphans = """
                SELECT u.id, u.username, u.rol, u.nombre_completo
                FROM sistema.usuarios u
                LEFT JOIN electoral.referentes r ON u.id = r.id_usuario_sistema
                WHERE r.id IS NULL AND u.rol IN ('admin', 'intendente', 'concejal', 'referente')
            """
            res_orphans = await session.execute(text(sql_orphans))
            orphans = res_orphans.fetchall()
            
            if not orphans:
                print("No se encontraron usuarios sin perfil de referente. Todo OK.")
                return

            print(f"Se encontraron {len(orphans)} usuarios sin perfil de referente.")
            
            for u in orphans:
                print(f"Vinculando: {u.username} (ID: {u.id}, Rol: {u.rol})")
                sql_insert = """
                    INSERT INTO electoral.referentes (id_usuario_sistema, nombre_referente, rol_electoral, activo)
                    VALUES (:uid, :nom, :rol, true)
                """
                await session.execute(text(sql_insert), {"uid": u.id, "nom": u.nombre_completo, "rol": u.rol})
            
            await session.commit()
            print("Sincronización completada exitosamente.")
        except Exception as e:
            await session.rollback()
            print(f"Error durante la sincronización: {str(e)}")
        finally:
            break

if __name__ == "__main__":
    asyncio.run(sync_referentes())
