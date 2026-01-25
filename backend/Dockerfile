FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para geoalchemy2 y geopandas
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libgdal-dev \
    gdal-bin \
    python3-gdal \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements y instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Exponer el puerto (puerto interno del container)
EXPOSE 8001

# Comando para ejecutar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
