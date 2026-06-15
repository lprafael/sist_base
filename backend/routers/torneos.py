"""
routers/torneos.py
Router FastAPI para el módulo completo de Gestión de Torneos.
Cubre: equipos, jugadores, planilla, goles, tarjetas, posiciones, sanciones, W.O.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date
import uuid
import json

from database import get_session
from services.facial_recognition import FacialRecognitionService

router = APIRouter(prefix="/cancha/torneos", tags=["Torneos"])


# ============================================================
# SCHEMAS PYDANTIC
# ============================================================

class TorneoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    deporte: str = "Fútbol 5"
    formato: str = "liga"           # liga | eliminatoria | mixta
    fecha_inicio: str
    max_equipos: int = 16
    costo_inscripcion: float = 0.0
    complejo_id: str
    pts_victoria: int = 3
    pts_empate: int = 1
    pts_derrota: int = 0
    reglas: Optional[list[str]] = []
    premios: Optional[list[dict]] = []

class EquipoCreate(BaseModel):
    nombre: str
    capitan_nombre: Optional[str] = None
    capitan_telefono: Optional[str] = None
    capitan_email: Optional[str] = None
    logo_url: Optional[str] = None
    color_principal: Optional[str] = None
    color_secundario: Optional[str] = None

class JugadorCreate(BaseModel):
    nombre: str
    dni: str
    fecha_nacimiento: Optional[str] = None
    numero_camiseta: Optional[int] = None
    posicion: Optional[str] = None
    foto_url: Optional[str] = None

class JugadorUpdate(BaseModel):
    nombre: Optional[str] = None
    numero_camiseta: Optional[int] = None
    posicion: Optional[str] = None
    estado: Optional[str] = None

class PartidoUpdate(BaseModel):
    goles_local: int = 0
    goles_visitante: int = 0
    estado: str = "finalizado"

class GolCreate(BaseModel):
    player_id: Optional[str] = None
    equipo_id: str
    minuto: Optional[int] = None
    tipo: str = "normal"    # normal | penal | autogol

class TarjetaCreate(BaseModel):
    player_id: str
    equipo_id: str
    minuto: Optional[int] = None
    tipo: str               # amarilla | roja_directa | roja_segunda

class WORequest(BaseModel):
    equipo_infractor_id: str
    marcador_ganador: int = 2
    marcador_perdedor: int = 0


# ============================================================
# HELPERS
# ============================================================

def _row_to_dict(keys: list, row) -> dict:
    return {k: (str(v) if isinstance(v, uuid.UUID) else
                v.isoformat() if isinstance(v, (datetime, date)) else v)
            for k, v in zip(keys, row)}


async def _recalcular_posiciones(torneo_id: str, session: AsyncSession):
    """Recalcula la tabla de posiciones completa para un torneo."""
    # Obtener configuración de puntos del torneo
    cfg = await session.execute(
        text("SELECT pts_victoria, pts_empate, pts_derrota FROM cancha.torneos WHERE id = :id"),
        {"id": torneo_id}
    )
    cfg_row = cfg.fetchone()
    if not cfg_row:
        return
    pts_v, pts_e, pts_d = cfg_row[0] or 3, cfg_row[1] or 1, cfg_row[2] or 0

    # Obtener todos los equipos del torneo
    eq_res = await session.execute(
        text("SELECT id FROM cancha.torneos_equipos WHERE torneo_id = :tid AND estado_inscripcion = 'confirmado'"),
        {"tid": torneo_id}
    )
    equipos = [str(r[0]) for r in eq_res.fetchall()]

    # Obtener partidos finalizados
    p_res = await session.execute(
        text("""
            SELECT equipo_local_id, equipo_visitante_id, goles_local, goles_visitante
            FROM cancha.torneos_partidos
            WHERE torneo_id = :tid AND estado IN ('finalizado', 'wo')
        """),
        {"tid": torneo_id}
    )
    partidos = p_res.fetchall()

    # Calcular stats por equipo
    stats: dict = {eid: {"pj": 0, "pg": 0, "pe": 0, "pp": 0, "gf": 0, "gc": 0, "pts": 0} for eid in equipos}

    for local_id, visitante_id, gl, gv in partidos:
        lid = str(local_id)
        vid = str(visitante_id)
        gl = gl or 0
        gv = gv or 0
        if lid in stats:
            stats[lid]["pj"] += 1
            stats[lid]["gf"] += gl
            stats[lid]["gc"] += gv
        if vid in stats:
            stats[vid]["pj"] += 1
            stats[vid]["gf"] += gv
            stats[vid]["gc"] += gl

        if gl > gv:
            if lid in stats: stats[lid]["pg"] += 1; stats[lid]["pts"] += pts_v
            if vid in stats: stats[vid]["pp"] += 1; stats[vid]["pts"] += pts_d
        elif gv > gl:
            if vid in stats: stats[vid]["pg"] += 1; stats[vid]["pts"] += pts_v
            if lid in stats: stats[lid]["pp"] += 1; stats[lid]["pts"] += pts_d
        else:
            if lid in stats: stats[lid]["pe"] += 1; stats[lid]["pts"] += pts_e
            if vid in stats: stats[vid]["pe"] += 1; stats[vid]["pts"] += pts_e

    # Obtener fair play por equipo
    fp_res = await session.execute(
        text("""
            SELECT tt.equipo_id, SUM(tt.pts_fair_play)
            FROM cancha.torneos_tarjetas tt
            JOIN cancha.torneos_partidos tp ON tt.partido_id = tp.id
            WHERE tp.torneo_id = :tid
            GROUP BY tt.equipo_id
        """),
        {"tid": torneo_id}
    )
    fp_map = {str(r[0]): int(r[1]) for r in fp_res.fetchall()}

    # Ordenar: pts DESC, dg DESC, gf DESC, fair_play ASC
    sorted_equipos = sorted(
        equipos,
        key=lambda e: (
            -stats[e]["pts"],
            -(stats[e]["gf"] - stats[e]["gc"]),
            -stats[e]["gf"],
            fp_map.get(e, 0)
        )
    )

    # UPSERT posiciones
    for pos, eid in enumerate(sorted_equipos, start=1):
        s = stats[eid]
        dg = s["gf"] - s["gc"]
        fp = fp_map.get(eid, 0)
        await session.execute(text("""
            INSERT INTO cancha.torneos_posiciones
                (id, torneo_id, torneo_equipo_id, posicion, pj, pg, pe, pp, gf, gc, dg, pts, pts_fair_play_neg, actualizado_en)
            VALUES
                (gen_random_uuid(), :tid, :eid, :pos, :pj, :pg, :pe, :pp, :gf, :gc, :dg, :pts, :fp, NOW())
            ON CONFLICT (torneo_id, torneo_equipo_id)
            DO UPDATE SET
                posicion=:pos, pj=:pj, pg=:pg, pe=:pe, pp=:pp,
                gf=:gf, gc=:gc, dg=:dg, pts=:pts, pts_fair_play_neg=:fp, actualizado_en=NOW()
        """), {"tid": torneo_id, "eid": eid, "pos": pos,
               "pj": s["pj"], "pg": s["pg"], "pe": s["pe"], "pp": s["pp"],
               "gf": s["gf"], "gc": s["gc"], "dg": dg, "pts": s["pts"], "fp": fp})


async def _aplicar_tarjeta_logica(player_id: str, tipo: str, torneo_id: str, session: AsyncSession) -> dict:
    """Calcula pts fair play, detecta si genera suspensión y la aplica."""
    pts_fp = {"amarilla": 1, "roja_segunda": 3, "roja_directa": 4}.get(tipo, 0)
    genera = False
    partidos_susp = 0

    # Contar amarillas acumuladas del jugador en el torneo
    if tipo == "amarilla":
        am_res = await session.execute(text("""
            SELECT COUNT(*) FROM cancha.torneos_tarjetas tt
            JOIN cancha.torneos_partidos tp ON tt.partido_id = tp.id
            WHERE tp.torneo_id = :tid AND tt.player_id = :pid AND tt.tipo = 'amarilla'
        """), {"tid": torneo_id, "pid": player_id})
        total_amarillas = (am_res.scalar() or 0) + 1  # +1 la actual
        if total_amarillas % 3 == 0:  # Cada 3 amarillas = 1 fecha
            genera = True
            partidos_susp = 1

    elif tipo in ("roja_directa", "roja_segunda"):
        genera = True
        partidos_susp = 1 if tipo == "roja_segunda" else 2

    # Actualizar acumulados en tournament_players
    if tipo == "amarilla":
        await session.execute(text("""
            UPDATE cancha.tournament_players
            SET amarillas_acum = amarillas_acum + 1,
                estado = CASE WHEN amarillas_acum + 1 >= 3 THEN 'suspendido' ELSE estado END,
                actualizado_en = NOW()
            WHERE id = :pid
        """), {"pid": player_id})
    elif tipo in ("roja_directa", "roja_segunda"):
        await session.execute(text("""
            UPDATE cancha.tournament_players
            SET rojas_acum = rojas_acum + 1,
                estado = 'suspendido',
                actualizado_en = NOW()
            WHERE id = :pid
        """), {"pid": player_id})

    return {"pts_fair_play": pts_fp, "genera_suspension": genera, "partidos_suspension": partidos_susp}


# ============================================================
# ENDPOINTS — TORNEOS
# ============================================================

@router.get("", summary="Listar torneos")
async def get_torneos(
    complejo_id: Optional[str] = None,
    estado: Optional[str] = None,
    deporte: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    sql = """
        SELECT t.id, t.complejo_id, t.nombre, t.descripcion, t.deporte,
               t.fecha_inicio, t.fecha_fin, t.estado,
               c.nombre AS complejo_nombre, t.formato,
               t.max_equipos, t.costo_inscripcion,
               (SELECT COUNT(*) FROM cancha.torneos_equipos te
                WHERE te.torneo_id = t.id AND te.estado_inscripcion = 'confirmado') AS equipos_confirmados
        FROM cancha.torneos t
        JOIN cancha.complejos c ON t.complejo_id = c.id
        WHERE 1=1
    """
    params: dict = {}
    if complejo_id:
        sql += " AND t.complejo_id = :complejo_id"
        params["complejo_id"] = complejo_id
    if estado:
        sql += " AND t.estado = :estado"
        params["estado"] = estado
    if deporte:
        sql += " AND t.deporte ILIKE :deporte"
        params["deporte"] = f"%{deporte}%"
    sql += " ORDER BY t.fecha_inicio DESC"

    result = await session.execute(text(sql), params)
    rows = result.fetchall()
    keys = ["id","complejo_id","nombre","descripcion","deporte","fecha_inicio",
            "fecha_fin","estado","complejo_nombre","formato","max_equipos",
            "costo_inscripcion","equipos_confirmados"]
    return [_row_to_dict(keys, r) for r in rows]


@router.post("", summary="Crear torneo")
async def create_torneo(payload: TorneoCreate, session: AsyncSession = Depends(get_session)):
    try:
        fecha_ini = date.fromisoformat(payload.fecha_inicio)
        result = await session.execute(text("""
            INSERT INTO cancha.torneos
                (id, complejo_id, nombre, descripcion, deporte, formato,
                 fecha_inicio, max_equipos, costo_inscripcion, estado,
                 pts_victoria, pts_empate, pts_derrota, reglas, premios)
            VALUES
                (gen_random_uuid(), :complejo_id, :nombre, :descripcion, :deporte, :formato,
                 :fecha_inicio, :max_equipos, :costo_inscripcion, 'abierto',
                 :pts_v, :pts_e, :pts_d, :reglas, :premios)
            RETURNING id, nombre, estado, deporte, formato, fecha_inicio, max_equipos, costo_inscripcion
        """), {
            "complejo_id": payload.complejo_id, "nombre": payload.nombre,
            "descripcion": payload.descripcion, "deporte": payload.deporte,
            "formato": payload.formato, "fecha_inicio": fecha_ini,
            "max_equipos": payload.max_equipos, "costo_inscripcion": payload.costo_inscripcion,
            "pts_v": payload.pts_victoria, "pts_e": payload.pts_empate, "pts_d": payload.pts_derrota,
            "reglas": json.dumps(payload.reglas), "premios": json.dumps(payload.premios)
        })
        await session.commit()
        row = result.fetchone()
        return _row_to_dict(["id","nombre","estado","deporte","formato","fecha_inicio","max_equipos","costo_inscripcion"], row)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{torneo_id}", summary="Detalle de torneo")
async def get_torneo(torneo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT t.id, t.complejo_id, t.nombre, t.descripcion, t.deporte,
               t.fecha_inicio, t.fecha_fin, t.estado, c.nombre AS complejo_nombre,
               t.formato, t.max_equipos, t.costo_inscripcion,
               t.pts_victoria, t.pts_empate, t.pts_derrota,
               t.reglas, t.premios
        FROM cancha.torneos t
        JOIN cancha.complejos c ON t.complejo_id = c.id
        WHERE t.id = :tid
    """), {"tid": torneo_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    keys = ["id","complejo_id","nombre","descripcion","deporte","fecha_inicio",
            "fecha_fin","estado","complejo_nombre","formato","max_equipos",
            "costo_inscripcion","pts_victoria","pts_empate","pts_derrota",
            "reglas","premios"]
    d = _row_to_dict(keys, row)
    import json
    d["reglas"] = json.loads(d["reglas"]) if isinstance(d["reglas"], str) else (d["reglas"] or [])
    d["premios"] = json.loads(d["premios"]) if isinstance(d["premios"], str) else (d["premios"] or [])
    return d


# ============================================================
# ENDPOINTS — EQUIPOS
# ============================================================

@router.get("/{torneo_id}/equipos", summary="Equipos del torneo")
async def get_equipos(torneo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT id, nombre, capitan_nombre, capitan_telefono, capitan_email,
               estado_inscripcion, semilla, logo_url, color_principal, color_secundario
        FROM cancha.torneos_equipos
        WHERE torneo_id = :tid ORDER BY creado_en ASC
    """), {"tid": torneo_id})
    rows = result.fetchall()
    keys = ["id","nombre","capitan_nombre","capitan_telefono","capitan_email",
            "estado_inscripcion","semilla","logo_url","color_principal","color_secundario"]
    return [_row_to_dict(keys, r) for r in rows]


@router.post("/{torneo_id}/equipos", summary="Inscribir equipo")
async def create_equipo(torneo_id: str, payload: EquipoCreate, session: AsyncSession = Depends(get_session)):
    try:
        t_res = await session.execute(
            text("SELECT costo_inscripcion FROM cancha.torneos WHERE id = :tid"),
            {"tid": torneo_id}
        )
        t_row = t_res.fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail="Torneo no encontrado")

        costo = float(t_row[0]) if t_row[0] else 0.0
        estado_insc = "confirmado" if costo <= 0 else "pendiente"

        result = await session.execute(text("""
            INSERT INTO cancha.torneos_equipos
                (id, torneo_id, nombre, capitan_nombre, capitan_telefono, capitan_email,
                 estado_inscripcion, logo_url, color_principal, color_secundario)
            VALUES
                (gen_random_uuid(), :tid, :nombre, :capitan_nombre, :capitan_telefono,
                 :capitan_email, :estado, :logo_url, :color_p, :color_s)
            RETURNING id, torneo_id, nombre, estado_inscripcion
        """), {
            "tid": torneo_id, "nombre": payload.nombre,
            "capitan_nombre": payload.capitan_nombre,
            "capitan_telefono": payload.capitan_telefono,
            "capitan_email": payload.capitan_email,
            "estado": estado_insc,
            "logo_url": payload.logo_url,
            "color_p": payload.color_principal,
            "color_s": payload.color_secundario
        })
        await session.commit()
        row = result.fetchone()
        return _row_to_dict(["id","torneo_id","nombre","estado_inscripcion"], row)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# ENDPOINTS — JUGADORES / PLANTEL
# ============================================================

@router.get("/{torneo_id}/equipos/{equipo_id}/jugadores", summary="Plantel del equipo")
async def get_jugadores(torneo_id: str, equipo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT tp.id, tp.nombre, tp.dni, tp.fecha_nacimiento, tp.numero_camiseta,
               tp.posicion, tp.foto_url, tp.estado, tp.partidos_jugados,
               tp.amarillas_acum, tp.rojas_acum
        FROM cancha.tournament_players tp
        WHERE tp.torneo_equipo_id = :eid
        ORDER BY tp.numero_camiseta ASC NULLS LAST, tp.nombre ASC
    """), {"eid": equipo_id})
    rows = result.fetchall()
    keys = ["id","nombre","dni","fecha_nacimiento","numero_camiseta",
            "posicion","foto_url","estado","partidos_jugados","amarillas_acum","rojas_acum"]
    return [_row_to_dict(keys, r) for r in rows]


