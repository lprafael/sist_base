import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
engine = create_engine(db_url)

with engine.connect() as conn:
    trans = conn.begin()
    try:
        # Borrar rastro previo si hubo error
        conn.execute(text("DELETE FROM electoral.candidatos WHERE municipio = 'San Lorenzo'"))
        
        # Insertar
        conn.execute(text("""
            INSERT INTO electoral.candidatos (nombre_candidato, municipio, partido_movimiento) 
            VALUES ('Rafael Lopez', 'San Lorenzo', 'ANR')
        """))
        
        # Obtener ID
        cand_id = conn.execute(text("SELECT id FROM electoral.candidatos WHERE municipio = 'San Lorenzo'")).scalar()
        print(f"Nuevo ID Candidato: {cand_id}")
        
        # Limpiar referentes previos del usuario 4
        conn.execute(text("DELETE FROM electoral.referentes WHERE id_usuario_sistema = 4"))
        
        # Vincular
        conn.execute(text("""
            INSERT INTO electoral.referentes (id_usuario_sistema, id_candidato, nombre_referente, activo)
            VALUES (4, :cid, 'Candidato Admin', true)
        """), {"cid": cand_id})
        
        # Actualizar distrito de usuario 4
        conn.execute(text("UPDATE sistema.usuarios SET distrito_id = 7, departamento_id = 11 WHERE id = 4"))
        
        trans.commit()
        print("Ajuste finalizado con éxito.")
    except Exception as e:
        trans.rollback()
        print(f"Error: {e}")
