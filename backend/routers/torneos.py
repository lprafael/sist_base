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
import os
import shutil

from database import get_session
from services.facial_recognition import FacialRecognitionService

router = APIRouter(prefix="/cancha/torneos", tags=["Torneos"])


# ============================================================
# SCHEMAS PYDANTIC
# ============================================================

class CategoriaCreate(BaseModel):
    nombre: str
    formato: str = "liga"  # liga | eliminacion_simple | mixto | suizo
    max_equipos: int = 16
    costo_inscripcion: float = 0.0
    pts_victoria: int = 3
    pts_empate: int = 1
    pts_derrota: int = 0
    configuracion: Optional[dict] = {}

class EventoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    deporte: str = "Fútbol 5"
    fecha_inicio: str
    fecha_fin: Optional[str] = None
    complejo_id: str
    reglas: Optional[list[str]] = []
    premios: Optional[list[dict]] = []
    categorias: List[CategoriaCreate] = []

class EquipoCreate(BaseModel):
    nombre: str
    capitan_nombre: Optional[str] = None
    capitan_telefono: Optional[str] = None
    capitan_email: Optional[str] = None
    logo_url: Optional[str] = None
    color_principal: Optional[str] = None
    color_secundario: Optional[str] = None
    promocion: int = 0

class JugadorCreate(BaseModel):
    nombre: str
    dni: str
    fecha_nacimiento: Optional[str] = None
    numero_camiseta: Optional[int] = None
    posicion: Optional[str] = None
    foto_url: Optional[str] = None
    egreso_ano: Optional[int] = None
    es_exalumno: bool = True

class JugadorUpdate(BaseModel):
    nombre: Optional[str] = None
    numero_camiseta: Optional[int] = None
    posicion: Optional[str] = None
    estado: Optional[str] = None
    egreso_ano: Optional[int] = None
    es_exalumno: Optional[bool] = None

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
    stats: dict = {eid: {"pj": 0, "pg": 0, "pe": 0, "pp": 0, "gf": 0, "gc": 0, "pts": 0, "opponents": []} for eid in equipos}

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
            if lid in stats: 
                stats[lid]["pg"] += 1; stats[lid]["pts"] += pts_v
                stats[lid]["opponents"].append((vid, 'W'))
            if vid in stats: 
                stats[vid]["pp"] += 1; stats[vid]["pts"] += pts_d
                stats[vid]["opponents"].append((lid, 'L'))
        elif gv > gl:
            if vid in stats: 
                stats[vid]["pg"] += 1; stats[vid]["pts"] += pts_v
                stats[vid]["opponents"].append((lid, 'W'))
            if lid in stats: 
                stats[lid]["pp"] += 1; stats[lid]["pts"] += pts_d
                stats[lid]["opponents"].append((vid, 'L'))
        else:
            if lid in stats: 
                stats[lid]["pe"] += 1; stats[lid]["pts"] += pts_e
                stats[lid]["opponents"].append((vid, 'D'))
            if vid in stats: 
                stats[vid]["pe"] += 1; stats[vid]["pts"] += pts_e
                stats[vid]["opponents"].append((lid, 'D'))

    # Calculate Buchholz and Sonneborn-Berger
    for eid in equipos:
        bh = 0
        sb = 0.0
        for opp_id, result in stats[eid]["opponents"]:
            if opp_id in stats:
                opp_pts = stats[opp_id]["pts"]
                bh += opp_pts
                if result == 'W':
                    sb += opp_pts
                elif result == 'D':
                    sb += opp_pts * 0.5
        stats[eid]["bh"] = bh
        stats[eid]["sb"] = sb

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

    # Ordenar: pts DESC, bh DESC, sb DESC, dg DESC, gf DESC, fair_play ASC
    sorted_equipos = sorted(
        equipos,
        key=lambda e: (
            -stats[e]["pts"],
            -stats[e]["bh"],
            -stats[e]["sb"],
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
                (:uuid, :tid, :eid, :pos, :pj, :pg, :pe, :pp, :gf, :gc, :dg, :pts, :fp, CURRENT_TIMESTAMP)
            ON CONFLICT (torneo_id, torneo_equipo_id)
            DO UPDATE SET
                posicion=:pos, pj=:pj, pg=:pg, pe=:pe, pp=:pp,
                gf=:gf, gc=:gc, dg=:dg, pts=:pts, pts_fair_play_neg=:fp, actualizado_en=CURRENT_TIMESTAMP
        """), {"uuid": str(uuid.uuid4()), "tid": torneo_id, "eid": eid, "pos": pos,
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
# ENDPOINTS — EVENTOS Y TORNEOS
# ============================================================

@router.get("/eventos", summary="Listar eventos")
async def get_eventos(
    complejo_id: Optional[str] = None,
    estado: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    sql = """
        SELECT e.id, e.complejo_id, e.nombre, e.descripcion, e.fecha_inicio, e.fecha_fin, e.estado,
               c.nombre AS complejo_nombre,
               (SELECT json_agg(json_build_object('id', t.id, 'categoria', t.categoria, 'formato', t.formato)) 
                FROM cancha.torneos t WHERE t.evento_id = e.id) as categorias
        FROM cancha.torneos_eventos e
        JOIN cancha.complejos c ON e.complejo_id = c.id
        WHERE 1=1
    """
    params: dict = {}
    if complejo_id:
        sql += " AND e.complejo_id = :complejo_id"
        params["complejo_id"] = complejo_id
    if estado:
        sql += " AND e.estado = :estado"
        params["estado"] = estado
    sql += " ORDER BY e.fecha_inicio DESC"

    result = await session.execute(text(sql), params)
    rows = result.fetchall()
    
    events = []
    for r in rows:
        d = _row_to_dict(["id","complejo_id","nombre","descripcion","fecha_inicio","fecha_fin","estado","complejo_nombre","categorias"], r)
        # Parse JSON if needed
        cats = d.get("categorias")
        if isinstance(cats, str):
            try:
                d["categorias"] = json.loads(cats)
            except:
                d["categorias"] = []
        events.append(d)
    return events

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
               t.evento_id, t.categoria,
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
            "costo_inscripcion","evento_id","categoria","equipos_confirmados"]
    return [_row_to_dict(keys, r) for r in rows]


@router.post("", summary="Crear evento y categorías")
async def create_evento_y_categorias(payload: EventoCreate, session: AsyncSession = Depends(get_session)):
    try:
        fecha_ini = date.fromisoformat(payload.fecha_inicio)
        fecha_f = date.fromisoformat(payload.fecha_fin) if payload.fecha_fin else None

        # Insert Event
        evento_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO cancha.torneos_eventos
                (id, complejo_id, nombre, descripcion, fecha_inicio, fecha_fin, estado)
            VALUES
                (:id, :complejo_id, :nombre, :descripcion, :fecha_inicio, :fecha_fin, 'abierto')
        """), {
            "id": evento_id, "complejo_id": payload.complejo_id, "nombre": payload.nombre,
            "descripcion": payload.descripcion, "fecha_inicio": fecha_ini, "fecha_fin": fecha_f
        })

        # Insert Categories (Torneos)
        categorias_creadas = []
        for cat in payload.categorias:
            cat_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO cancha.torneos
                    (id, evento_id, complejo_id, nombre, descripcion, deporte, formato,
                     fecha_inicio, max_equipos, costo_inscripcion, estado,
                     pts_victoria, pts_empate, pts_derrota, reglas, premios, categoria, configuracion)
                VALUES
                    (:id, :evento_id, :complejo_id, :nombre, :descripcion, :deporte, :formato,
                     :fecha_inicio, :max_equipos, :costo_inscripcion, 'abierto',
                     :pts_v, :pts_e, :pts_d, :reglas, :premios, :categoria, :configuracion)
            """), {
                "id": cat_id, "evento_id": evento_id, "complejo_id": payload.complejo_id,
                "nombre": f"{payload.nombre} - {cat.nombre}", "descripcion": payload.descripcion,
                "deporte": payload.deporte, "formato": cat.formato, "fecha_inicio": fecha_ini,
                "max_equipos": cat.max_equipos, "costo_inscripcion": cat.costo_inscripcion,
                "pts_v": cat.pts_victoria, "pts_e": cat.pts_empate, "pts_d": cat.pts_derrota,
                "reglas": json.dumps(payload.reglas), "premios": json.dumps(payload.premios),
                "categoria": cat.nombre, "configuracion": json.dumps(cat.configuracion)
            })
            categorias_creadas.append({"id": cat_id, "nombre": cat.nombre, "formato": cat.formato})

        await session.commit()
        return {"evento_id": evento_id, "nombre": payload.nombre, "categorias": categorias_creadas}
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
        SELECT * FROM (
            SELECT DISTINCT ON (nombre) id, nombre, capitan_nombre, capitan_telefono, capitan_email,
                   estado_inscripcion, semilla, logo_url, color_principal, color_secundario, creado_en
            FROM cancha.torneos_equipos
            WHERE torneo_id = :tid 
            ORDER BY nombre ASC, creado_en ASC
        ) t
        ORDER BY t.creado_en ASC
    """), {"tid": torneo_id})
    rows = result.fetchall()
    keys = ["id","nombre","capitan_nombre","capitan_telefono","capitan_email",
            "estado_inscripcion","semilla","logo_url","color_principal","color_secundario"]
    return [_row_to_dict(keys, r) for r in rows]

