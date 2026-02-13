import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def run_migration():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    # Si estamos fuera de Docker, intentamos usar localhost
    url = DATABASE_URL
    if "host.docker.internal" in url:
        url = url.replace("host.docker.internal", "localhost")
    
    print(f"🔄 Conectando a: {url}")
    engine = create_async_engine(url)
    
    try:
        async with engine.begin() as conn:
            print("🚀 Iniciando migración...")
            
            # 1. Tabla de estados
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS playa.estados (
                    id_estado SERIAL PRIMARY KEY,
                    nombre VARCHAR(50) UNIQUE NOT NULL,
                    descripcion TEXT,
                    color_hex VARCHAR(7),
                    activo BOOLEAN DEFAULT TRUE
                );
            """))
            
            # Estados iniciales
            states = ['PENDIENTE', 'PAGADO', 'VENCIDO', 'ANULADO', 'PARCIAL']
            for state in states:
                await conn.execute(text("INSERT INTO playa.estados (nombre) VALUES (:name) ON CONFLICT (nombre) DO NOTHING"), {"name": state})
            
            # 2. Tabla de cuentas
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS playa.cuentas (
                    id_cuenta SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) UNIQUE NOT NULL,
                    tipo VARCHAR(50) DEFAULT 'CAJA',
                    banco VARCHAR(100),
                    numero_cuenta VARCHAR(100),
                    saldo_actual DECIMAL(15, 2) DEFAULT 0,
                    activo BOOLEAN DEFAULT TRUE,
                    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            await conn.execute(text("INSERT INTO playa.cuentas (nombre, tipo) VALUES ('Caja Central', 'CAJA') ON CONFLICT (nombre) DO NOTHING"))

            # 3. Tabla de movimientos
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS playa.movimientos (
                    id_movimiento SERIAL PRIMARY KEY,
                    id_cuenta_origen INTEGER REFERENCES playa.cuentas(id_cuenta),
                    id_cuenta_destino INTEGER REFERENCES playa.cuentas(id_cuenta),
                    monto DECIMAL(15, 2) NOT NULL,
                    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    concepto TEXT,
                    id_usuario INTEGER,
                    referencia VARCHAR(100)
                );
            """))

            # 4. Modificar pagares
            # cancelado
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'pagares' AND column_name = 'cancelado'"))
            if not res.fetchone():
                await conn.execute(text("ALTER TABLE playa.pagares ADD COLUMN cancelado BOOLEAN DEFAULT FALSE"))

            # id_estado
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'pagares' AND column_name = 'id_estado'"))
            if not res.fetchone():
                await conn.execute(text("ALTER TABLE playa.pagares ADD COLUMN id_estado INTEGER REFERENCES playa.estados(id_estado)"))
                
                # Migrar datos
                await conn.execute(text("""
                    UPDATE playa.pagares p
                    SET id_estado = e.id_estado
                    FROM playa.estados e
                    WHERE p.estado = e.nombre
                """))
                
                # Default
                await conn.execute(text("""
                    UPDATE playa.pagares 
                    SET id_estado = (SELECT id_estado FROM playa.estados WHERE nombre = 'PENDIENTE') 
                    WHERE id_estado IS NULL
                """))
                
                # NOT NULL
                await conn.execute(text("ALTER TABLE playa.pagares ALTER COLUMN id_estado SET NOT NULL"))

            # 5. Agregar id_cuenta a pagos
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'playa' AND table_name = 'pagos' AND column_name = 'id_cuenta'"))
            if not res.fetchone():
                await conn.execute(text("ALTER TABLE playa.pagos ADD COLUMN id_cuenta INTEGER REFERENCES playa.cuentas(id_cuenta)"))
                await conn.execute(text("UPDATE playa.pagos SET id_cuenta = (SELECT id_cuenta FROM playa.cuentas WHERE nombre = 'Caja Central')"))

            print("✅ Migración completada exitosamente.")
            
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
