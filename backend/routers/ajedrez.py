"""
routers/ajedrez.py
Router FastAPI para el módulo de Torneos de Ajedrez.

Cubre:
  - Gestión de Circuitos anuales y sus Etapas
  - Gestión de Rondas (Sistema Suizo)
  - Emparejamiento: Automático (Swiss), Drag-and-Drop, Manual
  - Registro de resultados de partidas
  - Tabla de posiciones con desempates (Bucholz Cut-1, Bucholz Total, Sonneborn-Berger)
  - Ranking acumulado del circuito
  - Ranking institucional (colegios/universidades)
  - ELO/Rating de jugadores
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
import uuid
import json

from database import get_session
from security import get_current_user

router = APIRouter(prefix="/api/ajedrez", tags=["Ajedrez"])


# ==============================================================================
# SCHEMAS PYDANTIC
# ==============================================================================

class InstitucionCreate(BaseModel):
    nombre: str
    tipo: str = "colegio"   # colegio | universidad | otro
    ciudad: Optional[str] = None
    pais: str = "Paraguay"

class CircuitoCreate(BaseModel):
    organizador_id: Optional[int] = None
    nombre: str
    anio: int
    modalidad: str = "presencial"   # presencial | online | mixto
    min_etapas_para_ranking: int = 1
    descripcion: Optional[str] = None

class CircuitoUpdate(BaseModel):
    nombre: Optional[str] = None
    modalidad: Optional[str] = None
    min_etapas_para_ranking: Optional[int] = None
    estado: Optional[str] = None
    descripcion: Optional[str] = None

class EtapaCreate(BaseModel):
    torneo_id: str
    numero_etapa: int
    puntos_tabla: Optional[Dict[str, int]] = {
        "1": 12, "2": 11, "3": 10, "4": 9, "5": 8,
        "6": 7,  "7": 6,  "8": 5,  "9": 4, "10": 3
    }

class RondaCreate(BaseModel):
    numero_ronda: int
    fecha_hora: Optional[datetime] = None
    modo_emparejamiento: str = "automatico"   # automatico | drag_drop | manual
    notas: Optional[str] = None

class EmparejamientoManualItem(BaseModel):
    blancas_id: Optional[str] = None
    negras_id: Optional[str] = None   # None = BYE
    tablero_numero: Optional[int] = None
    modalidad_partida: str = "presencial"
    url_partida: Optional[str] = None

class EmparejamientoManualPayload(BaseModel):
    """Usado tanto para drag-drop como para manual completo."""
    partidas: List[EmparejamientoManualItem]

class ResultadoPartida(BaseModel):
    resultado: str = Field(
        ...,
        description="'1-0' victoria blancas | '0.5-0.5' empate | '0-1' victoria negras | 'BYE' | 'FF' forfeit"
    )
    url_partida: Optional[str] = None

class RatingUpdate(BaseModel):
    rating_fide: Optional[int] = None
    rating_nacional: Optional[int] = None
    codigo_fide: Optional[str] = None
    usuario_lichess: Optional[str] = None
    usuario_chess_com: Optional[str] = None






async def _calcular_posiciones(torneo_id: str, ronda_numero: int, session: AsyncSession):
    """
    Recalcula la tabla de posiciones después de registrar resultados en una ronda.
    Calcula puntos, Bucholz Cut-1, Bucholz Total y Sonneborn-Berger.
    Hace UPSERT en ajedrez_posiciones.
    """
    # 1. Traer todos los participantes del torneo
    partic_q = await session.execute(text("""
        SELECT id FROM torneos_generales.participantes
        WHERE torneo_id = :tid AND estado != 'Descalificado'
    """), {"tid": torneo_id})
    participantes = [str(r.id) for r in partic_q.fetchall()]

    # 2. Traer todas las partidas finalizadas hasta esta ronda (inclusive)
    partidas_q = await session.execute(text("""
        SELECT p.blancas_id, p.negras_id, p.resultado,
               p.puntos_blancas, p.puntos_negras, r.numero_ronda
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        WHERE r.torneo_id = :tid
          AND r.numero_ronda <= :ronda
          AND p.resultado IS NOT NULL
        ORDER BY r.numero_ronda
    """), {"tid": torneo_id, "ronda": ronda_numero})
    partidas = partidas_q.fetchall()

    # 3. Calcular puntos acumulados por jugador
    puntos: Dict[str, float] = {p: 0.0 for p in participantes}
    victorias: Dict[str, int] = {p: 0 for p in participantes}
    empates: Dict[str, int] = {p: 0 for p in participantes}
    derrotas: Dict[str, int] = {p: 0 for p in participantes}
    byes: Dict[str, int] = {p: 0 for p in participantes}
    jugados: Dict[str, int] = {p: 0 for p in participantes}
    rivales: Dict[str, List[str]] = {p: [] for p in participantes}

    for row in partidas:
        b = str(row.blancas_id) if row.blancas_id else None
        n = str(row.negras_id) if row.negras_id else None
        res = row.resultado
        pb = float(row.puntos_blancas or 0)
        pn = float(row.puntos_negras or 0)

        if b and b in puntos:
            puntos[b] += pb
            jugados[b] += 1
            if n:
                rivales[b].append(n)
            if res == "1-0":
                victorias[b] += 1
            elif res == "0.5-0.5":
                empates[b] += 1
            elif res == "BYE":
                byes[b] += 1
            else:
                derrotas[b] += 1

        if n and n in puntos:
            puntos[n] += pn
            jugados[n] += 1
            rivales[n].append(b) if b else None
            if res == "0-1":
                victorias[n] += 1
            elif res == "0.5-0.5":
                empates[n] += 1
            else:
                derrotas[n] += 1

    # 4. Calcular desempates
    def bucholz_total(pid: str) -> float:
        return sum(puntos.get(r, 0.0) for r in rivales[pid])

    def bucholz_cut1(pid: str) -> float:
        vals = sorted([puntos.get(r, 0.0) for r in rivales[pid]])
        if len(vals) > 1:
            vals = vals[1:]  # Eliminar el peor
        return sum(vals)

    def sonneborn_berger(pid: str) -> float:
        """Suma de puntos de rivales derrotados + mitad de puntos de rivales empatados."""
        sb = 0.0
        for partida in partidas:
            b = str(partida.blancas_id) if partida.blancas_id else None
            n = str(partida.negras_id) if partida.negras_id else None
            res = partida.resultado
            if b == pid and res == "1-0" and n:
                sb += puntos.get(n, 0.0)
            elif b == pid and res == "0.5-0.5" and n:
                sb += puntos.get(n, 0.0) * 0.5
            elif n == pid and res == "0-1" and b:
                sb += puntos.get(b, 0.0)
            elif n == pid and res == "0.5-0.5" and b:
                sb += puntos.get(b, 0.0) * 0.5
        return sb

    # 5. UPSERT en ajedrez_posiciones
    for pid in participantes:
        await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_posiciones
                (torneo_id, ronda_numero, participante_id,
                 puntos, partidas_jugadas, victorias, empates, derrotas, byes,
                 bucholz_cut1, bucholz_total, sonneborn_berger, actualizado_en)
            VALUES
                (:tid, :ronda, :pid,
                 :pts, :pj, :v, :e, :d, :b,
                 :bc1, :bt, :sb, NOW())
            ON CONFLICT (torneo_id, ronda_numero, participante_id)
            DO UPDATE SET
                puntos           = EXCLUDED.puntos,
                partidas_jugadas = EXCLUDED.partidas_jugadas,
                victorias        = EXCLUDED.victorias,
                empates          = EXCLUDED.empates,
                derrotas         = EXCLUDED.derrotas,
                byes             = EXCLUDED.byes,
                bucholz_cut1     = EXCLUDED.bucholz_cut1,
                bucholz_total    = EXCLUDED.bucholz_total,
                sonneborn_berger = EXCLUDED.sonneborn_berger,
                actualizado_en   = NOW()
        """), {
            "tid": torneo_id, "ronda": ronda_numero, "pid": pid,
            "pts": puntos[pid], "pj": jugados[pid],
            "v": victorias[pid], "e": empates[pid],
            "d": derrotas[pid], "b": byes[pid],
            "bc1": bucholz_cut1(pid),
            "bt": bucholz_total(pid),
            "sb": sonneborn_berger(pid),
        })

    await session.commit()


