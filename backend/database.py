# database.py
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Configuración de las bases de datos
DATABASE_URL = os.getenv("DATABASE_URL")
MONITOREO_DATABASE_URL = os.getenv("MONITOREO_DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("No se encontró DATABASE_URL en el archivo .env")

# Motores asíncronos
engine = create_async_engine(DATABASE_URL, echo=False)  # CID DB
engine_monitoreo = None
if MONITOREO_DATABASE_URL:
    engine_monitoreo = create_async_engine(MONITOREO_DATABASE_URL, echo=False)

# Fábricas de sesiones
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
SessionMonitoreo = None
if engine_monitoreo:
    SessionMonitoreo = sessionmaker(bind=engine_monitoreo, class_=AsyncSession, expire_on_commit=False)

async def get_session():
    """
    Proveedor de dependencia para obtener una sesión de base de datos CID.
    """
    async with SessionLocal() as session:
        yield session

async def get_monitoreo_session():
    """
    Proveedor de dependencia para obtener una sesión de base de datos de Monitoreo.
    """
    if not SessionMonitoreo:
        raise ValueError("Capa de monitoreo no configurada")
    async with SessionMonitoreo() as session:
        yield session
    async with SessionLocal() as session:
        yield session
