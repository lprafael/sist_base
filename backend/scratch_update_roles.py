
import os
from sqlalchemy import create_engine
from sqlalchemy.sql import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL").replace("+asyncpg", "")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Updating roles in sistema.usuarios...")
    res1 = conn.execute(text("UPDATE sistema.usuarios SET rol = 'candidato_principal' WHERE rol = 'intendente'"))
    res2 = conn.execute(text("UPDATE sistema.usuarios SET rol = 'equipo_electoral' WHERE rol = 'concejal'"))
    
    print("Updating roles in electoral.referentes...")
    res3 = conn.execute(text("UPDATE electoral.referentes SET rol_electoral = 'candidato_principal' WHERE rol_electoral = 'intendente'"))
    res4 = conn.execute(text("UPDATE electoral.referentes SET rol_electoral = 'equipo_electoral' WHERE rol_electoral = 'concejal'"))
    
    conn.commit()
    print(f"Update complete. Rows affected: Usuarios({res1.rowcount + res2.rowcount}), Referentes({res3.rowcount + res4.rowcount})")
