import os
import psycopg2

def run():
    from dotenv import load_dotenv
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://postgres:admin@187.77.247.23:5432/BBDD_micancha"
    
    db_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    print(f"Connecting to {db_url}")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        print("Ejecutando parche a la DB para pts_victoria...")
        sql = """
        ALTER TABLE cancha.torneos ADD COLUMN IF NOT EXISTS pts_victoria INTEGER DEFAULT 3;
        ALTER TABLE cancha.torneos ADD COLUMN IF NOT EXISTS pts_empate INTEGER DEFAULT 1;
        ALTER TABLE cancha.torneos ADD COLUMN IF NOT EXISTS pts_derrota INTEGER DEFAULT 0;
        """
        cursor.execute(sql)
        print("✅ Parche aplicado con éxito")
    except Exception as e:
        print("Error al aplicar parche:", e)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run()
