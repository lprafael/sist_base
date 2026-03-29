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

## 4. Ajustes para producción

- **Puertos:** En `docker-compose.yml` los servicios exponen `8002` (API), `3002` (frontend), `3003` (public-catalog). En producción suele mapearse `80:80` con un reverse proxy o cambiar los puertos publicados.
- **Volúmenes de desarrollo:** El compose actual monta `./backend:/app` en el backend (útil en local). En el servidor puedes **comentar ese volumen** para ejecutar solo el código de la imagen construida y evitar inconsistencias.
- **HTTPS:** Usa Caddy, Traefik o Nginx en el host (o en otro contenedor) delante de los puertos, con certificados Let’s Encrypt para tu dominio.

## 5. Levantar los contenedores

```bash
cd /var/www/mi_playa
docker compose pull   # si usas imágenes de registry
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs -f backend   # ver errores de arranque
```

## 6. Comprobar

- API: `http://IP:8002/docs` (o el puerto que hayas mapeado).
- Frontend: `http://IP:3002`
- Catálogo público: `http://IP:3003`

Si el frontend llama a la API con rutas relativas `/api`, el `nginx.conf` del contenedor `frontend` ya hace proxy a `backend:8001` dentro de la red Docker.

## 7. Actualizar después de un `git pull`

```bash
cd /var/www/mi_playa
git pull
docker compose build
docker compose up -d
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
