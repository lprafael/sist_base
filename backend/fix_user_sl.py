import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
engine = create_engine(db_url)

with engine.connect() as conn:
    trans = conn.begin()
    try:
        # 1. Ajustar distrito de tu usuario para que coincida con el padron (San Lorenzo = 7)
        conn.execute(text("UPDATE sistema.usuarios SET distrito_id = 7 WHERE username = 'rlopez'"))
        print("Distrito actualizado a 7 para rlopez")
        
        # 2. Asegurar que existe el candidato de San Lorenzo
        conn.execute(text("""
            INSERT INTO electoral.candidatos (nombre_candidato, municipio, partido_movimiento) 
            VALUES ('Rafael López - Intendente', 'San Lorenzo', 'ANR')
            ON CONFLICT DO NOTHING
        """))
        
        # 3. Obtener el ID de ese candidato
        res = conn.execute(text("SELECT id FROM electoral.candidatos WHERE municipio = 'San Lorenzo' LIMIT 1"))
        cand_id = res.scalar()
        print(f"ID del candidato San Lorenzo: {cand_id}")
        
        # 4. Vincular tu usuario (ID 4) con ese candidato en la tabla referentes
        # (Esto es necesario porque la logica actual del sistema busca el candidato a traves de esta tabla)
        conn.execute(text("""
            INSERT INTO electoral.referentes (id_usuario_sistema, id_candidato, nombre_referente, activo)
            VALUES (4, :cid, 'Auto-Administrado', true)
        """), {"cid": cand_id})
        print("Vínculo de administrador creado en la tabla referentes")
        
        trans.commit()
        print("--- TODO LISTO ---")
    except Exception as e:
        trans.rollback()
        print(f"Error: {e}")
