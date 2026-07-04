import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, date
from fastapi import HTTPException

from routers.torneos import generar_fixture, generar_siguiente_ronda_suizo, update_partido, declarar_wo
from routers.torneos import PartidoUpdate, WORequest

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def async_session_fixture():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        echo=False
    )
    async with engine.begin() as conn:
        await conn.execute(text("ATTACH DATABASE ':memory:' AS cancha"))
        
        # Torneos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.torneos (
                id TEXT PRIMARY KEY,
                evento_id TEXT,
                complejo_id TEXT,
                nombre TEXT NOT NULL,
                categoria TEXT,
                formato TEXT DEFAULT 'liga',
                estado TEXT DEFAULT 'disponible',
                costo_inscripcion DECIMAL DEFAULT 0,
                pts_victoria INT DEFAULT 3,
                pts_empate INT DEFAULT 1,
                pts_derrota INT DEFAULT 0,
                fecha_inicio DATE,
                fecha_fin DATE,
                configuracion TEXT
            )
        """))
        
        # Equipos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.equipos (
                id TEXT PRIMARY KEY,
                torneo_id TEXT NOT NULL,
                nombre TEXT NOT NULL,
                estado_inscripcion TEXT DEFAULT 'confirmado',
                promocion INT DEFAULT 0,
                semilla INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(torneo_id) REFERENCES torneos(id)
            )
        """))

        # Partidos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.partidos (
                id TEXT PRIMARY KEY,
                torneo_id TEXT NOT NULL,
                equipo_local_id TEXT,
                equipo_visitante_id TEXT,
                goles_local INT,
                goles_visitante INT,
                estado TEXT DEFAULT 'programado',
                jornada INT,
                numero_partido INT,
                fase TEXT,
                es_wo BOOLEAN DEFAULT 0,
                equipo_wo_id TEXT,
                ganador_id TEXT,
                fecha_hora TIMESTAMP,
                fecha_hora_fin_real TIMESTAMP,
                acta_cerrada_en TIMESTAMP,
                FOREIGN KEY(torneo_id) REFERENCES torneos(id),
                FOREIGN KEY(equipo_local_id) REFERENCES torneos_equipos(id),
                FOREIGN KEY(equipo_visitante_id) REFERENCES torneos_equipos(id)
            )
        """))

        # Posiciones
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.posiciones (
                id TEXT PRIMARY KEY,
                torneo_id TEXT NOT NULL,
                torneo_equipo_id TEXT NOT NULL,
                posicion INT,
                pj INT DEFAULT 0,
                pg INT DEFAULT 0,
                pe INT DEFAULT 0,
                pp INT DEFAULT 0,
                gf INT DEFAULT 0,
                gc INT DEFAULT 0,
                dg INT DEFAULT 0,
                pts INT DEFAULT 0,
                pts_fair_play_neg INT DEFAULT 0,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(torneo_id, torneo_equipo_id)
            )
        """))

        # Goles
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.goles (
                id TEXT PRIMARY KEY,
                partido_id TEXT NOT NULL,
                player_id TEXT,
                equipo_id TEXT,
                minuto INT,
                tipo TEXT,
                anulado BOOLEAN DEFAULT 0
            )
        """))

        # Tarjetas
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS torneos.tarjetas (
                id TEXT PRIMARY KEY,
                partido_id TEXT NOT NULL,
                player_id TEXT NOT NULL,
                equipo_id TEXT NOT NULL,
                minuto INT,
                tipo TEXT,
                pts_fair_play INT DEFAULT 0,
                genera_suspension BOOLEAN DEFAULT 0,
                partidos_suspension INT DEFAULT 0,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    session = async_session_maker()
    try:
        yield session
    finally:
        await session.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_format_eliminatoria_bracket(async_session_fixture):
    """Playoffs / Eliminatoria Directa: Generación de fixture inicial de bracket para 4 equipos, avance a Final"""
    session = async_session_fixture
    hoy = date.today()

    await session.execute(text("INSERT INTO torneos.torneos (id, nombre, formato, fecha_inicio, configuracion) VALUES ('t_elim', 'Torneo Playoffs', 'eliminatoria', :hoy, '{\"tipo_sorteo_playoffs\": \"siembra\"}')"), {"hoy": hoy})
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq1', 't_elim', 'Equipo A', 1)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq2', 't_elim', 'Equipo B', 2)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq3', 't_elim', 'Equipo C', 3)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq4', 't_elim', 'Equipo D', 4)"))
    await session.commit()

    # Generar fixture inicial (debería crear 2 semifinales)
    res = await generar_fixture(torneo_id='t_elim', session=session)
    assert "2 partidos" in res["message"]

    # Verificar fase y partidos
    p_res = await session.execute(text("SELECT id, fase, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE torneo_id = 't_elim'"))
    partidos = p_res.fetchall()
    assert len(partidos) == 2
    for p in partidos:
        assert p[1] == "Semifinal"

    p1_id, p2_id = str(partidos[0][0]), str(partidos[1][0])

    # Finalizar primera semifinal (gana eq1 contra eq4)
    # eq1 vs eq4 (según el emparejamiento 1vs4, 2vs3)
    p1_el, p1_ev = str(partidos[0][2]), str(partidos[0][3])
    # finalizamos el partido 1 con victoria local
    payload_p1 = PartidoUpdate(goles_local=3, goles_visitante=1, estado="finalizado")
    await update_partido(partido_id=p1_id, payload=payload_p1, session=session)

    # Verificar que no se ha generado la final aún (falta el otro partido)
    p_final_res = await session.execute(text("SELECT COUNT(*) FROM torneos.partidos WHERE torneo_id = 't_elim' AND fase = 'Final'"))
    assert p_final_res.scalar() == 0

    # Finalizar segunda semifinal (gana eq2 contra eq3)
    payload_p2 = PartidoUpdate(goles_local=4, goles_visitante=2, estado="finalizado")
    await update_partido(partido_id=p2_id, payload=payload_p2, session=session)

    # Ahora sí, al completarse todos los de la ronda, debió generarse la Final
    p_final_res2 = await session.execute(text("SELECT id, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE torneo_id = 't_elim' AND fase = 'Final'"))
    final = p_final_res2.fetchone()
    assert final is not None
    # Los ganadores (eq1 y eq2) deberían enfrentarse en la Final
    assert {str(final[1]), str(final[2])} == {'eq1', 'eq2'}


@pytest.mark.asyncio
async def test_format_mixto_groups_to_playoffs(async_session_fixture):
    """Mixto: División en Grupo A y Grupo B, al finalizar todos los partidos, avanza a Semifinales de Playoffs"""
    session = async_session_fixture
    hoy = date.today()

    await session.execute(text("INSERT INTO torneos.torneos (id, nombre, formato, fecha_inicio, configuracion) VALUES ('t_mix', 'Torneo Mixto', 'mixta', :hoy, '{\"tipo_sorteo_playoffs\": \"siembra\"}')"), {"hoy": hoy})
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq1', 't_mix', 'Equipo 1', 1)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq2', 't_mix', 'Equipo 2', 2)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq3', 't_mix', 'Equipo 3', 3)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq4', 't_mix', 'Equipo 4', 4)"))
    await session.commit()

    # Generar fixture
    res = await generar_fixture(torneo_id='t_mix', session=session)
    # Grupo A (eq1, eq3) -> 1 partido de ida
    # Grupo B (eq2, eq4) -> 1 partido de ida
    # Total = 2 partidos de grupos
    assert "2 partidos" in res["message"]

    p_res = await session.execute(text("SELECT id, fase, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE torneo_id = 't_mix'"))
    partidos = p_res.fetchall()
    assert len(partidos) == 2
    assert "Grupo A" in partidos[0][1] or "Grupo B" in partidos[0][1]
    assert "Grupo A" in partidos[1][1] or "Grupo B" in partidos[1][1]

    # Finalizar los dos partidos de grupos
    # Partido 1 (Grupo A) -> Gana eq1 (3 pts) sobre eq3 (0 pts)
    await update_partido(partido_id=str(partidos[0][0]), payload=PartidoUpdate(goles_local=3, goles_visitante=0, estado="finalizado"), session=session)
    # Partido 2 (Grupo B) -> Gana eq2 (3 pts) sobre eq4 (0 pts)
    await update_partido(partido_id=str(partidos[1][0]), payload=PartidoUpdate(goles_local=2, goles_visitante=1, estado="finalizado"), session=session)

    # Debió gatillar la transición de fase de grupos a Playoffs (Semifinal)
    p_sf_res = await session.execute(text("SELECT id, fase, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE torneo_id = 't_mix' AND fase = 'Semifinal'"))
    sf_partidos = p_sf_res.fetchall()
    # 1º Grupo A vs 2º Grupo B, y 1º Grupo B vs 2º Grupo A
    # Eq A1 (eq1) vs Eq B2 (eq4)
    # Eq B1 (eq2) vs Eq A2 (eq3)
    assert len(sf_partidos) == 2
    cruce1 = {str(sf_partidos[0][2]), str(sf_partidos[0][3])}
    cruce2 = {str(sf_partidos[1][2]), str(sf_partidos[1][3])}
    assert cruce1 == {'eq1', 'eq4'} or cruce1 == {'eq2', 'eq3'}
    assert cruce2 == {'eq1', 'eq4'} or cruce2 == {'eq2', 'eq3'}


@pytest.mark.asyncio
async def test_format_suizo_system(async_session_fixture):
    """Sistema Suizo: Generación de Ronda 1, simulación de juego y generación de Ronda 2 evitando repeticiones"""
    session = async_session_fixture
    hoy = date.today()

    await session.execute(text("INSERT INTO torneos.torneos (id, nombre, formato, fecha_inicio, configuracion) VALUES ('t_suizo', 'Torneo Suizo', 'suizo', :hoy, '{\"tipo_sorteo_playoffs\": \"siembra\", \"rondas_suizo\": 2}')"), {"hoy": hoy})
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq1', 't_suizo', 'Equipo 1', 1)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq2', 't_suizo', 'Equipo 2', 2)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq3', 't_suizo', 'Equipo 3', 3)"))
    await session.execute(text("INSERT INTO torneos.equipos (id, torneo_id, nombre, semilla) VALUES ('eq4', 't_suizo', 'Equipo 4', 4)"))
    await session.commit()

    # Generar Ronda 1
    res = await generar_fixture(torneo_id='t_suizo', session=session)
    assert "2 partidos" in res["message"]

    p_res = await session.execute(text("SELECT id, fase, equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE torneo_id = 't_suizo'"))
    partidos = p_res.fetchall()
    assert len(partidos) == 2
    assert partidos[0][1] == "Suizo - Ronda 1"

    # Simular resultados Ronda 1:
    # Partido 1 (eq1 vs eq4): Gana eq1
    await update_partido(partido_id=str(partidos[0][0]), payload=PartidoUpdate(goles_local=2, goles_visitante=0, estado="finalizado"), session=session)
    # Partido 2 (eq2 vs eq3): Gana eq2
    await update_partido(partido_id=str(partidos[1][0]), payload=PartidoUpdate(goles_local=3, goles_visitante=1, estado="finalizado"), session=session)

    # Generar Ronda 2
    res_r2 = await generar_siguiente_ronda_suizo(torneo_id='t_suizo', session=session)
    assert "Ronda 2" in res_r2["message"]

    # Verificar emparejamientos de la Ronda 2:
    # Ganadores (eq1 y eq2 con 3 pts) deben jugar entre ellos.
    # Perdedores (eq3 y eq4 con 0 pts) deben jugar entre ellos.
    p_r2_res = await session.execute(text("SELECT equipo_local_id, equipo_visitante_id FROM torneos.partidos WHERE torneo_id = 't_suizo' AND fase = 'Suizo - Ronda 2'"))
    r2_partidos = p_r2_res.fetchall()
    assert len(r2_partidos) == 2
    
    r2_cruce1 = {str(r2_partidos[0][0]), str(r2_partidos[0][1])}
    r2_cruce2 = {str(r2_partidos[1][0]), str(r2_partidos[1][1])}
    
    assert r2_cruce1 == {'eq1', 'eq2'} or r2_cruce1 == {'eq3', 'eq4'}
    assert r2_cruce2 == {'eq1', 'eq2'} or r2_cruce2 == {'eq3', 'eq4'}
