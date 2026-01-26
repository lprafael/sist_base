# 🔧 Solución: docker-compose no encontrado

## Problema

El comando `docker-compose` no se encuentra en el servidor. Esto puede deberse a:

1. Docker Compose no está instalado
2. Docker Compose está instalado como plugin (versión nueva usa `docker compose` sin guión)
3. Docker no está instalado

## Soluciones

### Opción 1: Usar `docker compose` (sin guión) - Versión Nueva

Las versiones recientes de Docker incluyen Compose como plugin. Prueba:

```bash
docker compose build
docker compose up -d
```

### Opción 2: Instalar Docker Compose (si no está instalado)

#### Verificar si Docker está instalado

```bash
docker --version
```

Si Docker no está instalado, instálalo primero:

```bash
# Para CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Para Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

#### Instalar Docker Compose

```bash
# Descargar la última versión
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Dar permisos de ejecución
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker-compose --version
```

### Opción 3: Instalar Docker Compose v2 (Plugin)

```bash
# Instalar Docker Compose v2 como plugin
sudo yum install -y docker-compose-plugin
# o para Ubuntu/Debian:
# sudo apt-get install -y docker-compose-plugin

# Luego usar:
docker compose build
docker compose up -d
```

## Verificación

Después de instalar, verifica:

```bash
# Verificar Docker
docker --version

# Verificar Docker Compose (versión antigua)
docker-compose --version

# Verificar Docker Compose (versión nueva/plugin)
docker compose version
```

## Actualizar docker-compose.yml (si es necesario)

Si tu versión de Docker Compose es muy antigua, puede que necesites actualizar el archivo `docker-compose.yml`. La versión actual usa `version: '3.8'` que es compatible con Docker Compose 1.27.0+.

Si tienes una versión muy antigua, puedes cambiar a:

```yaml
version: '3.7'  # o '3.6', '3.5', etc.
```

Pero es mejor actualizar Docker Compose.

## Comandos Alternativos

Si tienes problemas, puedes usar estos comandos equivalentes:

```bash
# En lugar de: docker-compose build
docker compose build

# En lugar de: docker-compose up -d
docker compose up -d

# En lugar de: docker-compose ps
docker compose ps

# En lugar de: docker-compose logs
docker compose logs
```

## Próximos Pasos

Una vez que Docker Compose funcione:

1. Verificar puertos disponibles
2. Configurar `.env` en backend
3. Construir imágenes: `docker compose build`
4. Iniciar contenedores: `docker compose up -d`
