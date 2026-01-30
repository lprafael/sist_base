#!/usr/bin/env python3
"""
Script para revertir la inicialización de la base de datos, eliminando todas las tablas.
"""

import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from sqlalchemy import text

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no está configurada en el archivo .env")

# Tablas que NO deben ser eliminadas (vacío para reset completo)
TABLAS_PROTEGIDAS = []

async def revert_database():
    """Elimina todas las tablas y el schema sistema de la base de datos."""
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # 1. Eliminar schema sistema
        print("Eliminando schema sistema...")
        await conn.execute(text('DROP SCHEMA IF EXISTS sistema CASCADE'))
        
        # 2. Consultar y eliminar todas las tablas en el schema public
        print("Buscando tablas residuales en el schema public...")
        result = await conn.execute(text(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
        ))
        tablas_public = result.scalars().all()
        
        for tabla in tablas_public:
            print(f"Eliminando tabla residual en public: {tabla}")
            await conn.execute(text(f'DROP TABLE IF EXISTS "public"."{tabla}" CASCADE'))
                
    print("Reversión completada.")

if __name__ == "__main__":
    asyncio.run(revert_database())