async def _generar_suizo(torneo_id: str, ronda_numero: int, session: AsyncSession) -> List[Dict]:
    """
    Algoritmo de emparejamiento Sistema Suizo.
    Retorna lista de dicts con {blancas_id, negras_id} ordenados por tablero.

    Reglas implementadas:
      1. Ordenar jugadores por puntos DESC, luego rating_fide DESC como desempate
      2. Emparejar en pares del mismo grupo de puntos (o adyacente si no hay suficientes)
      3. Nunca emparejar dos jugadores que ya se enfrentaron
      4. Intentar alternar colores (un jugador no debería tener el mismo color 3 veces seguidas)
      5. Si número impar de jugadores → BYE al último (menor puntos, que no haya tenido BYE)
    """
    # Traer posiciones actuales (ronda anterior)
    ronda_ant = ronda_numero - 1
    pos_q = await session.execute(text("""
        SELECT ap.participante_id, ap.puntos,
               p.rating_fide, p.nombre, p.apellido
        FROM torneos_generales.ajedrez_posiciones ap
        JOIN torneos_generales.participantes p ON p.id = ap.participante_id
        WHERE ap.torneo_id = :tid AND ap.ronda_numero = :ronda_ant
        ORDER BY ap.puntos DESC, p.rating_fide DESC
    """), {"tid": torneo_id, "ronda_ant": ronda_ant})
    jugadores_rows = pos_q.fetchall()

    # Si es la primera ronda, tomar todos los participantes ordenados por rating
    if not jugadores_rows:
        pq = await session.execute(text("""
            SELECT id AS participante_id, 0 AS puntos, rating_fide, nombre, apellido
            FROM torneos_generales.participantes
            WHERE torneo_id = :tid AND estado = 'Confirmado'
            ORDER BY rating_fide DESC, nombre
        """), {"tid": torneo_id})
        jugadores_rows = pq.fetchall()

    jugadores = [
        {
            "id": str(r.participante_id),
            "puntos": float(r.puntos),
            "rating_fide": int(r.rating_fide or 0),
        }
        for r in jugadores_rows
    ]

    if not jugadores:
        raise HTTPException(status_code=400, detail="No hay jugadores confirmados en el torneo")

    # Historial de enfrentamientos
    hist_q = await session.execute(text("""
        SELECT p.blancas_id, p.negras_id
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        WHERE r.torneo_id = :tid
    """), {"tid": torneo_id})
    enfrentados: Dict[str, set] = {}
    for row in hist_q.fetchall():
        b = str(row.blancas_id) if row.blancas_id else None
        n = str(row.negras_id) if row.negras_id else None
        if b and n:
            enfrentados.setdefault(b, set()).add(n)
            enfrentados.setdefault(n, set()).add(b)

    # Historial de colores
    color_q = await session.execute(text("""
        SELECT p.blancas_id, p.negras_id, r.numero_ronda
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        WHERE r.torneo_id = :tid
        ORDER BY r.numero_ronda DESC
    """), {"tid": torneo_id})
    # cuenta cuántas blancas/negras tuvo cada jugador (últimas rondas)
    blancas_count: Dict[str, int] = {}
    negras_count: Dict[str, int] = {}
    for row in color_q.fetchall():
        if row.blancas_id:
            blancas_count[str(row.blancas_id)] = blancas_count.get(str(row.blancas_id), 0) + 1
        if row.negras_id:
            negras_count[str(row.negras_id)] = negras_count.get(str(row.negras_id), 0) + 1

    # BYE: si número impar, el último que NO haya tenido BYE recibe BYE
    bye_ids_q = await session.execute(text("""
        SELECT DISTINCT p.blancas_id
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        WHERE r.torneo_id = :tid AND p.resultado = 'BYE'
    """), {"tid": torneo_id})
    ya_tuvo_bye = {str(r.blancas_id) for r in bye_ids_q.fetchall()}

    bye_jugador = None
    if len(jugadores) % 2 != 0:
        # Buscar el último jugador (menor puntos) que no tuvo BYE
        for jug in reversed(jugadores):
            if jug["id"] not in ya_tuvo_bye:
                bye_jugador = jug
                jugadores = [j for j in jugadores if j["id"] != jug["id"]]
                break
        if not bye_jugador:
            # Si todos tuvieron BYE, asignar al último
            bye_jugador = jugadores.pop()

    # Algoritmo de emparejamiento greedy
    emparejados: List[Dict] = []
    disponibles = list(jugadores)
    usados = set()

    for i, jug1 in enumerate(disponibles):
        if jug1["id"] in usados:
            continue
        # Buscar el primer oponente válido con puntos similares
        for j in range(i + 1, len(disponibles)):
            jug2 = disponibles[j]
            if jug2["id"] in usados:
                continue
            if jug2["id"] in enfrentados.get(jug1["id"], set()):
                continue  # Ya se enfrentaron

            # Asignar colores por alternancia
            b1 = blancas_count.get(jug1["id"], 0)
            n1 = negras_count.get(jug1["id"], 0)
            b2 = blancas_count.get(jug2["id"], 0)
            n2 = negras_count.get(jug2["id"], 0)

            # El que menos blancas tuvo, juega con blancas
            if b1 <= b2:
                blancas, negras = jug1["id"], jug2["id"]
            else:
                blancas, negras = jug2["id"], jug1["id"]

            emparejados.append({"blancas_id": blancas, "negras_id": negras})
            usados.add(jug1["id"])
            usados.add(jug2["id"])
            break

    # BYE final
    if bye_jugador:
        emparejados.append({"blancas_id": bye_jugador["id"], "negras_id": None, "resultado": "BYE"})

    return emparejados


