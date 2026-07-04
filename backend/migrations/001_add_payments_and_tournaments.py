"""
Migration: Agregar tablas de pagos, goles, tarjetas y sanciones
Timestamp: 2026-05-17
"""

migration_up = """
-- ==========================================
-- 1. TABLA DE PAGOS
-- ==========================================
CREATE TABLE IF NOT EXISTS cancha.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_team_id UUID NOT NULL REFERENCES torneos.equipos(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',
    provider VARCHAR(20) NOT NULL, -- mercadopago, stripe, cash
    provider_payment_id VARCHAR(255),
    provider_preference_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, approved, rejected, refunded, cancelled
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_amount DECIMAL(10,2),
    received_by VARCHAR(255), -- para pagos en efectivo
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_tournament_team ON cancha.payments(tournament_team_id);
CREATE INDEX idx_payments_provider_id ON cancha.payments(provider_payment_id);
CREATE INDEX idx_payments_status ON cancha.payments(status);
CREATE INDEX idx_payments_created ON cancha.payments(created_at);

-- ==========================================
-- 2. TABLA DE JUGADORES EN TORNEO
-- ==========================================
CREATE TABLE IF NOT EXISTS cancha.tournament_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_team_id UUID NOT NULL REFERENCES torneos.equipos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE,
    numero_camiseta INT NOT NULL,
    posicion VARCHAR(50), -- GK, DEF, MID, FWD
    foto_url VARCHAR(500),
    estado VARCHAR(20) DEFAULT 'active', -- active, suspended, injured
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_team_id, dni),
    UNIQUE(tournament_team_id, numero_camiseta)
);

CREATE INDEX idx_tournament_players_team ON cancha.tournament_players(tournament_team_id);
CREATE INDEX idx_tournament_players_dni ON cancha.tournament_players(dni);

-- ==========================================
-- 3. TABLA DE GOLES
-- ==========================================
CREATE TABLE IF NOT EXISTS cancha.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES torneos.partidos(id) ON DELETE CASCADE,
    player_id UUID REFERENCES cancha.tournament_players(id),
    team_id UUID NOT NULL REFERENCES torneos.equipos(id),
    minute INT NOT NULL,
    type VARCHAR(20) DEFAULT 'normal', -- normal, penalty, own_goal, header
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_match ON cancha.goals(match_id);
CREATE INDEX idx_goals_player ON cancha.goals(player_id);
CREATE INDEX idx_goals_team ON cancha.goals(team_id);

-- ==========================================
-- 4. TABLA DE TARJETAS
-- ==========================================
CREATE TABLE IF NOT EXISTS cancha.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES torneos.partidos(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES cancha.tournament_players(id),
    team_id UUID NOT NULL REFERENCES torneos.equipos(id),
    minute INT NOT NULL,
    type VARCHAR(20) NOT NULL, -- yellow, red, second_yellow
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_match ON cancha.cards(match_id);
CREATE INDEX idx_cards_player ON cancha.cards(player_id);
CREATE INDEX idx_cards_team ON cancha.cards(team_id);

-- ==========================================
-- 5. TABLA DE SANCIONES
-- ==========================================
CREATE TABLE IF NOT EXISTS cancha.sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES cancha.tournament_players(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES torneos.torneos(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cancha.cards(id),
    reason VARCHAR(500) NOT NULL,
    severity VARCHAR(20) DEFAULT 'mild', -- mild, serious, very_serious
    matches_suspended INT DEFAULT 1,
    matches_served INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, served, appealing, overturned
    appeal_reason TEXT,
    appeal_resolved_at TIMESTAMPTZ,
    appeal_resolved_by UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sanctions_player ON cancha.sanctions(player_id);
CREATE INDEX idx_sanctions_tournament ON cancha.sanctions(tournament_id);
CREATE INDEX idx_sanctions_status ON cancha.sanctions(status);

-- ==========================================
-- 6. ALTERAR TABLA torneos_equipos
-- ==========================================
ALTER TABLE torneos.equipos 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE torneos.equipos 
ADD COLUMN IF NOT EXISTS delegado_nombre VARCHAR(255);

ALTER TABLE torneos.equipos 
ADD COLUMN IF NOT EXISTS delegado_telefono VARCHAR(20);

ALTER TABLE torneos.equipos 
ADD COLUMN IF NOT EXISTS delegado_email VARCHAR(255);

-- ==========================================
-- 7. ALTERAR TABLA torneos
-- ==========================================
ALTER TABLE torneos.torneos 
ADD COLUMN IF NOT EXISTS sorteo_ejecutado BOOLEAN DEFAULT FALSE;

ALTER TABLE torneos.torneos 
ADD COLUMN IF NOT EXISTS sorteo_seed INT;

ALTER TABLE torneos.torneos 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- ==========================================
-- 8. MATERIALIZED VIEW - STANDINGS
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS cancha.standings AS
SELECT
    t.id AS tournament_id,
    tte.id AS tournament_team_id,
    tte.nombre_equipo,
    COUNT(DISTINCT m.id) AS played,
    COUNT(DISTINCT CASE 
        WHEN (m.equipo_local_id = tte.id AND m.resultado_local > m.resultado_visitante)
          OR (m.equipo_visitante_id = tte.id AND m.resultado_visitante > m.resultado_local)
        THEN m.id
    END) AS won,
    COUNT(DISTINCT CASE 
        WHEN m.resultado_local = m.resultado_visitante
        THEN m.id
    END) AS drawn,
    COUNT(DISTINCT CASE 
        WHEN (m.equipo_local_id = tte.id AND m.resultado_local < m.resultado_visitante)
          OR (m.equipo_visitante_id = tte.id AND m.resultado_visitante < m.resultado_local)
        THEN m.id
    END) AS lost,
    COALESCE(SUM(CASE 
        WHEN m.equipo_local_id = tte.id THEN m.resultado_local 
        WHEN m.equipo_visitante_id = tte.id THEN m.resultado_visitante 
        ELSE 0 
    END), 0) AS goals_for,
    COALESCE(SUM(CASE 
        WHEN m.equipo_local_id = tte.id THEN m.resultado_visitante 
        WHEN m.equipo_visitante_id = tte.id THEN m.resultado_local 
        ELSE 0 
    END), 0) AS goals_against,
    (COUNT(DISTINCT CASE 
        WHEN (m.equipo_local_id = tte.id AND m.resultado_local > m.resultado_visitante)
          OR (m.equipo_visitante_id = tte.id AND m.resultado_visitante > m.resultado_local)
        THEN m.id
    END) * 3 + COUNT(DISTINCT CASE 
        WHEN m.resultado_local = m.resultado_visitante
        THEN m.id
    END)) AS points
FROM torneos.torneos t
JOIN torneos.equipos tte ON tte.torneo_id = t.id
LEFT JOIN torneos.partidos m ON 
    (m.equipo_local_id = tte.id OR m.equipo_visitante_id = tte.id)
    AND m.estado = 'finalizado'
GROUP BY t.id, tte.id, tte.nombre_equipo
ORDER BY t.id, points DESC, goals_for - goals_against DESC;

CREATE INDEX idx_standings_tournament ON cancha.standings(tournament_id);
"""

migration_down = """
-- Revertir migración (si es necesario)
DROP MATERIALIZED VIEW IF EXISTS cancha.standings;
DROP TABLE IF EXISTS cancha.sanctions;
DROP TABLE IF EXISTS cancha.cards;
DROP TABLE IF EXISTS cancha.goals;
DROP TABLE IF EXISTS cancha.tournament_players;
DROP TABLE IF EXISTS cancha.payments;

ALTER TABLE torneos.equipos 
DROP COLUMN IF EXISTS payment_status;
ALTER TABLE torneos.equipos 
DROP COLUMN IF EXISTS delegado_nombre;
ALTER TABLE torneos.equipos 
DROP COLUMN IF EXISTS delegado_telefono;
ALTER TABLE torneos.equipos 
DROP COLUMN IF EXISTS delegado_email;

ALTER TABLE torneos.torneos 
DROP COLUMN IF EXISTS sorteo_ejecutado;
ALTER TABLE torneos.torneos 
DROP COLUMN IF EXISTS sorteo_seed;
ALTER TABLE torneos.torneos 
DROP COLUMN IF EXISTS config;
"""