@router.get("/{torneo_id}/posiciones", summary="Tabla de posiciones")
async def get_posiciones(torneo_id: str, session: AsyncSession = Depends(get_session)):
    try:
        t_res = await session.execute(
            text("SELECT pts_victoria, pts_empate, pts_derrota FROM cancha.torneos WHERE id = :tid"),
            {"tid": torneo_id}
        )
        t_row = t_res.fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail="Torneo no encontrado")
        
        pts_v = t_row[0] if t_row[0] is not None else 3
        pts_e = t_row[1] if t_row[1] is not None else 1
        pts_d = t_row[2] if t_row[2] is not None else 0

        sql = """
            WITH partidos AS (
                SELECT 
                    equipo_local_id AS equipo_id,
                    goles_local AS gf,
                    goles_visitante AS gc,
                    CASE 
                        WHEN goles_local > goles_visitante THEN :pts_v
                        WHEN goles_local = goles_visitante THEN :pts_e
                        ELSE :pts_d
                    END AS pts,
                    CASE WHEN goles_local > goles_visitante THEN 1 ELSE 0 END AS pg,
                    CASE WHEN goles_local = goles_visitante THEN 1 ELSE 0 END AS pe,
                    CASE WHEN goles_local < goles_visitante THEN 1 ELSE 0 END AS pp
                FROM cancha.torneos_partidos
                WHERE torneo_id = :tid AND estado = 'finalizado'

                UNION ALL

                SELECT 
                    equipo_visitante_id AS equipo_id,
                    goles_visitante AS gf,
                    goles_local AS gc,
                    CASE 
                        WHEN goles_visitante > goles_local THEN :pts_v
                        WHEN goles_visitante = goles_local THEN :pts_e
                        ELSE :pts_d
                    END AS pts,
                    CASE WHEN goles_visitante > goles_local THEN 1 ELSE 0 END AS pg,
                    CASE WHEN goles_visitante = goles_local THEN 1 ELSE 0 END AS pe,
                    CASE WHEN goles_visitante < goles_local THEN 1 ELSE 0 END AS pp
                FROM cancha.torneos_partidos
                WHERE torneo_id = :tid AND estado = 'finalizado'
            ),
            equipos_distinct AS (
                SELECT DISTINCT ON (nombre) id, nombre, logo_url
                FROM cancha.torneos_equipos
                WHERE torneo_id = :tid
                ORDER BY nombre ASC, creado_en ASC
            )
            SELECT 
                e.id, 
                e.nombre,
                e.logo_url,
                COUNT(p.equipo_id) AS pj,
                COALESCE(SUM(p.pg), 0) AS pg,
                COALESCE(SUM(p.pe), 0) AS pe,
                COALESCE(SUM(p.pp), 0) AS pp,
                COALESCE(SUM(p.gf), 0) AS gf,
                COALESCE(SUM(p.gc), 0) AS gc,
                COALESCE(SUM(p.gf) - SUM(p.gc), 0) AS dif,
                COALESCE(SUM(p.pts), 0) AS pts
            FROM equipos_distinct e
            LEFT JOIN partidos p ON e.id = p.equipo_id
            GROUP BY e.id, e.nombre, e.logo_url
            ORDER BY pts DESC, dif DESC, gf DESC, e.nombre ASC
        """
        result = await session.execute(text(sql), {
            "tid": torneo_id, 
            "pts_v": pts_v, 
            "pts_e": pts_e, 
            "pts_d": pts_d
        })
        
        keys = ["id", "nombre", "logo_url", "pj", "pg", "pe", "pp", "gf", "gc", "dif", "pts"]
        return [_row_to_dict(keys, r) for r in result.fetchall()]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
                 estado_inscripcion, logo_url, color_principal, color_secundario, promocion)
            VALUES
                (gen_random_uuid(), :tid, :nombre, :capitan_nombre, :capitan_telefono,
                 :capitan_email, :estado, :logo_url, :color_p, :color_s, :promocion)
            RETURNING id, torneo_id, nombre, estado_inscripcion, promocion
        """), {
            "tid": torneo_id, "nombre": payload.nombre,
            "capitan_nombre": payload.capitan_nombre,
            "capitan_telefono": payload.capitan_telefono,
            "capitan_email": payload.capitan_email,
            "estado": estado_insc,
            "logo_url": payload.logo_url,
            "color_p": payload.color_principal,
            "color_s": payload.color_secundario,
            "promocion": payload.promocion
        })
        await session.commit()
        row = result.fetchone()
        return _row_to_dict(["id","torneo_id","nombre","estado_inscripcion","promocion"], row)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{torneo_id}/equipos/{equipo_id}/logo", summary="Subir logo del equipo")
async def upload_equipo_logo(
    torneo_id: str,
    equipo_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "logos")
        os.makedirs(upload_dir, exist_ok=True)

        ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        filename = f"logo_equipo_{equipo_id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(upload_dir, filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logo_url = f"/static/uploads/logos/{filename}"

        sql = "UPDATE cancha.torneos_equipos SET logo_url = :logo_url WHERE id = :eid AND torneo_id = :tid RETURNING id"
        res = await session.execute(text(sql), {"logo_url": logo_url, "eid": equipo_id, "tid": torneo_id})
        await session.commit()

        if not res.fetchone():
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        return {"status": "ok", "logo_url": logo_url}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ENDPOINTS — JUGADORES / PLANTEL
# ============================================================

@router.get("/{torneo_id}/equipos/{equipo_id}/jugadores", summary="Plantel del equipo")
async def get_jugadores(torneo_id: str, equipo_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("""
        SELECT tp.id, tp.nombre, tp.dni, tp.fecha_nacimiento, tp.numero_camiseta,
               tp.posicion, tp.foto_url, tp.estado, tp.partidos_jugados,
               tp.amarillas_acum, tp.rojas_acum, tp.egreso_ano, tp.es_exalumno
        FROM cancha.tournament_players tp
        WHERE tp.torneo_equipo_id = :eid
        ORDER BY tp.numero_camiseta ASC NULLS LAST, tp.nombre ASC
    """), {"eid": equipo_id})
    rows = result.fetchall()
    keys = ["id","nombre","dni","fecha_nacimiento","numero_camiseta",
            "posicion","foto_url","estado","partidos_jugados","amarillas_acum","rojas_acum","egreso_ano","es_exalumno"]
    return [_row_to_dict(keys, r) for r in rows]


async def _get_config_param(param_key: str, default_value, torneo_id: str, session: AsyncSession):
    """Retrieves a configuration parameter hierarchically: Torneo -> Complejo -> Default."""
    t_res = await session.execute(
        text("SELECT config, configuracion, complejo_id FROM cancha.torneos WHERE id = :tid"),
        {"tid": torneo_id}
    )
    t_row = t_res.fetchone()
    if not t_row:
        return default_value
        
    t_config, t_configuracion, complejo_id = t_row
    
    # Try t_config
    if t_config:
        try:
            if isinstance(t_config, str):
                t_config = json.loads(t_config)
            if isinstance(t_config, dict) and param_key in t_config:
                return t_config[param_key]
        except Exception:
            pass
            
    # Try t_configuracion
    if t_configuracion:
        try:
            if isinstance(t_configuracion, str):
                t_configuracion = json.loads(t_configuracion)
            if isinstance(t_configuracion, dict) and param_key in t_configuracion:
                return t_configuracion[param_key]
        except Exception:
            pass

    # 2. Check Complejo's configuracion
    if complejo_id:
        c_res = await session.execute(
            text("SELECT configuracion FROM cancha.complejos WHERE id = :cid"),
            {"cid": complejo_id}
        )
        c_row = c_res.fetchone()
        if c_row and c_row[0]:
            c_config = c_row[0]
            try:
                if isinstance(c_config, str):
                    c_config = json.loads(c_config)
                if isinstance(c_config, dict) and param_key in c_config:
                    return c_config[param_key]
            except Exception:
                pass

    return default_value


@router.post("/{torneo_id}/equipos/{equipo_id}/jugadores", summary="Agregar jugador al plantel")
async def add_jugador(
    torneo_id: str, equipo_id: str,
    payload: JugadorCreate,
    session: AsyncSession = Depends(get_session)
):
    try:
        # 1. Obtener datos del equipo y del torneo
        team_res = await session.execute(
            text("""
                SELECT te.promocion, t.categoria, t.estado
                FROM cancha.torneos_equipos te
                JOIN cancha.torneos t ON te.torneo_id = t.id
                WHERE te.id = :eid AND te.torneo_id = :tid
            """),
            {"eid": equipo_id, "tid": torneo_id}
        )
        team_row = team_res.fetchone()
        if not team_row:
            raise HTTPException(status_code=404, detail="Equipo no encontrado en este torneo")
        
        team_promocion, torneo_categoria, torneo_estado = team_row
        team_promocion = team_promocion or 0
        torneo_categoria = torneo_categoria or 'Primera'

        # 2. Bloqueo de adición de jugadores en fases finales (playoffs)
        if torneo_estado in ('playoffs', 'finalizado'):
             raise HTTPException(
                 status_code=400,
                 detail="Está prohibido incorporar jugadores en fases de eliminación directa / playoffs o cuando el torneo está finalizado."
             )

        # 3. Validar DNI no repetido en otro equipo del mismo torneo
        dup = await session.execute(text("""
            SELECT tp.id FROM cancha.tournament_players tp
            JOIN cancha.torneos_equipos te ON tp.torneo_equipo_id = te.id
            WHERE te.torneo_id = :tid AND tp.dni = :dni
        """), {"tid": torneo_id, "dni": payload.dni})
        if dup.fetchone():
            raise HTTPException(status_code=409, detail=f"El jugador con DNI {payload.dni} ya está inscripto en otro equipo de este torneo")

        # 4. Validar edad y fecha de nacimiento
        current_year = datetime.now().year
        player_age = None
        fnac = None
        if payload.fecha_nacimiento:
            try:
                fnac = date.fromisoformat(payload.fecha_nacimiento)
                player_age = current_year - fnac.year
            except Exception:
                fnac = None

        # 5. Determinar si el jugador es considerado refuerzo
        is_refuerzo = False
        anos_exencion_vg = await _get_config_param("anos_exencion_viejas_glorias", 25, torneo_id, session)
        if not payload.es_exalumno or payload.egreso_ano != team_promocion:
            is_refuerzo = True
            
            # Exención de viejas glorias
            if payload.es_exalumno and payload.egreso_ano:
                years_since_egreso = current_year - payload.egreso_ano
                if years_since_egreso >= anos_exencion_vg:
                    is_refuerzo = False

        # 6. Si es refuerzo, aplicar validaciones de cupo de refuerzos
        if is_refuerzo:
            existing_players_res = await session.execute(
                text("""
                    SELECT es_exalumno, egreso_ano, fecha_nacimiento
                    FROM cancha.tournament_players
                    WHERE torneo_equipo_id = :eid
                """),
                {"eid": equipo_id}
            )
            existing_players = existing_players_res.fetchall()
            
            refuerzos_count = 0
            refuerzos_menores_30_count = 0
            
            for p_es_exalumno, p_egreso_ano, p_fnac in existing_players:
                p_is_refuerzo = False
                if not p_es_exalumno or p_egreso_ano != team_promocion:
                    p_is_refuerzo = True
                    if p_es_exalumno and p_egreso_ano:
                        p_years = current_year - p_egreso_ano
                        if p_years >= anos_exencion_vg:
                            p_is_refuerzo = False
                
                if p_is_refuerzo:
                    refuerzos_count += 1
                    if p_fnac:
                        if isinstance(p_fnac, str):
                            try:
                                p_year = int(p_fnac.split('-')[0])
                            except Exception:
                                p_year = current_year
                        else:
                            p_year = p_fnac.year
                        p_age = current_year - p_year
                        if p_age < 30:
                            refuerzos_menores_30_count += 1

            # Calcular límite máximo de refuerzos permitido
            antiguedad_promo = current_year - team_promocion
            if antiguedad_promo > 15 and torneo_categoria != 'Primera':
                max_refuerzos = await _get_config_param("limite_refuerzos_antiguedad", 6, torneo_id, session)
            else:
                max_refuerzos = await _get_config_param("limite_refuerzos_estandar", 4, torneo_id, session)
                
            if refuerzos_count >= max_refuerzos:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cupo de refuerzos completo. Límite máximo para este equipo: {max_refuerzos} refuerzos."
                )

            if torneo_categoria == 'Ejecutivo':
                if player_age is not None and player_age < 30:
                    max_menores_30 = await _get_config_param("limite_refuerzos_menores_30_ejecutivo", 1, torneo_id, session)
                    if refuerzos_menores_30_count >= max_menores_30:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Categoría Ejecutivo: Solo se permite {max_menores_30} refuerzo(s) menor(es) de 30 años por equipo, y ya hay uno registrado."
                        )
        # 7. Insertar jugador
        player_uuid = str(uuid.uuid4())
        result = await session.execute(text("""
            INSERT INTO cancha.tournament_players
                (id, torneo_equipo_id, nombre, dni, fecha_nacimiento, numero_camiseta, posicion, foto_url, egreso_ano, es_exalumno)
            VALUES
                (:id, :eid, :nombre, :dni, :fnac, :camiseta, :posicion, :foto_url, :egreso_ano, :es_exalumno)
            RETURNING id, nombre, dni, numero_camiseta, posicion, estado, egreso_ano, es_exalumno
        """), {
            "id": player_uuid,
            "eid": equipo_id, "nombre": payload.nombre, "dni": payload.dni,
            "fnac": fnac, "camiseta": payload.numero_camiseta,
            "posicion": payload.posicion, "foto_url": payload.foto_url,
            "egreso_ano": payload.egreso_ano, "es_exalumno": payload.es_exalumno
        })
        await session.commit()
        row = result.fetchone()
        return _row_to_dict(["id","nombre","dni","numero_camiseta","posicion","estado","egreso_ano","es_exalumno"], row)
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
                fecha_hora_fin_real = CURRENT_TIMESTAMP, acta_cerrada_en = CURRENT_TIMESTAMP
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
            
            await _avanzar_ronda_eliminatoria(torneo_id, session)
            await _verificar_fin_fase_grupos(torneo_id, session)
            await session.commit()

        return {"id": partido_id, "goles_local": payload.goles_local,
                "goles_visitante": payload.goles_visitante, "estado": payload.estado}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


async def _chequear_descalificacion_wo(equipo_id: str, torneo_id: str, session: AsyncSession):
    """Monitorea los W.O. y descalifica automáticamente si acumula 3 consecutivos o 4 alternados."""
    res = await session.execute(
        text("""
            SELECT id, estado, equipo_wo_id
            FROM cancha.torneos_partidos
            WHERE torneo_id = :tid 
              AND (equipo_local_id = :eid OR equipo_visitante_id = :eid)
              AND estado IN ('finalizado', 'wo')
            ORDER BY fecha_hora ASC
        """),
        {"tid": torneo_id, "eid": equipo_id}
    )
    partidos = res.fetchall()
    
    # 1. Contar W.O.s alternados (totales)
    wo_totales = 0
    for pid, estado, eq_wo_id in partidos:
        if estado == 'wo' and eq_wo_id and str(eq_wo_id) == equipo_id:
            wo_totales += 1
            
    # 2. Contar W.O.s consecutivos
    wo_consecutivos = 0
    max_consecutivos = 0
    for pid, estado, eq_wo_id in partidos:
        if estado == 'wo' and eq_wo_id and str(eq_wo_id) == equipo_id:
            wo_consecutivos += 1
            if wo_consecutivos > max_consecutivos:
                max_consecutivos = wo_consecutivos
        else:
            wo_consecutivos = 0
            
    # Disparador de Expulsión: parametrizable por tenant
    consecutivos_limit = await _get_config_param("consecutivos_wo_descalificacion", 3, torneo_id, session)
    alternados_limit = await _get_config_param("alternados_wo_descalificacion", 4, torneo_id, session)

    if max_consecutivos >= consecutivos_limit or wo_totales >= alternados_limit:
        # Cambiar estado del equipo a 'eliminado'
        await session.execute(
            text("""
                UPDATE cancha.torneos_equipos
                SET estado_inscripcion = 'eliminado', updated_at = CURRENT_TIMESTAMP
                WHERE id = :eid
            """),
            {"eid": equipo_id}
        )
        
        # Sancionar al equipo dando por perdidos todos sus partidos restantes por 2-0 (marcador WO)
        partidos_restantes_res = await session.execute(
            text("""
                SELECT id, equipo_local_id, equipo_visitante_id
                FROM cancha.torneos_partidos
                WHERE torneo_id = :tid
                  AND (equipo_local_id = :eid OR equipo_visitante_id = :eid)
                  AND estado NOT IN ('finalizado', 'wo')
            """),
            {"tid": torneo_id, "eid": equipo_id}
        )
        partidos_restantes = partidos_restantes_res.fetchall()
        
        for p_id, loc_id, vis_id in partidos_restantes:
            p_id = str(p_id)
            loc_id = str(loc_id)
            vis_id = str(vis_id)
            
            if loc_id == equipo_id:
                gl, gv = 0, 2
                ganador_id = vis_id
            else:
                gl, gv = 2, 0
                ganador_id = loc_id
                
            await session.execute(
                text("""
                    UPDATE cancha.torneos_partidos
                    SET estado = 'wo', es_wo = true,
                        equipo_wo_id = :infractor_id,
                        goles_local = :gl, goles_visitante = :gv,
                        ganador_id = :ganador_id,
                        fecha_hora_fin_real = CURRENT_TIMESTAMP, acta_cerrada_en = CURRENT_TIMESTAMP
                    WHERE id = :pid
                """),
                {
                    "pid": p_id, "infractor_id": equipo_id,
                    "gl": gl, "gv": gv, "ganador_id": ganador_id
                }
            )
        return True
    return False


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
                fecha_hora_fin_real = CURRENT_TIMESTAMP, acta_cerrada_en = CURRENT_TIMESTAMP
            WHERE id = :pid
        """), {
            "pid": partido_id, "infractor_id": payload.equipo_infractor_id,
            "gl": gl, "gv": gv, "ganador_id": ganador_id
        })
        await session.commit()
        
        # Chequear si corresponde la descalificación
        fue_descalificado = await _chequear_descalificacion_wo(payload.equipo_infractor_id, torneo_id, session)
        await session.commit()

        await _recalcular_posiciones(torneo_id, session)
        await session.commit()

        await _avanzar_ronda_eliminatoria(torneo_id, session)
        await _verificar_fin_fase_grupos(torneo_id, session)
        await session.commit()
 
        msg = "W.O. declarado correctamente"
        if fue_descalificado:
            msg += ". El equipo infractor acumuló el límite de W.O.s y fue ELIMINADO DEL TORNEO. Se otorgaron victorias automáticas para sus partidos restantes."

        return {"status": "ok", "message": msg,
                "goles_local": gl, "goles_visitante": gv, "ganador_id": ganador_id,
                "eliminado": fue_descalificado}
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

