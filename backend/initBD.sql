-- ============================================================
-- MIGRACIÓN: SISTEMA MICANCHA - CANCHAS, RESERVAS, NOTIFICACIONES
-- Paraguay - Moneda: Guaraníes (Gs)
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- SCHEMA PRINCIPAL
-- ============================================================
CREATE SCHEMA IF NOT EXISTS cancha;
SET search_path TO cancha, public;

-- ============================================================
-- TABLA: COMPLEJOS DEPORTIVOS (Tenants/Locales)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.complejos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(100),
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) DEFAULT 'Asunción',
    departamento VARCHAR(100) DEFAULT 'Central',
    ubicacion GEOGRAPHY(POINT, 4326),  -- lat/lon PostGIS
    foto_portada VARCHAR(500),
    fotos TEXT[],                       -- array de URLs
    horario_apertura TIME DEFAULT '07:00',
    horario_cierre  TIME DEFAULT '23:00',
    dias_habilitados TEXT[] DEFAULT ARRAY['lunes','martes','miercoles','jueves','viernes','sabado','domingo'],
    es_publico BOOLEAN DEFAULT false,
    configuracion JSONB DEFAULT '{
        "minutos_seña": 0,
        "tiempo_minimo_reserva": 60,
        "tiempo_maximo_reserva": 120,
        "anticipacion_min_horas": 1,
        "anticipacion_max_dias": 30,
        "permite_cancelacion": true,
        "horas_cancelacion": 2
    }'::jsonb,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: ADMINISTRADORES DE COMPLEJO
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.admins_complejo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    usuario_id INTEGER,                 -- FK a sistema.usuarios
    rol VARCHAR(50) DEFAULT 'admin',    -- admin, operador
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: CANCHAS
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.canchas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,       -- "Cancha 1", "Principal", etc.
    descripcion TEXT,
    deporte VARCHAR(50) NOT NULL,       -- Fútbol, Padel, Tenis, Básquet, etc.
    superficie VARCHAR(50),             -- Sintético, Parquet, Arcilla, Cemento
    dimensiones VARCHAR(50),            -- "40x20m", "Fútbol 5", etc.
    capacidad_jugadores INTEGER DEFAULT 10,
    precio_hora NUMERIC(12,0) NOT NULL, -- Guaraníes
    precio_hora_nocturna NUMERIC(12,0), -- Precio diferencial noche
    hora_inicio_nocturna TIME DEFAULT '20:00',
    fotos TEXT[],
    numero_orden INTEGER DEFAULT 1,     -- Orden para mostrar en la grilla
    color VARCHAR(20) DEFAULT '#3B82F6', -- Color en el timeline
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: HORARIOS ESPECIALES / BLOQUEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.bloqueos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cancha_id UUID REFERENCES cancha.canchas(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    motivo VARCHAR(200),               -- Mantenimiento, Torneo, etc.
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: CLIENTES / JUGADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    apellido VARCHAR(150),
    telefono VARCHAR(50),
    email VARCHAR(100),
    google_id VARCHAR(200),            -- Para OAuth
    foto_perfil VARCHAR(500),
    es_confiable BOOLEAN DEFAULT FALSE,
    notas TEXT,
    estadisticas JSONB DEFAULT '{"total_reservas": 0, "cancelaciones": 0}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: RESERVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cancha_id UUID REFERENCES cancha.canchas(id) ON DELETE RESTRICT,
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES cancha.clientes(id),
    -- Datos del cliente (en caso de reserva manual sin cuenta)
    cliente_nombre VARCHAR(200),
    cliente_telefono VARCHAR(50),
    -- Horario
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    duracion_minutos INTEGER GENERATED ALWAYS AS ( ((EXTRACT(EPOCH FROM (fin - inicio)) / 60)::INTEGER) ) STORED,
    -- Precios en Guaraníes
    precio_hora NUMERIC(12,0) NOT NULL,
    precio_total NUMERIC(12,0) NOT NULL,
    seña_pagada NUMERIC(12,0) DEFAULT 0,
    -- Estado
    estado VARCHAR(30) DEFAULT 'confirmada' CHECK (estado IN ('pendiente','confirmada','en_curso','finalizada','cancelada')),
    estado_pago VARCHAR(30) DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente','seña_pagada','pagado')),
    origen VARCHAR(30) DEFAULT 'admin' CHECK (origen IN ('admin','web','app')),
    notas TEXT,
    -- Notificaciones enviadas
    notif_5min_enviada BOOLEAN DEFAULT FALSE,
    notif_fin_enviada BOOLEAN DEFAULT FALSE,
    notif_inicio_enviada BOOLEAN DEFAULT FALSE,
    -- Metadatos
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: COLA DE NOTIFICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS cancha.notificaciones_cola (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID REFERENCES cancha.reservas(id) ON DELETE CASCADE,
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('inicio_turno','aviso_5min','fin_turno')),
    programada_para TIMESTAMPTZ NOT NULL,
    enviada BOOLEAN DEFAULT FALSE,
    enviada_en TIMESTAMPTZ,
    payload JSONB NOT NULL,            -- Datos para el mensaje de voz
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: TORNEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos.torneos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complejo_id UUID REFERENCES cancha.complejos(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    deporte VARCHAR(50) NOT NULL,
    formato VARCHAR(50) DEFAULT 'eliminacion_simple' CHECK (formato IN ('eliminacion_simple','eliminacion_doble','grupos','liga')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    max_equipos INTEGER DEFAULT 16,
    costo_inscripcion NUMERIC(12,0) DEFAULT 0,
    premio_1 VARCHAR(200),
    premio_2 VARCHAR(200),
    premio_3 VARCHAR(200),
    estado VARCHAR(30) DEFAULT 'abierto' CHECK (estado IN ('abierto','en_curso','finalizado','cancelado')),
    configuracion JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos.equipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id UUID REFERENCES torneos.torneos(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    capitan_nombre VARCHAR(150),
    capitan_telefono VARCHAR(50),
    capitan_email VARCHAR(100),
    estado_inscripcion VARCHAR(30) DEFAULT 'pendiente' CHECK (estado_inscripcion IN ('pendiente','confirmado','eliminado')),
    semilla INTEGER,                   -- Para el fixture
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torneos.partidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id UUID REFERENCES torneos.torneos(id) ON DELETE CASCADE,
    cancha_id UUID REFERENCES cancha.canchas(id),
    equipo_local_id UUID REFERENCES torneos.equipos(id),
    equipo_visitante_id UUID REFERENCES torneos.equipos(id),
    fase VARCHAR(50),                  -- Cuartos, Semi, Final, Grupo A
    numero_partido INTEGER,
    fecha_hora TIMESTAMPTZ,
    goles_local INTEGER,
    goles_visitante INTEGER,
    ganador_id UUID REFERENCES torneos.equipos(id),
    estado VARCHAR(30) DEFAULT 'programado' CHECK (estado IN ('programado','en_curso','finalizado')),
    notas TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_complejos_ubicacion ON cancha.complejos USING GIST(ubicacion);
CREATE INDEX IF NOT EXISTS idx_reservas_cancha_inicio ON cancha.reservas(cancha_id, inicio);
CREATE INDEX IF NOT EXISTS idx_reservas_complejo_inicio ON cancha.reservas(complejo_id, inicio);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON cancha.reservas(estado);
CREATE INDEX IF NOT EXISTS idx_notif_cola_programada ON cancha.notificaciones_cola(programada_para) WHERE NOT enviada;
CREATE INDEX IF NOT EXISTS idx_canchas_complejo ON cancha.canchas(complejo_id) WHERE activo = TRUE;

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Actualizar timestamp automático
CREATE OR REPLACE FUNCTION cancha.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_reservas_updated
    BEFORE UPDATE ON cancha.reservas
    FOR EACH ROW EXECUTE FUNCTION cancha.set_updated_at();

CREATE OR REPLACE TRIGGER trg_canchas_updated
    BEFORE UPDATE ON cancha.canchas
    FOR EACH ROW EXECUTE FUNCTION cancha.set_updated_at();

-- Auto-crear notificaciones cuando se confirma una reserva
CREATE OR REPLACE FUNCTION cancha.crear_notificaciones_reserva()
RETURNS TRIGGER AS $$
DECLARE
    v_cancha_nombre VARCHAR;
    v_complejo_id UUID;
BEGIN
    -- Solo actuar en reservas confirmadas nuevas o actualizadas a confirmada
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.estado != 'confirmada'))
       AND NEW.estado = 'confirmada' THEN

        SELECT nombre INTO v_cancha_nombre FROM cancha.canchas WHERE id = NEW.cancha_id;

        -- 1) Notificación de inicio de turno
        INSERT INTO cancha.notificaciones_cola
            (reserva_id, complejo_id, tipo, programada_para, payload)
        VALUES (
            NEW.id, NEW.complejo_id, 'inicio_turno', NEW.inicio,
            jsonb_build_object(
                'cliente_nombre', COALESCE(NEW.cliente_nombre, 'Cliente'),
                'cancha_nombre', v_cancha_nombre,
                'inicio', NEW.inicio,
                'fin', NEW.fin,
                'duracion_minutos', EXTRACT(EPOCH FROM (NEW.fin - NEW.inicio))/60
            )
        );

        -- 2) Aviso 5 minutos antes del fin
        INSERT INTO cancha.notificaciones_cola
            (reserva_id, complejo_id, tipo, programada_para, payload)
        VALUES (
            NEW.id, NEW.complejo_id, 'aviso_5min', NEW.fin - INTERVAL '5 minutes',
            jsonb_build_object(
                'cliente_nombre', COALESCE(NEW.cliente_nombre, 'Cliente'),
                'cancha_nombre', v_cancha_nombre,
                'fin', NEW.fin
            )
        );

        -- 3) Notificación de fin de turno
        INSERT INTO cancha.notificaciones_cola
            (reserva_id, complejo_id, tipo, programada_para, payload)
        VALUES (
            NEW.id, NEW.complejo_id, 'fin_turno', NEW.fin,
            jsonb_build_object(
                'cliente_nombre', COALESCE(NEW.cliente_nombre, 'Cliente'),
                'cancha_nombre', v_cancha_nombre,
                'fin', NEW.fin
            )
        );

    END IF;

    -- Cancelar notificaciones si la reserva se cancela
    IF TG_OP = 'UPDATE' AND NEW.estado = 'cancelada' THEN
        DELETE FROM cancha.notificaciones_cola
        WHERE reserva_id = NEW.id AND NOT enviada;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_crear_notificaciones
    AFTER INSERT OR UPDATE ON cancha.reservas
    FOR EACH ROW EXECUTE FUNCTION cancha.crear_notificaciones_reserva();

