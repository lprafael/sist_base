# 🚀 Despliegue en Hostinger VPS (Docker)

Esta guía explica cómo levantar el sistema **Mi Playa** utilizando Docker Compose en un entorno de producción.

## 📋 Requisitos Previos

1. **Hostinger VPS** con Ubuntu (o plantilla Docker).
2. **PostgreSQL** (Dockerizado o externo).
3. **Puertos Abiertos**: 3002 (Admin), 3003 (Público), 8002 (API).

---

## 🛠️ Paso 1: Configurar Entorno

Desde la terminal del VPS:

```bash
# Crear archivos de entorno
cp backend/env_example.txt backend/.env
cp .env.production.example .env.production

# Editar credenciales (CRÍTICO)
nano backend/.env
```

Asegúrate de configurar:
- `DATABASE_URL`: `postgresql+asyncpg://usuario:password@host:5432/nombre_db`
- `SECRET_KEY`: Una clave segura.

---

## 🚀 Paso 2: Levantar Contenedores

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## 🏗️ Paso 3: Inicializar Base de Datos (Solo 1ra vez)

```bash
docker exec -it mi-playa-backend bash
python init_database.py
exit
```

---

## 🛡️ Paso 4: Firewall (UFW)

Si el firewall está activo en tu VPS:

```bash
sudo ufw allow 3002/tcp
sudo ufw allow 3003/tcp
sudo ufw allow 8002/tcp
sudo ufw reload
```

---

## 💡 Recomendación pro (SSL)

Para producción, usa **Nginx Proxy Manager** para gestionar subdominios (ej: `admin.miplaya.com`) y certificados SSL (HTTPS).
