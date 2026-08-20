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

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import os
import uuid
import json
import re
import urllib.request
import urllib.error
import zipfile
import xml.etree.ElementTree as ET
import csv
import io

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
    modalidad: str = "presencial"  # presencial | virtual | hibrido
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
    puntos_tabla: Optional[Dict[str, int]] = None

class RondaCreate(BaseModel):
    numero_ronda: int
    sistema: Optional[str] = "suizo"  # suizo | round_robin | eliminatoria
    fecha_ronda: Optional[str] = None
    fecha_hora: Optional[str] = None
    modo_emparejamiento: Optional[str] = "automatico"
    notas: Optional[str] = None

class ResultadoPartida(BaseModel):
    resultado: str   # '1-0' | '0-1' | '0.5-0.5' | 'BYE' | 'FF'

class EstadoPartidaPayload(BaseModel):
    estado: str      # 'pendiente' | 'en_curso' | 'finalizada'

PartidaResultado = ResultadoPartida
PartidaEstado = EstadoPartidaPayload

_CHESS_DDL_STATEMENTS = [
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_instituciones (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre          VARCHAR(200) NOT NULL,
        tipo            VARCHAR(30) NOT NULL DEFAULT 'colegio',
        ciudad          VARCHAR(100),
        pais            VARCHAR(100) DEFAULT 'Paraguay',
        creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS rating_fide INTEGER DEFAULT 0""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS codigo_fide VARCHAR(20)""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS rating_nacional INTEGER DEFAULT 0""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS usuario_lichess VARCHAR(50)""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS usuario_chess_com VARCHAR(50)""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS institucion_id UUID""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS categoria_base VARCHAR(30)""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS categoria_jugada VARCHAR(30)""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS documento VARCHAR(50)""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS foto_documento_url TEXT""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS documento_validado BOOLEAN DEFAULT FALSE""",
    """ALTER TABLE torneos_generales.participantes ADD COLUMN IF NOT EXISTS documento_validado_anio INTEGER""",
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_circuitos (
        id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organizador_id              INTEGER,
        nombre                      VARCHAR(200) NOT NULL,
        anio                        SMALLINT NOT NULL DEFAULT 2026,
        modalidad                   VARCHAR(20) NOT NULL DEFAULT 'presencial',
        min_etapas_para_ranking     SMALLINT NOT NULL DEFAULT 1,
        estado                      VARCHAR(20) NOT NULL DEFAULT 'borrador',
        descripcion                 TEXT,
        creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_circuito_etapas (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        circuito_id     UUID NOT NULL,
        torneo_id       UUID NOT NULL,
        numero_etapa    SMALLINT NOT NULL,
        puntos_tabla    JSONB NOT NULL DEFAULT '{"1":12,"2":11,"3":10,"4":9,"5":8,"6":7,"7":6,"8":5,"9":4,"10":3}',
        creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_rondas (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        torneo_id               UUID NOT NULL,
        numero_ronda            SMALLINT NOT NULL,
        estado                  VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        fecha_hora              TIMESTAMPTZ,
        modo_emparejamiento     VARCHAR(20) NOT NULL DEFAULT 'automatico',
        notas                   TEXT,
        creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_partidas (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ronda_id            UUID NOT NULL,
        tablero_numero      SMALLINT,
        blancas_id          UUID NOT NULL,
        negras_id           UUID,
        resultado           VARCHAR(10),
        puntos_blancas      NUMERIC(3,1),
        puntos_negras       NUMERIC(3,1),
        estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        url_partida         TEXT,
        modalidad_partida   VARCHAR(20) DEFAULT 'presencial',
        analisis_partida    JSONB,
        notas               TEXT,
        creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_posiciones (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        torneo_id           UUID NOT NULL,
        ronda_numero        SMALLINT NOT NULL DEFAULT 0,
        participante_id     UUID NOT NULL,
        posicion            SMALLINT NOT NULL,
        puntos              NUMERIC(4,1) NOT NULL DEFAULT 0.0,
        partidas_jugadas    SMALLINT NOT NULL DEFAULT 0,
        victorias           SMALLINT NOT NULL DEFAULT 0,
        empates             SMALLINT NOT NULL DEFAULT 0,
        derrotas            SMALLINT NOT NULL DEFAULT 0,
        byes                SMALLINT NOT NULL DEFAULT 0,
        bucholz_cut1        NUMERIC(5,2) NOT NULL DEFAULT 0.0,
        bucholz_total       NUMERIC(5,2) NOT NULL DEFAULT 0.0,
        sonneborn_berger    NUMERIC(5,2) NOT NULL DEFAULT 0.0,
        calculado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_circuito_ranking (
        id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        circuito_id                 UUID NOT NULL,
        participante_id             UUID NOT NULL,
        categoria                   VARCHAR(30) NOT NULL DEFAULT 'General',
        posicion                    SMALLINT NOT NULL,
        puntos_totales              INTEGER NOT NULL DEFAULT 0,
        etapas_jugadas              SMALLINT NOT NULL DEFAULT 0,
        victorias_etapa             SMALLINT NOT NULL DEFAULT 0,
        calculado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """CREATE UNIQUE INDEX IF NOT EXISTS idx_aj_pos_torneo_ronda_part ON torneos_generales.ajedrez_posiciones(torneo_id, ronda_numero, participante_id)""",
    """CREATE UNIQUE INDEX IF NOT EXISTS idx_aj_rondas_torneo_num ON torneos_generales.ajedrez_rondas(torneo_id, numero_ronda)"""
]

_tables_checked = False

def _parse_datetime(val: Optional[Any]) -> Optional[datetime]:
    """Convierte de forma segura strings ISO/fecha a objeto datetime para asyncpg/PostgreSQL."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        s = str(val).strip()
        if "T" in s:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        if len(s) == 10 and "-" in s:
            return datetime.strptime(s, "%Y-%m-%d")
        return datetime.fromisoformat(s)
    except Exception:
        return None

async def _ensure_chess_tables(session: AsyncSession):
    """Garantiza de forma idempotente que todas las tablas y columnas de ajedrez existan."""
    global _tables_checked
    if _tables_checked:
        return
    for stmt in _CHESS_DDL_STATEMENTS:
        try:
            await session.execute(text(stmt))
            await session.commit()
        except Exception:
            await session.rollback()
    _tables_checked = True

class EmparejamientoManual(BaseModel):
    blancas_id: str
    negras_id: Optional[str] = None
    tablero_numero: int

class EmparejamientoManualPayload(BaseModel):
    partidas: List[EmparejamientoManual]

class RatingUpdate(BaseModel):
    rating_fide: Optional[int] = None
    rating_nacional: Optional[int] = None
    codigo_fide: Optional[str] = None
    usuario_lichess: Optional[str] = None
    usuario_chess_com: Optional[str] = None
    institucion_id: Optional[str] = None
    categoria_base: Optional[str] = None
    categoria_jugada: Optional[str] = None

class SincronizarLichessPayload(BaseModel):
    url_partida: Optional[str] = None

class SincronizarParticipanteLichessPayload(BaseModel):
    usuario_lichess: Optional[str] = None

class ParticipanteImportItem(BaseModel):
    nombre: str
    apellido: Optional[str] = ""
    rating_fide: Optional[int] = 0
    codigo_fide: Optional[str] = None
    rating_nacional: Optional[int] = 0
    usuario_lichess: Optional[str] = None
    categoria_base: Optional[str] = "Abierta"
    categoria_jugada: Optional[str] = "Abierta"
    institucion_nombre: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None

class ImportarChessResultsPayload(BaseModel):
    jugadores: List[ParticipanteImportItem]
    anio_referencia: Optional[int] = None
    auto_clasificar_sub: bool = True

class ReclasificarCategoriasPayload(BaseModel):
    anio_referencia: Optional[int] = None


def _puntos_de_resultado(resultado: Optional[str], color: str) -> Optional[float]:
    """
    Retorna los puntos asignados según el resultado de la partida y el color del jugador.
    - '1-0':     blancas = 1.0, negras = 0.0
    - '0-1':     blancas = 0.0, negras = 1.0
    - '0.5-0.5': blancas = 0.5, negras = 0.5
    - 'BYE':     blancas = 1.0, negras = None / 0.0
    - 'FF':      0.0 para ambos
    """
    if not resultado:
        return None
    res = str(resultado).strip()
    if res == "1-0":
        return 1.0 if color == "blancas" else 0.0
    elif res == "0-1":
        return 0.0 if color == "blancas" else 1.0
    elif res in ("0.5-0.5", "1/2-1/2", "0.5 - 0.5", "1/2 - 1/2"):
        return 0.5
    elif res == "BYE":
        return 1.0 if color == "blancas" else 0.0
    elif res == "FF":
        return 0.0
    return None


async def _calcular_posiciones(torneo_id: str, ronda_numero: int, session: AsyncSession):
    """
    Recalcula la tabla de posiciones después de registrar resultados en una ronda.
    Calcula puntos, Bucholz Cut-1, Bucholz Total y Sonneborn-Berger.
    Hace UPSERT en ajedrez_posiciones.
    """
    # 1. Traer todos los participantes del torneo
    partic_q = await session.execute(text("""
        SELECT id FROM torneos_generales.participantes
        WHERE torneo_id = :tid AND (estado IS NULL OR estado != 'Descalificado')
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
@router.post("/circuitos/{circuito_id}/recalcular-ranking", status_code=200)
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
    await _ensure_chess_tables(session)
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


@router.post("/torneos/{torneo_id}/rondas", status_code=201)
async def crear_ronda(
    torneo_id: str,
    payload: RondaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Crea una nueva ronda en el torneo."""
    await _ensure_chess_tables(session)
    # Verificar si el torneo existe
    t_q = await session.execute(text("""
        SELECT id FROM torneos_generales.torneos WHERE id = :tid
    """), {"tid": torneo_id})
    if not t_q.fetchone():
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    # Verificar si el número de ronda ya existe
    existe_q = await session.execute(text("""
        SELECT id FROM torneos_generales.ajedrez_rondas
        WHERE torneo_id = :tid AND numero_ronda = :num
    """), {"tid": torneo_id, "num": payload.numero_ronda})
    if existe_q.fetchone():
        raise HTTPException(status_code=400, detail=f"La ronda {payload.numero_ronda} ya existe")

    fh_dt = _parse_datetime(payload.fecha_hora or payload.fecha_ronda)

    res = await session.execute(text("""
        INSERT INTO torneos_generales.ajedrez_rondas
            (torneo_id, numero_ronda, fecha_hora, modo_emparejamiento, notas)
        VALUES
            (:tid, :num, :fh, :modo, :notas)
        RETURNING id, torneo_id, numero_ronda, estado, fecha_hora, modo_emparejamiento, notas, creado_en, actualizado_en
    """), {
        "tid": torneo_id,
        "num": payload.numero_ronda,
        "fh": fh_dt,
        "modo": payload.modo_emparejamiento or payload.sistema or "automatico",
        "notas": payload.notas,
    })
    ronda = res.fetchone()
    await session.commit()
    return dict(ronda._mapping)


@router.delete("/torneos/{torneo_id}/rondas/{ronda_id}")
@router.delete("/rondas/{ronda_id}")
async def eliminar_ronda(
    ronda_id: str,
    torneo_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina una ronda completa, incluyendo todas sus partidas y desempates calculados.
    """
    ronda_q = await session.execute(text("""
        SELECT * FROM torneos_generales.ajedrez_rondas WHERE id = :rid
    """), {"rid": ronda_id})
    ronda = ronda_q.fetchone()
    if not ronda:
        raise HTTPException(status_code=404, detail="Ronda no encontrada")

    tid = str(ronda.torneo_id)
    num = ronda.numero_ronda

    # Eliminar partidas de la ronda
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_partidas WHERE ronda_id = :rid
    """), {"rid": ronda_id})

    # Eliminar snapshots de posiciones de esta ronda
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_posiciones WHERE torneo_id = :tid AND ronda_numero = :num
    """), {"tid": tid, "num": num})

    # Eliminar la ronda
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_rondas WHERE id = :rid
    """), {"rid": ronda_id})

    await session.commit()

    # Si aún quedan rondas con partidas finalizadas, recalcular posiciones de la última calculada
    max_ronda_q = await session.execute(text("""
        SELECT MAX(r.numero_ronda)
        FROM torneos_generales.ajedrez_rondas r
        JOIN torneos_generales.ajedrez_partidas p ON p.ronda_id = r.id
        WHERE r.torneo_id = :tid AND p.resultado IS NOT NULL
    """), {"tid": tid})
    max_r = max_ronda_q.scalar()
    if max_r and max_r > 0:
        await _calcular_posiciones(tid, max_r, session)

    return {"mensaje": f"Ronda {num} eliminada correctamente"}


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
@router.post("/rondas/{ronda_id}/confirmar")
async def confirmar_ronda(
    ronda_id: str,
    torneo_id: Optional[str] = None,
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
            p.modalidad_partida, p.url_partida, p.analisis_partida,
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


@router.patch("/partidas/{partida_id}/estado")
async def actualizar_estado_partida(
    partida_id: str,
    payload: EstadoPartidaPayload,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza el estado de una partida individual:
    - 'pendiente' / 'programado'
    - 'en_curso' / 'iniciado'
    - 'finalizada' / 'finalizado'
    """
    est = payload.estado.lower().strip()
    if est in ["pendiente", "programado", "prog"]:
        est_db = "pendiente"
    elif est in ["en_curso", "en curso", "iniciado", "iniciada", "en_juego", "en juego", "live"]:
        est_db = "en_curso"
    elif est in ["finalizada", "finalizado", "fin"]:
        est_db = "finalizada"
    else:
        raise HTTPException(
            status_code=400,
            detail="Estado no válido. Valores permitidos: 'pendiente', 'en_curso', 'finalizada'"
        )

    partida_q = await session.execute(text("""
        SELECT p.id FROM torneos_generales.ajedrez_partidas p WHERE p.id = :pid
    """), {"pid": partida_id})
    if not partida_q.fetchone():
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_partidas
        SET estado = :est, actualizado_en = NOW()
        WHERE id = :pid
    """), {"pid": partida_id, "est": est_db})
    await session.commit()

    return {"mensaje": f"Estado de partida actualizado a {est_db}", "estado": est_db}


@router.post("/rondas/{ronda_id}/iniciar-partidas")
async def iniciar_todas_partidas_ronda(
    ronda_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Pasa todas las partidas pendientes de la ronda a 'en_curso'."""
    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_partidas
        SET estado = 'en_curso', actualizado_en = NOW()
        WHERE ronda_id = :rid AND resultado IS NULL
    """), {"rid": ronda_id})
    await session.commit()
    return {"mensaje": "Todas las partidas pendientes han sido iniciadas"}