async def _guardar_partidas(ronda_id: str, parejas: List[Dict], session: AsyncSession):
    """Inserta las partidas en la BD a partir de la lista de pares."""
    for idx, par in enumerate(parejas, start=1):
        resultado = par.get("resultado")
        puntos_b = _puntos_de_resultado(resultado, "blancas") if resultado else None
        puntos_n = _puntos_de_resultado(resultado, "negras") if resultado and par.get("negras_id") else None
        ganador_id = None
        if resultado == "1-0":
            ganador_id = par.get("blancas_id")
        elif resultado == "0-1":
            ganador_id = par.get("negras_id")

        await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_partidas
                (ronda_id, tablero_numero, blancas_id, negras_id,
                 resultado, ganador_id, puntos_blancas, puntos_negras,
                 modalidad_partida, url_partida, estado)
            VALUES
                (:rid, :tbl, :bid, :nid,
                 :res, :ganador, :pb, :pn,
                 :mod, :url, :estado)
        """), {
            "rid": ronda_id,
            "tbl": par.get("tablero_numero", idx),
            "bid": par.get("blancas_id"),
            "nid": par.get("negras_id"),
            "res": resultado,
            "ganador": ganador_id,
            "pb": puntos_b,
            "pn": puntos_n,
            "mod": par.get("modalidad_partida", "presencial"),
            "url": par.get("url_partida"),
            "estado": "finalizada" if resultado else "pendiente",
        })
    await session.commit()


# ==============================================================================
# ENDPOINTS — INSTITUCIONES
# ==============================================================================

@router.get("/instituciones")
async def listar_instituciones(
    tipo: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """Lista colegios/universidades registrados."""
    q = "SELECT * FROM torneos_generales.ajedrez_instituciones"
    params = {}
    if tipo:
        q += " WHERE tipo = :tipo"
        params["tipo"] = tipo
    q += " ORDER BY nombre"
    res = await session.execute(text(q), params)
    return [dict(r._mapping) for r in res.fetchall()]


@router.post("/instituciones", status_code=201)
async def crear_institucion(
    payload: InstitucionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    res = await session.execute(text("""
        INSERT INTO torneos_generales.ajedrez_instituciones (nombre, tipo, ciudad, pais)
        VALUES (:nombre, :tipo, :ciudad, :pais)
        RETURNING id
    """), payload.model_dump())
    new_id = res.scalar()
    await session.commit()
    return {"id": str(new_id), "mensaje": "Institución creada"}


# ==============================================================================
# ENDPOINTS — CIRCUITOS
# ==============================================================================

@router.get("/circuitos")
async def listar_circuitos(
    anio: Optional[int] = None,
    organizador_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session)
):
    """Lista los circuitos anuales con conteo de etapas."""
    conds = []
    params = {}
    if anio:
        conds.append("c.anio = :anio")
        params["anio"] = anio
    if organizador_id:
        conds.append("c.organizador_id = :oid")
        params["oid"] = organizador_id

    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    res = await session.execute(text(f"""
        SELECT c.*,
               COUNT(e.id) AS total_etapas
        FROM torneos_generales.ajedrez_circuitos c
        LEFT JOIN torneos_generales.ajedrez_circuito_etapas e ON e.circuito_id = c.id
        {where}
        GROUP BY c.id
        ORDER BY c.anio DESC, c.nombre
    """), params)
    return [dict(r._mapping) for r in res.fetchall()]


@router.post("/circuitos", status_code=201)
async def crear_circuito(
    payload: CircuitoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    res = await session.execute(text("""
        INSERT INTO torneos_generales.ajedrez_circuitos
            (organizador_id, nombre, anio, modalidad, min_etapas_para_ranking, descripcion)
        VALUES (:organizador_id, :nombre, :anio, :modalidad, :min_etapas_para_ranking, :descripcion)
        RETURNING id
    """), payload.model_dump())
    new_id = res.scalar()
    await session.commit()
    return {"id": str(new_id), "mensaje": "Circuito creado"}


@router.get("/circuitos/{circuito_id}")
async def obtener_circuito(circuito_id: str, session: AsyncSession = Depends(get_session)):
    res = await session.execute(text("""
        SELECT c.*,
               json_agg(json_build_object(
                   'id', e.id, 'numero_etapa', e.numero_etapa,
                   'torneo_id', e.torneo_id, 'puntos_tabla', e.puntos_tabla,
                   'torneo_nombre', t.nombre
               ) ORDER BY e.numero_etapa) FILTER (WHERE e.id IS NOT NULL) AS etapas
        FROM torneos_generales.ajedrez_circuitos c
        LEFT JOIN torneos_generales.ajedrez_circuito_etapas e ON e.circuito_id = c.id
        LEFT JOIN torneos_generales.torneos t ON t.id = e.torneo_id
        WHERE c.id = :cid
        GROUP BY c.id
    """), {"cid": circuito_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Circuito no encontrado")
    return dict(row._mapping)


@router.patch("/circuitos/{circuito_id}")
async def actualizar_circuito(
    circuito_id: str,
    payload: CircuitoUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    sets = ", ".join(f"{k} = :{k}" for k in data.keys())
    data["cid"] = circuito_id
    await session.execute(text(f"""
        UPDATE torneos_generales.ajedrez_circuitos
        SET {sets}, actualizado_en = NOW()
        WHERE id = :cid
    """), data)
    await session.commit()
    return {"mensaje": "Circuito actualizado"}


# ==============================================================================
# ENDPOINTS — ETAPAS DEL CIRCUITO
# ==============================================================================

@router.post("/circuitos/{circuito_id}/etapas", status_code=201)
async def agregar_etapa(
    circuito_id: str,
    payload: EtapaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Agrega un torneo existente como etapa del circuito."""
    res = await session.execute(text("""
        INSERT INTO torneos_generales.ajedrez_circuito_etapas
            (circuito_id, torneo_id, numero_etapa, puntos_tabla)
        VALUES (:cid, :tid, :num, :tabla)
        RETURNING id
    """), {
        "cid": circuito_id,
        "tid": payload.torneo_id,
        "num": payload.numero_etapa,
        "tabla": json.dumps(payload.puntos_tabla),
    })
    new_id = res.scalar()
    await session.commit()
    return {"id": str(new_id), "mensaje": "Etapa agregada al circuito"}


