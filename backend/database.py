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

# Motores asíncronos con pooling optimizado
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=10,           # Conexiones base para mantener abiertas
    max_overflow=20,        # Conexiones adicionales permitidas en picos de carga
    pool_recycle=3600,      # Reciclar conexión cada hora
    pool_pre_ping=True      # Verificar conexión antes de usarla para evitar errores de red
)

# Fábricas de sesiones
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_session():
    """
    Proveedor de dependencia para obtener una sesión de base de datos.
    """
    async with SessionLocal() as session:
        yield session
