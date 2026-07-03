import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from datetime import datetime, timedelta

# Asegurar path de importación
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from security import get_password_hash

async def run():
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no definida")
        sys.exit(1)

    # Mantenemos DATABASE_URL intacto porque host.docker.internal funciona

    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        print("Creando usuario organizador (artes marciales)...")
        # 1. Crear usuario organizador
        hashed_password = get_password_hash("Marcial2026!")
        q_user = text("""
            INSERT INTO sistema.usuarios (username, email, hashed_password, nombre_completo, rol, activo)
            VALUES ('org_marcial', 'artesmarciales@micancha.com', :pwd, 'Organizador Artes Marciales', 'organizador', true)
            ON CONFLICT (username) DO UPDATE SET hashed_password = EXCLUDED.hashed_password
            RETURNING id
        """)
        res = await conn.execute(q_user, {"pwd": hashed_password})
        usuario_id = res.scalar()
        print(f"✅ Usuario creado/actualizado. Username: org_marcial | Password: Marcial2026! | ID: {usuario_id}")

        # 2. Skip organizador independiente since table might not be ready
        print("✅ Perfil de Organizador skip.")

        # 3. Crear un Torneo General de Prueba
        print("Creando torneo general de prueba...")
        fecha_ini = datetime.now().date() + timedelta(days=30)
        fecha_fin = datetime.now().date() + timedelta(days=32)
        
        q_torneo = text("""
            INSERT INTO torneos_generales.torneos (nombre, fecha_inicio, fecha_fin, lugar, modalidades_permitidas, estado)
            VALUES ('Copa Kumite Nacional 2026', :ini, :fin, 'SND Arena', ARRAY['Karate', 'Taekwondo', 'Judo'], 'Inscripciones Abiertas')
            RETURNING id
        """)
        res_tor = await conn.execute(q_torneo, {"ini": fecha_ini, "fin": fecha_fin})
        torneo_id = res_tor.scalar()
        
        print(f"✅ Torneo multidisciplinario creado con ID: {torneo_id}")
        
        # 4. Insertar un par de participantes para poder probar el endpoint de agrupación
        print("Creando participantes de prueba...")
        q_part = text("""
            INSERT INTO torneos_generales.participantes 
            (torneo_id, nombre, apellido, documento, fecha_nacimiento, genero, modalidad, nivel_experiencia, peso_declarado, estatura_declarada, estado, pago_confirmado)
            VALUES 
            (:tid, 'Juan', 'Pérez', '1234567', '2005-05-10', 'Masculino', 'Karate', 'Cinturón Negro', 71.5, 1.75, 'Confirmado', true),
            (:tid, 'Marcos', 'López', '2345678', '2004-02-15', 'Masculino', 'Karate', 'Cinturón Negro', 72.0, 1.76, 'Confirmado', true),
            (:tid, 'Luis', 'Gómez', '3456789', '2005-11-20', 'Masculino', 'Karate', 'Cinturón Negro', 70.8, 1.74, 'Confirmado', true)
        """)
        await conn.execute(q_part, {"tid": torneo_id})
        print("✅ 3 Participantes de prueba (Karate) creados en estado 'Confirmado' (Listos para hacer Check-in).")

    await engine.dispose()
    print("\\n🚀 Todo listo. Ya puedes usar el sistema de Torneos Generales.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