@router.delete("/circuitos/{circuito_id}/etapas/{etapa_id}", status_code=204)
async def eliminar_etapa(
    circuito_id: str,
    etapa_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_circuito_etapas
        WHERE id = :eid AND circuito_id = :cid
    """), {"eid": etapa_id, "cid": circuito_id})
    await session.commit()


# ==============================================================================
# ENDPOINTS — RANKING DEL CIRCUITO
# ==============================================================================

@router.post("/circuitos/{circuito_id}/calcular-ranking", status_code=200)
async def calcular_ranking_circuito(
    circuito_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Recalcula el ranking acumulado del circuito basándose en las posiciones
    finales de cada etapa y la tabla de puntos configurada.
    """
    # Traer etapas del circuito con su tabla de puntos
    etapas_q = await session.execute(text("""
        SELECT e.torneo_id, e.puntos_tabla
        FROM torneos_generales.ajedrez_circuito_etapas e
        WHERE e.circuito_id = :cid
        ORDER BY e.numero_etapa
    """), {"cid": circuito_id})
    etapas = etapas_q.fetchall()

    if not etapas:
        raise HTTPException(status_code=400, detail="El circuito no tiene etapas registradas")

    # Acumular puntos por participante
    acumulado: Dict[str, Dict] = {}

    for etapa in etapas:
        torneo_id = str(etapa.torneo_id)
        puntos_tabla: Dict = etapa.puntos_tabla if isinstance(etapa.puntos_tabla, dict) else json.loads(etapa.puntos_tabla)

        # Traer posiciones finales de esta etapa (ronda_numero = 0)
        pos_q = await session.execute(text("""
            SELECT ap.participante_id, ap.posicion_final,
                   p.categoria_base, p.institucion_id
            FROM torneos_generales.ajedrez_posiciones ap
            JOIN torneos_generales.participantes p ON p.id = ap.participante_id
            WHERE ap.torneo_id = :tid AND ap.ronda_numero = 0
              AND ap.posicion_final IS NOT NULL
        """), {"tid": torneo_id})
        posiciones = pos_q.fetchall()

        for row in posiciones:
            pid = str(row.participante_id)
            pos_str = str(row.posicion_final)
            pts_etapa = float(puntos_tabla.get(pos_str, 0))

            if pid not in acumulado:
                acumulado[pid] = {
                    "puntos_totales": 0.0,
                    "etapas_jugadas": 0,
                    "mejor_posicion": None,
                    "categoria_base": row.categoria_base,
                    "institucion_id": str(row.institucion_id) if row.institucion_id else None,
                }
            acumulado[pid]["puntos_totales"] += pts_etapa
            acumulado[pid]["etapas_jugadas"] += 1
            pos_actual = row.posicion_final
            if acumulado[pid]["mejor_posicion"] is None or pos_actual < acumulado[pid]["mejor_posicion"]:
                acumulado[pid]["mejor_posicion"] = pos_actual

    # UPSERT en ajedrez_circuito_ranking
    for pid, datos in acumulado.items():
        await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_circuito_ranking
                (circuito_id, participante_id, categoria_base, institucion_id,
                 puntos_totales, etapas_jugadas, mejor_posicion, actualizado_en)
            VALUES
                (:cid, :pid, :cat, :inst, :pts, :etapas, :mejor, NOW())
            ON CONFLICT (circuito_id, participante_id)
            DO UPDATE SET
                categoria_base  = EXCLUDED.categoria_base,
                institucion_id  = EXCLUDED.institucion_id,
                puntos_totales  = EXCLUDED.puntos_totales,
                etapas_jugadas  = EXCLUDED.etapas_jugadas,
                mejor_posicion  = EXCLUDED.mejor_posicion,
                actualizado_en  = NOW()
        """), {
            "cid": circuito_id,
            "pid": pid,
            "cat": datos["categoria_base"],
            "inst": datos["institucion_id"],
            "pts": datos["puntos_totales"],
            "etapas": datos["etapas_jugadas"],
            "mejor": datos["mejor_posicion"],
        })
    await session.commit()
    return {"mensaje": f"Ranking recalculado. {len(acumulado)} participantes actualizados."}


@router.get("/circuitos/{circuito_id}/ranking")
async def ranking_circuito(
    circuito_id: str,
    categoria: Optional[str] = Query(None, description="Filtrar por categoría base (ej: Sub-13)"),
    session: AsyncSession = Depends(get_session)
):
    """Retorna el ranking acumulado del circuito, opcionalmente filtrado por categoría."""
    q = """
        SELECT
            cr.puntos_totales, cr.etapas_jugadas, cr.mejor_posicion, cr.categoria_base,
            p.nombre, p.apellido, p.rating_fide, p.codigo_fide, p.usuario_lichess,
            i.nombre AS institucion_nombre, i.tipo AS institucion_tipo
        FROM torneos_generales.ajedrez_circuito_ranking cr
        JOIN torneos_generales.participantes p ON p.id = cr.participante_id
        LEFT JOIN torneos_generales.ajedrez_instituciones i ON i.id = cr.institucion_id
        WHERE cr.circuito_id = :cid
    """
    params: Dict = {"cid": circuito_id}
    if categoria:
        q += " AND cr.categoria_base = :cat"
        params["cat"] = categoria
    q += " ORDER BY cr.puntos_totales DESC, cr.mejor_posicion ASC NULLS LAST"

    res = await session.execute(text(q), params)
    rows = res.fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/circuitos/{circuito_id}/ranking-institucional")
async def ranking_institucional(
    circuito_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Ranking de instituciones (colegios/universidades) sumando los puntos
    de todos sus alumnos en el circuito.
    """
    res = await session.execute(text("""
        SELECT
            i.id AS institucion_id,
            i.nombre AS institucion,
            i.tipo,
            SUM(cr.puntos_totales) AS puntos_institucionales,
            COUNT(DISTINCT cr.participante_id) AS total_participantes
        FROM torneos_generales.ajedrez_circuito_ranking cr
        JOIN torneos_generales.ajedrez_instituciones i ON i.id = cr.institucion_id
        WHERE cr.circuito_id = :cid
        GROUP BY i.id, i.nombre, i.tipo
        ORDER BY puntos_institucionales DESC
    """), {"cid": circuito_id})
    return [dict(r._mapping) for r in res.fetchall()]


# ==============================================================================
# ENDPOINTS — RONDAS
# ==============================================================================

@router.get("/torneos/{torneo_id}/rondas")
async def listar_rondas(torneo_id: str, session: AsyncSession = Depends(get_session)):
    """Lista todas las rondas de un torneo con conteo de partidas."""
    res = await session.execute(text("""
        SELECT r.*,
               COUNT(p.id) AS total_partidas,
               COUNT(p.id) FILTER (WHERE p.resultado IS NOT NULL) AS partidas_finalizadas
        FROM torneos_generales.ajedrez_rondas r
        LEFT JOIN torneos_generales.ajedrez_partidas p ON p.ronda_id = r.id
        WHERE r.torneo_id = :tid
        GROUP BY r.id
        ORDER BY r.numero_ronda
    """), {"tid": torneo_id})
    return [dict(r._mapping) for r in res.fetchall()]





# ==============================================================================
# ENDPOINTS — EMPAREJAMIENTO
# ==============================================================================

@router.post("/torneos/{torneo_id}/rondas/{ronda_id}/emparejar")
async def emparejar_automatico(
    torneo_id: str,
    ronda_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera el emparejamiento Sistema Suizo AUTOMÁTICO.
    Si la ronda ya tiene partidas, las elimina y regenera.
    Retorna las partidas generadas para que el frontend pueda mostrarlas
    (en modo drag-drop, el frontend permite reordenar antes de confirmar).
    """
    # Obtener ronda
    ronda_q = await session.execute(text("""
        SELECT * FROM torneos_generales.ajedrez_rondas
        WHERE id = :rid AND torneo_id = :tid
    """), {"rid": ronda_id, "tid": torneo_id})
    ronda = ronda_q.fetchone()
    if not ronda:
        raise HTTPException(status_code=404, detail="Ronda no encontrada")

    if ronda.estado == "finalizada":
        raise HTTPException(status_code=400, detail="La ronda ya está finalizada, no se puede reemparejar")

    # Borrar partidas previas si existen (permite regenerar)
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_partidas WHERE ronda_id = :rid
    """), {"rid": ronda_id})
    await session.commit()

    # Calcular posiciones de la ronda anterior para ordenar jugadores
    ronda_numero = ronda.numero_ronda
    if ronda_numero > 1:
        await _calcular_posiciones(torneo_id, ronda_numero - 1, session)

    # Generar pares
    parejas = await _generar_suizo(torneo_id, ronda_numero, session)

    # Insertar partidas (en estado 'pendiente')
    await _guardar_partidas(ronda_id, parejas, session)

    # Actualizar modo y estado de la ronda
    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_rondas
        SET modo_emparejamiento = 'automatico', actualizado_en = NOW()
        WHERE id = :rid
    """), {"rid": ronda_id})
    await session.commit()

    # Retornar las partidas con nombres de participantes
    return await _get_partidas_con_nombres(ronda_id, session)


@router.put("/torneos/{torneo_id}/rondas/{ronda_id}/emparejamiento")
async def guardar_emparejamiento_personalizado(
    torneo_id: str,
    ronda_id: str,
    payload: EmparejamientoManualPayload,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Guarda un emparejamiento personalizado:
    - **Drag-and-drop**: el frontend llamó primero a /emparejar para obtener la propuesta
      automática, el organizador reorganizó los pares, y ahora envía el resultado final.
    - **Manual**: el organizador construyó cada par desde cero.

    Reemplaza las partidas existentes de la ronda.
    """
    # Verificar ronda
    ronda_q = await session.execute(text("""
        SELECT estado FROM torneos_generales.ajedrez_rondas
        WHERE id = :rid AND torneo_id = :tid
    """), {"rid": ronda_id, "tid": torneo_id})
    ronda = ronda_q.fetchone()
    if not ronda:
        raise HTTPException(status_code=404, detail="Ronda no encontrada")
    if ronda.estado == "finalizada":
        raise HTTPException(status_code=400, detail="La ronda ya está finalizada")

    # Reemplazar partidas
    await session.execute(text("DELETE FROM torneos_generales.ajedrez_partidas WHERE ronda_id = :rid"), {"rid": ronda_id})
    await session.commit()

    parejas = [p.model_dump() for p in payload.partidas]
    for idx, par in enumerate(parejas):
        par["tablero_numero"] = par.get("tablero_numero") or idx + 1

    await _guardar_partidas(ronda_id, parejas, session)

    # Marcar como drag_drop o manual según lo que venga
    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_rondas
        SET modo_emparejamiento = 'drag_drop', actualizado_en = NOW()
        WHERE id = :rid
    """), {"rid": ronda_id})
    await session.commit()

    return {"mensaje": f"Emparejamiento guardado. {len(parejas)} partidas."}


@router.post("/torneos/{torneo_id}/rondas/{ronda_id}/confirmar")
async def confirmar_ronda(
    torneo_id: str,
    ronda_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Cambia el estado de la ronda a 'en_curso', publicando el emparejamiento."""
    check = await session.execute(text("""
        SELECT id, estado FROM torneos_generales.ajedrez_partidas WHERE ronda_id = :rid
    """), {"rid": ronda_id})
    if not check.fetchone():
        raise HTTPException(status_code=400, detail="No hay partidas en esta ronda. Genere el emparejamiento primero.")

    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_rondas
        SET estado = 'en_curso', actualizado_en = NOW()
        WHERE id = :rid
    """), {"rid": ronda_id})
    await session.commit()
    return {"mensaje": "Ronda confirmada y publicada"}


# ==============================================================================
# ENDPOINTS — PARTIDAS Y RESULTADOS
# ==============================================================================

async def _get_partidas_con_nombres(ronda_id: str, session: AsyncSession) -> List[Dict]:
    res = await session.execute(text("""
        SELECT
            p.id, p.tablero_numero, p.resultado, p.estado,
            p.puntos_blancas, p.puntos_negras,
            p.modalidad_partida, p.url_partida,
            p.blancas_id, pb.nombre AS blancas_nombre, pb.apellido AS blancas_apellido,
            pb.rating_fide AS blancas_rating,
            p.negras_id,  pn.nombre AS negras_nombre,  pn.apellido AS negras_apellido,
            pn.rating_fide AS negras_rating
        FROM torneos_generales.ajedrez_partidas p
        LEFT JOIN torneos_generales.participantes pb ON pb.id = p.blancas_id
        LEFT JOIN torneos_generales.participantes pn ON pn.id = p.negras_id
        WHERE p.ronda_id = :rid
        ORDER BY p.tablero_numero NULLS LAST
    """), {"rid": ronda_id})
    return [dict(r._mapping) for r in res.fetchall()]


@router.get("/rondas/{ronda_id}/partidas")
async def listar_partidas(ronda_id: str, session: AsyncSession = Depends(get_session)):
    """Lista las partidas de una ronda con nombres de participantes."""
    return await _get_partidas_con_nombres(ronda_id, session)


@router.patch("/partidas/{partida_id}/resultado")
async def registrar_resultado(
    partida_id: str,
    payload: ResultadoPartida,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Registra el resultado de una partida.
    Actualiza automáticamente las posiciones del torneo.
    """
    resultados_validos = {"1-0", "0.5-0.5", "0-1", "BYE", "FF"}
    if payload.resultado not in resultados_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Resultado inválido. Valores permitidos: {resultados_validos}"
        )

    # Traer partida
    partida_q = await session.execute(text("""
        SELECT p.*, r.torneo_id, r.numero_ronda
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        WHERE p.id = :pid
    """), {"pid": partida_id})
    partida = partida_q.fetchone()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    res = payload.resultado
    pts_b = _puntos_de_resultado(res, "blancas")
    pts_n = _puntos_de_resultado(res, "negras") if partida.negras_id else None
    ganador_id = None
    if res == "1-0":
        ganador_id = str(partida.blancas_id) if partida.blancas_id else None
    elif res == "0-1":
        ganador_id = str(partida.negras_id) if partida.negras_id else None

    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_partidas
        SET resultado = :res, ganador_id = :gid,
            puntos_blancas = :pb, puntos_negras = :pn,
            url_partida = COALESCE(:url, url_partida),
            estado = 'finalizada', actualizado_en = NOW()
        WHERE id = :pid
    """), {
        "pid": partida_id, "res": res, "gid": ganador_id,
        "pb": pts_b, "pn": pts_n,
        "url": payload.url_partida,
    })
    await session.commit()

    # Recalcular posiciones de la ronda actual
    await _calcular_posiciones(str(partida.torneo_id), partida.numero_ronda, session)

    return {"mensaje": "Resultado registrado y posiciones actualizadas"}


# ==============================================================================
# ENDPOINTS — POSICIONES
# ==============================================================================

@router.get("/torneos/{torneo_id}/posiciones")
async def tabla_posiciones(
    torneo_id: str,
    ronda: int = Query(0, description="Snapshot de la ronda. 0 = última calculada"),
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna la tabla de posiciones con desempates ajedrecísticos:
    Bucholz Cut-1, Bucholz Total, Sonneborn-Berger.
    """
    # Si ronda=0, obtener el mayor ronda_numero con datos
    if ronda == 0:
        max_q = await session.execute(text("""
            SELECT MAX(ronda_numero) FROM torneos_generales.ajedrez_posiciones
            WHERE torneo_id = :tid
        """), {"tid": torneo_id})
        ronda = max_q.scalar() or 0

    res = await session.execute(text("""
        SELECT
            ap.*,
            p.nombre, p.apellido, p.rating_fide, p.codigo_fide,
            p.usuario_lichess, p.categoria_base, p.categoria_jugada,
            i.nombre AS institucion_nombre
        FROM torneos_generales.ajedrez_posiciones ap
        JOIN torneos_generales.participantes p ON p.id = ap.participante_id
        LEFT JOIN torneos_generales.ajedrez_instituciones i ON i.id = p.institucion_id
        WHERE ap.torneo_id = :tid AND ap.ronda_numero = :ronda
        ORDER BY ap.puntos DESC,
                 ap.bucholz_cut1 DESC,
                 ap.bucholz_total DESC,
                 ap.sonneborn_berger DESC,
                 p.rating_fide DESC
    """), {"tid": torneo_id, "ronda": ronda})
    rows = res.fetchall()

    # Agregar número de posición
    resultado = []
    for idx, row in enumerate(rows, start=1):
        d = dict(row._mapping)
        d["posicion"] = idx
        resultado.append(d)
    return resultado


