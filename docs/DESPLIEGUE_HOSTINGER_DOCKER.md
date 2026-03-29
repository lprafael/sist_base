# Despliegue en VPS (Hostinger) con Docker

## Requisitos en el servidor

- Ubuntu 22.04/24.04 (o similar) con Docker y Docker Compose Plugin instalados.
- En Hostinger VPS: panel → acceso SSH, puertos 80/443 abiertos si usarás dominio y HTTPS.

```bash
# Comprobar
docker --version
docker compose version
```

## 1. Conectar por SSH

```bash
ssh usuario@IP_DEL_SERVIDOR
```

(Crea un usuario con privilegios o usa `root` según tu Hostinger.)

## 2. Clonar el repositorio

```bash
cd /var/www   # o ~/apps
git clone https://github.com/TU_USUARIO/TU_REPO.git mi_playa
cd mi_playa
git checkout mi_playa   # si tu rama es esta
```

## 3. Variables de entorno (no subir a Git)

En el servidor, crea `backend/.env` (copia desde tu máquina local con valores de producción):

- `DATABASE_URL` o las variables que use tu `database.py` para PostgreSQL.
- `SECRET_KEY`, JWT, correo, etc.

**Nunca** commitees `.env`.

## 4. Producción en el VPS: `docker-compose.prod.yml`

En el servidor **no** uses el `docker-compose.yml` de desarrollo (monta `./backend:/app` sobre la imagen). Usa el archivo de producción:

```bash
cp .env.production.example .env.production
# Editar .env.production si cambias puertos o la URL del API del catálogo público
```

- **`backend/.env`**: obligatorio (Postgres, JWT, etc.), igual que antes.
- **`.env.production`**: opcional; define `VITE_PUBLIC_API_URL` (por defecto `/api`) y puertos `BACKEND_HOST_PORT`, `FRONTEND_HOST_PORT`, `PUBLIC_CATALOG_HOST_PORT`.

**Levantar** (con variables por defecto puedes omitir `--env-file`):

```bash
cd /var/www/mi_playa
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
# o sin archivo:  docker compose -f docker-compose.prod.yml up -d --build

docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Los volúmenes con nombre `mi_playa_uploads` y `mi_playa_logs` guardan subidas y logs aunque reconstruyas la imagen.

**HTTPS / dominio:** delante de los puertos suele ir Nginx o Caddy en el host (80/443) con proxy a `127.0.0.1:3002`, `:3003`, etc.

## 5. Desarrollo local (opcional)

Para codificar en tu PC con hot-reload del backend montado:

```bash
docker compose up -d
```

## 6. Comprobar

- API: `http://IP:8002/docs` (o el puerto que hayas mapeado).
- Frontend: `http://IP:3002`
- Catálogo público: `http://IP:3003`

Si el frontend llama a la API con rutas relativas `/api`, el `nginx.conf` del contenedor `frontend` ya hace proxy a `backend:8001` dentro de la red Docker.

## 7. Actualizar después de un `git pull` (producción)

```bash
cd /var/www/mi_playa
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## Firewall (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

**Nota Hostinger:** En planes **compartidos** no hay Docker; necesitas **VPS** o **Cloud** con acceso root/SSH y Docker. Si solo tienes hosting compartido, el despliegue sería por FTP/subida estática + API en otro servicio, no con este `docker-compose` tal cual.
