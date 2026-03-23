
from sqlalchemy import create_engine, text
TARGET_URL = "postgresql://postgres:admin@187.77.247.23:5434/SIGEL"
engine = create_engine(TARGET_URL)
with engine.connect() as conn:
    print("Manual cleanup for User 3...")
    with conn.begin():
        conn.execute(text("UPDATE electoral.choferes SET creado_por = NULL WHERE creado_por = 3"))
        conn.execute(text("UPDATE electoral.posibles_votantes SET veedor_id = NULL WHERE veedor_id = 3"))
        conn.execute(text("UPDATE electoral.financiamiento_egresos SET creado_por = NULL WHERE creado_por = 3"))
        conn.execute(text("UPDATE electoral.financiamiento_ingresos SET creado_por = NULL WHERE creado_por = 3"))
        conn.execute(text("UPDATE electoral.resultados_mesas SET creado_por = NULL WHERE creado_por = 3"))
        conn.execute(text("UPDATE sistema.usuarios SET creado_por = NULL WHERE creado_por = 3"))
        conn.execute(text("UPDATE sistema.roles SET creado_por = NULL WHERE creado_por = 3"))
        conn.execute(text("UPDATE sistema.parametros_sistema SET modificado_por = NULL WHERE modificado_por = 3"))
    print("Cleanup successful.")
