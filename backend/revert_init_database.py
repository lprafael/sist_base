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
    """Elimina todas las tablas de la base de datos."""
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # Obtener todas las tablas
        inspector = await conn.run_sync(lambda c: Base.metadata.tables.keys())
        tablas_a_eliminar = [t for t in inspector]
        for tabla in tablas_a_eliminar:
            print(f"Eliminando tabla: {tabla}")
            await conn.execute(text(f'DROP TABLE IF EXISTS "{tabla}" CASCADE'))
    print("Reversión completada.")

if __name__ == "__main__":
    asyncio.run(revert_database())
