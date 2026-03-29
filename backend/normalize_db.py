import asyncio
import os
import sys

# Añadir el directorio actual al path para importar modelos y base de datos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.future import select
from sqlalchemy import text, update, func
from sqlalchemy.orm import joinedload
from models_playa import (
    Producto, TipoVehiculoCatalogo, MarcaCatalogo, ModeloCatalogo
)

# Sobrescribir URL para conexión local (fuera de Docker)
DATABASE_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/mi_playa"
engine = create_async_engine(DATABASE_URL, echo=False)

async def run_migration():
    print("Iniciando migración de normalización de catálogos...")
    
    # Asegurarnos de que las tablas existan
    async with engine.begin() as conn:
        print("Verificando existencia de tablas de catálogo...")
        await conn.run_sync(TipoVehiculoCatalogo.__table__.create, checkfirst=True)
        await conn.run_sync(MarcaCatalogo.__table__.create, checkfirst=True)
        await conn.run_sync(ModeloCatalogo.__table__.create, checkfirst=True)
        print("Tablas de catálogo verificadas/creadas.")

    async with AsyncSession(engine) as session:
        # 1. Agregar columnas si no existen
        try:
            print("Verificando/Agregando columnas a playa.productos...")
            await session.execute(text("ALTER TABLE playa.productos ADD COLUMN IF NOT EXISTS id_tipo_vehiculo INTEGER"))
            await session.execute(text("ALTER TABLE playa.productos ADD COLUMN IF NOT EXISTS id_marca INTEGER"))
            await session.execute(text("ALTER TABLE playa.productos ADD COLUMN IF NOT EXISTS id_modelo INTEGER"))
            await session.commit()
            print("Columnas verificadas.")
        except Exception as e:
            print(f"Error operando sobre la tabla productos: {e}")
            await session.rollback()

        # 2. Poblar Marcas
        print("Poblando catálogo de marcas desde datos existentes...")
        res = await session.execute(select(Producto.marca).distinct())
        marcas_nombres = [row[0] for row in res.all() if row[0]]
        
        for nombre in marcas_nombres:
            nombre_clean = nombre.strip().upper()
            exist = await session.execute(select(MarcaCatalogo).where(func.upper(MarcaCatalogo.nombre) == nombre_clean))
            if not exist.scalar_one_or_none():
                session.add(MarcaCatalogo(nombre=nombre.strip(), activo=True))
        await session.commit()

        # 3. Poblar Tipos de Vehículo
        print("Poblando catálogo de tipos de vehículo...")
        res = await session.execute(select(Producto.tipo_vehiculo).distinct())
        tipos_nombres = [row[0] for row in res.all() if row[0]]
        
        for nombre in tipos_nombres:
            nombre_clean = nombre.strip().upper()
            exist = await session.execute(select(TipoVehiculoCatalogo).where(func.upper(TipoVehiculoCatalogo.nombre) == nombre_clean))
            if not exist.scalar_one_or_none():
                session.add(TipoVehiculoCatalogo(nombre=nombre.strip(), activo=True))
        await session.commit()

        # 4. Poblar Modelos
        print("Poblando catálogo de modelos...")
        res = await session.execute(select(Producto.marca, Producto.modelo).distinct())
        modelos_data = res.all()
        
        for marca_nombre, modelo_nombre in modelos_data:
            if not marca_nombre or not modelo_nombre:
                continue
            
            res_marca = await session.execute(select(MarcaCatalogo.id_marca).where(func.upper(MarcaCatalogo.nombre) == marca_nombre.strip().upper()))
            id_marca = res_marca.scalar_one_or_none()
            
            if id_marca:
                modelo_clean = modelo_nombre.strip().upper()
                exist = await session.execute(
                    select(ModeloCatalogo).where(
                        ModeloCatalogo.id_marca == id_marca,
                        func.upper(ModeloCatalogo.nombre) == modelo_clean
                    )
                )
                if not exist.scalar_one_or_none():
                    session.add(ModeloCatalogo(id_marca=id_marca, nombre=modelo_nombre.strip(), activo=True))
        await session.commit()

        # 5. Actualizar Foreign Keys en productos
        print("Sincronizando IDs en la tabla productos...")
        
        # Marcas
        res_marcas = await session.execute(select(MarcaCatalogo))
        for marca in res_marcas.scalars().all():
            await session.execute(
                update(Producto)
                .where(Producto.marca == marca.nombre)
                .values(id_marca=marca.id_marca)
            )
        
        # Tipos
        res_tipos = await session.execute(select(TipoVehiculoCatalogo))
        for tipo in res_tipos.scalars().all():
            await session.execute(
                update(Producto)
                .where(Producto.tipo_vehiculo == tipo.nombre)
                .values(id_tipo_vehiculo=tipo.id_tipo)
            )
            
        # Modelos
        res_modelos = await session.execute(
            select(ModeloCatalogo, MarcaCatalogo.nombre)
            .join(MarcaCatalogo, ModeloCatalogo.id_marca == MarcaCatalogo.id_marca)
        )
        for modelo, marca_n in res_modelos.all():
            await session.execute(
                update(Producto)
                .where(Producto.modelo == modelo.nombre, Producto.marca == marca_n)
                .values(id_modelo=modelo.id_modelo)
            )
        
        await session.commit()
        print("Migración completada con éxito.")

if __name__ == "__main__":
    asyncio.run(run_migration())