@router.post("/partidas/{partida_id}/reiniciar")
async def reiniciar_partida(
    partida_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Limpia el resultado de una partida y la devuelve a estado 'pendiente'.
    Recalcula automáticamente las posiciones del torneo.
    """
    partida_q = await session.execute(text("""
        SELECT p.*, r.torneo_id, r.numero_ronda
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        WHERE p.id = :pid
    """), {"pid": partida_id})
    partida = partida_q.fetchone()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_partidas
        SET resultado = NULL, ganador_id = NULL,
            puntos_blancas = NULL, puntos_negras = NULL,
            estado = 'pendiente', actualizado_en = NOW()
        WHERE id = :pid
    """), {"pid": partida_id})
    await session.commit()

    # Recalcular posiciones de la ronda actual tras limpiar el resultado
    await _calcular_posiciones(str(partida.torneo_id), partida.numero_ronda, session)

    return {"mensaje": "Partida reiniciada y posiciones recalculadas", "estado": "pendiente"}


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
    await _ensure_chess_tables(session)
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
# ENDPOINTS — ELO / RATING Y PARTICIPANTES
# ==============================================================================

@router.get("/torneos/{torneo_id}/participantes")
async def listar_participantes_torneo(
    torneo_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Lista todos los participantes de un torneo de ajedrez con sus datos y rating."""
    await _ensure_chess_tables(session)
    res = await session.execute(text("""
        SELECT p.*, i.nombre AS institucion_nombre
        FROM torneos_generales.participantes p
        LEFT JOIN torneos_generales.ajedrez_instituciones i ON i.id = p.institucion_id
        WHERE p.torneo_id = :tid
        ORDER BY p.rating_fide DESC NULLS LAST, p.nombre, p.apellido
    """), {"tid": torneo_id})
    return [dict(r._mapping) for r in res.fetchall()]


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

    if "institucion_id" in data and not data["institucion_id"]:
        data["institucion_id"] = None

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


# ==============================================================================
# ENDPOINTS — REGISTRO ÚNICO ANUAL Y VALIDACIÓN DE CÉDULA DE IDENTIDAD
# ==============================================================================

CEDULAS_UPLOAD_DIR = Path("static/uploads/cedulas")
CEDULAS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/participantes/verificar-cedula/{documento}")
async def verificar_cedula_anual(
    documento: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Verifica si una cédula ya fue registrada y validada en la temporada anual actual.
    Si ya cuenta con foto/validación de este año, permite omitir la carga obligatoria del archivo.
    """
    clean_doc = re.sub(r'[^\w]', '', documento.strip())
    if not clean_doc:
        raise HTTPException(status_code=400, detail="Documento inválido")

    current_year = datetime.now().year

    # Asegurar columnas
    await session.execute(text("""
        ALTER TABLE torneos_generales.participantes
        ADD COLUMN IF NOT EXISTS foto_documento_url TEXT,
        ADD COLUMN IF NOT EXISTS documento_validado BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS documento_validado_anio INTEGER;
    """))

    res = await session.execute(text("""
        SELECT nombre, apellido, documento, foto_documento_url,
               documento_validado, documento_validado_anio, fecha_nacimiento
        FROM torneos_generales.participantes
        WHERE regexp_replace(COALESCE(documento, ''), '[^a-zA-Z0-9]', '', 'g') = :doc
          AND foto_documento_url IS NOT NULL
        ORDER BY documento_validado_anio DESC NULLS LAST, actualizado_en DESC
        LIMIT 1
    """), {"doc": clean_doc})
    row = res.fetchone()

    if not row:
        return {
            "encontrado": False,
            "documento": documento,
            "requiere_foto": True,
            "mensaje": "Documento no registrado previamente. Se requiere adjuntar foto de cédula."
        }

    es_valido_anio = (row.documento_validado_anio == current_year or row.documento_validado is True)

    return {
        "encontrado": True,
        "documento": row.documento,
        "nombre_completo": f"{row.nombre} {row.apellido or ''}".strip(),
        "foto_documento_url": row.foto_documento_url,
        "validado_este_anio": es_valido_anio,
        "anio_validacion": row.documento_validado_anio,
        "fecha_nacimiento": str(row.fecha_nacimiento)[:10] if row.fecha_nacimiento else None,
        "requiere_foto": not bool(row.foto_documento_url),
        "mensaje": (
            f"Cédula validada para la temporada {current_year}. No es necesario volver a subir el documento."
            if es_valido_anio else
            "Cédula encontrada pero requiere actualización para la temporada actual."
        )
    }


@router.post("/participantes/{participante_id}/documento/upload")
async def subir_foto_cedula_participante(
    participante_id: str,
    file: UploadFile = File(...),
    documento: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Sube la foto del documento / cédula de identidad del participante.
    - Guarda el archivo en static/uploads/cedulas
    - Marca documento_validado = TRUE y documento_validado_anio = año_actual
    - Sincroniza la foto en todos los torneos donde participe el mismo jugador.
    """
    # 1. Validar participante
    part_q = await session.execute(text("""
        SELECT * FROM torneos_generales.participantes WHERE id = :pid
    """), {"pid": participante_id})
    part = part_q.fetchone()
    if not part:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    # 2. Guardar archivo
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"cedula_{participante_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = CEDULAS_UPLOAD_DIR / filename

    contents = await file.read()
    with open(dest_path, "wb") as f:
        f.write(contents)

    file_url = f"/static/uploads/cedulas/{filename}"
    current_year = datetime.now().year
    doc_val = documento or part.documento

    # 3. Actualizar registro
    await session.execute(text("""
        UPDATE torneos_generales.participantes
        SET documento = COALESCE(:doc, documento),
            foto_documento_url = :url,
            documento_validado = TRUE,
            documento_validado_anio = :anio,
            actualizado_en = NOW()
        WHERE id = :pid
    """), {
        "pid": participante_id,
        "doc": doc_val,
        "url": file_url,
        "anio": current_year,
    })

    # 4. Sincronizar en otros torneos para el mismo documento
    if doc_val:
        await session.execute(text("""
            UPDATE torneos_generales.participantes
            SET foto_documento_url = :url,
                documento_validado = TRUE,
                documento_validado_anio = :anio,
                actualizado_en = NOW()
            WHERE documento = :doc AND id != :pid
        """), {
            "doc": doc_val,
            "url": file_url,
            "anio": current_year,
            "pid": participante_id
        })

    await session.commit()

    return {
        "mensaje": f"Documento subido y validado exitosamente para la temporada {current_year}.",
        "foto_documento_url": file_url,
        "documento_validado": True,
        "documento_validado_anio": current_year
    }


@router.post("/participantes/{participante_id}/validar-documento")
async def toggle_validar_documento(
    participante_id: str,
    validado: bool = Query(True),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Permite al árbitro u organizador dar el 'OK' o revocar la validación de la cédula."""
    current_year = datetime.now().year
    await session.execute(text("""
        UPDATE torneos_generales.participantes
        SET documento_validado = :val,
            documento_validado_anio = :anio,
            actualizado_en = NOW()
        WHERE id = :pid
    """), {
        "pid": participante_id,
        "val": validado,
        "anio": current_year if validado else None
    })
    await session.commit()
    return {"mensaje": f"Estado de documento actualizado a {'Validado' if validado else 'Pendiente'}."}


# ==============================================================================
# ENDPOINTS — IMPORTACIÓN CHESS-RESULTS & RECLASIFICACIÓN DE CATEGORÍAS
# ==============================================================================

def _calcular_categoria_fide(anio_nac: Optional[int], anio_torneo: Optional[int] = None) -> str:
    if not anio_nac:
        return "Abierta"
    if not anio_torneo:
        anio_torneo = datetime.now().year
    edad = anio_torneo - anio_nac
    if edad <= 7:
        return "Sub-7"
    elif edad <= 9:
        return "Sub-9"
    elif edad <= 11:
        return "Sub-11"
    elif edad <= 13:
        return "Sub-13"
    elif edad <= 15:
        return "Sub-15"
    elif edad <= 18:
        return "Sub-18"
    return "Abierta"


def _parse_chess_results_xlsx_bytes(file_bytes: bytes) -> List[List[str]]:
    with zipfile.ZipFile(io.BytesIO(file_bytes), 'r') as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                text_parts = [t.text for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]
                strings.append("".join(text_parts))
        
        sheet_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
        if not sheet_files:
            return []
        
        tree = ET.fromstring(z.read(sheet_files[0]))
        rows = []
        for row in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_vals = []
            for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                t_attr = c.attrib.get('t')
                val = v.text if v is not None else ''
                if t_attr == 's' and val.isdigit():
                    idx = int(val)
                    val = strings[idx] if idx < len(strings) else val
                row_vals.append(val.strip() if val else '')
            if any(row_vals):
                rows.append(row_vals)
        return rows


def _parse_chess_results_matrix(rows: List[List[str]], anio_torneo: Optional[int] = None) -> List[Dict[str, Any]]:
    if not anio_torneo:
        anio_torneo = datetime.now().year

    header_idx = -1
    col_map = {}
    
    for idx, r in enumerate(rows):
        r_lower = [str(cell).lower().strip() for cell in r]
        for c_idx, cell in enumerate(r_lower):
            if any(term == cell or term in cell for term in ['nombre', 'jugador', 'apellido', 'player', 'name']):
                if 'nombre' not in col_map:
                    col_map['nombre'] = c_idx
            elif any(term in cell for term in ['fide-id', 'fide id', 'fide_id', 'id fide', 'código fide', 'codigo fide']):
                col_map['codigo_fide'] = c_idx
            elif any(term in cell for term in ['elo', 'rating', 'rtg', 'ptos', 'pts']):
                if 'elo' not in col_map:
                    col_map['elo'] = c_idx
            elif any(term in cell for term in ['fed', 'pais', 'club', 'colegio', 'institucion', 'ciudad']):
                if 'club' not in col_map:
                    col_map['club'] = c_idx
            elif any(term in cell for term in ['nac', 'nacimiento', 'fecha nac', 'birth', 'edad', 'fnac']):
                col_map['nacimiento'] = c_idx
            elif any(term == cell or cell.startswith('cat') or 'sub' in cell for term in ['categoría', 'categoria']):
                if cell not in ['no.', 'no', 'pos', 'puesto', 'nr']:
                    col_map['categoria'] = c_idx
            elif any(term in cell for term in ['sex', 'sexo', 'gen', 'genero', 'género']):
                col_map['genero'] = c_idx

        if 'nombre' in col_map:
            header_idx = idx
            break

    if header_idx == -1:
        header_idx = 4 if len(rows) > 4 else 0
        col_map = {'nombre': 2, 'codigo_fide': 3, 'club': 4, 'elo': 5}

    participantes = []
    for r in rows[header_idx + 1:]:
        if len(r) <= col_map.get('nombre', 0):
            continue
        
        nombre_raw = r[col_map['nombre']].strip()
        if not nombre_raw or nombre_raw.lower().startswith(('no.', 'ranking', 'tabla', 'fuente', 'de la base')):
            continue
            
        if ',' in nombre_raw:
            partes = nombre_raw.split(',', 1)
            apellido = partes[0].strip()
            nombre = partes[1].strip()
        else:
            partes = nombre_raw.split()
            if len(partes) > 1:
                nombre = partes[0]
                apellido = " ".join(partes[1:])
            else:
                nombre = nombre_raw
                apellido = ""

        elo_val = 0
        if 'elo' in col_map and len(r) > col_map['elo']:
            elo_str = re.sub(r'[^\d]', '', str(r[col_map['elo']]))
            if elo_str.isdigit():
                elo_val = int(elo_str)

        fide_id = ""
        if 'codigo_fide' in col_map and len(r) > col_map['codigo_fide']:
            fide_str = str(r[col_map['codigo_fide']]).strip()
            if fide_str.isdigit():
                fide_id = fide_str

        club = ""
        if 'club' in col_map and len(r) > col_map['club']:
            club = str(r[col_map['club']]).strip()

        cat_sugerida = "Abierta"
        fecha_nac_str = None
        if 'nacimiento' in col_map and len(r) > col_map['nacimiento']:
            nac_str = str(r[col_map['nacimiento']]).strip()
            m_year = re.search(r'\b(19\d\d|20\d\d)\b', nac_str)
            if m_year:
                anio_nac = int(m_year.group(1))
                cat_sugerida = _calcular_categoria_fide(anio_nac, anio_torneo)
                fecha_nac_str = f"{anio_nac}-01-01"
        elif 'categoria' in col_map and len(r) > col_map['categoria']:
            c_val = str(r[col_map['categoria']]).strip()
            if c_val:
                cat_sugerida = c_val

        genero_val = None
        if 'genero' in col_map and len(r) > col_map['genero']:
            g_str = str(r[col_map['genero']]).strip().lower()
            if g_str in ['f', 'fem', 'femenino', 'w', 'mujer']:
                genero_val = 'Femenino'
            elif g_str in ['m', 'masc', 'masculino', 'varon', 'hombre']:
                genero_val = 'Masculino'

        participantes.append({
            "nombre": nombre,
            "apellido": apellido,
            "rating_fide": elo_val,
            "codigo_fide": fide_id,
            "institucion_nombre": club,
            "categoria_base": cat_sugerida,
            "categoria_jugada": cat_sugerida,
            "fecha_nacimiento": fecha_nac_str,
            "genero": genero_val,
        })
    return participantes


@router.post("/torneos/{torneo_id}/importar-chess-results/upload")
async def preview_upload_chess_results(
    torneo_id: str,
    file: UploadFile = File(...),
    anio_referencia: Optional[int] = Form(None),
):
    """
    Parsea un archivo subido (Excel o CSV de Chess-Results/Swiss-Manager) y devuelve la lista
    de participantes detectados con su categoría calculada para vista previa antes de guardar.
    """
    contents = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".xlsx"):
        rows = _parse_chess_results_xlsx_bytes(contents)
    elif filename.endswith(".csv"):
        text_str = contents.decode("utf-8", errors="replace")
        rows = list(csv.reader(io.StringIO(text_str)))
    else:
        # Intentar parsear como XLSX
        try:
            rows = _parse_chess_results_xlsx_bytes(contents)
        except Exception:
            text_str = contents.decode("utf-8", errors="replace")
            rows = list(csv.reader(io.StringIO(text_str)))

    if not rows:
        raise HTTPException(status_code=400, detail="No se pudieron extraer filas del archivo")

    parsed = _parse_chess_results_matrix(rows, anio_referencia)
    if not parsed:
        raise HTTPException(status_code=400, detail="No se encontraron jugadores válidos en el archivo")

    # Resumen por categorías
    cat_counts: Dict[str, int] = {}
    for p in parsed:
        cat = p.get("categoria_base") or "Abierta"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    return {
        "total_detectados": len(parsed),
        "categorias_resumen": cat_counts,
        "jugadores": parsed
    }


@router.post("/torneos/{torneo_id}/importar-chess-results")
async def confirmar_importacion_chess_results(
    torneo_id: str,
    payload: ImportarChessResultsPayload,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Guarda los participantes parseados en el torneo.
    - Asocia o crea instituciones según 'institucion_nombre'.
    - Hace UPSERT en torneos_generales.participantes por (torneo_id, nombre, apellido) o inserta nuevo.
    """
    if not payload.jugadores:
        raise HTTPException(status_code=400, detail="Lista de jugadores vacía")

    # Cache de instituciones
    inst_res = await session.execute(text("SELECT id, nombre FROM torneos_generales.ajedrez_instituciones"))
    inst_map = {r.nombre.lower().strip(): str(r.id) for r in inst_res.fetchall()}

    creados = 0
    actualizados = 0
    cat_counts: Dict[str, int] = {}

    for j in payload.jugadores:
        nombre = j.nombre.strip()
        apellido = (j.apellido or "").strip()
        if not nombre:
            continue

        # Resolver o crear institución
        inst_id = None
        if j.institucion_nombre and j.institucion_nombre.strip():
            raw_inst = j.institucion_nombre.strip()
            inst_key = raw_inst.lower()
            if inst_key in inst_map:
                inst_id = inst_map[inst_key]
            else:
                new_inst_id = str(uuid.uuid4())
                await session.execute(text("""
                    INSERT INTO torneos_generales.ajedrez_instituciones (id, nombre, tipo)
                    VALUES (:id, :nom, 'colegio')
                """), {"id": new_inst_id, "nom": raw_inst})
                inst_map[inst_key] = new_inst_id
                inst_id = new_inst_id

        # Categoría
        cat_base = j.categoria_base or "Abierta"
        cat_jug = j.categoria_jugada or cat_base
        cat_counts[cat_base] = cat_counts.get(cat_base, 0) + 1

        # Verificar si ya existe en el torneo
        part_q = await session.execute(text("""
            SELECT id FROM torneos_generales.participantes
            WHERE torneo_id = :tid AND LOWER(TRIM(nombre)) = :nom AND LOWER(TRIM(COALESCE(apellido, ''))) = :ape
        """), {
            "tid": torneo_id,
            "nom": nombre.lower(),
            "ape": apellido.lower(),
        })
        existing = part_q.fetchone()

        if existing:
            await session.execute(text("""
                UPDATE torneos_generales.participantes
                SET rating_fide = COALESCE(:rf, rating_fide),
                    codigo_fide = COALESCE(:cf, codigo_fide),
                    institucion_id = COALESCE(:iid, institucion_id),
                    categoria_base = :cb,
                    categoria_jugada = :cj,
                    actualizado_en = NOW()
                WHERE id = :pid
            """), {
                "pid": str(existing.id),
                "rf": j.rating_fide,
                "cf": j.codigo_fide or None,
                "iid": inst_id,
                "cb": cat_base,
                "cj": cat_jug,
            })
            actualizados += 1
        else:
            await session.execute(text("""
                INSERT INTO torneos_generales.participantes
                    (torneo_id, nombre, apellido, rating_fide, codigo_fide,
                     institucion_id, categoria_base, categoria_jugada, estado, creado_en)
                VALUES
                    (:tid, :nom, :ape, :rf, :cf,
                     :iid, :cb, :cj, 'confirmado', NOW())
            """), {
                "tid": torneo_id,
                "nom": nombre,
                "ape": apellido,
                "rf": j.rating_fide or 0,
                "cf": j.codigo_fide or None,
                "iid": inst_id,
                "cb": cat_base,
                "cj": cat_jug,
            })
            creados += 1

    await session.commit()

    return {
        "mensaje": f"Importación completada: {creados} registrados, {actualizados} actualizados.",
        "creados": creados,
        "actualizados": actualizados,
        "total": creados + actualizados,
        "categorias_resumen": cat_counts
    }


@router.post("/torneos/{torneo_id}/reclasificar-categorias")
async def reclasificar_categorias_torneo(
    torneo_id: str,
    payload: Optional[ReclasificarCategoriasPayload] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Reclasifica a todos los participantes del torneo en Sub-7, Sub-9, Sub-11, Sub-13 o Abierta
    según su fecha de nacimiento o año de corte.
    """
    anio_ref = (payload.anio_referencia if payload and payload.anio_referencia else datetime.now().year)

    part_q = await session.execute(text("""
        SELECT id, nombre, apellido, fecha_nacimiento, categoria_base
        FROM torneos_generales.participantes
        WHERE torneo_id = :tid
    """), {"tid": torneo_id})
    participantes = part_q.fetchall()

    actualizados = 0
    cat_counts: Dict[str, int] = {}

    for p in participantes:
        nueva_cat = p.categoria_base or "Abierta"
        if p.fecha_nacimiento:
            try:
                fn = p.fecha_nacimiento if isinstance(p.fecha_nacimiento, datetime) else datetime.strptime(str(p.fecha_nacimiento)[:10], "%Y-%m-%d")
                nueva_cat = _calcular_categoria_fide(fn.year, anio_ref)
            except Exception:
                pass

        cat_counts[nueva_cat] = cat_counts.get(nueva_cat, 0) + 1

        await session.execute(text("""
            UPDATE torneos_generales.participantes
            SET categoria_base = :cb, categoria_jugada = :cb, actualizado_en = NOW()
            WHERE id = :pid
        """), {"cb": nueva_cat, "pid": str(p.id)})
        actualizados += 1

    await session.commit()

    return {
        "mensaje": f"Reclasificación completada para {actualizados} participantes (Año de corte: {anio_ref}).",
        "actualizados": actualizados,
        "categorias_resumen": cat_counts
    }


@router.get("/torneos/{torneo_id}/ranking-por-categorias")
async def ranking_por_categorias(
    torneo_id: str,
    ronda_numero: Optional[int] = Query(None, description="Número de ronda (omite para última o final)"),
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna la tabla de posiciones clasificada y segregada por categorías (Sub-7, Sub-9, Sub-11, Sub-13, Abierta)
    extrayendo el Top 10 de cada una para premiaciones y reportes.
    """
    if ronda_numero is None:
        r_q = await session.execute(text("""
            SELECT MAX(ronda_numero) FROM torneos_generales.ajedrez_posiciones WHERE torneo_id = :tid
        """), {"tid": torneo_id})
        ronda_numero = r_q.scalar() or 0

    res = await session.execute(text("""
        SELECT
            ap.*,
            p.nombre, p.apellido, p.rating_fide, p.codigo_fide,
            COALESCE(p.categoria_base, 'Abierta') AS categoria,
            p.genero,
            i.nombre AS institucion_nombre
        FROM torneos_generales.ajedrez_posiciones ap
        JOIN torneos_generales.participantes p ON p.id = ap.participante_id
        LEFT JOIN torneos_generales.ajedrez_instituciones i ON i.id = p.institucion_id
        WHERE ap.torneo_id = :tid AND ap.ronda_numero = :ronda
        ORDER BY ap.puntos DESC, ap.bucholz_cut1 DESC, ap.bucholz_total DESC,
                 ap.sonneborn_berger DESC
    """), {"tid": torneo_id, "ronda": ronda_numero})

    filas = [dict(r._mapping) for r in res.fetchall()]

    categorias_dict: Dict[str, List[Dict]] = {
        "General": filas,
        "Sub-7": [],
        "Sub-9": [],
        "Sub-11": [],
        "Sub-13": [],
        "Sub-15": [],
        "Sub-18": [],
        "Abierta": [],
        "Femenino": [],
    }

    for idx, f in enumerate(filas, start=1):
        f["posicion_general"] = idx
        cat = f.get("categoria") or "Abierta"
        if cat in categorias_dict:
            categorias_dict[cat].append(f)
        else:
            categorias_dict.setdefault(cat, []).append(f)

        if str(f.get("genero", "")).lower() in ["femenino", "f", "fem"]:
            categorias_dict["Femenino"].append(f)

    top10_por_categoria: Dict[str, List[Dict]] = {}
    for cat_key, items in categorias_dict.items():
        top10_por_categoria[cat_key] = items[:10]

    return {
        "torneo_id": torneo_id,
        "ronda_numero": ronda_numero,
        "total_participantes": len(filas),
        "categorias_disponibles": [k for k, v in categorias_dict.items() if len(v) > 0],
        "posiciones_por_categoria": categorias_dict,
        "top10_por_categoria": top10_por_categoria
    }


# ==============================================================================
# ENDPOINTS — INTEGRACIÓN LICHESS & TABLERO EMBEBIDO
# ==============================================================================

def _extraer_lichess_game_id(url_o_id: Optional[str]) -> Optional[str]:
    """
    Extrae el gameId de 8 caracteres de Lichess a partir de una URL o ID.
    Ejemplos soportados:
    - 'https://lichess.org/qa7x6Y4w' -> 'qa7x6Y4w'
    - 'https://lichess.org/qa7x6Y4w/white' -> 'qa7x6Y4w'
    - 'https://lichess.org/embed/game/qa7x6Y4w' -> 'qa7x6Y4w'
    - 'qa7x6Y4w' -> 'qa7x6Y4w'
    - 'qa7x6Y4w1234' (12 chars con token de jugador) -> 'qa7x6Y4w'
    """
    if not url_o_id:
        return None
    s = url_o_id.strip()
    match = re.search(r'(?:lichess\.org/(?:embed/game/)?|lichess\.org/)?([a-zA-Z0-9]{8})', s)
    if match:
        return match.group(1)
    return None


@router.get("/lichess/user/{username}")
async def consultar_usuario_lichess(username: str):
    """
    Consulta información pública de un usuario en Lichess (ratings, títulos, online).
    """
    clean_user = username.strip().lower()
    if not clean_user:
        raise HTTPException(status_code=400, detail="Nombre de usuario requerido")

    url = f"https://lichess.org/api/user/{clean_user}"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MiCanchaChess/1.0"
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            perfs = data.get("perfs", {})
            total_games = sum(p.get("games", 0) for p in perfs.values() if isinstance(p, dict))

            return {
                "id": data.get("id"),
                "username": data.get("username", clean_user),
                "title": data.get("title"),  # GM, IM, FM, etc.
                "online": data.get("online", False),
                "rating_blitz": perfs.get("blitz", {}).get("rating"),
                "rating_rapid": perfs.get("rapid", {}).get("rating"),
                "rating_classical": perfs.get("classical", {}).get("rating"),
                "rating_bullet": perfs.get("bullet", {}).get("rating"),
                "total_partidas": total_games,
                "profile_url": f"https://lichess.org/@/{data.get('username', clean_user)}"
            }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(status_code=404, detail=f"Usuario de Lichess '{clean_user}' no encontrado")
        raise HTTPException(status_code=502, detail=f"Error en servicio de Lichess (código {e.code})")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con Lichess: {str(e)}")


def _evaluar_antitrampa(
    white_analysis: Optional[Dict],
    black_analysis: Optional[Dict],
    status: Optional[str],
    winner: Optional[str],
    total_moves: int,
    white_user: str,
    black_user: str,
    white_rating: Optional[int],
    black_rating: Optional[int],
) -> Dict[str, Any]:
    """
    Evalúa métricas de precisión y pérdida media de centipeones (ACPL)
    para detectar anomalías estadísticas o posible asistencia de motor de ajedrez.
    
    Escala ACPL (Average Centipawn Loss):
    - < 16: Nivel Super GM / Motor de Ajedrez (Sospechoso en jugadores sin título / < 2200)
    - 16 - 28: Nivel Maestro / Muy alta precisión
    - 29 - 50: Nivel Club / Avanzado normal
    - > 50: Nivel Aficionado / Escolar estándar
    """
    def _eval_lado(analisis: Optional[Dict], rating: Optional[int]) -> Dict[str, Any]:
        if not analisis or not isinstance(analisis, dict):
            return {
                "disponible": False,
                "acpl": None,
                "inaccuracy": 0,
                "mistake": 0,
                "blunder": 0,
                "precision_nivel": "Sin análisis de motor",
                "sospechoso": False,
                "motivo": None,
            }
        
        acpl = analisis.get("acpl")
        inacc = analisis.get("inaccuracy", 0)
        mist = analisis.get("mistake", 0)
        blund = analisis.get("blunder", 0)
        
        sospechoso = False
        motivo = None
        
        if acpl is not None:
            if acpl <= 16 and blund == 0 and total_moves >= 15:
                if not rating or rating < 2200:
                    sospechoso = True
                    motivo = f"Pérdida media de centipeones extremadamente baja (ACPL: {acpl}) sin errores graves en {total_moves} jugadas (Precisión equivalente a motor)."
                precision = "Extrema / Posible Motor"
            elif acpl <= 26 and blund == 0 and total_moves >= 12:
                precision = "Muy Alta (Nivel Maestro)"
            elif acpl <= 48:
                precision = "Alta (Nivel Club)"
            elif acpl <= 75:
                precision = "Media (Estándar)"
            else:
                precision = "Baja (Aficionado)"
        else:
            precision = "No evaluado"

        return {
            "disponible": True,
            "acpl": acpl,
            "inaccuracy": inacc,
            "mistake": mist,
            "blunder": blund,
            "precision_nivel": precision,
            "sospechoso": sospechoso,
            "motivo": motivo,
        }

    eval_w = _eval_lado(white_analysis, white_rating)
    eval_b = _eval_lado(black_analysis, black_rating)
    
    es_cheat = (status == "cheat")
    hay_alerta = eval_w["sospechoso"] or eval_b["sospechoso"] or es_cheat

    motivo_general = []
    if es_cheat:
        motivo_general.append("Lichess marcó la partida con sanción de trampa (Cheat detected).")
    if eval_w["sospechoso"]:
        motivo_general.append(f"Blancas (@{white_user}): {eval_w['motivo']}")
    if eval_b["sospechoso"]:
        motivo_general.append(f"Negras (@{black_user}): {eval_b['motivo']}")

    return {
        "alerta_sospecha": hay_alerta,
        "cheat_flag_lichess": es_cheat,
        "resumen_alerta": " | ".join(motivo_general) if hay_alerta else "Partida dentro de parámetros normales",
        "blancas": eval_w,
        "negras": eval_b,
    }


@router.get("/lichess/game/{game_id_or_url:path}")
async def consultar_partida_lichess(game_id_or_url: str):
    """
    Consulta el estado y resultado de una partida en Lichess.
    Retorna información de jugadores, FEN, movimientos, ganador y resultado compatible.
    """
    game_id = _extraer_lichess_game_id(game_id_or_url)
    if not game_id:
        raise HTTPException(status_code=400, detail="Formato de ID o URL de Lichess inválido")

    url = f"https://lichess.org/game/export/{game_id}?pgnInJson=true&clocks=true&evals=true"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MiCanchaChess/1.0"
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            status = data.get("status")
            winner = data.get("winner")

            resultado = None
            if status in ["mate", "resign", "timeout", "outoftime", "cheat", "noStart", "unknownFinish"]:
                if winner == "white":
                    resultado = "1-0"
                elif winner == "black":
                    resultado = "0-1"
            elif status in ["stalemate", "draw"]:
                resultado = "0.5-0.5"

            players = data.get("players", {})
            white_user = players.get("white", {}).get("user", {}).get("name") or players.get("white", {}).get("name") or "Blancas"
            white_rating = players.get("white", {}).get("rating")
            white_analysis = players.get("white", {}).get("analysis")

            black_user = players.get("black", {}).get("user", {}).get("name") or players.get("black", {}).get("name") or "Negras"
            black_rating = players.get("black", {}).get("rating")
            black_analysis = players.get("black", {}).get("analysis")

            moves_str = data.get("moves") or ""
            total_moves = len(moves_str.split()) // 2 if moves_str else 0

            antitrampa = _evaluar_antitrampa(
                white_analysis=white_analysis,
                black_analysis=black_analysis,
                status=status,
                winner=winner,
                total_moves=total_moves,
                white_user=white_user,
                black_user=black_user,
                white_rating=white_rating,
                black_rating=black_rating,
            )

            return {
                "game_id": game_id,
                "url": f"https://lichess.org/{game_id}",
                "embed_url": f"https://lichess.org/embed/game/{game_id}?theme=auto&bg=auto",
                "status": status,
                "winner": winner,
                "resultado": resultado,
                "finalizada": resultado is not None,
                "speed": data.get("speed"),
                "perf": data.get("perf"),
                "white": {"username": white_user, "rating": white_rating, "analysis": white_analysis},
                "black": {"username": black_user, "rating": black_rating, "analysis": black_analysis},
                "moves": moves_str,
                "total_moves": total_moves,
                "last_fen": data.get("lastFen") or data.get("fen"),
                "antitrampa": antitrampa,
            }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(status_code=404, detail=f"Partida de Lichess '{game_id}' no encontrada")
        raise HTTPException(status_code=502, detail=f"Error en Lichess (código {e.code})")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con Lichess: {str(e)}")


@router.post("/partidas/{partida_id}/sincronizar-lichess")
async def sincronizar_partida_lichess(
    partida_id: str,
    payload: Optional[SincronizarLichessPayload] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Sincroniza automáticamente una partida desde Lichess:
    1. Si se envía url_partida en el payload, se actualiza; sino se usa la existente.
    2. Consulta la API de Lichess.
    3. Si la partida concluyó, registra el resultado (1-0, 0-1, 0.5-0.5), ganador, puntos, análisis antitrampa y estado='finalizada'.
    4. Recalcula automáticamente las posiciones del torneo.
    """
    # 0. Asegurar columna analisis_partida en la base de datos
    await session.execute(text("""
        ALTER TABLE torneos_generales.ajedrez_partidas
        ADD COLUMN IF NOT EXISTS analisis_partida JSONB;
    """))

    # 1. Traer partida
    partida_q = await session.execute(text("""
        SELECT p.*, r.torneo_id, r.numero_ronda
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        WHERE p.id = :pid
    """), {"pid": partida_id})
    partida = partida_q.fetchone()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    url_target = (payload.url_partida if payload and payload.url_partida else partida.url_partida)
    if not url_target:
        raise HTTPException(status_code=400, detail="La partida no tiene URL de Lichess asignada")

    game_id = _extraer_lichess_game_id(url_target)
    if not game_id:
        raise HTTPException(status_code=400, detail="URL o ID de Lichess inválido")

    # 2. Consultar Lichess
    lichess_info = await consultar_partida_lichess(game_id)
    canonical_url = lichess_info["url"]
    resultado = lichess_info["resultado"]
    antitrampa = lichess_info.get("antitrampa")

    if resultado:
        pts_b = _puntos_de_resultado(resultado, "blancas")
        pts_n = _puntos_de_resultado(resultado, "negras") if partida.negras_id else None
        ganador_id = None
        if resultado == "1-0":
            ganador_id = str(partida.blancas_id) if partida.blancas_id else None
        elif resultado == "0-1":
            ganador_id = str(partida.negras_id) if partida.negras_id else None

        await session.execute(text("""
            UPDATE torneos_generales.ajedrez_partidas
            SET resultado = :res, ganador_id = :gid,
                puntos_blancas = :pb, puntos_negras = :pn,
                url_partida = :url, analisis_partida = :analisis,
                estado = 'finalizada', actualizado_en = NOW()
            WHERE id = :pid
        """), {
            "pid": partida_id,
            "res": resultado,
            "gid": ganador_id,
            "pb": pts_b,
            "pn": pts_n,
            "url": canonical_url,
            "analisis": json.dumps(antitrampa) if antitrampa else None,
        })
        await session.commit()

        # Recalcular posiciones
        await _calcular_posiciones(str(partida.torneo_id), partida.numero_ronda, session)

        return {
            "mensaje": f"Partida sincronizada con éxito ({resultado})",
            "resultado": resultado,
            "ganador": lichess_info["winner"],
            "url_partida": canonical_url,
            "embed_url": lichess_info["embed_url"],
            "estado": "finalizada",
            "posiciones_actualizadas": True,
            "antitrampa": antitrampa,
        }
    else:
        # Partida en curso o sin definir
        await session.execute(text("""
            UPDATE torneos_generales.ajedrez_partidas
            SET url_partida = :url, analisis_partida = :analisis,
                estado = 'en_curso', actualizado_en = NOW()
            WHERE id = :pid
        """), {
            "pid": partida_id,
            "url": canonical_url,
            "analisis": json.dumps(antitrampa) if antitrampa else None,
        })
        await session.commit()

        return {
            "mensaje": f"Partida en curso en Lichess (estado: {lichess_info['status']})",
            "resultado": None,
            "url_partida": canonical_url,
            "embed_url": lichess_info["embed_url"],
            "estado": "en_curso",
            "posiciones_actualizadas": False,
            "antitrampa": antitrampa,
        }


@router.post("/participantes/{participante_id}/sincronizar-lichess")
async def sincronizar_participante_lichess(
    participante_id: str,
    payload: Optional[SincronizarParticipanteLichessPayload] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Sincroniza el perfil y rating de Lichess de un participante.
    Si tiene rating Blitz o Rapid, actualiza el rating si está en 0 o actualiza el usuario.
    """
    partic_q = await session.execute(text("""
        SELECT * FROM torneos_generales.participantes WHERE id = :pid
    """), {"pid": participante_id})
    partic = partic_q.fetchone()
    if not partic:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    user_lichess = (payload.usuario_lichess if payload and payload.usuario_lichess else partic.usuario_lichess)
    if not user_lichess:
        raise HTTPException(status_code=400, detail="El participante no tiene usuario de Lichess registrado")

    user_info = await consultar_usuario_lichess(user_lichess)

    # Preferir Rapid, luego Blitz, luego Clásico
    rating_sugerido = user_info.get("rating_rapid") or user_info.get("rating_blitz") or user_info.get("rating_classical") or 0

    await session.execute(text("""
        UPDATE torneos_generales.participantes
        SET usuario_lichess = :u_lic,
            rating_fide = CASE WHEN COALESCE(rating_fide, 0) = 0 THEN :rat ELSE rating_fide END,
            rating_nacional = CASE WHEN COALESCE(rating_nacional, 0) = 0 THEN :rat ELSE rating_nacional END,
            actualizado_en = NOW()
        WHERE id = :pid
    """), {
        "pid": participante_id,
        "u_lic": user_info["username"],
        "rat": rating_sugerido,
    })
    await session.commit()

    return {
        "mensaje": f"Perfil de Lichess sincronizado para @{user_info['username']}",
        "usuario_lichess": user_info["username"],
        "title": user_info["title"],
        "rating_rapid": user_info["rating_rapid"],
        "rating_blitz": user_info["rating_blitz"],
        "rating_classical": user_info["rating_classical"],
        "rating_sugerido": rating_sugerido,
    }
