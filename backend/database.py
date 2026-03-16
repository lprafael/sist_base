# database.py
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Configuración de las bases de datos
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("No se encontró DATABASE_URL en el archivo .env")

# Motores asíncronos con pooling optimizado para evitar desconexiones
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=10, 
    max_overflow=20,
    pool_recycle=3600,  # Reciclar conexiones cada hora
    pool_pre_ping=True   # Verificar conexión antes de usarla
)

# Fábricas de sesiones
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_session():
    """
    Proveedor de dependencia para obtener una sesión de base de datos.
    """
    async with SessionLocal() as session:
        yield session
