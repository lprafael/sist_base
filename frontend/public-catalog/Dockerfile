FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Inyectadas en build (Vite): ajustar en docker-compose build.args
ARG VITE_REACT_APP_API_URL=/api
ENV VITE_REACT_APP_API_URL=$VITE_REACT_APP_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Reusamos nginx.conf o creamos uno básico
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
