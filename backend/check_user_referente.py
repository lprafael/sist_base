import asyncio
from sqlalchemy import text
from database import get_session

async def check_referente_connection(user_id):
    async for session in get_session():
        try:
            print(f"Buscando conexión para usuario_id={user_id}")
            
            # Verificar en sistema.usuarios
            u = await session.execute(text(f"SELECT id, username, rol, nombre_completo FROM sistema.usuarios WHERE id={user_id}"))
            user = u.fetchone()
            if not user:
                print(f"❌ Error: El usuario_id={user_id} no existe en sistema.usuarios")
                return
            
            print(f"✅ Usuario encontrado: ID={user.id}, Username={user.username}, Rol={user.rol}, Nombre={user.nombre_completo}")
            
            # Verificar en electoral.referentes
            r = await session.execute(text(f"SELECT * FROM electoral.referentes WHERE id_usuario_sistema={user_id}"))
            referente = r.fetchone()
            
            if referente:
                print(f"✅ Referente encontrado en electoral.referentes: ID={referente.id}, Nombre={referente.nombre_referente}, Rol={referente.rol_electoral}")
            else:
                print(f"❌ Error: El usuario_id={user_id} NO tiene un registro correspondiente en electoral.referentes.")
                print(f"💡 Intentando vincularlo ahora mismo...")
                
                # Crear el referente si no existe
                await session.execute(text(f"""
                    INSERT INTO electoral.referentes (id_usuario_sistema, nombre_referente, rol_electoral, activo)
                    VALUES ({user.id}, '{user.nombre_completo}', '{user.rol}', true)
                """))
                await session.commit()
                print(f"✅ Registro creado exitosamente en electoral.referentes para {user.nombre_completo}")
                
        except Exception as e:
            print(f"❌ Error durante el chequeo: {str(e)}")
        finally:
            break

if __name__ == "__main__":
    import os
    # El usuario ID según el log es 3
    asyncio.run(check_referente_connection(3))