-- ============================================================
-- DATOS INICIALES DE EJEMPLO (Paraguay)
-- ============================================================
-- ============================================================
-- DATOS INICIALES DE EJEMPLO (Paraguay)
-- ============================================================
INSERT INTO cancha.complejos (id, nombre, descripcion, telefono, email, direccion, ciudad, departamento, ubicacion, horario_apertura, horario_cierre)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Mburicao Parque Deportivo',
    'El mejor parque de fútbol de la zona de Choferes del Chaco',
    '0981-123-456',
    'mburicao@micancha.com.py',
    'Av. Choferes del Chaco e/ 25 de Mayo',
    'Asunción',
    'Asunción',
    ST_GeogFromText('POINT(-57.5956 -25.2974)'),
    '07:00:00',
    '23:00:00'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Las Canchas de Madero',
    'Complejo deportivo premium en Plaza Madero Luque',
    '0971-888-999',
    'madero@micancha.com.py',
    'Autopista Silvio Pettirossi y Torokay',
    'Luque',
    'Central',
    ST_GeogFromText('POINT(-57.5144 -25.2505)'),
    '08:00:00',
    '01:00:00'
),
(
    '33333333-3333-3333-3333-333333333333',
    'La Quinta Sports',
    'Complejo multideportivo de primer nivel en Av. Perón',
    '0983-555-111',
    'laquinta@micancha.com.py',
    'Av. Juan Domingo Perón y Concepción Yegros',
    'Asunción',
    'Asunción',
    ST_GeogFromText('POINT(-57.6366 -25.3364)'),
    '08:00:00',
    '00:00:00'
),
(
    '44444444-4444-4444-4444-444444444444',
    'Blue Padel Club',
    'Canchas de pádel de cristal y tenis sobre la Av. Santa Teresa',
    '0982-111-222',
    'bluepadel@micancha.com.py',
    'Av. Santa Teresa',
    'Asunción',
    'Asunción',
    ST_GeogFromText('POINT(-57.5684 -25.2858)'),
    '07:00:00',
    '23:00:00'
),
(
    '55555555-5555-5555-5555-555555555555',
    'Villa Morra Padel Bar',
    'El mejor ambiente deportivo y social de Villa Morra',
    '0985-333-444',
    'villamorra@micancha.com.py',
    'Dr. Eulogio Estigarribia',
    'Asunción',
    'Asunción',
    ST_GeogFromText('POINT(-57.5815 -25.2926)'),
    '08:00:00',
    '23:00:00'
),
(
    '66666666-6666-6666-6666-666666666666',
    'Complejo Arrayanes',
    'Complejo deportivo y recreativo muy popular en San Lorenzo',
    '0986-777-888',
    'arrayanes@micancha.com.py',
    'Av. Manuel Ortiz Guerrero',
    'San Lorenzo',
    'Central',
    ST_GeogFromText('POINT(-57.5080 -25.3450)'),
    '07:00:00',
    '23:00:00'
),
(
    '77777777-7777-7777-7777-777777777777',
    'Club Social Area 1 CDE',
    'El tradicional complejo deportivo de Ciudad del Este',
    '0961-444-555',
    'area1@micancha.com.py',
    'Área 1, Ciudad del Este',
    'Ciudad del Este',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6300 -25.5150)'),
    '08:00:00',
    '22:00:00'
),
(
    '88888888-8888-8888-8888-888888888888',
    'Arena Soccer CDE',
    'Las mejores canchas sintéticas en Alto Paraná',
    '0962-666-777',
    'arenasoccer@micancha.com.py',
    'Barrio Fátima, Ciudad del Este',
    'Ciudad del Este',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6150 -25.5350)'),
    '09:00:00',
    '00:00:00'
),
(
    '99999999-9999-9999-9999-999999999999',
    'Box Padel Club Encarnacion',
    'Canchas de pádel techadas a pasos de la Costanera en Itapúa',
    '0991-222-333',
    'boxpadel@micancha.com.py',
    'Av. Costanera Padre Bolik',
    'Encarnación',
    'Itapúa',
    ST_GeogFromText('POINT(-55.8660 -27.3300)'),
    '07:00:00',
    '23:00:00'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Fut-Padel Court Encarnacion',
    'Canchas sintéticas y de pádel premium en el corazón de Itapúa',
    '0992-444-555',
    'futpadel@micancha.com.py',
    'Ruta 1 y Costanera',
    'Encarnación',
    'Itapúa',
    ST_GeogFromText('POINT(-55.8500 -27.3380)'),
    '08:00:00',
    '00:00:00'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'San Ber Arena',
    'Complejo de pádel y fútbol al aire libre en San Bernardino',
    '0985-111-222',
    'sanberarena@micancha.com.py',
    'Av. Luis F. Vache c/ Colon',
    'San Bernardino',
    'Cordillera',
    ST_GeogFromText('POINT(-57.2960 -25.3120)'),
    '07:00:00',
    '01:00:00'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Club Caacupe Padel',
    'Las mejores canchas de pádel en la villa serrana',
    '0984-333-444',
    'caacupe@micancha.com.py',
    'Calle Teniente Fariña',
    'Caacupé',
    'Cordillera',
    ST_GeogFromText('POINT(-57.1420 -25.3850)'),
    '08:00:00',
    '23:00:00'
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'La MORENA Padel Club',
    'Canchas profesionales con los mejores torneos de Caaguazú',
    '0983-444-555',
    'lamorena@micancha.com.py',
    'Ruta Dr. Blas Garay',
    'Coronel Oviedo',
    'Caaguazú',
    ST_GeogFromText('POINT(-56.4420 -25.4460)'),
    '07:00:00',
    '23:00:00'
),
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Quinchito Padel Club',
    'Gran ambiente deportivo y canchas de alta calidad en Oviedo',
    '0982-555-666',
    'quinchito@micancha.com.py',
    'Barrio Santa Lucía',
    'Coronel Oviedo',
    'Caaguazú',
    ST_GeogFromText('POINT(-56.4520 -25.4380)'),
    '08:00:00',
    '00:00:00'
),
(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Complejo Recreativo La Cascada',
    'Canchas y piscinas familiares en Canindeyú',
    '0981-666-777',
    'lacascada@micancha.com.py',
    'Av. Paraguay',
    'Salto del Guairá',
    'Canindeyú',
    ST_GeogFromText('POINT(-54.3060 -24.0620)'),
    '09:00:00',
    '22:00:00'
),
(
    '12121212-1212-1212-1212-121212121212',
    'Sintetico San Jorge',
    'Las mejores canchas de pasto sintético en Salto del Guairá',
    '0986-888-999',
    'sanjorge@micancha.com.py',
    'Ruta Internacional',
    'Salto del Guairá',
    'Canindeyú',
    ST_GeogFromText('POINT(-54.3120 -24.0700)'),
    '08:00:00',
    '00:00:00'
),
(
    '13131313-1313-1313-1313-131313131313',
    'Concepcion Arena',
    'El principal complejo multideportivo de Concepción',
    '0987-999-111',
    'concepcionarena@micancha.com.py',
    'Av. Agustín Fernando de Pinedo',
    'Concepción',
    'Concepción',
    ST_GeogFromText('POINT(-57.4360 -23.4080)'),
    '09:00:00',
    '23:00:00'
),
(
    '14141414-1414-1414-1414-141414141414',
    'Club Concepcion Padel',
    'El punto de encuentro para el pádel en el norte del país',
    '0988-111-222',
    'concepcionpadel@micancha.com.py',
    'Calle Presidente Franco',
    'Concepción',
    'Concepción',
    ST_GeogFromText('POINT(-57.4420 -23.4150)'),
    '08:00:00',
    '23:00:00'
),
(
    '21212121-2121-2121-2121-212121212121',
    'Chaco Sports Complejo',
    'El principal complejo multideportivo del Bajo Chaco',
    '0985-666-777',
    'chacosports@micancha.com.py',
    'Ruta Transchaco Km 31',
    'Villa Hayes',
    'Presidente Hayes',
    ST_GeogFromText('POINT(-57.5250 -25.0930)'),
    '07:00:00',
    '00:00:00'
),
(
    '23232323-2323-2323-2323-232323232323',
    'Complejo Deportivo Filadelfia',
    'El centro del deporte y la recreación en el Chaco Central',
    '0984-777-888',
    'filadelfia@micancha.com.py',
    'Av. Hindenburg',
    'Filadelfia',
    'Boquerón',
    ST_GeogFromText('POINT(-60.0320 -22.3520)'),
    '08:00:00',
    '23:00:00'
),
(
    '24242424-2424-2424-2424-242424242424',
    'Hernandarias Padel Club',
    'Canchas profesionales de pádel de cristal al norte de Alto Paraná',
    '0986-999-111',
    'hernandarias@micancha.com.py',
    'Av. El Mensú',
    'Hernandarias',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6400 -25.4080)'),
    '07:00:00',
    '23:00:00'
),
(
    '25252525-2525-2525-2525-252525252525',
    'Presidente Franco Soccer',
    'Canchas sintéticas de alta calidad en las tres fronteras',
    '0987-111-222',
    'franco@micancha.com.py',
    'Av. Bernardino Caballero',
    'Presidente Franco',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6150 -25.5680)'),
    '08:00:00',
    '00:00:00'
),
(
    '26262626-2626-2626-2626-262626262626',
    'Guarani Padel Center CDE',
    'Las pistas de cristal techadas de mayor reputación en Ciudad del Este',
    '0988-222-333',
    'guaranipadel@micancha.com.py',
    'Av. Rogelio Benítez',
    'Ciudad del Este',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6280 -25.5220)'),
    '07:00:00',
    '23:00:00'
),
(
    '27272727-2727-2727-2727-272727272727',
    'Yacht y Golf Club Paraguayo',
    'La cuna del tenis y el deporte de alto nivel en Paraguay',
    '0981-555-555',
    'yacht@micancha.com.py',
    'Av. del Yacht',
    'Lambaré',
    'Central',
    ST_GeogFromText('POINT(-57.6520 -25.3720)'),
    '06:00:00',
    '23:59:00'
),
(
    '28282828-2828-2828-2828-282828282828',
    'Capiata Padel & Soccer',
    'El mejor punto de encuentro deportivo de la Ruta 2',
    '0982-666-666',
    'capiata@micancha.com.py',
    'Ruta 2 Km 18',
    'Capiatá',
    'Central',
    ST_GeogFromText('POINT(-57.4420 -25.3520)'),
    '08:00:00',
    '01:00:00'
),
(
    '29292929-2929-2929-2929-292929292929',
    'Fernando de la Mora Complejo',
    'Canchas sintéticas y de pádel premium en Zona Sur',
    '0983-777-777',
    'fernando@micancha.com.py',
    'Av. 11 de Septiembre',
    'Fernando de la Mora',
    'Central',
    ST_GeogFromText('POINT(-57.5620 -25.3280)'),
    '08:00:00',
    '00:00:00'
),
(
    '30303030-3030-3030-3030-303030303030',
    'Arasa Padel Villarrica',
    'El club de pádel más importante y concurrido del departamento del Guairá',
    '0984-888-888',
    'arasapadel@micancha.com.py',
    'Avenida España',
    'Villarrica',
    'Guairá',
    ST_GeogFromText('POINT(-56.4420 -25.7820)'),
    '07:00:00',
    '23:00:00'
),
(
    '15151515-1515-1515-1515-151515151515',
    'Aventura Centro Deportivo',
    'Excelente complejo multideportivo en Lambaré, ideal para fútbol y pádel',
    '0981-222-333',
    'aventura@micancha.com.py',
    'Avda. Primero de Marzo y Cacique Lambaré',
    'Lambaré',
    'Central',
    ST_GeogFromText('POINT(-57.6250 -25.3410)'),
    '07:00:00',
    '23:00:00'
),
(
    '16161616-1616-1616-1616-161616161616',
    'Guggiari Padel & Bar',
    'Un punto de encuentro muy popular que combina juego competitivo con un excelente tercer tiempo',
    '0982-333-444',
    'guggiari@micancha.com.py',
    'Av. Guggiari c/ Pirizal',
    'Lambaré',
    'Central',
    ST_GeogFromText('POINT(-57.6180 -25.3280)'),
    '08:00:00',
    '23:59:00'
),
(
    '17171717-1717-1717-1717-171717171717',
    'Laguna Padel Club',
    'Complejo de pádel con canchas de vidrio templado de primer nivel profesional',
    '0983-444-555',
    'laguna@micancha.com.py',
    'Calle Laguna Grande',
    'San Lorenzo',
    'Central',
    ST_GeogFromText('POINT(-57.5300 -25.3250)'),
    '07:00:00',
    '23:00:00'
),
(
    '18181818-1818-1818-1818-181818181818',
    'Central Padel Club',
    'Pistas profesionales de cristal y gran ambiente deportivo y social',
    '0984-555-666',
    'centralpadel@micancha.com.py',
    'Julio César Franco 2412',
    'Fernando de la Mora',
    'Central',
    ST_GeogFromText('POINT(-57.5500 -25.3200)'),
    '07:00:00',
    '23:00:00'
),
(
    '19191919-1919-1919-1919-191919191919',
    'El Coliseo Padel Complex',
    'El complejo de pádel más imponente de Ciudad del Este con 8 canchas profesionales',
    '0985-666-777',
    'coliseo@micancha.com.py',
    'Km 8, Ciudad del Este',
    'Ciudad del Este',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6600 -25.5250)'),
    '07:00:00',
    '23:30:00'
),
(
    '20202020-2020-2020-2020-202020202020',
    'Ciudad Padel CDE',
    'Excelente infraestructura para torneos y juego diario a pasos de la Supercarretera',
    '0986-777-888',
    'ciudadpadel@micancha.com.py',
    'Avda. del Lago',
    'Ciudad del Este',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6200 -25.5180)'),
    '07:00:00',
    '23:00:00'
),
(
    '31313131-3131-3131-3131-313131313131',
    'La Choza Padel Club',
    'Excelente ambiente deportivo y canchas de primera calidad en el este del país',
    '0987-888-999',
    'lachoza@micancha.com.py',
    'Km 7, Ciudad del Este',
    'Ciudad del Este',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6500 -25.5200)'),
    '08:00:00',
    '23:00:00'
),
(
    '32323232-3232-3232-3232-323232323232',
    'J&M Futbol Center',
    'Las canchas de fútbol sintético más concurridas de la zona sur del Este',
    '0988-999-000',
    'jym@micancha.com.py',
    'Barrio Fátima Sur, Ciudad del Este',
    'Ciudad del Este',
    'Alto Paraná',
    ST_GeogFromText('POINT(-54.6180 -25.5390)'),
    '08:00:00',
    '00:00:00'
),
(
    '34343434-3434-3434-3434-343434343434',
    'Set Padel Encarnacion',
    'Canchas profesionales y una excelente comunidad de jugadores en Itapúa',
    '0975-770-017',
    'setpadel@micancha.com.py',
    'Barrio San Blas, Encarnación',
    'Encarnación',
    'Itapúa',
    ST_GeogFromText('POINT(-55.8550 -27.3220)'),
    '07:00:00',
    '23:00:00'
),
(
    '35353535-3535-3535-3535-353535353535',
    'Eseka Padel Club',
    'Pistas de cristal techadas ideales para días de lluvia, en plena costanera',
    '0995-602-231',
    'eseka@micancha.com.py',
    'Av. Caballero, Encarnación',
    'Encarnación',
    'Itapúa',
    ST_GeogFromText('POINT(-55.8620 -27.3350)'),
    '07:00:00',
    '23:00:00'
),
(
    '36363636-3636-3636-3636-363636363636',
    'Centro Encarnaceno de Deportes (CEDE)',
    'El complejo multideportivo municipal de referencia nacional frente al río Paraná',
    '0991-333-444',
    'cede@micancha.com.py',
    'Av. Costanera Padre Bolik, Encarnación',
    'Encarnación',
    'Itapúa',
    ST_GeogFromText('POINT(-55.8690 -27.3280)'),
    '06:00:00',
    '23:00:00'
),
(
    '91919191-9191-9191-9191-919191919191',
    'San Lorenzo Padel Arena',
    'El complejo de pádel techado más grande de San Lorenzo, climatizado y con vestuarios de primer nivel.',
    '0981-222-777',
    'arena@micancha.com.py',
    'Av. Mariscal Estigarribia Km 9',
    'San Lorenzo',
    'Central',
    ST_GeogFromText('POINT(-57.5180 -25.3390)'),
    '07:00:00',
    '23:30:00'
),
(
    '92929292-9292-9292-9292-929292929292',
    'La Terraza Fútbol Club',
    'Canchas de fútbol sintético techadas y al aire libre, cantina climatizada para el mejor tercer tiempo.',
    '0971-444-555',
    'laterraza@micancha.com.py',
    'Calle 14 de Mayo c/ España',
    'San Lorenzo',
    'Central',
    ST_GeogFromText('POINT(-57.5090 -25.3420)'),
    '08:00:00',
    '00:00:00'
),
(
    '93939393-9393-9393-9393-939393939393',
    'Fernando Padel Center',
    'Pistas de cristal panorámicas oficiales del WPT, equipadas con iluminación LED de alta definición.',
    '0983-888-222',
    'fernandopadel@micancha.com.py',
    'Av. Santa Teresa c/ Cnel. Martínez',
    'Fernando de la Mora',
    'Central',
    ST_GeogFromText('POINT(-57.5450 -25.3050)'),
    '07:00:00',
    '23:00:00'
),
(
    '94949494-9494-9494-9494-949494949494',
    'Complejo Deportivo 3 de Febrero',
    'Estadio de fútbol 5 y 7 con césped sintético de calidad FIFA Pro, ideal para torneos empresariales.',
    '0984-999-333',
    'complejo3febrero@micancha.com.py',
    'Av. Zavala Cué',
    'Fernando de la Mora',
    'Central',
    ST_GeogFromText('POINT(-57.5650 -25.3350)'),
    '08:00:00',
    '23:59:00'
)
ON CONFLICT DO NOTHING;

