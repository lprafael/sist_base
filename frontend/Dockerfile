# Etapa 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa 2: Producción con Nginx
FROM nginx:alpine

# Copiar los archivos construidos desde la etapa de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80 (puerto interno del container)
EXPOSE 80

# Nginx se inicia automáticamente
CMD ["nginx", "-g", "daemon off;"]
