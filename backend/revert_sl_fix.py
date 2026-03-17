import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
engine = create_engine(db_url)

with engine.connect() as conn:
    trans = conn.begin()
    try:
        # 1. Revertir distrito a 27 (San Lorenzo real en ref_distritos)
        conn.execute(text("UPDATE sistema.usuarios SET distrito_id = 27 WHERE username = 'rlopez'"))
        print("Distrito revertido a 27 para rlopez")
        
        # 2. Asegurar que el candidato de San Lorenzo tenga municipio 'SAN LORENZO' (en mayúsculas suele estar en la ref)
        # pero san lorenzo funcionó bien.
        
        # 3. Vincular correctamente el referente del usuario 4 al candidato ID 2
        conn.execute(text("UPDATE electoral.referentes SET id_candidato = 2 WHERE id_usuario_sistema = 4"))
        print("Vínculo de candidato actualizado en referentes")
        
        trans.commit()
    except Exception as e:
        trans.rollback()
        print(f"Error: {e}")