INSERT INTO cancha.canchas (complejo_id, nombre, deporte, superficie, precio_hora, numero_orden, color)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Cancha 1', 'Fútbol 5', 'Sintético', 120000, 1, '#10B981'),
    ('11111111-1111-1111-1111-111111111111', 'Cancha 2', 'Fútbol 7', 'Sintético', 170000, 2, '#3B82F6'),
    ('11111111-1111-1111-1111-111111111111', 'Cancha 3', 'Pádel', 'Sintético', 100000, 3, '#F59E0B'),
    
    ('22222222-2222-2222-2222-222222222222', 'Cancha 1', 'Fútbol 5', 'Sintético', 110000, 1, '#10B981'),
    ('22222222-2222-2222-2222-222222222222', 'Cancha 2', 'Fútbol 7', 'Sintético', 160000, 2, '#3B82F6'),
    ('22222222-2222-2222-2222-222222222222', 'Pista 1', 'Pádel', 'Cristal', 90000, 3, '#F59E0B'),
    ('22222222-2222-2222-2222-222222222222', 'Cancha Tenis', 'Tenis', 'Arcilla', 80000, 4, '#EF4444'),
    
    ('33333333-3333-3333-3333-333333333333', 'Pista Cristal', 'Pádel', 'Cristal', 100000, 1, '#F59E0B'),
    ('33333333-3333-3333-3333-333333333333', 'Cancha 1', 'Tenis', 'Rápida', 90000, 2, '#EF4444'),
    
    ('44444444-4444-4444-4444-444444444444', 'Pista 1', 'Pádel', 'Cristal', 110000, 1, '#F59E0B'),
    ('44444444-4444-4444-4444-444444444444', 'Cancha Tenis', 'Tenis', 'Arcilla', 85000, 2, '#EF4444'),
    
    ('55555555-5555-5555-5555-555555555555', 'Cancha Central', 'Pádel', 'Cristal', 95000, 1, '#F59E0B'),

    ('66666666-6666-6666-6666-666666666666', 'Cancha Sintética 1', 'Fútbol 5', 'Sintético', 130000, 1, '#10B981'),
    ('66666666-6666-6666-6666-666666666666', 'Cancha Sintética 2', 'Fútbol 7', 'Sintético', 180000, 2, '#3B82F6'),
    ('66666666-6666-6666-6666-666666666666', 'Pista Pádel', 'Pádel', 'Cristal', 100000, 3, '#F59E0B'),

    ('77777777-7777-7777-7777-777777777777', 'Cancha 1', 'Fútbol 5', 'Sintético', 140000, 1, '#10B981'),
    ('77777777-7777-7777-7777-777777777777', 'Cancha 2', 'Tenis', 'Arcilla', 90000, 2, '#EF4444'),

    ('88888888-8888-8888-8888-888888888888', 'Cancha Central', 'Fútbol 7', 'Sintético', 190000, 1, '#3B82F6'),
    ('88888888-8888-8888-8888-888888888888', 'Cancha Auxiliar', 'Fútbol 5', 'Sintético', 130000, 2, '#10B981'),

    ('99999999-9999-9999-9999-999999999999', 'Pista 1 (Panorámica)', 'Pádel', 'Cristal', 120000, 1, '#F59E0B'),
    ('99999999-9999-9999-9999-999999999999', 'Pista 2', 'Pádel', 'Cristal', 110000, 2, '#F59E0B'),

    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cancha 1', 'Fútbol 5', 'Sintético', 120000, 1, '#10B981'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pista 2', 'Pádel', 'Cristal', 90000, 2, '#F59E0B'),

    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cancha Sintética', 'Fútbol 5', 'Sintético', 130000, 1, '#10B981'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pista 1', 'Pádel', 'Cristal', 100000, 2, '#F59E0B'),

    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pista Central', 'Pádel', 'Cristal', 95000, 1, '#F59E0B'),

    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Pista 1', 'Pádel', 'Cristal', 90000, 1, '#F59E0B'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Pista 2', 'Pádel', 'Cristal', 90000, 2, '#F59E0B'),

    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Pista Cristal', 'Pádel', 'Cristal', 95000, 1, '#F59E0B'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Cancha Fútbol', 'Fútbol 5', 'Sintético', 120000, 2, '#10B981'),

    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Cancha Principal', 'Fútbol 7', 'Sintético', 180000, 1, '#3B82F6'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Cancha Chica', 'Fútbol 5', 'Sintético', 120000, 2, '#10B981'),

    ('12121212-1212-1212-1212-121212121212', 'Cancha Central', 'Fútbol 5', 'Sintético', 130000, 1, '#10B981'),

    ('13131313-1313-1313-1313-131313131313', 'Estadio Central', 'Fútbol 7', 'Sintético', 180000, 1, '#3B82F6'),
    ('13131313-1313-1313-1313-131313131313', 'Estadio Chico', 'Fútbol 5', 'Sintético', 120000, 2, '#10B981'),

    ('14141414-1414-1414-1414-141414141414', 'Pista 1', 'Pádel', 'Cristal', 100000, 1, '#F59E0B'),

    ('21212121-2121-2121-2121-212121212121', 'Cancha Sintética', 'Fútbol 5', 'Sintético', 130000, 1, '#10B981'),
    ('21212121-2121-2121-2121-212121212121', 'Cancha 2', 'Fútbol 7', 'Sintético', 180000, 2, '#3B82F6'),

    ('23232323-2323-2323-2323-232323232323', 'Cancha 1', 'Fútbol 7', 'Sintético', 170000, 1, '#3B82F6'),
    ('23232323-2323-2323-2323-232323232323', 'Tenis Rápida', 'Tenis', 'Rápida', 90000, 2, '#EF4444'),

    ('24242424-2424-2424-2424-242424242424', 'Pista 1', 'Pádel', 'Cristal', 90000, 1, '#F59E0B'),
    ('24242424-2424-2424-2424-242424242424', 'Pista 2', 'Pádel', 'Cristal', 90000, 2, '#F59E0B'),

    ('25252525-2525-2525-2525-252525252525', 'Cancha Sintética', 'Fútbol 5', 'Sintético', 120000, 1, '#10B981'),
    ('25252525-2525-2525-2525-252525252525', 'Cancha Grande', 'Fútbol 7', 'Sintético', 170000, 2, '#3B82F6'),

    ('26262626-2626-2626-2626-262626262626', 'Pista 1', 'Pádel', 'Cristal', 100000, 1, '#F59E0B'),
    ('26262626-2626-2626-2626-262626262626', 'Pista 2', 'Pádel', 'Cristal', 100000, 2, '#F59E0B'),
    ('26262626-2626-2626-2626-262626262626', 'Pista 3', 'Pádel', 'Cristal', 100000, 3, '#F59E0B'),

    ('27272727-2727-2727-2727-272727272727', 'Cancha Tenis Central', 'Tenis', 'Arcilla', 120000, 1, '#EF4444'),
    ('27272727-2727-2727-2727-272727272727', 'Cancha Tenis 2', 'Tenis', 'Arcilla', 100000, 2, '#EF4444'),
    ('27272727-2727-2727-2727-272727272727', 'Pista Pádel', 'Pádel', 'Cristal', 110000, 3, '#F59E0B'),

    ('28282828-2828-2828-2828-282828282828', 'Cancha Sintética', 'Fútbol 5', 'Sintético', 120000, 1, '#10B981'),
    ('28282828-2828-2828-2828-282828282828', 'Pista Pádel', 'Pádel', 'Cristal', 95000, 2, '#F59E0B'),

    ('29292929-2929-2929-2929-292929292929', 'Cancha Central', 'Fútbol 5', 'Sintético', 130000, 1, '#10B981'),
    ('29292929-2929-2929-2929-292929292929', 'Pista Cristal', 'Pádel', 'Cristal', 95000, 2, '#F59E0B'),

    ('30303030-3030-3030-3030-303030303030', 'Pista 1', 'Pádel', 'Cristal', 95000, 1, '#F59E0B'),
    ('30303030-3030-3030-3030-303030303030', 'Pista 2', 'Pádel', 'Cristal', 95000, 2, '#F59E0B'),
    
    -- Aventura Centro Deportivo (Lambaré - Central)
    ('15151515-1515-1515-1515-151515151515', 'Cancha Sintética 1', 'Fútbol 5', 'Sintético', 130000, 1, '#10B981'),
    ('15151515-1515-1515-1515-151515151515', 'Cancha Sintética 2', 'Fútbol 7', 'Sintético', 180000, 2, '#3B82F6'),
    ('15151515-1515-1515-1515-151515151515', 'Pista Pádel 1', 'Pádel', 'Cristal', 90000, 3, '#F59E0B'),

    -- Guggiari Padel & Bar (Lambaré - Central)
    ('16161616-1616-1616-1616-161616161616', 'Pista 1', 'Pádel', 'Cristal', 95000, 1, '#F59E0B'),
    ('16161616-1616-1616-1616-161616161616', 'Pista 2', 'Pádel', 'Cristal', 95000, 2, '#F59E0B'),

    -- Laguna Padel Club (San Lorenzo - Central)
    ('17171717-1717-1717-1717-171717171717', 'Pista Vidrio 1', 'Pádel', 'Cristal', 100000, 1, '#F59E0B'),
    ('17171717-1717-1717-1717-171717171717', 'Pista Vidrio 2', 'Pádel', 'Cristal', 100000, 2, '#F59E0B'),

    -- Central Padel Club (Fernando de la Mora - Central)
    ('18181818-1818-1818-1818-181818181818', 'Pista Cristal 1', 'Pádel', 'Cristal', 100000, 1, '#F59E0B'),
    ('18181818-1818-1818-1818-181818181818', 'Pista Cristal 2', 'Pádel', 'Cristal', 100000, 2, '#F59E0B'),

    -- El Coliseo Padel Complex (CDE - Alto Paraná)
    ('19191919-1919-1919-1919-191919191919', 'Pista Central Pro', 'Pádel', 'Cristal', 120000, 1, '#F59E0B'),
    ('19191919-1919-1919-1919-191919191919', 'Pista 2', 'Pádel', 'Cristal', 100000, 2, '#F59E0B'),
    ('19191919-1919-1919-1919-191919191919', 'Pista 3', 'Pádel', 'Cristal', 100000, 3, '#F59E0B'),
    ('19191919-1919-1919-1919-191919191919', 'Pista 4', 'Pádel', 'Cristal', 100000, 4, '#F59E0B'),

    -- Ciudad Padel CDE (CDE - Alto Paraná)
    ('20202020-2020-2020-2020-202020202020', 'Pista Cristal 1', 'Pádel', 'Cristal', 90000, 1, '#F59E0B'),
    ('20202020-2020-2020-2020-202020202020', 'Pista Cristal 2', 'Pádel', 'Cristal', 90000, 2, '#F59E0B'),

    -- La Choza Padel Club (CDE - Alto Paraná)
    ('31313131-3131-3131-3131-313131313131', 'Pista 1', 'Pádel', 'Cristal', 95000, 1, '#F59E0B'),
    ('31313131-3131-3131-3131-313131313131', 'Pista 2', 'Pádel', 'Cristal', 95000, 2, '#F59E0B'),

    -- J&M Futbol Center (CDE - Alto Paraná)
    ('32323232-3232-3232-3232-323232323232', 'Cancha Principal F8', 'Fútbol 8', 'Sintético', 190000, 1, '#3B82F6'),
    ('32323232-3232-3232-3232-323232323232', 'Cancha Chica F5', 'Fútbol 5', 'Sintético', 120000, 2, '#10B981'),

    -- Set Padel Encarnacion (Encarnación - Itapúa)
    ('34343434-3434-3434-3434-343434343434', 'Pista Set 1', 'Pádel', 'Cristal', 110000, 1, '#F59E0B'),
    ('34343434-3434-3434-3434-343434343434', 'Pista Set 2', 'Pádel', 'Cristal', 110000, 2, '#F59E0B'),

    -- Eseka Padel Club (Encarnación - Itapúa)
    ('35353535-3535-3535-3535-353535353535', 'Pista Techada 1', 'Pádel', 'Cristal', 120000, 1, '#F59E0B'),
    ('35353535-3535-3535-3535-353535353535', 'Pista Techada 2', 'Pádel', 'Cristal', 120000, 2, '#F59E0B'),

    -- Centro Encarnaceno de Deportes (CEDE) (Encarnación - Itapúa)
    ('36363636-3636-3636-3636-363636363636', 'Estadio F9', 'Fútbol 9', 'Sintético', 220000, 1, '#3B82F6'),
    ('36363636-3636-3636-3636-363636363636', 'Cancha Tenis Arcilla', 'Tenis', 'Arcilla', 100000, 2, '#EF4444'),

    -- San Lorenzo Padel Arena (San Lorenzo)
    ('91919191-9191-9191-9191-919191919191', 'Pista Techada 1', 'Pádel', 'Cristal', 110000, 1, '#F59E0B'),
    ('91919191-9191-9191-9191-919191919191', 'Pista Techada 2 (Climatizada)', 'Pádel', 'Cristal', 130000, 2, '#F59E0B'),

    -- La Terraza Fútbol Club (San Lorenzo)
    ('92929292-9292-9292-9292-929292929292', 'Cancha Sintética F5', 'Fútbol 5', 'Sintético', 120000, 1, '#10B981'),
    ('92929292-9292-9292-9292-929292929292', 'Cancha Sintética F7', 'Fútbol 7', 'Sintético', 170000, 2, '#3B82F6'),

    -- Fernando Padel Center (Fernando de la Mora)
    ('93939393-9393-9393-9393-939393939393', 'Pista Central WPT', 'Pádel', 'Cristal', 120000, 1, '#F59E0B'),
    ('93939393-9393-9393-9393-939393939393', 'Pista Cristal 2', 'Pádel', 'Cristal', 100000, 2, '#F59E0B'),

    -- Complejo Deportivo 3 de Febrero (Fernando de la Mora)
    ('94949494-9494-9494-9494-949494949494', 'Cancha F5 FIFA Pro', 'Fútbol 5', 'Sintético', 130000, 1, '#10B981'),
    ('94949494-9494-9494-9494-949494949494', 'Cancha F7 FIFA Pro', 'Fútbol 7', 'Sintético', 180000, 2, '#3B82F6')
ON CONFLICT DO NOTHING;
