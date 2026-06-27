import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, date
from fastapi import HTTPException
from pydantic import BaseModel

# Mock schemas to import or use
from routers.torneos import JugadorCreate, WORequest, add_jugador, declarar_wo

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
        
        # Complejos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.complejos (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                configuracion TEXT DEFAULT '{}'
            )
        """))

        # Torneos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.torneos (
                id TEXT PRIMARY KEY,
                complejo_id TEXT,
                nombre TEXT NOT NULL,
                categoria TEXT DEFAULT 'Primera',
                estado TEXT DEFAULT 'disponible',
                costo_inscripcion DECIMAL DEFAULT 0,
                pts_victoria INT DEFAULT 3,
                pts_empate INT DEFAULT 1,
                pts_derrota INT DEFAULT 0,
                formato TEXT DEFAULT 'liga',
                fecha_inicio DATE,
                config TEXT DEFAULT '{}',
                configuracion TEXT DEFAULT '{}',
                FOREIGN KEY(complejo_id) REFERENCES complejos(id)
            )
        """))
        
        # Equipos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.torneos_equipos (
                id TEXT PRIMARY KEY,
                torneo_id TEXT NOT NULL,
                nombre TEXT NOT NULL,
                estado_inscripcion TEXT DEFAULT 'pendiente',
                promocion INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(torneo_id) REFERENCES torneos(id)
            )
        """))
        
        # Jugadores
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.tournament_players (
                id TEXT PRIMARY KEY,
                torneo_id TEXT,
                torneo_equipo_id TEXT NOT NULL,
                nombre TEXT NOT NULL,
                dni TEXT NOT NULL,
                fecha_nacimiento DATE,
                numero_camiseta INT,
                posicion TEXT,
                foto_url TEXT,
                estado TEXT DEFAULT 'habilitado',
                partidos_jugados INT DEFAULT 0,
                amarillas_acum INT DEFAULT 0,
                rojas_acum INT DEFAULT 0,
                egreso_ano INT,
                es_exalumno BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(torneo_equipo_id) REFERENCES torneos_equipos(id)
            )
        """))

        # Partidos
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.torneos_partidos (
                id TEXT PRIMARY KEY,
                torneo_id TEXT NOT NULL,
                equipo_local_id TEXT NOT NULL,
                equipo_visitante_id TEXT NOT NULL,
                goles_local INT,
                goles_visitante INT,
                estado TEXT DEFAULT 'programado',
                jornada INT,
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
            CREATE TABLE IF NOT EXISTS cancha.torneos_posiciones (
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

        # Tarjetas
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cancha.torneos_tarjetas (
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
async def test_add_player_validation_exalumno_same_year(async_session_fixture):
    """Jugador exalumno del mismo año de promoción: Habilitado sin límites de refuerzo"""
    session = async_session_fixture
    
    # Setup Torneo & Equipo (Promo 2020)
    await session.execute(text("INSERT INTO cancha.torneos (id, nombre, categoria) VALUES ('t1', 'Liga A', 'Primera')"))
    await session.execute(text("INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre, promocion) VALUES ('eq1', 't1', 'Promo 2020', 2020)"))
    await session.commit()

    payload = JugadorCreate(
        nombre="Juan Perez",
        dni="123456",
        fecha_nacimiento="1995-05-10",
        numero_camiseta=10,
        posicion="mediocampista",
        egreso_ano=2020,
        es_exalumno=True
    )
    
    res = await add_jugador(torneo_id="t1", equipo_id="eq1", payload=payload, session=session)
    assert res["nombre"] == "Juan Perez"
    assert res["es_exalumno"] == True
    assert res["egreso_ano"] == 2020


@pytest.mark.asyncio
async def test_add_player_refuerzos_limit_standard(async_session_fixture):
    """Comprobar límite estándar de 4 refuerzos por equipo"""
    session = async_session_fixture
    current_year = datetime.now().year

    # Torneo y equipo de promo nueva (antigüedad < 15 años)
    await session.execute(text("INSERT INTO cancha.torneos (id, nombre, categoria) VALUES ('t2', 'Liga B', 'Primera')"))
    await session.execute(text(f"INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre, promocion) VALUES ('eq2', 't2', 'Promo 2022', {current_year - 5})"))
    
    # Registrar 4 refuerzos (es_exalumno = False)
    for i in range(4):
        await session.execute(text(f"""
            INSERT INTO cancha.tournament_players (id, torneo_equipo_id, nombre, dni, numero_camiseta, es_exalumno)
            VALUES ('j_ref_{i}', 'eq2', 'Refuerzo {i}', 'dni_{i}', {i+1}, 0)
        """))
    await session.commit()

    # Intentar registrar el 5to refuerzo
    payload = JugadorCreate(
        nombre="Quinto Refuerzo",
        dni="dni_5",
        fecha_nacimiento="1998-01-01",
        numero_camiseta=22,
        posicion="defensor",
        es_exalumno=False
    )
    
    with pytest.raises(HTTPException) as exc:
        await add_jugador(torneo_id="t2", equipo_id="eq2", payload=payload, session=session)
    assert exc.value.status_code == 400
    assert "Cupo de refuerzos completo" in exc.value.detail


@pytest.mark.asyncio
async def test_add_player_refuerzos_limit_old_promotion(async_session_fixture):
    """Promociones con más de 15 años de egreso permiten hasta 6 refuerzos (categoría no Primera)"""
    session = async_session_fixture
    current_year = datetime.now().year

    await session.execute(text("INSERT INTO cancha.torneos (id, nombre, categoria) VALUES ('t3', 'Liga Ejecutivo', 'Ejecutivo')"))
    await session.execute(text(f"INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre, promocion) VALUES ('eq3', 't3', 'Promo 2005', {current_year - 20})"))
    
    # Registrar 5 refuerzos
    for i in range(5):
        await session.execute(text(f"""
            INSERT INTO cancha.tournament_players (id, torneo_equipo_id, nombre, dni, numero_camiseta, es_exalumno)
            VALUES ('j_ref_{i}', 'eq3', 'Refuerzo {i}', 'dni_{i}', {i+1}, 0)
        """))
    await session.commit()

    # Agregar el 6to refuerzo (debería pasar porque el límite es 6)
    payload = JugadorCreate(
        nombre="Sexto Refuerzo",
        dni="dni_6",
        fecha_nacimiento="1980-01-01",
        numero_camiseta=33,
        posicion="delantero",
        es_exalumno=False
    )
    
    res = await add_jugador(torneo_id="t3", equipo_id="eq3", payload=payload, session=session)
    assert res["nombre"] == "Sexto Refuerzo"

    # Intentar el 7mo refuerzo (debería fallar)
    payload_fail = JugadorCreate(
        nombre="Septimo Refuerzo",
        dni="dni_7",
        fecha_nacimiento="1980-01-01",
        numero_camiseta=44,
        posicion="delantero",
        es_exalumno=False
    )
    with pytest.raises(HTTPException) as exc:
        await add_jugador(torneo_id="t3", equipo_id="eq3", payload=payload_fail, session=session)
    assert exc.value.status_code == 400
    assert "Cupo de refuerzos completo" in exc.value.detail


@pytest.mark.asyncio
async def test_add_player_viejas_glorias_exemption(async_session_fixture):
    """Exalumnos con egreso >= 25 años no cuentan en el cupo de refuerzos (viejas glorias)"""
    session = async_session_fixture
    current_year = datetime.now().year

    await session.execute(text("INSERT INTO cancha.torneos (id, nombre, categoria) VALUES ('t4', 'Liga Senior', 'Senior')"))
    await session.execute(text(f"INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre, promocion) VALUES ('eq4', 't4', 'Promo 2015', {current_year - 9})"))
    
    # Registrar 4 refuerzos regulares (es_exalumno = False)
    for i in range(4):
        await session.execute(text(f"""
            INSERT INTO cancha.tournament_players (id, torneo_equipo_id, nombre, dni, numero_camiseta, es_exalumno)
            VALUES ('j_ref_{i}', 'eq4', 'Refuerzo {i}', 'dni_{i}', {i+1}, 0)
        """))
    await session.commit()

    # Intentar agregar un exalumno graduado hace 30 años (Vieja Gloria)
    payload = JugadorCreate(
        nombre="Vieja Gloria",
        dni="dni_vg",
        fecha_nacimiento="1970-01-01",
        numero_camiseta=55,
        posicion="defensor",
        egreso_ano=current_year - 30,
        es_exalumno=True
    )
    
    # Debería registrarse correctamente sin lanzar error, ya que no cuenta en el cupo de 4 refuerzos
    res = await add_jugador(torneo_id="t4", equipo_id="eq4", payload=payload, session=session)
    assert res["nombre"] == "Vieja Gloria"


@pytest.mark.asyncio
async def test_add_player_ejecutivo_age_rule(async_session_fixture):
    """Categoría Ejecutivo: máximo 1 refuerzo menor de 30 años"""
    session = async_session_fixture
    current_year = datetime.now().year

    await session.execute(text("INSERT INTO cancha.torneos (id, nombre, categoria) VALUES ('t5', 'Liga Ejecutivo', 'Ejecutivo')"))
    await session.execute(text(f"INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre, promocion) VALUES ('eq5', 't5', 'Promo 2000', 2000)"))
    
    # Agregar 1 refuerzo menor de 30 años (Ej. 28 años)
    payload_ok = JugadorCreate(
        nombre="Refuerzo Joven 1",
        dni="dni_j1",
        fecha_nacimiento=f"{current_year - 28}-01-01",
        numero_camiseta=7,
        es_exalumno=False
    )
    await add_jugador(torneo_id="t5", equipo_id="eq5", payload=payload_ok, session=session)

    # Intentar agregar un segundo refuerzo menor de 30 años (Ej. 25 años)
    payload_fail = JugadorCreate(
        nombre="Refuerzo Joven 2",
        dni="dni_j2",
        fecha_nacimiento=f"{current_year - 25}-01-01",
        numero_camiseta=8,
        es_exalumno=False
    )
    
    with pytest.raises(HTTPException) as exc:
        await add_jugador(torneo_id="t5", equipo_id="eq5", payload=payload_fail, session=session)
    assert exc.value.status_code == 400
    assert "Solo se permite 1 refuerzo(s) menor(es) de 30 años" in exc.value.detail


@pytest.mark.asyncio
async def test_add_player_playoffs_block(async_session_fixture):
    """Impedir registros si el torneo ya está en playoffs"""
    session = async_session_fixture

    await session.execute(text("INSERT INTO cancha.torneos (id, nombre, estado) VALUES ('t6', 'Playoffs Torneo', 'playoffs')"))
    await session.execute(text("INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre, promocion) VALUES ('eq6', 't6', 'Promo A', 2018)"))
    await session.commit()

    payload = JugadorCreate(
        nombre="Nuevo Jugador",
        dni="dni_playoffs",
        fecha_nacimiento="2000-01-01",
        numero_camiseta=99,
        es_exalumno=True,
        egreso_ano=2018
    )

    with pytest.raises(HTTPException) as exc:
        await add_jugador(torneo_id="t6", equipo_id="eq6", payload=payload, session=session)
    assert exc.value.status_code == 400
    assert "fases de eliminación directa" in exc.value.detail


@pytest.mark.asyncio
async def test_walkover_disqualification_consecutive(async_session_fixture):
    """Un equipo es descalificado (estado_inscripcion = 'eliminado') tras 3 W.O.s consecutivos"""
    session = async_session_fixture

    await session.execute(text("INSERT INTO cancha.torneos (id, nombre) VALUES ('t7', 'Liga WO')"))
    await session.execute(text("INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre) VALUES ('eq_ok', 't7', 'Equipo OK')"))
    await session.execute(text("INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre) VALUES ('eq_wo', 't7', 'Equipo Infractor')"))
    
    # 3 partidos programados
    for i in range(1, 5):
        await session.execute(text(f"""
            INSERT INTO cancha.torneos_partidos (id, torneo_id, equipo_local_id, equipo_visitante_id, estado, jornada)
            VALUES ('partido_{i}', 't7', 'eq_wo', 'eq_ok', 'programado', {i})
        """))
    await session.commit()

    # Declarar 2 walkovers
    for i in range(1, 3):
        req = WORequest(equipo_infractor_id="eq_wo")
        await declarar_wo(partido_id=f"partido_{i}", payload=req, session=session)

    # Verificar que el equipo sigue activo
    eq_res = await session.execute(text("SELECT estado_inscripcion FROM cancha.torneos_equipos WHERE id = 'eq_wo'"))
    assert eq_res.scalar() == 'pendiente' # o el estado default

    # Declarar el 3er walkover
    req = WORequest(equipo_infractor_id="eq_wo")
    res = await declarar_wo(partido_id="partido_3", payload=req, session=session)
    
    assert res["eliminado"] == True
    
    # Verificar que el equipo está eliminado
    eq_res2 = await session.execute(text("SELECT estado_inscripcion FROM cancha.torneos_equipos WHERE id = 'eq_wo'"))
    assert eq_res2.scalar() == 'eliminado'

    # Verificar que el 4to partido (restante/programado) se canceló automáticamente y se dio como WO 0-2
    partido4 = await session.execute(text("SELECT estado, es_wo, goles_local, goles_visitante FROM cancha.torneos_partidos WHERE id = 'partido_4'"))
    p4 = partido4.fetchone()
    assert p4[0] == 'wo'
    assert p4[1] == 1 # es_wo
    assert p4[2] == 0 # goles local (infractor)
    assert p4[3] == 2 # goles visitante (ganador)


@pytest.mark.asyncio
async def test_multitenant_custom_reinforcement_limits(async_session_fixture):
    """El complex configura su propio límite de refuerzos (ej. max 2 en vez de 4)"""
    session = async_session_fixture
    current_year = datetime.now().year

    # Insertar complejo con configuración multitenant personalizada
    await session.execute(text("""
        INSERT INTO cancha.complejos (id, nombre, configuracion) 
        VALUES ('c_tenant_1', 'Complejo Tenant 1', '{"limite_refuerzos_estandar": 2}')
    """))

    # Vincular torneo al complejo
    await session.execute(text("""
        INSERT INTO cancha.torneos (id, complejo_id, nombre, categoria) 
        VALUES ('t_tenant_1', 'c_tenant_1', 'Torneo Tenant 1', 'Primera')
    """))
    await session.execute(text("INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre, promocion) VALUES ('eq_tenant_1', 't_tenant_1', 'Promo A', 2022)"))
    
    # Agregar 2 refuerzos (es_exalumno = False)
    for i in range(2):
        await session.execute(text(f"""
            INSERT INTO cancha.tournament_players (id, torneo_equipo_id, nombre, dni, numero_camiseta, es_exalumno)
            VALUES ('j_ref_{i}', 'eq_tenant_1', 'Refuerzo {i}', 'dni_{i}', {i+1}, 0)
        """))
    await session.commit()

    # Intentar registrar el 3er refuerzo (debería fallar porque el tenant configuró límite en 2)
    payload = JugadorCreate(
        nombre="Tercer Refuerzo",
        dni="dni_3",
        fecha_nacimiento="1998-01-01",
        numero_camiseta=10,
        posicion="defensor",
        es_exalumno=False
    )
    
    with pytest.raises(HTTPException) as exc:
        await add_jugador(torneo_id="t_tenant_1", equipo_id="eq_tenant_1", payload=payload, session=session)
    assert exc.value.status_code == 400
    assert "Cupo de refuerzos completo. Límite máximo para este equipo: 2 refuerzos." in exc.value.detail


@pytest.mark.asyncio
async def test_multitenant_custom_wo_disqualification_limits(async_session_fixture):
    """El complex configura su propio límite de descalificación por W.O. (ej. descalificar tras 2 W.O. consecutivos)"""
    session = async_session_fixture

    await session.execute(text("""
        INSERT INTO cancha.complejos (id, nombre, configuracion) 
        VALUES ('c_tenant_2', 'Complejo Tenant 2', '{"consecutivos_wo_descalificacion": 2}')
    """))
    await session.execute(text("""
        INSERT INTO cancha.torneos (id, complejo_id, nombre) 
        VALUES ('t_tenant_2', 'c_tenant_2', 'Torneo Tenant 2')
    """))
    await session.execute(text("INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre) VALUES ('eq_ok_t2', 't_tenant_2', 'Equipo OK')"))
    await session.execute(text("INSERT INTO cancha.torneos_equipos (id, torneo_id, nombre) VALUES ('eq_wo_t2', 't_tenant_2', 'Equipo Infractor')"))
    
    # 3 partidos programados
    for i in range(1, 4):
        await session.execute(text(f"""
            INSERT INTO cancha.torneos_partidos (id, torneo_id, equipo_local_id, equipo_visitante_id, estado, jornada)
            VALUES ('partido_{i}', 't_tenant_2', 'eq_wo_t2', 'eq_ok_t2', 'programado', {i})
        """))
    await session.commit()

    # Declarar 1er walkover
    req = WORequest(equipo_infractor_id="eq_wo_t2")
    await declarar_wo(partido_id="partido_1", payload=req, session=session)

    # Verificar que el equipo sigue activo
    eq_res = await session.execute(text("SELECT estado_inscripcion FROM cancha.torneos_equipos WHERE id = 'eq_wo_t2'"))
    assert eq_res.scalar() == 'pendiente'

    # Declarar el 2do walkover (debería descalificarlo inmediatamente por el límite custom de 2)
    res = await declarar_wo(partido_id="partido_2", payload=req, session=session)
    assert res["eliminado"] == True
    
    # Verificar que el equipo está eliminado
    eq_res2 = await session.execute(text("SELECT estado_inscripcion FROM cancha.torneos_equipos WHERE id = 'eq_wo_t2'"))
    assert eq_res2.scalar() == 'eliminado'
