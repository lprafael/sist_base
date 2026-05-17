import asyncio
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select
from models import Usuario, Rol, Chofer, Candidato, Referente
from security import get_password_hash
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def create_test_users():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL no encontrada en .env")
        return

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            print("--- Preparando base de datos para usuarios de prueba detallados ---")
            
            # 1. Definir lista de usuarios
            test_users_data = [
                {"username": "intendente_test", "nombre": "Juan Intendente", "rol": "candidato_principal", "email": "intendente@test.com"},
                {"username": "referente_intendente_test", "nombre": "Pedro Referente Intendencia", "rol": "referente", "email": "ref_int@test.com"},
                {"username": "concejal_ind_test", "nombre": "Roberto Concejal Libre", "rol": "equipo_electoral", "email": "concejal_ind@test.com"},
                {"username": "concejal_dep_test", "nombre": "Marta Concejal Equipo", "rol": "equipo_electoral", "email": "concejal_dep@test.com"},
                {"username": "ref_concejal_dep_test", "nombre": "Lucas Referente de Marta", "rol": "referente", "email": "ref_marta@test.com"},
                {"username": "ref_concejal_ind_test", "nombre": "Sofia Referente de Roberto", "rol": "referente", "email": "ref_roberto@test.com"},
                {"username": "chofer_test", "nombre": "Carlos Chofer", "rol": "chofer", "email": "chofer@test.com"},
                {"username": "veedor_test", "nombre": "Vicente Veedor", "rol": "veedor", "email": "veedor@test.com"},
            ]
            
            usernames = [u["username"] for u in test_users_data]

            # 2. Limpieza (Idempotencia)
            print("Limpiando datos previos...")
            
            # Romper jerarquía primero para evitar errores de FK (caudillos_id_superior_fkey)
            # Primero quitamos el superior a CUALQUIER referente que apunte a nuestros usuarios de prueba
            await session.execute(text(f"""
                UPDATE electoral.referentes 
                SET id_superior = NULL 
                WHERE id_superior IN (
                    SELECT id FROM electoral.referentes 
                    WHERE id_usuario_sistema IN (SELECT id FROM sistema.usuarios WHERE username = ANY(:usernames))
                )
            """), {"usernames": usernames})

            # Ahora sí podemos limpiar nuestros propios registros de referentes
            await session.execute(text(f"""
                DELETE FROM electoral.referentes 
                WHERE id_usuario_sistema IN (SELECT id FROM sistema.usuarios WHERE username = ANY(:usernames))
            """), {"usernames": usernames})
            
            # Limpiar también los usuarios antiguos que ya no usamos pero pueden estorbar
            viejos_usernames = ["concejal_intendente", "concejal_libre"]
            await session.execute(text(f"""
                UPDATE electoral.referentes SET id_superior = NULL WHERE id_usuario_sistema IN (SELECT id FROM sistema.usuarios WHERE username = ANY(:viejos))
            """), {"viejos": viejos_usernames})
            await session.execute(text(f"""
                DELETE FROM electoral.referentes WHERE id_usuario_sistema IN (SELECT id FROM sistema.usuarios WHERE username = ANY(:viejos))
            """), {"viejos": viejos_usernames})
            await session.execute(text(f"""
                DELETE FROM sistema.usuarios WHERE username = ANY(:viejos)
            """), {"viejos": viejos_usernames})
            
            # Borrar choferes vinculados
            await session.execute(text(f"""
                DELETE FROM electoral.choferes 
                WHERE creado_por IN (SELECT id FROM sistema.usuarios WHERE username = ANY(:usernames))
                OR nombre = 'Carlos Chofer'
            """), {"usernames": usernames})
            
            # Borrar usuarios
            await session.execute(text(f"""
                DELETE FROM sistema.usuarios 
                WHERE username = ANY(:usernames)
            """), {"usernames": usernames})
            
            await session.commit()
            print("Limpieza completada.")

            # 3. Asegurar Roles
            roles_needed = ["candidato_principal", "equipo_electoral", "referente", "veedor", "chofer"]
            for role_name in roles_needed:
                result = await session.execute(select(Rol).where(Rol.nombre == role_name))
                if not result.scalar_one_or_none():
                    session.add(Rol(nombre=role_name, descripcion=f"Rol de {role_name} para pruebas"))
            await session.commit()

            # 4. Candidato de Prueba (Intendente)
            c_name = "Candidato Prueba 2026"
            result = await session.execute(select(Candidato).where(Candidato.nombre_candidato == c_name))
            candidato = result.scalar_one_or_none()
            if not candidato:
                candidato = Candidato(nombre_candidato=c_name, partido_movimiento="Movimiento SIGEL", municipio="ASUNCION", activo=True)
                session.add(candidato)
                await session.flush()

            pass_hash = get_password_hash("test1234")

            # Helper para crear usuario
            async def add_user(data):
                u = Usuario(
                    username=data["username"],
                    email=data["email"],
                    hashed_password=pass_hash,
                    nombre_completo=data["nombre"],
                    rol=data["rol"],
                    departamento_id=0,
                    distrito_id=0,
                    eleccion_id=1,
                    activo=True
                )
                session.add(u)
                await session.flush()
                return u

            # Helper para crear referente
            def add_ref(user, cand_id=None, superior_id=None, rol_e=None):
                r = Referente(
                    id_usuario_sistema=user.id,
                    id_candidato=cand_id,
                    id_superior=superior_id,
                    rol_electoral=rol_e or user.rol,
                    nombre_referente=user.nombre_completo,
                    activo=True
                )
                session.add(r)
                return r

            # --- CREACIÓN JERÁRQUICA ---

            # 1. Intendente
            u_intendente = await add_user(test_users_data[0])
            ref_intendente = add_ref(u_intendente, cand_id=candidato.id)
            await session.flush()

            # 2. Referente de Intendente (subordinado al Intendente)
            u_ref_int = await add_user(test_users_data[1])
            add_ref(u_ref_int, cand_id=candidato.id, superior_id=ref_intendente.id)

            # 3. Concejal Dependiente (subordinado al Intendente)
            u_conc_dep = await add_user(test_users_data[3])
            ref_conc_dep = add_ref(u_conc_dep, cand_id=candidato.id, superior_id=ref_intendente.id)
            await session.flush()

            # 4. Referente de Concejal Dependiente (subordinado a Marta)
            u_ref_conc_dep = await add_user(test_users_data[4])
            add_ref(u_ref_conc_dep, cand_id=candidato.id, superior_id=ref_conc_dep.id)

            # 5. Concejal Independiente (Sin superior, sin candidato intendente)
            u_conc_ind = await add_user(test_users_data[2])
            ref_conc_ind = add_ref(u_conc_ind)
            await session.flush()

            # 6. Referente de Concejal Independiente (subordinado a Roberto)
            u_ref_conc_ind = await add_user(test_users_data[5])
            add_ref(u_ref_conc_ind, superior_id=ref_conc_ind.id)

            # 7. Chofer
            u_chofer = await add_user(test_users_data[6])
            chofer_data = Chofer(
                nombre=u_chofer.nombre_completo,
                telefono="0981123456",
                vehiculo_info="Toyota Hilux - BAA 123",
                token_seguimiento="token_test_chofer_1",
                activo=True,
                creado_por=u_intendente.id,
                departamento_id=0,
                distrito_id=0
            )
            session.add(chofer_data)

            # 8. Veedor
            u_veedor = await add_user(test_users_data[7])
            u_veedor.veedor_mesas = {"mesas": [1, 2, 3]}

            await session.commit()
            print("[SUCCESS] Estructura de usuarios de prueba creada exitosamente.")
            for u in test_users_data:
                print(f"- {u['username']} | Pass: test1234")

        except Exception as e:
            await session.rollback()
            print(f"[ERROR]: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_test_users())