@router.post("/torneos/{torneo_id}/rondas/{ronda_numero}/finalizar")
async def finalizar_ronda(
    torneo_id: str,
    ronda_numero: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Finaliza la ronda, calcula las posiciones finales del snapshot
    y cierra la ronda para no admitir más cambios.
    """
    ronda_q = await session.execute(text("""
        SELECT id FROM torneos_generales.ajedrez_rondas
        WHERE torneo_id = :tid AND numero_ronda = :num
    """), {"tid": torneo_id, "num": ronda_numero})
    ronda = ronda_q.fetchone()
    if not ronda:
        raise HTTPException(status_code=404, detail="Ronda no encontrada")

    # Verificar que todas las partidas tengan resultado
    pendientes_q = await session.execute(text("""
        SELECT COUNT(*) FROM torneos_generales.ajedrez_partidas
        WHERE ronda_id = :rid AND resultado IS NULL
    """), {"rid": str(ronda.id)})
    pendientes = pendientes_q.scalar()
    if pendientes > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Hay {pendientes} partidas sin resultado. Complete todas antes de finalizar."
        )

    # Calcular posiciones finales del snapshot de esta ronda
    await _calcular_posiciones(torneo_id, ronda_numero, session)

    # Marcar ronda como finalizada
    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_rondas
        SET estado = 'finalizada', actualizado_en = NOW()
        WHERE id = :rid
    """), {"rid": str(ronda.id)})
    await session.commit()

    return {"mensaje": f"Ronda {ronda_numero} finalizada. Posiciones actualizadas."}