def _generar_primera_ronda_eliminatoria(equipos: list) -> tuple[str, list, any]:
    """Genera la primera ronda de bracket de eliminación directa según el número de equipos."""
    m = len(equipos)
    if m <= 2:
        fase = "Final"
    elif m <= 4:
        fase = "Semifinal"
    elif m <= 8:
        fase = "Cuartos de Final"
    elif m <= 16:
        fase = "Octavos de Final"
    else:
        fase = "Dieciseisavos de Final"
        
    partidos = []
    for i in range(m // 2):
        partidos.append((equipos[i], equipos[m - 1 - i]))
        
    bye_team = equipos[m // 2] if m % 2 != 0 else None
    return fase, partidos, bye_team


async def _avanzar_ronda_eliminatoria(torneo_id: str, session: AsyncSession):
    """Verifica si todos los partidos de la fase eliminatoria actual terminaron y genera la siguiente fase."""
    t_res = await session.execute(
        text("SELECT formato, estado, fecha_inicio FROM cancha.torneos WHERE id = :tid"),
        {"tid": torneo_id}
    )
    t_row = t_res.fetchone()
    if not t_row:
        return
    formato, torneo_estado, fecha_inicio = t_row
    if isinstance(fecha_inicio, str):
        fecha_inicio = date.fromisoformat(fecha_inicio)
    
    if formato not in ('eliminatoria', 'mixta'):
        return

    # Buscar partidos activos en fase eliminatoria
    f_res = await session.execute(
        text("""
            SELECT fase, MAX(jornada) 
            FROM cancha.torneos_partidos 
            WHERE torneo_id = :tid 
              AND (fase LIKE '%Final%' OR fase LIKE '%Semifinal%')
            GROUP BY fase
        """),
        {"tid": torneo_id}
    )
    fases = f_res.fetchall()
    if not fases:
        return
        
    jerarquia = ["Dieciseisavos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Final"]
    
    fase_actual = None
    max_idx = -1
    max_jornada = 1
    for f, j in fases:
        for idx, name in enumerate(jerarquia):
            if f == name and idx > max_idx:
                max_idx = idx
                fase_actual = name
                max_jornada = j or 1
                
    if not fase_actual:
        return
        
    p_res = await session.execute(
        text("""
            SELECT id, estado, ganador_id, equipo_local_id, equipo_visitante_id, es_wo
            FROM cancha.torneos_partidos
            WHERE torneo_id = :tid AND fase = :fase
        """),
        {"tid": torneo_id, "fase": fase_actual}
    )
    partidos = p_res.fetchall()
    if not partidos:
        return
        
    for pid, estado, win_id, el_id, ev_id, es_wo in partidos:
        if estado not in ('finalizado', 'wo'):
            return # Aún quedan partidos por jugar en esta fase
            
    ganadores = []
    for pid, estado, win_id, el_id, ev_id, es_wo in partidos:
        if win_id:
            ganadores.append(str(win_id))
            
    # ¿Hay algún equipo que tuvo BYE?
    eq_res = await session.execute(
        text("""
            SELECT id FROM cancha.torneos_equipos 
            WHERE torneo_id = :tid AND estado_inscripcion = 'confirmado'
        """),
        {"tid": torneo_id}
    )
    todos_equipos = [str(r[0]) for r in eq_res.fetchall()]
    
    jugaron = set()
    for pid, estado, win_id, el_id, ev_id, es_wo in partidos:
        if el_id: jugaron.add(str(el_id))
        if ev_id: jugaron.add(str(ev_id))
        
    for eq_id in todos_equipos:
        if eq_id not in jugaron:
            ganadores.append(eq_id)

    idx_actual = jerarquia.index(fase_actual)
    if idx_actual == len(jerarquia) - 1:
        await session.execute(
            text("UPDATE cancha.torneos SET estado = 'finalizado' WHERE id = :tid"),
            {"tid": torneo_id}
        )
        return
        
    siguiente_fase = jerarquia[idx_actual + 1]
    
    from datetime import timedelta, time as dtime
    siguiente_jornada = max_jornada + 1
    fecha_partido = fecha_inicio + timedelta(days=(siguiente_jornada - 1) * 7)
    
    partidos_siguiente = []
    m = len(ganadores)
    for i in range(m // 2):
        partidos_siguiente.append((ganadores[i], ganadores[m - 1 - i]))
        
    total_creados = 0
    for i, (local, visitante) in enumerate(partidos_siguiente):
        hora = dtime(18 + i, 0)
        await session.execute(text("""
            INSERT INTO cancha.torneos_partidos
                (id, torneo_id, equipo_local_id, equipo_visitante_id,
                 fase, jornada, numero_partido, fecha_hora, estado)
            VALUES
                (:uuid, :tid, :local, :visitante,
                 :fase, :jornada, :num, :fecha_hora, 'programado')
        """), {
            "uuid": str(uuid.uuid4()),
            "tid": torneo_id, "local": local, "visitante": visitante,
            "fase": siguiente_fase, "jornada": siguiente_jornada,
            "num": i + 1,
            "fecha_hora": datetime.combine(fecha_partido, hora)
        })
        total_creados += 1
        
    if m % 2 != 0:
        bye_team = ganadores[m // 2]
        hora = dtime(18 + total_creados, 0)
        await session.execute(text("""
            INSERT INTO cancha.torneos_partidos
                (id, torneo_id, equipo_local_id, equipo_visitante_id,
                 fase, jornada, numero_partido, fecha_hora, estado, es_wo, ganador_id, goles_local, goles_visitante, fecha_hora_fin_real, acta_cerrada_en)
            VALUES
                (:uuid, :tid, :local, NULL,
                 :fase, :jornada, :num, :fecha_hora, 'wo', true, :local, 2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "uuid": str(uuid.uuid4()),
            "tid": torneo_id, "local": bye_team,
            "fase": siguiente_fase, "jornada": siguiente_jornada,
            "num": total_creados + 1,
            "fecha_hora": datetime.combine(fecha_partido, hora)
        })


async def _verificar_fin_fase_grupos(torneo_id: str, session: AsyncSession):
    """Para torneos mixtos, verifica si terminó la fase de grupos y genera las semifinales de playoffs."""
    t_res = await session.execute(
        text("SELECT formato, estado, fecha_inicio FROM cancha.torneos WHERE id = :tid"),
        {"tid": torneo_id}
    )
    t_row = t_res.fetchone()
    if not t_row or t_row[0] != 'mixta':
        return
        
    fecha_inicio = t_row[2]
    if isinstance(fecha_inicio, str):
        fecha_inicio = date.fromisoformat(fecha_inicio)

    playoffs_res = await session.execute(
        text("SELECT COUNT(*) FROM cancha.torneos_partidos WHERE torneo_id = :tid AND (fase = 'Semifinal' OR fase = 'Final')"),
        {"tid": torneo_id}
    )
    if playoffs_res.scalar() > 0:
        return

    p_res = await session.execute(
        text("SELECT id, estado, fase FROM cancha.torneos_partidos WHERE torneo_id = :tid AND fase LIKE 'Grupo%'"),
        {"tid": torneo_id}
    )
    group_partidos = p_res.fetchall()
    if not group_partidos:
        return
        
    for pid, estado, fase in group_partidos:
        if estado not in ('finalizado', 'wo'):
            return

    eq_res = await session.execute(
        text("SELECT id, nombre FROM cancha.torneos_equipos WHERE torneo_id = :tid AND estado_inscripcion = 'confirmado'"),
        {"tid": torneo_id}
    )
    equipos = [str(r[0]) for r in eq_res.fetchall()]
    
    grupo_a_teams = set()
    grupo_b_teams = set()
    for pid, estado, fase in group_partidos:
        eqs_res = await session.execute(
            text("SELECT equipo_local_id, equipo_visitante_id FROM cancha.torneos_partidos WHERE id = :pid"),
            {"pid": pid}
        )
        el, ev = eqs_res.fetchone()
        if 'Grupo A' in fase:
            if el: grupo_a_teams.add(str(el))
            if ev: grupo_a_teams.add(str(ev))
        elif 'Grupo B' in fase:
            if el: grupo_b_teams.add(str(el))
            if ev: grupo_b_teams.add(str(ev))

    pos_res = await session.execute(
        text("SELECT torneo_equipo_id, pts, dg, gf FROM cancha.torneos_posiciones WHERE torneo_id = :tid"),
        {"tid": torneo_id}
    )
    pos_map = {str(r[0]): (r[1] or 0, r[2] or 0, r[3] or 0) for r in pos_res.fetchall()}

    sorted_a = sorted(
        list(grupo_a_teams),
        key=lambda e: pos_map.get(e, (0, 0, 0)),
        reverse=True
    )
    sorted_b = sorted(
        list(grupo_b_teams),
        key=lambda e: pos_map.get(e, (0, 0, 0)),
        reverse=True
    )

    if len(sorted_a) < 2 or len(sorted_b) < 2:
        return

    a1, a2 = sorted_a[0], sorted_a[1]
    b1, b2 = sorted_b[0], sorted_b[1]

    jornada_max_res = await session.execute(
        text("SELECT MAX(jornada) FROM cancha.torneos_partidos WHERE torneo_id = :tid"),
        {"tid": torneo_id}
    )
    jornada_max = (jornada_max_res.scalar() or 0) + 1

    from datetime import timedelta, time as dtime
    fecha_partido = fecha_inicio + timedelta(days=(jornada_max - 1) * 7)
    
    cruces = [(a1, b2), (b1, a2)]
    for i, (local, visitante) in enumerate(cruces):
        hora = dtime(18 + i, 0)
        await session.execute(text("""
            INSERT INTO cancha.torneos_partidos
                (id, torneo_id, equipo_local_id, equipo_visitante_id,
                 fase, jornada, numero_partido, fecha_hora, estado)
            VALUES
                (:uuid, :tid, :local, :visitante,
                 'Semifinal', :jornada, :num, :fecha_hora, 'programado')
        """), {
            "uuid": str(uuid.uuid4()),
            "tid": torneo_id, "local": local, "visitante": visitante,
            "jornada": jornada_max, "num": i + 1,
            "fecha_hora": datetime.combine(fecha_partido, hora)
        })
    
    await session.execute(
        text("UPDATE cancha.torneos SET estado = 'playoffs' WHERE id = :tid"),
        {"tid": torneo_id}
    )


def _generar_round_robin(equipos_ids: list, a_dos_vueltas: bool = False) -> list:
    """Algoritmo de Berger — maneja número impar con BYE, e Ida/Vuelta."""
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

    if a_dos_vueltas:
        rondas_vuelta = []
        for ronda in rondas:
            partidos_vuelta = [(v, l) for l, v in ronda]
            rondas_vuelta.append(partidos_vuelta)
        rondas.extend(rondas_vuelta)

    return rondas


@router.post("/{torneo_id}/fixture", summary="Generar fixture automático")
async def generar_fixture(torneo_id: str, session: AsyncSession = Depends(get_session)):
    try:
        from datetime import timedelta, time as dtime

        torneo_res = await session.execute(
            text("SELECT id, formato, fecha_inicio, configuracion FROM cancha.torneos WHERE id = :tid"),
            {"tid": torneo_id}
        )
        torneo = torneo_res.fetchone()
        if not torneo:
            raise HTTPException(status_code=404, detail="Torneo no encontrado")

        formato = torneo[1] or 'liga'
        fecha_base = torneo[2]
        if isinstance(fecha_base, str):
            fecha_base = date.fromisoformat(fecha_base)
            
        config_str = torneo[3]
        configuracion = {}
        if config_str:
            if isinstance(config_str, str):
                try: configuracion = json.loads(config_str)
                except: pass
            else: configuracion = config_str
        
        a_dos_vueltas = configuracion.get("a_dos_vueltas", False)
        tipo_sorteo = configuracion.get("tipo_sorteo_playoffs", "random")

        equipos_res = await session.execute(
            text("SELECT id, semilla FROM cancha.torneos_equipos WHERE torneo_id = :tid AND estado_inscripcion = 'confirmado'"),
            {"tid": torneo_id}
        )
        equipos_db = equipos_res.fetchall()
        
        if tipo_sorteo == 'random':
            import random
            random.shuffle(equipos_db)
        else:
            equipos_db = sorted(equipos_db, key=lambda x: x[1] or 9999)
            
        equipos = [str(r[0]) for r in equipos_db]

        if len(equipos) < 2:
            raise HTTPException(status_code=400, detail="Se necesitan al menos 2 equipos confirmados")

        # Limpiar fixture anterior
        await session.execute(
            text("DELETE FROM cancha.torneos_partidos WHERE torneo_id = :tid"),
            {"tid": torneo_id}
        )

        total = 0
        jornadas_totales = 0

        if formato == 'liga':
            rondas = _generar_round_robin(equipos, a_dos_vueltas=a_dos_vueltas)
            jornadas_totales = len(rondas)
            for round_num, partidos_ronda in enumerate(rondas, start=1):
                fecha_partido = fecha_base + timedelta(days=(round_num - 1) * 7)
                for i, (local, visitante) in enumerate(partidos_ronda):
                    hora = dtime(18 + i, 0)
                    await session.execute(text("""
                        INSERT INTO cancha.torneos_partidos
                            (id, torneo_id, equipo_local_id, equipo_visitante_id,
                             fase, jornada, numero_partido, fecha_hora, estado)
                        VALUES
                            (:uuid, :tid, :local, :visitante,
                             :fase, :jornada, :num, :fecha_hora, 'programado')
                    """), {
                        "uuid": str(uuid.uuid4()),
                        "tid": torneo_id, "local": local, "visitante": visitante,
                        "fase": f"Fecha {round_num}", "jornada": round_num,
                        "num": total + 1,
                        "fecha_hora": datetime.combine(fecha_partido, hora)
                    })
                    total += 1

        elif formato == 'eliminatoria':
            fase, partidos_ronda, bye_team = _generar_primera_ronda_eliminatoria(equipos)
            jornadas_totales = 1
            fecha_partido = fecha_base
            for i, (local, visitante) in enumerate(partidos_ronda):
                hora = dtime(18 + i, 0)
                await session.execute(text("""
                    INSERT INTO cancha.torneos_partidos
                        (id, torneo_id, equipo_local_id, equipo_visitante_id,
                         fase, jornada, numero_partido, fecha_hora, estado)
                    VALUES
                        (:uuid, :tid, :local, :visitante,
                         :fase, 1, :num, :fecha_hora, 'programado')
                """), {
                    "uuid": str(uuid.uuid4()),
                    "tid": torneo_id, "local": local, "visitante": visitante,
                    "fase": fase, "num": total + 1,
                    "fecha_hora": datetime.combine(fecha_partido, hora)
                })
                total += 1
            
            if bye_team:
                hora = dtime(18 + total, 0)
                await session.execute(text("""
                    INSERT INTO cancha.torneos_partidos
                        (id, torneo_id, equipo_local_id, equipo_visitante_id,
                         fase, jornada, numero_partido, fecha_hora, estado, es_wo, ganador_id, goles_local, goles_visitante, fecha_hora_fin_real, acta_cerrada_en)
                    VALUES
                        (:uuid, :tid, :local, NULL,
                         :fase, 1, :num, :fecha_hora, 'wo', true, :local, 2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """), {
                    "uuid": str(uuid.uuid4()),
                    "tid": torneo_id, "local": bye_team,
                    "fase": fase, "num": total + 1,
                    "fecha_hora": datetime.combine(fecha_partido, hora)
                })
                total += 1

        elif formato == 'mixta':
            grupo_a = [eq for idx, eq in enumerate(equipos) if idx % 2 == 0]
            grupo_b = [eq for idx, eq in enumerate(equipos) if idx % 2 != 0]

            rondas_a = _generar_round_robin(grupo_a, a_dos_vueltas=a_dos_vueltas)
            rondas_b = _generar_round_robin(grupo_b, a_dos_vueltas=a_dos_vueltas)
            
            max_rondas = max(len(rondas_a), len(rondas_b))
            jornadas_totales = max_rondas

            for r_num in range(max_rondas):
                fecha_partido = fecha_base + timedelta(days=r_num * 7)
                i_partido = 0
                
                # Partidos Grupo A
                if r_num < len(rondas_a):
                    for local, visitante in rondas_a[r_num]:
                        hora = dtime(18 + i_partido, 0)
                        await session.execute(text("""
                            INSERT INTO cancha.torneos_partidos
                                (id, torneo_id, equipo_local_id, equipo_visitante_id,
                                 fase, jornada, numero_partido, fecha_hora, estado)
                            VALUES
                                (:uuid, :tid, :local, :visitante,
                                 :fase, :jornada, :num, :fecha_hora, 'programado')
                        """), {
                            "uuid": str(uuid.uuid4()),
                            "tid": torneo_id, "local": local, "visitante": visitante,
                            "fase": f"Grupo A - Fecha {r_num + 1}", "jornada": r_num + 1,
                            "num": total + 1,
                            "fecha_hora": datetime.combine(fecha_partido, hora)
                        })
                        total += 1
                        i_partido += 1
                        
                # Partidos Grupo B
                if r_num < len(rondas_b):
                    for local, visitante in rondas_b[r_num]:
                        hora = dtime(18 + i_partido, 0)
                        await session.execute(text("""
                            INSERT INTO cancha.torneos_partidos
                                (id, torneo_id, equipo_local_id, equipo_visitante_id,
                                 fase, jornada, numero_partido, fecha_hora, estado)
                            VALUES
                                (:uuid, :tid, :local, :visitante,
                                 :fase, :jornada, :num, :fecha_hora, 'programado')
                        """), {
                            "uuid": str(uuid.uuid4()),
                            "tid": torneo_id, "local": local, "visitante": visitante,
                            "fase": f"Grupo B - Fecha {r_num + 1}", "jornada": r_num + 1,
                            "num": total + 1,
                            "fecha_hora": datetime.combine(fecha_partido, hora)
                        })
                        total += 1
                        i_partido += 1

        elif formato == 'suizo':
            jornadas_totales = 1
            fecha_partido = fecha_base
            m = len(equipos)
            
            partidos_ronda = []
            for i in range(m // 2):
                partidos_ronda.append((equipos[i], equipos[m - 1 - i]))
                
            bye_team = equipos[m // 2] if m % 2 != 0 else None
            
            for i, (local, visitante) in enumerate(partidos_ronda):
                hora = dtime(18 + i, 0)
                await session.execute(text("""
                    INSERT INTO cancha.torneos_partidos
                        (id, torneo_id, equipo_local_id, equipo_visitante_id,
                         fase, jornada, numero_partido, fecha_hora, estado)
                    VALUES
                        (:uuid, :tid, :local, :visitante,
                         'Suizo - Ronda 1', 1, :num, :fecha_hora, 'programado')
                """), {
                    "uuid": str(uuid.uuid4()),
                    "tid": torneo_id, "local": local, "visitante": visitante,
                    "num": total + 1,
                    "fecha_hora": datetime.combine(fecha_partido, hora)
                })
                total += 1
                
            if bye_team:
                hora = dtime(18 + total, 0)
                await session.execute(text("""
                    INSERT INTO cancha.torneos_partidos
                        (id, torneo_id, equipo_local_id, equipo_visitante_id,
                         fase, jornada, numero_partido, fecha_hora, estado, es_wo, ganador_id, goles_local, goles_visitante, fecha_hora_fin_real, acta_cerrada_en)
                    VALUES
                        (:uuid, :tid, :local, NULL,
                         'Suizo - Ronda 1', 1, :num, :fecha_hora, 'wo', true, :local, 2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """), {
                    "uuid": str(uuid.uuid4()),
                    "tid": torneo_id, "local": bye_team,
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
                    (:uuid, :tid, :eid, 0)
                ON CONFLICT (torneo_id, torneo_equipo_id) DO NOTHING
            """), {"uuid": str(uuid.uuid4()), "tid": torneo_id, "eid": eid})

        await session.commit()
        return {"status": "ok", "message": f"Fixture generado: {total} partidos en {jornadas_totales} jornadas"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{torneo_id}/fixture/suizo/siguiente", summary="Generar siguiente ronda del sistema Suizo")
async def generar_siguiente_ronda_suizo(torneo_id: str, session: AsyncSession = Depends(get_session)):
    try:
        from datetime import timedelta, time as dtime

        torneo_res = await session.execute(
            text("SELECT id, formato, fecha_inicio FROM cancha.torneos WHERE id = :tid"),
            {"tid": torneo_id}
        )
        torneo = torneo_res.fetchone()
        if not torneo:
            raise HTTPException(status_code=404, detail="Torneo no encontrado")

        formato, fecha_base = torneo[1], torneo[2]
        if isinstance(fecha_base, str):
            fecha_base = date.fromisoformat(fecha_base)
        if formato != 'suizo':
            raise HTTPException(status_code=400, detail="Este torneo no es de formato suizo")

        ronda_res = await session.execute(
            text("SELECT MAX(jornada) FROM cancha.torneos_partidos WHERE torneo_id = :tid"),
            {"tid": torneo_id}
        )
        ronda_actual = ronda_res.scalar()
        if not ronda_actual:
            raise HTTPException(status_code=400, detail="No se ha generado la primera ronda aún")

        activos_res = await session.execute(
            text("""
                SELECT COUNT(*) FROM cancha.torneos_partidos 
                WHERE torneo_id = :tid AND jornada = :ronda AND estado NOT IN ('finalizado', 'wo')
            """),
            {"tid": torneo_id, "ronda": ronda_actual}
        )
        if activos_res.scalar() > 0:
            raise HTTPException(status_code=400, detail=f"No se puede avanzar: existen partidos pendientes en la Ronda {ronda_actual}")

        enfrentamientos_res = await session.execute(
            text("""
                SELECT equipo_local_id, equipo_visitante_id FROM cancha.torneos_partidos
                WHERE torneo_id = :tid AND equipo_local_id IS NOT NULL AND equipo_visitante_id IS NOT NULL
            """),
            {"tid": torneo_id}
        )
        enfrentamientos = set()
        for loc, vis in enfrentamientos_res.fetchall():
            enfrentamientos.add((str(loc), str(vis)))
            enfrentamientos.add((str(vis), str(loc)))

        equipos_res = await session.execute(
            text("""
                SELECT tp.torneo_equipo_id, tp.pts, tp.dg, tp.gf 
                FROM cancha.torneos_posiciones tp
                JOIN cancha.torneos_equipos te ON tp.torneo_equipo_id = te.id
                WHERE tp.torneo_id = :tid AND te.estado_inscripcion = 'confirmado'
            """),
            {"tid": torneo_id}
        )
        posiciones = sorted(
            [{"id": str(r[0]), "pts": r[1] or 0, "dg": r[2] or 0, "gf": r[3] or 0} for r in equipos_res.fetchall()],
            key=lambda e: (e["pts"], e["dg"], e["gf"]),
            reverse=True
        )

        n_ronda = ronda_actual + 1
        fecha_partido = fecha_base + timedelta(days=(n_ronda - 1) * 7)

        paired = set()
        partidos_ronda = []
        bye_team = None

        if len(posiciones) % 2 != 0:
            byes_res = await session.execute(
                text("SELECT equipo_local_id FROM cancha.torneos_partidos WHERE torneo_id = :tid AND equipo_visitante_id IS NULL"),
                {"tid": torneo_id}
            )
            equipos_con_bye = {str(r[0]) for r in byes_res.fetchall()}
            
            idx_bye = -1
            for idx in range(len(posiciones) - 1, -1, -1):
                tid = posiciones[idx]["id"]
                if tid not in equipos_con_bye:
                    idx_bye = idx
                    break
            if idx_bye == -1:
                idx_bye = len(posiciones) - 1
                
            bye_team = posiciones.pop(idx_bye)["id"]
            paired.add(bye_team)

        for i in range(len(posiciones)):
            t1_id = posiciones[i]["id"]
            if t1_id in paired:
                continue

            t2_id = None
            for j in range(i + 1, len(posiciones)):
                cand_id = posiciones[j]["id"]
                if cand_id in paired:
                    continue
                if (t1_id, cand_id) not in enfrentamientos:
                    t2_id = cand_id
                    break
                    
            if not t2_id:
                for j in range(i + 1, len(posiciones)):
                    cand_id = posiciones[j]["id"]
                    if cand_id not in paired:
                        t2_id = cand_id
                        break

            if t2_id:
                partidos_ronda.append((t1_id, t2_id))
                paired.add(t1_id)
                paired.add(t2_id)

        total_creados = 0
        for idx, (local, visitante) in enumerate(partidos_ronda):
            hora = dtime(18 + idx, 0)
            await session.execute(text("""
                INSERT INTO cancha.torneos_partidos
                    (id, torneo_id, equipo_local_id, equipo_visitante_id,
                     fase, jornada, numero_partido, fecha_hora, estado)
                VALUES
                    (:uuid, :tid, :local, :visitante,
                     :fase, :jornada, :num, :fecha_hora, 'programado')
            """), {
                "uuid": str(uuid.uuid4()),
                "tid": torneo_id, "local": local, "visitante": visitante,
                "fase": f"Suizo - Ronda {n_ronda}", "jornada": n_ronda,
                "num": total_creados + 1,
                "fecha_hora": datetime.combine(fecha_partido, hora)
            })
            total_creados += 1

        if bye_team:
            hora = dtime(18 + total_creados, 0)
            await session.execute(text("""
                INSERT INTO cancha.torneos_partidos
                    (id, torneo_id, equipo_local_id, equipo_visitante_id,
                     fase, jornada, numero_partido, fecha_hora, estado, es_wo, ganador_id, goles_local, goles_visitante, fecha_hora_fin_real, acta_cerrada_en)
                VALUES
                    (:uuid, :tid, :local, NULL,
                     :fase, :jornada, :num, :fecha_hora, 'wo', true, :local, 2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "uuid": str(uuid.uuid4()),
                "tid": torneo_id, "local": bye_team,
                "fase": f"Suizo - Ronda {n_ronda}", "jornada": n_ronda,
                "num": total_creados + 1,
                "fecha_hora": datetime.combine(fecha_partido, hora)
            })
            total_creados += 1

        await session.commit()
        return {"status": "ok", "message": f"Ronda {n_ronda} del sistema suizo generada con éxito."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================
# ENDPOINTS MULTITENANCY 007 — Catálogos y Roles por Complejo
# ============================================================

# ── Schemas nuevos ──────────────────────────────────────────

class ModalidadOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None

class CategoriaOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    edad_minima: Optional[int] = None
    edad_maxima: Optional[int] = None

class RolComplejoCreate(BaseModel):
    usuario_id: int
    complejo_id: str
    rol: str = "organizador"  # admin_complejo | organizador | veedor

class EventoPartidoCreate(BaseModel):
    player_id: Optional[str] = None
    equipo_id: str
    tipo: str  # GOL | GOL_PENAL | AUTOGOL | AMARILLA | ROJA | ROJA_DIRECTA | DOBLE_AMARILLA | LESION | SUSTITUCION
    minuto: int
    periodo: int = 1
    es_tiempo_adicional: bool = False
    observaciones: Optional[str] = None


# ── CATALOGOS ───────────────────────────────────────────────

@router.get("/catalogos/modalidades", summary="Listar modalidades de torneo")
async def get_modalidades(session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(text("SELECT id, codigo, nombre, descripcion FROM cancha.modalidades ORDER BY id"))
        rows = result.fetchall()
        return [{"id": r[0], "codigo": r[1], "nombre": r[2], "descripcion": r[3]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo modalidades: {str(e)}")


@router.get("/catalogos/categorias", summary="Listar categorías de torneo")
async def get_categorias(session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(text("SELECT id, codigo, nombre, edad_minima, edad_maxima FROM cancha.categorias ORDER BY id"))
        rows = result.fetchall()
        return [{"id": r[0], "codigo": r[1], "nombre": r[2], "edad_minima": r[3], "edad_maxima": r[4]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo categorías: {str(e)}")


# ── EVENTOS DE PARTIDO (tabla unificada) ─────────────────────

@router.get("/{torneo_id}/partidos/{partido_id}/eventos", summary="Listar eventos de un partido")
async def get_eventos_partido(
    torneo_id: str,
    partido_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        result = await session.execute(text("""
            SELECT ep.id, ep.tipo, ep.minuto, ep.periodo, ep.es_tiempo_adicional,
                   ep.observaciones, ep.registrado_en,
                   ep.equipo_id,
                   tp.nombre AS jugador_nombre
            FROM cancha.eventos_partido ep
            LEFT JOIN cancha.tournament_players tp ON tp.id = ep.player_id
            WHERE ep.partido_id = :pid
            ORDER BY ep.minuto, ep.periodo
        """), {"pid": partido_id})
        rows = result.fetchall()
        cols = ["id","tipo","minuto","periodo","es_tiempo_adicional","observaciones",
                "registrado_en","equipo_id","jugador_nombre"]
        return [_row_to_dict(cols, r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{torneo_id}/partidos/{partido_id}/eventos", summary="Registrar evento en partido")
async def create_evento_partido(
    torneo_id: str,
    partido_id: str,
    data: EventoPartidoCreate,
    session: AsyncSession = Depends(get_session)
):
    try:
        # Verificar que el partido pertenece al torneo
        chk = await session.execute(
            text("SELECT estado FROM cancha.torneos_partidos WHERE id = :pid AND torneo_id = :tid"),
            {"pid": partido_id, "tid": torneo_id}
        )
        row = chk.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Partido no encontrado en este torneo")
        if row[0] == "finalizado":
            raise HTTPException(status_code=400, detail="No se pueden agregar eventos a un partido finalizado")

        new_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO cancha.eventos_partido
                (id, partido_id, player_id, equipo_id, tipo,
                 minuto, periodo, es_tiempo_adicional, observaciones)
            VALUES
                (:id, :pid, :pid_ref, :eid, :tipo,
                 :min, :per, :ta, :obs)
        """), {
            "id": new_id, "pid": partido_id,
            "pid_ref": data.player_id,
            "eid": data.equipo_id, "tipo": data.tipo,
            "min": data.minuto, "per": data.periodo,
            "ta": data.es_tiempo_adicional, "obs": data.observaciones
        })
        await session.commit()
        return {"status": "ok", "id": new_id, "message": f"Evento '{data.tipo}' registrado en minuto {data.minuto}"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ── ROLES POR COMPLEJO (Multitenancy) ───────────────────────

@router.get("/complejos/{complejo_id}/roles", summary="Listar usuarios y roles de un complejo")
async def get_roles_complejo(
    complejo_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        result = await session.execute(text("""
            SELECT rc.id, rc.usuario_id, rc.rol, rc.activo, rc.creado_en,
                   u.nombre || ' ' || u.apellido AS usuario_nombre,
                   u.email AS usuario_email
            FROM cancha.roles_complejo rc
            JOIN sistema.usuarios u ON u.id = rc.usuario_id
            WHERE rc.complejo_id = :cid
            ORDER BY rc.rol, u.apellido
        """), {"cid": complejo_id})
        rows = result.fetchall()
        cols = ["id","usuario_id","rol","activo","creado_en","usuario_nombre","usuario_email"]
        return [_row_to_dict(cols, r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complejos/{complejo_id}/roles", summary="Asignar rol a usuario en un complejo")
async def create_rol_complejo(
    complejo_id: str,
    data: RolComplejoCreate,
    session: AsyncSession = Depends(get_session)
):
    try:
        new_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO cancha.roles_complejo (id, complejo_id, usuario_id, rol)
            VALUES (:id, :cid, :uid, :rol)
            ON CONFLICT (complejo_id, usuario_id)
            DO UPDATE SET rol = EXCLUDED.rol, activo = TRUE
        """), {"id": new_id, "cid": complejo_id, "uid": data.usuario_id, "rol": data.rol})
        await session.commit()
        return {"status": "ok", "message": f"Rol '{data.rol}' asignado exitosamente"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/complejos/{complejo_id}/roles/{usuario_id}", summary="Revocar rol de usuario en un complejo")
async def delete_rol_complejo(
    complejo_id: str,
    usuario_id: int,
    session: AsyncSession = Depends(get_session)
):
    try:
        await session.execute(
            text("UPDATE cancha.roles_complejo SET activo = FALSE WHERE complejo_id = :cid AND usuario_id = :uid"),
            {"cid": complejo_id, "uid": usuario_id}
        )
        await session.commit()
        return {"status": "ok", "message": "Rol revocado exitosamente"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

