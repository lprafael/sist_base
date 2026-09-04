"""
Migración: Sistema de Suscripciones
- Agrega columnas plan, plan_vence_en, plan_actualizado_en a sistema.usuarios
- Crea tabla sistema.suscripciones para historial de pagos/planes
"""
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print(">> Agregando columnas de plan a sistema.usuarios...")
        await conn.execute(text("""
            ALTER TABLE sistema.usuarios
              ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'basico',
              ADD COLUMN IF NOT EXISTS plan_vence_en DATE,
              ADD COLUMN IF NOT EXISTS plan_actualizado_en TIMESTAMP;
        """))

        print(">> Creando tabla sistema.suscripciones...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sistema.suscripciones (
              id SERIAL PRIMARY KEY,
              usuario_id INTEGER REFERENCES sistema.usuarios(id),
              plan VARCHAR(20) NOT NULL CHECK (plan IN ('basico', 'profesional', 'premium')),
              precio_usd NUMERIC(10,2),
              precio_gs NUMERIC(12,0),
              moneda VARCHAR(10) DEFAULT 'USD',
              fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
              fecha_vencimiento DATE,
              activo BOOLEAN DEFAULT true,
              notas TEXT,
              mp_preference_id VARCHAR(255),
              mp_payment_id VARCHAR(255),
              mp_status VARCHAR(50),
              asignado_por INTEGER REFERENCES sistema.usuarios(id),
              creado_en TIMESTAMP DEFAULT NOW()
            );
        """))

        print(">> Creando indices...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_suscripciones_usuario_id
              ON sistema.suscripciones(usuario_id);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_suscripciones_activo
              ON sistema.suscripciones(activo);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_usuarios_plan
              ON sistema.usuarios(plan);
        """))

        print(">> Insertando parametro de tipo de cambio USD/Gs...")
        await conn.execute(text("""
            INSERT INTO sistema.parametros_sistema (codigo, nombre, valor, tipo, descripcion, categoria)
            VALUES (
              'TIPO_CAMBIO_USD_GS',
              'Tipo de cambio USD a Guaranies',
              '7200',
              'integer',
              'Valor de 1 USD en Guaranies paraguayos para mostrar precios de planes',
              'suscripciones'
            )
            ON CONFLICT (codigo) DO NOTHING;
        """))

        print("OK: Migracion completada exitosamente.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
