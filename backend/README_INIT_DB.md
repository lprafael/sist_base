# Inicialización de Base de Datos - Poliverso

Este documento explica cómo usar el script `init_database.py` para inicializar la base de datos del sistema.

## 📋 Requisitos Previos

1. PostgreSQL instalado y corriendo
2. Archivo `.env` configurado con `DATABASE_URL`
3. Dependencias de Python instaladas (`pip install -r requirements.txt`)

## 🚀 Uso del Script

### Inicializar TODO (Sistema + Cancha)
```bash
python init_database.py
```
Este comando inicializa:
- ✅ Schema `sistema` (usuarios, roles, permisos, configuración)
- ✅ Schema `cancha` (ejecutando `initBD.sql`)

### Inicializar SOLO Schema Cancha
```bash
python init_database.py --cancha
```
Este comando:
- ✅ Ejecuta el archivo `initBD.sql`
- ✅ Crea todas las tablas del schema cancha
- ✅ Inserta datos iniciales (categorías, tipos de gastos, configuraciones)

### Inicializar SOLO Schema Sistema
```bash
python init_database.py --sistema
```
Este comando:
- ✅ Crea el schema sistema
- ✅ Crea usuarios, roles y permisos
- ✅ Configura parámetros del sistema

### Ver Ayuda
```bash
python init_database.py --help
```

## 📁 Estructura de Archivos

```
backend/
├── init_database.py       # Script principal de inicialización
├── revert_init_database.py # Borra schemas sistema y cancha (reset total)
├── initBD.sql              # SQL para schema cancha (tablas base)
├── models.py               # Modelos del schema sistema
└── .env                    # Configuración de conexión
```

## ⚠️ Importante

- **El archivo `initBD.sql` es la ÚNICA fuente de verdad para el schema cancha**
- Cualquier cambio en las tablas de cancha debe hacerse en `initBD.sql`
- El script `init_database.py` ejecuta `initBD.sql` directamente sin modificaciones

## 🔐 Credenciales por Defecto

Después de inicializar el sistema, se crea un usuario administrador:

- **Usuario:** `admin`
- **Contraseña:** `Admin123!`
- **Email:** `rafadevstack@gmail.com`
- **Rol:** `admin`

## 📝 Roles Creados

1. **admin** - Acceso completo al sistema
2. **manager** - Gestión y lectura
3. **user** - Operaciones básicas
4. **viewer** - Solo lectura

## 🔄 Reset total y reinicializar

Si quieres **empezar de cero** (borrar sistema y cancha y volver a crear todo):

```bash
python revert_init_database.py   # Elimina schemas sistema y cancha
python init_database.py         # Inicializa todo de nuevo
```

**Cuidado:** `revert_init_database.py` borra todos los datos. Úsalo solo en desarrollo o cuando quieras una BD limpia.

## 🔄 Actualización de Schema Cancha

Si necesitas actualizar el schema cancha:

1. Modifica el archivo `initBD.sql`
2. Ejecuta: `python init_database.py --cancha`

**Nota:** En producción, usa los scripts de migración dentro de la carpeta `migrations/` y ejecútalos usando `run_migrations.py`.

## 🛠️ Troubleshooting

### Error: "DATABASE_URL no está configurada"
- Verifica que el archivo `.env` existe
- Verifica que contiene la variable `DATABASE_URL`

### Error: "No se encontró el archivo initBD.sql"
- Verifica que `initBD.sql` está en el mismo directorio que `init_database.py`

### Error: "La base de datos ya está inicializada"
- Si quieres reinicializar desde cero: `python revert_init_database.py` y luego `python init_database.py`
- Para solo actualizar cancha: `python init_database.py --cancha`

## 📞 Soporte

Para más información, contacta al equipo de desarrollo.
