import asyncio
from sqlalchemy import text
import sys
import os

# Asegurar que el directorio actual está en el path para importar database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine
except ImportError:
    print("Error: No se pudo importar 'engine' de 'database.py'")
    sys.exit(1)

async def apply():
    async with engine.begin() as conn:
        print("Aplicando actualizaciones de base de datos...")
        
        # 1. Agregar columna cantidad_refuerzos si no existe
        try:
            # En Postgres no hay IF NOT EXISTS para ADD COLUMN de forma directa simple en versiones viejas, 
            # pero podemos chequear si existe
            check_column = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_schema='playa' AND table_name='ventas' AND column_name='cantidad_refuerzos';"
            ))
            if not check_column.fetchone():
                await conn.execute(text("ALTER TABLE playa.ventas ADD COLUMN cantidad_refuerzos INTEGER DEFAULT 0;"))
                print("✓ Columna 'cantidad_refuerzos' agregada a 'playa.ventas'.")
            else:
                print("- La columna 'cantidad_refuerzos' ya existe.")
        except Exception as e:
            print(f"Error al agregar columna: {e}")

        # 2. Crear tabla detalle_venta
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS playa.detalle_venta (
                    id_detalle_venta SERIAL PRIMARY KEY,
                    id_venta INTEGER REFERENCES playa.ventas(id_venta) ON DELETE CASCADE,
                    concepto VARCHAR(100) NOT NULL,
                    monto_unitario DECIMAL(15,2) NOT NULL,
                    cantidad INTEGER DEFAULT 1,
                    subtotal DECIMAL(15,2) NOT NULL,
                    observaciones TEXT
                );
            """))
            print("✓ Tabla 'playa.detalle_venta' verificada/creada.")
        except Exception as e:
            print(f"Error al crear tabla detalle_venta: {e}")

if __name__ == "__main__":
    asyncio.run(apply())
