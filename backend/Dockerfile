FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema: geoalchemy2/geopandas + unixODBC + ODBC Driver 18 (run_migration.py)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libgdal-dev \
    gdal-bin \
    python3-gdal \
    curl \
    gnupg2 \
    unixodbc-dev \
    unixodbc \
    && curl -sSL -o /tmp/packages-microsoft-prod.deb https://packages.microsoft.com/config/debian/$(grep VERSION_ID /etc/os-release | cut -d'"' -f 2 | cut -d'.' -f 1)/packages-microsoft-prod.deb \
    && dpkg -i /tmp/packages-microsoft-prod.deb \
    && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
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