@router.post("/torneos/{torneo_id}/finalizar")
async def finalizar_torneo(
    torneo_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Finaliza el torneo: calcula la posición final definitiva de cada jugador
    (snapshot ronda_numero=0) y actualiza el estado del torneo.
    """
    # Obtener la última ronda
    ultima_q = await session.execute(text("""
        SELECT MAX(numero_ronda) FROM torneos_generales.ajedrez_rondas
        WHERE torneo_id = :tid
    """), {"tid": torneo_id})
    ultima_ronda = ultima_q.scalar()
    if not ultima_ronda:
        raise HTTPException(status_code=400, detail="No hay rondas en este torneo")

    # Copiar snapshot de la última ronda como posición final (ronda_numero=0)
    pos_q = await session.execute(text("""
        SELECT * FROM torneos_generales.ajedrez_posiciones
        WHERE torneo_id = :tid AND ronda_numero = :ronda
        ORDER BY puntos DESC, bucholz_cut1 DESC, bucholz_total DESC,
                 sonneborn_berger DESC
    """), {"tid": torneo_id, "ronda": ultima_ronda})
    posiciones = pos_q.fetchall()

    for idx, pos in enumerate(posiciones, start=1):
        await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_posiciones
                (torneo_id, ronda_numero, participante_id,
                 puntos, partidas_jugadas, victorias, empates, derrotas, byes,
                 bucholz_cut1, bucholz_total, sonneborn_berger,
                 posicion_final, actualizado_en)
            VALUES
                (:tid, 0, :pid,
                 :pts, :pj, :v, :e, :d, :b,
                 :bc1, :bt, :sb,
                 :pos, NOW())
            ON CONFLICT (torneo_id, ronda_numero, participante_id)
            DO UPDATE SET
                puntos = EXCLUDED.puntos, partidas_jugadas = EXCLUDED.partidas_jugadas,
                victorias = EXCLUDED.victorias, empates = EXCLUDED.empates,
                derrotas = EXCLUDED.derrotas, byes = EXCLUDED.byes,
                bucholz_cut1 = EXCLUDED.bucholz_cut1, bucholz_total = EXCLUDED.bucholz_total,
                sonneborn_berger = EXCLUDED.sonneborn_berger,
                posicion_final = EXCLUDED.posicion_final,
                actualizado_en = NOW()
        """), {
            "tid": torneo_id, "pid": str(pos.participante_id),
            "pts": pos.puntos, "pj": pos.partidas_jugadas,
            "v": pos.victorias, "e": pos.empates, "d": pos.derrotas, "b": pos.byes,
            "bc1": pos.bucholz_cut1, "bt": pos.bucholz_total, "sb": pos.sonneborn_berger,
            "pos": idx,
        })
    await session.commit()
    return {"mensaje": f"Torneo finalizado. {len(posiciones)} posiciones registradas."}


