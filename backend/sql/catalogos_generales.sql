-- Catálogos globales para administración central (tipos, marcas, modelos).
-- Ejecutar una vez contra la base PostgreSQL del proyecto.

CREATE TABLE IF NOT EXISTS playa.catalogo_tipos_vehiculo (
    id_tipo SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playa.catalogo_marcas (
    id_marca SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playa.catalogo_modelos (
    id_modelo SERIAL PRIMARY KEY,
    id_marca INTEGER NOT NULL REFERENCES playa.catalogo_marcas(id_marca) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT NOW(),
    UNIQUE(id_marca, nombre)
);

CREATE INDEX IF NOT EXISTS ix_catalogo_modelos_marca ON playa.catalogo_modelos(id_marca);
