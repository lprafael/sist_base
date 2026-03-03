import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('+asyncpg', '')
e = create_engine(db_url)
with e.connect() as c:
    # Primero insertar un candidato ficticio si no hay
    res = c.execute(text("SELECT id FROM electoral.candidatos LIMIT 1")).fetchone()
    if not res:
        c.execute(text("INSERT INTO electoral.candidatos (nombre_candidato, municipio, partido_movimiento) VALUES ('Candidato Test', 'Asunción', 'Partido de Prueba')"))
        c.commit()
        cand_id = c.execute(text("SELECT id FROM electoral.candidatos LIMIT 1")).fetchone()[0]
    else:
        cand_id = res[0]

    # Insertar el referente
    c.execute(text(f"INSERT INTO electoral.referentes (id_usuario_sistema, id_candidato, nombre_referente, zona_influencia) VALUES (1, {cand_id}, 'Administrador Local', 'Zona Centro')"))
    c.commit()
    print(f"Referente inserted for user ID 1 with candidate ID {cand_id}")
c.close()