# ==============================================================================
# ENDPOINTS — ELO / RATING
# ==============================================================================

@router.patch("/participantes/{participante_id}/rating")
async def actualizar_rating(
    participante_id: str,
    payload: RatingUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Actualiza el rating ELO/FIDE y datos de plataformas online del participante."""
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")

    sets = ", ".join(f"{k} = :{k}" for k in data.keys())
    data["pid"] = participante_id

    await session.execute(text(f"""
        UPDATE torneos_generales.participantes
        SET {sets}, actualizado_en = NOW()
        WHERE id = :pid
    """), data)
    await session.commit()
    return {"mensaje": "Rating actualizado"}


@router.get("/participantes/{participante_id}/historial")
async def historial_participante(
    participante_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Retorna el historial completo de partidas de un jugador."""
    res = await session.execute(text("""
        SELECT
            p.resultado, p.puntos_blancas, p.puntos_negras,
            r.numero_ronda, r.torneo_id,
            t.nombre AS torneo_nombre,
            CASE WHEN p.blancas_id = :pid THEN 'Blancas' ELSE 'Negras' END AS color,
            CASE WHEN p.blancas_id = :pid
                THEN pn.nombre || ' ' || pn.apellido
                ELSE pb.nombre || ' ' || pb.apellido
            END AS rival_nombre,
            CASE WHEN p.blancas_id = :pid THEN pn.rating_fide ELSE pb.rating_fide END AS rival_rating
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        JOIN torneos_generales.torneos t ON t.id = r.torneo_id
        LEFT JOIN torneos_generales.participantes pb ON pb.id = p.blancas_id
        LEFT JOIN torneos_generales.participantes pn ON pn.id = p.negras_id
        WHERE (p.blancas_id = :pid OR p.negras_id = :pid)
          AND p.resultado IS NOT NULL
        ORDER BY r.torneo_id, r.numero_ronda
    """), {"pid": participante_id})
    return [dict(r._mapping) for r in res.fetchall()]
