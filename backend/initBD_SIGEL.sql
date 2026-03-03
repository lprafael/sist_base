-- 🗳️ SIGEL - Esquema de Base de Datos Electoral (PostgreSQL + PostGIS)

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear schema para organizar las tablas electorales
CREATE SCHEMA IF NOT EXISTS electoral;

-- 1. Tabla de Locales de Votación
CREATE TABLE electoral.locales_votacion (
    id SERIAL PRIMARY KEY,
    nombre_local VARCHAR(255) NOT NULL,
    direccion TEXT,
    distrito VARCHAR(100),
    departamento VARCHAR(100),
    ubicacion_gps GEOGRAPHY(POINT, 4326), -- Ubicación exacta del colegio/local
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Padrón (Base de datos estática)
CREATE TABLE electoral.padron (
    cedula VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero CHAR(1),
    id_local_votacion INT REFERENCES electoral.locales_votacion(id),
    mesa_nro INT,
    orden_nro INT,
    direccion_padron TEXT,
    distrito VARCHAR(100),
    departamento VARCHAR(100)
);

-- 3. Tabla de Candidatos (Concejales / Intendentes)
CREATE TABLE electoral.candidatos (
    id SERIAL PRIMARY KEY,
    nombre_candidato VARCHAR(155) NOT NULL,
    partido_movimiento VARCHAR(100),
    municipio VARCHAR(100),
    logo_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Referentes (Usuarios vinculados a un candidato)
-- Nota: En el sistema real, esta tabla se vincula con la tabla de usuarios del sistema base
CREATE TABLE electoral.referentes (
    id SERIAL PRIMARY KEY,
    id_usuario_sistema INT, -- Enlace al ID de la tabla sistema.usuarios
    id_candidato INT REFERENCES electoral.candidatos(id) ON DELETE CASCADE,
    nombre_referente VARCHAR(155) NOT NULL,
    telefono VARCHAR(20),
    zona_influencia TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- 5. Tabla de Posibles Votantes (Captación y Seguimiento)
CREATE TABLE electoral.posibles_votantes (
    id SERIAL PRIMARY KEY,
    id_referente INT REFERENCES electoral.referentes(id) ON DELETE CASCADE,
    cedula_votante VARCHAR(20) REFERENCES electoral.padron(cedula),
    parentesco VARCHAR(50), -- "Hermano", "Vecino", "Empleado", etc.
    grado_seguridad INT CHECK (grado_seguridad BETWEEN 1 AND 5), -- 1: Duda, 5: Seguro
    observaciones TEXT,
    ubicacion_captacion GEOGRAPHY(POINT, 4326), -- Para el Mapa de Calor
    fecha_captacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validacion_candidato BOOLEAN DEFAULT FALSE, -- Si el candidato ya aprobó este registro
    UNIQUE(id_referente, cedula_votante)
);

-- 6. Índices para Optimización y Búsqueda Difusa
CREATE INDEX idx_padron_apellidos_trgm ON electoral.padron USING gin (apellido_paterno gin_trgm_ops, apellido_materno gin_trgm_ops);
CREATE INDEX idx_padron_nombres_trgm ON electoral.padron USING gin (nombre gin_trgm_ops);
CREATE INDEX idx_pv_ubicacion ON electoral.posibles_votantes USING GIST (ubicacion_captacion);
CREATE INDEX idx_locales_gps ON electoral.locales_votacion USING GIST (ubicacion_gps);

-- Comentarios de documentación en la DB
COMMENT ON TABLE electoral.posibles_votantes IS 'Almacena la relación entre referentes y votantes captados, con su grado de seguridad y geolocalización.';
COMMENT ON COLUMN electoral.posibles_votantes.grado_seguridad IS 'Escala de 1 a 5 donde 5 es compromiso total (voto seguro).';
