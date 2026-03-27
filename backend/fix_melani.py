import asyncio
import os
import sys

# Añadir el path actual al sys.path para importar los modelos
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from models_playa import Venta, Cliente, Pagare, Pago, Estado

async def fix():
    try:
        engine = create_async_engine("postgresql+asyncpg://postgres:adminperalta@host.docker.internal:5432/BBDD_playa")
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            # Buscar pagare 6057 (Melani)
            q = select(Pagare).where(Pagare.id_pagare == 6057)
            res = await session.execute(q)
            pagare = res.scalar_one_or_none()
            if pagare:
                print(f"Antes - Cancelado: {pagare.cancelado}, Estado: {pagare.id_estado}")
                pagare.cancelado = False
                # Asegurar que el estado sea PARCIAL (ID 5 según el script anterior)
                pagare.id_estado = 5 
                await session.commit()
                print("Fijado: Melani ahora tiene cancelado=False y Estado=PARCIAL")
            else:
                print("Pagare no encontrado")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix())