@router.post("/{torneo_id}/equipos/{equipo_id}/jugadores", summary="Agregar jugador al plantel")
async def add_jugador(
    torneo_id: str, equipo_id: str,
    payload: JugadorCreate,
    session: AsyncSession = Depends(get_session)
):
    try:
        # Verificar que el equipo pertenece al torneo
        eq_res = await session.execute(
            text("SELECT id FROM cancha.torneos_equipos WHERE id = :eid AND torneo_id = :tid"),
            {"eid": equipo_id, "tid": torneo_id}
        )
        if not eq_res.fetchone():
            raise HTTPException(status_code=404, detail="Equipo no encontrado en este torneo")

        # Verificar DNI no repetido en otro equipo del mismo torneo
        dup = await session.execute(text("""
            SELECT tp.id FROM cancha.tournament_players tp
            JOIN cancha.torneos_equipos te ON tp.torneo_equipo_id = te.id
            WHERE te.torneo_id = :tid AND tp.dni = :dni
        """), {"tid": torneo_id, "dni": payload.dni})
        if dup.fetchone():
            raise HTTPException(status_code=409, detail=f"El jugador con DNI {payload.dni} ya está inscripto en otro equipo de este torneo")

        fnac = date.fromisoformat(payload.fecha_nacimiento) if payload.fecha_nacimiento else None
        result = await session.execute(text("""
            INSERT INTO cancha.tournament_players
                (id, torneo_equipo_id, nombre, dni, fecha_nacimiento, numero_camiseta, posicion, foto_url)
            VALUES
                (gen_random_uuid(), :eid, :nombre, :dni, :fnac, :camiseta, :posicion, :foto_url)
            RETURNING id, nombre, dni, numero_camiseta, posicion, estado
        """), {
            "eid": equipo_id, "nombre": payload.nombre, "dni": payload.dni,
            "fnac": fnac, "camiseta": payload.numero_camiseta,
            "posicion": payload.posicion, "foto_url": payload.foto_url
        })
        await session.commit()
        row = result.fetchone()
        return _row_to_dict(["id","nombre","dni","numero_camiseta","posicion","estado"], row)
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{torneo_id}/equipos/{equipo_id}/jugadores/{jugador_id}", summary="Actualizar jugador")
async def update_jugador(
    torneo_id: str, equipo_id: str, jugador_id: str,
    payload: JugadorUpdate,
    session: AsyncSession = Depends(get_session)
):
    try:
        updates = []
        params: dict = {"pid": jugador_id}
        if payload.nombre is not None:
            updates.append("nombre = :nombre"); params["nombre"] = payload.nombre
        if payload.numero_camiseta is not None:
            updates.append("numero_camiseta = :camiseta"); params["camiseta"] = payload.numero_camiseta
        if payload.posicion is not None:
            updates.append("posicion = :posicion"); params["posicion"] = payload.posicion
        if payload.estado is not None:
            updates.append("estado = :estado"); params["estado"] = payload.estado
        if not updates:
            raise HTTPException(status_code=400, detail="Sin campos para actualizar")

        sql = f"UPDATE cancha.tournament_players SET {', '.join(updates)}, actualizado_en=NOW() WHERE id = :pid RETURNING id, nombre, estado"
        result = await session.execute(text(sql), params)
        await session.commit()
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Jugador no encontrado")
        return _row_to_dict(["id","nombre","estado"], row)
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/jugadores/{jugador_id}/upload-face", summary="Registrar rostro del jugador")
async def upload_face(
    jugador_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    try:
        # Validación de tipo de archivo y tamaño aproximado en memoria (seguridad)
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
        file_bytes = await file.read()
        
        # Limitar a ~5MB en memoria para prevenir DoS
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo es demasiado grande (máximo 5MB)")

        # Extraer el vector facial
        try:
            encoding = FacialRecognitionService.extract_encoding(file_bytes)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

        # Serializar y guardar en base de datos
        encoding_json = json.dumps(encoding)
        sql = "UPDATE cancha.tournament_players SET face_encoding = :encoding, actualizado_en=NOW() WHERE id = :pid RETURNING id"
        result = await session.execute(text(sql), {"encoding": encoding_json, "pid": jugador_id})
        await session.commit()
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Jugador no encontrado")

        return {"status": "ok", "message": "Identidad verificada y registrada correctamente", "id": jugador_id}

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando el rostro: {str(e)}")


@router.post("/jugadores/test-face", summary="Probar reconocimiento facial libremente")
async def test_face(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    try:
        # Validación de tipo de archivo y tamaño aproximado en memoria
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
        file_bytes = await file.read()
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo es demasiado grande (máximo 5MB)")

        # Extraer el vector facial
        try:
            encoding_test = FacialRecognitionService.extract_encoding(file_bytes)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

        # Consultar todos los jugadores que tengan un encoding registrado
        result = await session.execute(text("""
            SELECT id, nombre, face_encoding 
            FROM cancha.tournament_players 
            WHERE face_encoding IS NOT NULL
        """))
        players = result.fetchall()

        # Búsqueda secuencial
        recognized_player = None
        for row in players:
            try:
                db_encoding = row.face_encoding if isinstance(row.face_encoding, list) else json.loads(row.face_encoding)
                if FacialRecognitionService.compare_encodings(db_encoding, encoding_test):
                    recognized_player = {"id": str(row.id), "nombre": row.nombre}
                    break
            except Exception:
                continue

        if recognized_player:
            return {"status": "ok", "match": True, "message": "¡Rostro reconocido exitosamente!", "jugador": recognized_player}
        else:
            return {"status": "ok", "match": False, "message": "No se encontró coincidencia con ningún jugador registrado"}

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# ENDPOINTS — PARTIDOS
# ============================================================

@router.get("/{torneo_id}/partidos", summary="Partidos del torneo")
async def get_partidos(torneo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT p.id, p.equipo_local_id, p.equipo_visitante_id,
               p.goles_local, p.goles_visitante,
               p.fecha_hora, p.estado, p.jornada, p.fase, p.es_wo,
               el.nombre AS local_nombre, el.logo_url AS local_logo,
               ev.nombre AS visitante_nombre, ev.logo_url AS visitante_logo,
               c.nombre AS cancha_nombre
        FROM cancha.torneos_partidos p
        JOIN cancha.torneos_equipos el ON p.equipo_local_id = el.id
        JOIN cancha.torneos_equipos ev ON p.equipo_visitante_id = ev.id
        LEFT JOIN cancha.canchas c ON p.cancha_id = c.id
        WHERE p.torneo_id = :tid
        ORDER BY p.jornada ASC NULLS LAST, p.fecha_hora ASC
    """), {"tid": torneo_id})
    rows = result.fetchall()
    keys = ["id","equipo_local_id","equipo_visitante_id","goles_local","goles_visitante",
            "fecha_hora","estado","jornada","fase","es_wo",
            "local_nombre","local_logo","visitante_nombre","visitante_logo","cancha_nombre"]
    return [_row_to_dict(keys, r) for r in rows]


@router.post("/partidos/{partido_id}/iniciar", summary="Iniciar partido")
async def iniciar_partido(partido_id: str, session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(text("""
            UPDATE cancha.torneos_partidos
            SET estado = 'en_curso', fecha_hora_inicio_real = NOW()
            WHERE id = :pid AND estado = 'programado'
            RETURNING id, estado
        """), {"pid": partido_id})
        await session.commit()
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Partido no encontrado o ya iniciado")
        return {"id": str(row[0]), "estado": row[1]}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/partidos/{partido_id}", summary="Actualizar resultado de partido")
async def update_partido(partido_id: str, payload: PartidoUpdate, session: AsyncSession = Depends(get_session)):
    try:
        # Obtener IDs para determinar ganador
        p_res = await session.execute(
            text("SELECT torneo_id, equipo_local_id, equipo_visitante_id FROM cancha.torneos_partidos WHERE id = :pid"),
            {"pid": partido_id}
        )
        p_row = p_res.fetchone()
        if not p_row:
            raise HTTPException(status_code=404, detail="Partido no encontrado")

        torneo_id = str(p_row[0])
        el_id, ev_id = str(p_row[1]), str(p_row[2])
        ganador_id = None
        if payload.goles_local > payload.goles_visitante:
            ganador_id = el_id
        elif payload.goles_visitante > payload.goles_local:
            ganador_id = ev_id

        await session.execute(text("""
            UPDATE cancha.torneos_partidos
            SET goles_local = :gl, goles_visitante = :gv,
                estado = :estado, ganador_id = :ganador_id,
                fecha_hora_fin_real = NOW(), acta_cerrada_en = NOW()
            WHERE id = :pid
        """), {
            "pid": partido_id, "gl": payload.goles_local,
            "gv": payload.goles_visitante, "estado": payload.estado,
            "ganador_id": ganador_id
        })

        # Sincronizar goles con la tabla de goles si el acta fue cargada
        # (solo si no hay goles registrados individualmente)
        goles_registrados = await session.execute(
            text("SELECT COUNT(*) FROM cancha.torneos_goles WHERE partido_id = :pid AND NOT anulado"),
            {"pid": partido_id}
        )
        total_goles = goles_registrados.scalar() or 0

        await session.commit()

        # Recalcular posiciones si el partido quedó finalizado
        if payload.estado in ("finalizado", "wo"):
            await _recalcular_posiciones(torneo_id, session)
            await session.commit()

        return {"id": partido_id, "goles_local": payload.goles_local,
                "goles_visitante": payload.goles_visitante, "estado": payload.estado}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/partidos/{partido_id}/wo", summary="Declarar W.O.")
async def declarar_wo(partido_id: str, payload: WORequest, session: AsyncSession = Depends(get_session)):
    """Declara walkover: equipo infractor pierde, se aplica marcador estándar."""
    try:
        p_res = await session.execute(
            text("SELECT torneo_id, equipo_local_id, equipo_visitante_id FROM cancha.torneos_partidos WHERE id = :pid"),
            {"pid": partido_id}
        )
        p_row = p_res.fetchone()
        if not p_row:
            raise HTTPException(status_code=404, detail="Partido no encontrado")

        torneo_id, local_id, visitante_id = str(p_row[0]), str(p_row[1]), str(p_row[2])

        # Determinar quién gana
        if str(local_id) == payload.equipo_infractor_id:
            gl, gv = payload.marcador_perdedor, payload.marcador_ganador
            ganador_id = str(visitante_id)
        else:
            gl, gv = payload.marcador_ganador, payload.marcador_perdedor
            ganador_id = str(local_id)

        await session.execute(text("""
            UPDATE cancha.torneos_partidos
            SET estado = 'wo', es_wo = true,
                equipo_wo_id = :infractor_id,
                goles_local = :gl, goles_visitante = :gv,
                ganador_id = :ganador_id,
                fecha_hora_fin_real = NOW(), acta_cerrada_en = NOW()
            WHERE id = :pid
        """), {
            "pid": partido_id, "infractor_id": payload.equipo_infractor_id,
            "gl": gl, "gv": gv, "ganador_id": ganador_id
        })
        await session.commit()
        await _recalcular_posiciones(torneo_id, session)
        await session.commit()

        return {"status": "ok", "message": "W.O. declarado correctamente",
                "goles_local": gl, "goles_visitante": gv, "ganador_id": ganador_id}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# ENDPOINTS — GOLES
# ============================================================

@router.get("/partidos/{partido_id}/goles", summary="Goles de un partido")
async def get_goles(partido_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT g.id, g.player_id, g.equipo_id, g.minuto, g.tipo, g.anulado,
               tp.nombre AS jugador_nombre, te.nombre AS equipo_nombre
        FROM cancha.torneos_goles g
        LEFT JOIN cancha.tournament_players tp ON g.player_id = tp.id
        JOIN cancha.torneos_equipos te ON g.equipo_id = te.id
        WHERE g.partido_id = :pid
        ORDER BY g.minuto ASC NULLS LAST, g.creado_en ASC
    """), {"pid": partido_id})
    rows = result.fetchall()
    keys = ["id","player_id","equipo_id","minuto","tipo","anulado","jugador_nombre","equipo_nombre"]
    return [_row_to_dict(keys, r) for r in rows]


@router.post("/partidos/{partido_id}/goles", summary="Registrar gol")
async def add_gol(partido_id: str, payload: GolCreate, session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(text("""
            INSERT INTO cancha.torneos_goles
                (id, partido_id, player_id, equipo_id, minuto, tipo)
            VALUES
                (gen_random_uuid(), :pid, :player_id, :equipo_id, :minuto, :tipo)
            RETURNING id, player_id, equipo_id, minuto, tipo
        """), {
            "pid": partido_id, "player_id": payload.player_id,
            "equipo_id": payload.equipo_id, "minuto": payload.minuto,
            "tipo": payload.tipo
        })

        # Actualizar marcador en el partido
        gol_row = result.fetchone()
        if payload.tipo == "autogol":
            # autogol suma al rival
            await session.execute(text("""
                UPDATE cancha.torneos_partidos
                SET goles_local = CASE WHEN equipo_visitante_id = :eid THEN goles_local + 1 ELSE goles_local END,
                    goles_visitante = CASE WHEN equipo_local_id = :eid THEN goles_visitante + 1 ELSE goles_visitante END
                WHERE id = :pid
            """), {"pid": partido_id, "eid": payload.equipo_id})
        else:
            await session.execute(text("""
                UPDATE cancha.torneos_partidos
                SET goles_local = CASE WHEN equipo_local_id = :eid THEN goles_local + 1 ELSE goles_local END,
                    goles_visitante = CASE WHEN equipo_visitante_id = :eid THEN goles_visitante + 1 ELSE goles_visitante END
                WHERE id = :pid
            """), {"pid": partido_id, "eid": payload.equipo_id})

        await session.commit()
        return _row_to_dict(["id","player_id","equipo_id","minuto","tipo"], gol_row)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/partidos/{partido_id}/goles/{gol_id}", summary="Anular gol")
async def anular_gol(partido_id: str, gol_id: str, session: AsyncSession = Depends(get_session)):
    try:
        gol_res = await session.execute(
            text("SELECT equipo_id, tipo FROM cancha.torneos_goles WHERE id = :gid AND partido_id = :pid AND NOT anulado"),
            {"gid": gol_id, "pid": partido_id}
        )
        gol_row = gol_res.fetchone()
        if not gol_row:
            raise HTTPException(status_code=404, detail="Gol no encontrado o ya anulado")

        equipo_id, tipo = str(gol_row[0]), gol_row[1]
        await session.execute(
            text("UPDATE cancha.torneos_goles SET anulado = true WHERE id = :gid"),
            {"gid": gol_id}
        )
        # Restar del marcador
        if tipo == "autogol":
            await session.execute(text("""
                UPDATE cancha.torneos_partidos
                SET goles_local = CASE WHEN equipo_visitante_id = :eid THEN GREATEST(goles_local - 1, 0) ELSE goles_local END,
                    goles_visitante = CASE WHEN equipo_local_id = :eid THEN GREATEST(goles_visitante - 1, 0) ELSE goles_visitante END
                WHERE id = :pid
            """), {"pid": partido_id, "eid": equipo_id})
        else:
            await session.execute(text("""
                UPDATE cancha.torneos_partidos
                SET goles_local = CASE WHEN equipo_local_id = :eid THEN GREATEST(goles_local - 1, 0) ELSE goles_local END,
                    goles_visitante = CASE WHEN equipo_visitante_id = :eid THEN GREATEST(goles_visitante - 1, 0) ELSE goles_visitante END
                WHERE id = :pid
            """), {"pid": partido_id, "eid": equipo_id})
        await session.commit()
        return {"status": "ok", "message": "Gol anulado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# ENDPOINTS — TARJETAS
# ============================================================

@router.get("/partidos/{partido_id}/tarjetas", summary="Tarjetas de un partido")
async def get_tarjetas(partido_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT t.id, t.player_id, t.equipo_id, t.minuto, t.tipo,
               t.pts_fair_play, t.genera_suspension, t.partidos_suspension,
               tp.nombre AS jugador_nombre, te.nombre AS equipo_nombre
        FROM cancha.torneos_tarjetas t
        JOIN cancha.tournament_players tp ON t.player_id = tp.id
        JOIN cancha.torneos_equipos te ON t.equipo_id = te.id
        WHERE t.partido_id = :pid
        ORDER BY t.minuto ASC NULLS LAST
    """), {"pid": partido_id})
    rows = result.fetchall()
    keys = ["id","player_id","equipo_id","minuto","tipo","pts_fair_play",
            "genera_suspension","partidos_suspension","jugador_nombre","equipo_nombre"]
    return [_row_to_dict(keys, r) for r in rows]


@router.post("/partidos/{partido_id}/tarjetas", summary="Registrar tarjeta")
async def add_tarjeta(partido_id: str, payload: TarjetaCreate, session: AsyncSession = Depends(get_session)):
    try:
        # Obtener torneo_id
        tid_res = await session.execute(
            text("SELECT torneo_id FROM cancha.torneos_partidos WHERE id = :pid"),
            {"pid": partido_id}
        )
        tid_row = tid_res.fetchone()
        if not tid_row:
            raise HTTPException(status_code=404, detail="Partido no encontrado")
        torneo_id = str(tid_row[0])

        # Calcular pts fair play y suspensión
        logica = await _aplicar_tarjeta_logica(payload.player_id, payload.tipo, torneo_id, session)

        result = await session.execute(text("""
            INSERT INTO cancha.torneos_tarjetas
                (id, partido_id, player_id, equipo_id, minuto, tipo,
                 pts_fair_play, genera_suspension, partidos_suspension)
            VALUES
                (gen_random_uuid(), :pid, :player_id, :equipo_id, :minuto, :tipo,
                 :pts_fp, :genera, :susp)
            RETURNING id, tipo, pts_fair_play, genera_suspension, partidos_suspension
        """), {
            "pid": partido_id, "player_id": payload.player_id,
            "equipo_id": payload.equipo_id, "minuto": payload.minuto,
            "tipo": payload.tipo, "pts_fp": logica["pts_fair_play"],
            "genera": logica["genera_suspension"],
            "susp": logica["partidos_suspension"]
        })
        tarjeta_row = result.fetchone()
        tarjeta_id = str(tarjeta_row[0])

        # Crear sanción si corresponde
        if logica["genera_suspension"]:
            await session.execute(text("""
                INSERT INTO cancha.torneos_sanciones
                    (id, torneo_id, player_id, tarjeta_id, tipo, descripcion,
                     partidos_suspension, estado)
                VALUES
                    (gen_random_uuid(), :tid, :player_id, :tarjeta_id, 'suspension',
                     :desc, :susp, 'vigente')
            """), {
                "tid": torneo_id, "player_id": payload.player_id,
                "tarjeta_id": tarjeta_id,
                "desc": f"Suspensión automática por {payload.tipo}",
                "susp": logica["partidos_suspension"]
            })

        await session.commit()
        return {
            "id": tarjeta_id, "tipo": payload.tipo,
            "pts_fair_play": logica["pts_fair_play"],
            "genera_suspension": logica["genera_suspension"],
            "partidos_suspension": logica["partidos_suspension"]
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# ENDPOINTS — ESTADÍSTICAS
# ============================================================

@router.get("/{torneo_id}/posiciones", summary="Tabla de posiciones")
async def get_posiciones(torneo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT tp.posicion, te.id AS equipo_id, te.nombre, te.logo_url, te.color_principal,
               tp.pj, tp.pg, tp.pe, tp.pp, tp.gf, tp.gc, tp.dg, tp.pts, tp.pts_fair_play_neg
        FROM cancha.torneos_posiciones tp
        JOIN cancha.torneos_equipos te ON tp.torneo_equipo_id = te.id
        WHERE tp.torneo_id = :tid
        ORDER BY tp.posicion ASC
    """), {"tid": torneo_id})
    rows = result.fetchall()
    keys = ["posicion","equipo_id","nombre","logo_url","color_principal",
            "pj","pg","pe","pp","gf","gc","dg","pts","pts_fair_play_neg"]
    return [_row_to_dict(keys, r) for r in rows]


@router.get("/{torneo_id}/goleadores", summary="Tabla de goleadores")
async def get_goleadores(torneo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT tp.id AS player_id, tp.nombre, tp.foto_url, tp.numero_camiseta,
               te.nombre AS equipo_nombre, te.color_principal,
               COUNT(CASE WHEN g.tipo != 'autogol' AND NOT g.anulado THEN 1 END) AS goles,
               COUNT(CASE WHEN g.tipo = 'penal' AND NOT g.anulado THEN 1 END) AS penales,
               COUNT(CASE WHEN g.tipo = 'autogol' AND NOT g.anulado THEN 1 END) AS autogoles
        FROM cancha.tournament_players tp
        JOIN cancha.torneos_equipos te ON tp.torneo_equipo_id = te.id
        LEFT JOIN cancha.torneos_goles g ON g.player_id = tp.id
        LEFT JOIN cancha.torneos_partidos p ON g.partido_id = p.id
        WHERE te.torneo_id = :tid
        GROUP BY tp.id, tp.nombre, tp.foto_url, tp.numero_camiseta, te.nombre, te.color_principal
        HAVING COUNT(CASE WHEN g.tipo != 'autogol' AND NOT g.anulado THEN 1 END) > 0
        ORDER BY goles DESC, tp.nombre ASC
    """), {"tid": torneo_id})
    rows = result.fetchall()
    keys = ["player_id","nombre","foto_url","numero_camiseta",
            "equipo_nombre","color_principal","goles","penales","autogoles"]
    return [_row_to_dict(keys, r) for r in rows]


@router.get("/{torneo_id}/fair-play", summary="Tabla de fair play (disciplina)")
async def get_fair_play(torneo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT te.id AS equipo_id, te.nombre, te.logo_url,
               COALESCE(SUM(tt.pts_fair_play), 0) AS pts_negativos,
               COUNT(CASE WHEN tt.tipo = 'amarilla' THEN 1 END) AS amarillas,
               COUNT(CASE WHEN tt.tipo IN ('roja_directa','roja_segunda') THEN 1 END) AS rojas
        FROM cancha.torneos_equipos te
        LEFT JOIN cancha.torneos_tarjetas tt ON tt.equipo_id = te.id
        LEFT JOIN cancha.torneos_partidos p ON tt.partido_id = p.id AND p.torneo_id = :tid
        WHERE te.torneo_id = :tid AND te.estado_inscripcion = 'confirmado'
        GROUP BY te.id, te.nombre, te.logo_url
        ORDER BY pts_negativos ASC, te.nombre ASC
    """), {"tid": torneo_id})
    rows = result.fetchall()
    keys = ["equipo_id","nombre","logo_url","pts_negativos","amarillas","rojas"]
    return [_row_to_dict(keys, r) for r in rows]


@router.get("/{torneo_id}/sanciones", summary="Suspensiones vigentes del torneo")
async def get_sanciones(torneo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT s.id, s.player_id, tp.nombre AS jugador_nombre,
               tp.numero_camiseta, te.nombre AS equipo_nombre,
               s.tipo, s.descripcion, s.partidos_suspension, s.partidos_cumplidos,
               s.estado, s.creado_en
        FROM cancha.torneos_sanciones s
        JOIN cancha.tournament_players tp ON s.player_id = tp.id
        JOIN cancha.torneos_equipos te ON tp.torneo_equipo_id = te.id
        WHERE s.torneo_id = :tid
        ORDER BY s.estado ASC, s.creado_en DESC
    """), {"tid": torneo_id})
    rows = result.fetchall()
    keys = ["id","player_id","jugador_nombre","numero_camiseta","equipo_nombre",
            "tipo","descripcion","partidos_suspension","partidos_cumplidos","estado","creado_en"]
    return [_row_to_dict(keys, r) for r in rows]


# ============================================================
# FIXTURE (mantenido desde main.py pero mejorado)
# ============================================================

def _generar_round_robin(equipos_ids: list) -> list:
    """Algoritmo de Berger — maneja número impar con BYE."""
    n = len(equipos_ids)
    if n % 2 != 0:
        equipos_ids = equipos_ids + [None]
        n += 1
    rondas = []
    ids = equipos_ids[:]
    for r in range(n - 1):
        partidos = []
        for i in range(n // 2):
            local, visitante = ids[i], ids[n - 1 - i]
            if local is not None and visitante is not None:
                if r % 2 == 0:
                    partidos.append((local, visitante))
                else:
                    partidos.append((visitante, local))
        ids = [ids[0]] + [ids[-1]] + ids[1:-1]
        rondas.append(partidos)
    return rondas


@router.post("/{torneo_id}/fixture", summary="Generar fixture automático")
async def generar_fixture(torneo_id: str, session: AsyncSession = Depends(get_session)):
    try:
        from datetime import timedelta, time as dtime

        torneo_res = await session.execute(
            text("SELECT id, formato, fecha_inicio FROM cancha.torneos WHERE id = :tid"),
            {"tid": torneo_id}
        )
        torneo = torneo_res.fetchone()
        if not torneo:
            raise HTTPException(status_code=404, detail="Torneo no encontrado")

        equipos_res = await session.execute(
            text("SELECT id FROM cancha.torneos_equipos WHERE torneo_id = :tid AND estado_inscripcion = 'confirmado'"),
            {"tid": torneo_id}
        )
        equipos = [str(r[0]) for r in equipos_res.fetchall()]

        if len(equipos) < 2:
            raise HTTPException(status_code=400, detail="Se necesitan al menos 2 equipos confirmados")

        # Limpiar fixture anterior
        await session.execute(
            text("DELETE FROM cancha.torneos_partidos WHERE torneo_id = :tid"),
            {"tid": torneo_id}
        )

        rondas = _generar_round_robin(equipos)
        fecha_base = torneo[2]
        total = 0

        for round_num, partidos_ronda in enumerate(rondas, start=1):
            fecha_partido = fecha_base + timedelta(days=(round_num - 1) * 7)
            for i, (local, visitante) in enumerate(partidos_ronda):
                hora = dtime(18 + i, 0)
                await session.execute(text("""
                    INSERT INTO cancha.torneos_partidos
                        (id, torneo_id, equipo_local_id, equipo_visitante_id,
                         fase, jornada, numero_partido, fecha_hora, estado)
                    VALUES
                        (gen_random_uuid(), :tid, :local, :visitante,
                         :fase, :jornada, :num, :fecha_hora, 'programado')
                """), {
                    "tid": torneo_id, "local": local, "visitante": visitante,
                    "fase": f"Fecha {round_num}", "jornada": round_num,
                    "num": total + 1,
                    "fecha_hora": datetime.combine(fecha_partido, hora)
                })
                total += 1

        # Inicializar tabla de posiciones vacía para todos los equipos
        for eid in equipos:
            await session.execute(text("""
                INSERT INTO cancha.torneos_posiciones
                    (id, torneo_id, torneo_equipo_id, posicion)
                VALUES
                    (gen_random_uuid(), :tid, :eid, 0)
                ON CONFLICT (torneo_id, torneo_equipo_id) DO NOTHING
            """), {"tid": torneo_id, "eid": eid})

        await session.commit()
        return {"status": "ok", "message": f"Fixture generado: {total} partidos en {len(rondas)} jornadas"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
