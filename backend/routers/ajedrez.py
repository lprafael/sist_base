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
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from pathlib import Path
import os
import math
import uuid
import json
import re
import urllib.request
import urllib.error
import zipfile
import xml.etree.ElementTree as ET
import csv
import io
import httpx

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
    url_partida: Optional[str] = None
    modalidad_partida: Optional[str] = None
    notas: Optional[str] = None
    analisis_partida: Optional[Dict[str, Any]] = None

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
    """ALTER TABLE torneos_generales.ajedrez_partidas ADD COLUMN IF NOT EXISTS analisis_partida JSONB""",
    """ALTER TABLE torneos_generales.ajedrez_partidas ADD COLUMN IF NOT EXISTS url_partida TEXT""",
    """ALTER TABLE torneos_generales.ajedrez_partidas ADD COLUMN IF NOT EXISTS modalidad_partida VARCHAR(20) DEFAULT 'presencial'""",
    """ALTER TABLE torneos_generales.ajedrez_partidas ADD COLUMN IF NOT EXISTS notas TEXT""",
    """ALTER TABLE torneos_generales.ajedrez_partidas ADD COLUMN IF NOT EXISTS ganador_id UUID""",
    """ALTER TABLE torneos_generales.ajedrez_partidas ADD COLUMN IF NOT EXISTS puntos_blancas NUMERIC(3,1)""",
    """ALTER TABLE torneos_generales.ajedrez_partidas ADD COLUMN IF NOT EXISTS puntos_negras NUMERIC(3,1)""",
    """ALTER TABLE torneos_generales.ajedrez_rondas ADD COLUMN IF NOT EXISTS modo_emparejamiento VARCHAR(20) DEFAULT 'automatico'""",
    """ALTER TABLE torneos_generales.ajedrez_rondas ADD COLUMN IF NOT EXISTS notas TEXT""",
    """ALTER TABLE torneos_generales.ajedrez_rondas ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMPTZ""",
    """ALTER TABLE torneos_generales.ajedrez_posiciones ADD COLUMN IF NOT EXISTS posicion_final SMALLINT""",
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
        categoria_base              VARCHAR(30),
        institucion_id              UUID,
        puntos_totales              NUMERIC(6,1) NOT NULL DEFAULT 0.0,
        etapas_jugadas              SMALLINT NOT NULL DEFAULT 0,
        mejor_posicion              SMALLINT,
        actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """ALTER TABLE torneos_generales.ajedrez_circuito_ranking ADD COLUMN IF NOT EXISTS categoria_base VARCHAR(30)""",
    """ALTER TABLE torneos_generales.ajedrez_circuito_ranking ADD COLUMN IF NOT EXISTS institucion_id UUID""",
    """ALTER TABLE torneos_generales.ajedrez_circuito_ranking ADD COLUMN IF NOT EXISTS mejor_posicion SMALLINT""",
    """ALTER TABLE torneos_generales.ajedrez_circuito_ranking ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT NOW()""",
    """CREATE UNIQUE INDEX IF NOT EXISTS idx_aj_pos_torneo_ronda_part ON torneos_generales.ajedrez_posiciones(torneo_id, ronda_numero, participante_id)""",
    """CREATE UNIQUE INDEX IF NOT EXISTS idx_aj_rondas_torneo_num ON torneos_generales.ajedrez_rondas(torneo_id, numero_ronda)""",
    """CREATE UNIQUE INDEX IF NOT EXISTS idx_aj_circuito_ranking_unq ON torneos_generales.ajedrez_circuito_ranking(circuito_id, participante_id)""",
    """CREATE TABLE IF NOT EXISTS torneos_generales.ajedrez_lichess_sync (
        torneo_id               UUID PRIMARY KEY,
        lichess_id              VARCHAR(50) NOT NULL,
        tipo                    VARCHAR(20) DEFAULT 'swiss',
        auto_sync               BOOLEAN DEFAULT TRUE,
        ultima_sincronizacion   TIMESTAMPTZ,
        creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    """ALTER TABLE torneos_generales.ajedrez_lichess_sync ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'swiss'""",
    """ALTER TABLE torneos_generales.ajedrez_lichess_sync ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT TRUE""",
    """ALTER TABLE torneos_generales.ajedrez_lichess_sync ADD COLUMN IF NOT EXISTS ultima_sincronizacion TIMESTAMPTZ"""
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

class CrearDesafioLichessPayload(BaseModel):
    tiempo_minutos: Optional[int] = 5
    incremento_segundos: Optional[int] = 3
    nombre_desafio: Optional[str] = None

class ImportarTorneoLichessPayload(BaseModel):
    lichess_url: str

class SyncTorneoLichessPayload(BaseModel):
    lichess_id: str
    crear_usuarios_faltantes: bool = True
    auto_sync: bool = False

class CrearTorneoLichessPayload(BaseModel):
    tipo: str = "swiss"  # "swiss" | "arena"
    nombre: Optional[str] = None
    minutos: int = 5
    incremento: int = 3
    rondas: int = 5  # para suizo
    duracion_minutos: int = 60  # para arena
    rated: bool = True
    team_id: Optional[str] = None  # Requerido para torneo Suizo en Lichess
    lichess_token: Optional[str] = None  # Token con permiso tournament:write
    minutos_para_inicio: int = 10
    descripcion: Optional[str] = None
    auto_sync: bool = True

class LichessOAuthExchangePayload(BaseModel):
    code: str
    code_verifier: str
    redirect_uri: str
    client_id: Optional[str] = "micancha"

class LiveMovePayload(BaseModel):
    fen: str
    last_move: Optional[Dict[str, Any]] = None
    turn: str = "w"
    white_time: Optional[int] = 300
    black_time: Optional[int] = 300
    history: Optional[List[Dict[str, Any]]] = None
    pgn: Optional[str] = None
    game_over: Optional[Dict[str, Any]] = None
    total_jugadas: Optional[int] = 0
    antitrampa: Optional[Dict[str, Any]] = None


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


@router.delete("/circuitos/{circuito_id}")
async def eliminar_circuito(
    circuito_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un circuito y sus etapas vinculadas y ranking acumulado.
    """
    await _ensure_chess_tables(session)

    # 1. Eliminar rankings del circuito
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_circuito_ranking
        WHERE circuito_id = :cid
    """), {"cid": circuito_id})

    # 2. Eliminar etapas del circuito
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_circuito_etapas
        WHERE circuito_id = :cid
    """), {"cid": circuito_id})

    # 3. Eliminar el circuito
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_circuitos
        WHERE id = :cid
    """), {"cid": circuito_id})
    await session.commit()

    return {"mensaje": "Circuito eliminado correctamente"}


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
    tabla_val = payload.puntos_tabla if payload.puntos_tabla is not None else {"1":12,"2":11,"3":10,"4":9,"5":8,"6":7,"7":6,"8":5,"9":4,"10":3}
    
    try:
        res = await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_circuito_etapas
                (circuito_id, torneo_id, numero_etapa, puntos_tabla)
            VALUES (:cid, :tid, :num, CAST(:tabla AS JSONB))
            RETURNING id
        """), {
            "cid": circuito_id,
            "tid": payload.torneo_id,
            "num": payload.numero_etapa,
            "tabla": json.dumps(tabla_val),
        })
        new_id = res.scalar()
        await session.commit()
        return {"id": str(new_id), "mensaje": "Etapa agregada al circuito"}
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una etapa con el número {payload.numero_etapa} en este circuito."
        )


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
    finales o actuales de cada etapa y la tabla de puntos configurada.
    """
    await _ensure_chess_tables(session)

    # Traer etapas del circuito con su tabla de puntos
    etapas_q = await session.execute(text("""
        SELECT e.torneo_id, e.puntos_tabla
        FROM torneos_generales.ajedrez_circuito_etapas e
        WHERE e.circuito_id = :cid
        ORDER BY e.numero_etapa
    """), {"cid": circuito_id})
    etapas = etapas_q.fetchall()

    if not etapas:
        return {"mensaje": "El circuito aún no tiene etapas vinculadas. Vincula un torneo para calcular el ranking.", "participantes_actualizados": 0}

    # Acumular puntos por participante
    acumulado: Dict[str, Dict] = {}

    for etapa in etapas:
        torneo_id = str(etapa.torneo_id)
        puntos_tabla: Dict = etapa.puntos_tabla if isinstance(etapa.puntos_tabla, dict) else json.loads(etapa.puntos_tabla)

        # Traer posiciones de esta etapa (ronda_numero = 0 o la última ronda con posiciones calculadas)
        pos_q = await session.execute(text("""
            SELECT ap.participante_id,
                   COALESCE(ap.posicion_final, ap.posicion) AS posicion_final,
                   p.categoria_base, p.institucion_id
            FROM torneos_generales.ajedrez_posiciones ap
            JOIN torneos_generales.participantes p ON p.id = ap.participante_id
            WHERE ap.torneo_id = :tid
              AND ap.ronda_numero = (
                  SELECT COALESCE(
                      (SELECT 0 WHERE EXISTS (SELECT 1 FROM torneos_generales.ajedrez_posiciones WHERE torneo_id = :tid AND ronda_numero = 0)),
                      MAX(ronda_numero)
                  )
                  FROM torneos_generales.ajedrez_posiciones
                  WHERE torneo_id = :tid
              )
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
    await _ensure_chess_tables(session)
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
@router.post("/partidas/{partida_id}/resultado")
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
    await _ensure_chess_tables(session)
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

    analisis_json = json.dumps(payload.analisis_partida) if payload.analisis_partida else None

    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_partidas
        SET resultado = :res, ganador_id = :gid,
            puntos_blancas = :pb, puntos_negras = :pn,
            url_partida = COALESCE(:url, url_partida),
            modalidad_partida = COALESCE(:mod, modalidad_partida),
            analisis_partida = COALESCE(CAST(:analisis AS JSONB), analisis_partida),
            notas = COALESCE(:notas, notas),
            estado = 'finalizada', actualizado_en = NOW()
        WHERE id = :pid
    """), {
        "pid": partida_id, "res": res, "gid": ganador_id,
        "pb": pts_b, "pn": pts_n,
        "url": payload.url_partida,
        "mod": payload.modalidad_partida,
        "analisis": analisis_json,
        "notas": payload.notas,
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


@router.post("/lichess/oauth/exchange")
async def lichess_oauth_exchange(payload: LichessOAuthExchangePayload):
    """
    Intercambia un código de autorización PKCE de Lichess por un token de acceso
    y devuelve los datos del perfil del usuario (username, ratings, etc.).
    """
    token_url = "https://lichess.org/api/token"
    data = {
        "grant_type": "authorization_code",
        "code": payload.code,
        "code_verifier": payload.code_verifier,
        "redirect_uri": payload.redirect_uri,
        "client_id": payload.client_id or "micancha"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            token_resp = await client.post(token_url, data=data, headers={"Accept": "application/json"})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error conectando con Lichess token endpoint: {e}")

        if token_resp.status_code != 200:
            err_msg = token_resp.text
            try:
                err_json = token_resp.json()
                err_msg = err_json.get("error_description") or err_json.get("error") or err_msg
            except Exception:
                pass
            raise HTTPException(status_code=400, detail=f"Error al autenticar con Lichess: {err_msg}")

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Lichess no retornó access_token válido.")

        # Obtener información del usuario autenticado
        user_resp = await client.get(
            "https://lichess.org/api/account",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="No se pudo obtener el perfil de usuario desde Lichess.")

        user_data = user_resp.json()
        perfs = user_data.get("perfs", {})

        return {
            "access_token": access_token,
            "id": user_data.get("id"),
            "username": user_data.get("username"),
            "title": user_data.get("title"),
            "profile": user_data.get("profile", {}),
            "perfs": perfs,
            "rating_blitz": perfs.get("blitz", {}).get("rating"),
            "rating_rapid": perfs.get("rapid", {}).get("rating"),
            "rating_classical": perfs.get("classical", {}).get("rating"),
            "online": user_data.get("online", False),
            "profile_url": f"https://lichess.org/@/{user_data.get('username')}"
        }


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


@router.post("/partidas/{partida_id}/crear-desafio-lichess")
async def crear_desafio_lichess(
    partida_id: str,
    payload: Optional[CrearDesafioLichessPayload] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un desafío abierto en Lichess vía API pública y vincula la URL a la partida.
    Retorna los enlaces para el jugador de Blancas, Negras y el visor embebido.
    """
    partida_q = await session.execute(text("""
        SELECT p.*, 
               pb.nombre as b_nom, pb.apellido as b_ape,
               pn.nombre as n_nom, pn.apellido as n_ape,
               r.numero_ronda
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON p.ronda_id = r.id
        LEFT JOIN torneos_generales.participantes pb ON p.blancas_id = pb.id
        LEFT JOIN torneos_generales.participantes pn ON p.negras_id = pn.id
        WHERE p.id = :pid
    """), {"pid": partida_id})
    partida = partida_q.fetchone()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    tiempo_min = payload.tiempo_minutos if payload and payload.tiempo_minutos is not None else 5
    incremento_seg = payload.incremento_segundos if payload and payload.incremento_segundos is not None else 3

    limit_seg = max(60, min(10800, tiempo_min * 60))
    inc_seg = max(0, min(180, incremento_seg))

    nom_b = f"{partida.b_nom or ''} {partida.b_ape or ''}".strip() or "Blancas"
    nom_n = f"{partida.n_nom or ''} {partida.n_ape or ''}".strip() or "Negras"
    tablero = getattr(partida, 'tablero_numero', 1) or 1
    ronda = getattr(partida, 'numero_ronda', 1) or 1

    nombre_desafio = (
        payload.nombre_desafio
        if payload and payload.nombre_desafio
        else f"MiCancha R{ronda} T{tablero}: {nom_b} vs {nom_n}"
    )

    url_api = "https://lichess.org/api/challenge/open"
    form_data = urllib.parse.urlencode({
        "rated": "false",
        "clock.limit": str(limit_seg),
        "clock.increment": str(inc_seg),
        "name": nombre_desafio,
        "rules": "chess"
    }).encode("utf-8")

    req = urllib.request.Request(url_api, data=form_data, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MiCanchaChess/1.0",
        "Accept": "application/json"
    })

    try:
        with urllib.request.urlopen(req, timeout=12.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            challenge = data.get("challenge", data)
            game_id = challenge.get("id")
            game_url = challenge.get("url") or f"https://lichess.org/{game_id}"
            url_white = challenge.get("urlWhite") or challenge.get("url")
            url_black = challenge.get("urlBlack") or challenge.get("url")
            embed_url = f"https://lichess.org/embed/game/{game_id}?theme=auto&bg=auto"

            # Actualizar la partida en base de datos
            await session.execute(text("""
                UPDATE torneos_generales.ajedrez_partidas
                SET url_partida = :url, estado = 'en_curso', actualizado_en = NOW()
                WHERE id = :pid
            """), {
                "pid": partida_id,
                "url": game_url
            })
            await session.commit()

            return {
                "mensaje": "Desafío creado exitosamente en Lichess",
                "game_id": game_id,
                "url_partida": game_url,
                "url_blancas": url_white,
                "url_negras": url_black,
                "embed_url": embed_url,
                "tiempo_minutos": tiempo_min,
                "incremento_segundos": inc_seg,
                "nombre_desafio": nombre_desafio,
                "blancas": nom_b,
                "negras": nom_n,
                "tablero_numero": tablero,
                "numero_ronda": ronda,
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        raise HTTPException(status_code=502, detail=f"Error de Lichess al crear desafío ({e.code}): {err_body}")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con Lichess: {str(e)}")


def _evaluar_ritmo_tiempos(tiempos: List[float]) -> Dict[str, Any]:
    """
    Evalúa si la varianza de tiempos de decisión por jugada es sospechosamente baja (ritmo plano).
    """
    if not tiempos or len(tiempos) < 6:
        return {"sospechoso": False, "desviacion": 0.0, "promedio": 0.0, "total_jugadas": len(tiempos or []), "motivo": None}

    n = len(tiempos)
    prom = sum(tiempos) / n
    varianza = sum((t - prom) ** 2 for t in tiempos) / n
    std_dev = math.sqrt(varianza)

    # Sospechoso si tiene 10+ jugadas con desviación estándar menor a 1.2s y promedio >= 2.0s
    es_sospechoso = bool(n >= 10 and std_dev < 1.2 and prom >= 2.0)
    motivo = None
    if es_sospechoso:
        motivo = f"Ritmo de tiempos excesivamente plano (desv. estándar: {std_dev:.2f}s en {n} jugadas)"
    
    return {
        "sospechoso": es_sospechoso,
        "desviacion": round(std_dev, 2),
        "promedio": round(prom, 2),
        "total_jugadas": n,
        "motivo": motivo
    }

# ==============================================================================
# ENDPOINTS — VINCULACIÓN Y CREACIÓN DE TORNEOS LICHESS (SUIZO / ARENA)
# ==============================================================================

def _extraer_lichess_tournament_id(url: str) -> str:
    match = re.search(r'lichess\.org/(?:swiss|tournament)/([a-zA-Z0-9]+)', url)
    return match.group(1) if match else url.strip()

@router.get("/torneos/{torneo_id}/lichess/status")
async def lichess_get_torneo_status(
    torneo_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Retorna el estado y configuración de vinculación Lichess del torneo."""
    await _ensure_chess_tables(session)
    q = await session.execute(text("""
        SELECT lichess_id, tipo, auto_sync, ultima_sincronizacion
        FROM torneos_generales.ajedrez_lichess_sync
        WHERE torneo_id = CAST(:tid AS UUID)
        LIMIT 1
    """), {"tid": torneo_id})
    row = q.fetchone()
    if not row:
        return {"vinculado": False, "lichess_id": None, "lichess_url": None, "auto_sync": False}
    
    lid = row.lichess_id
    tipo = row.tipo or "swiss"
    lurl = f"https://lichess.org/{'swiss' if tipo == 'swiss' else 'tournament'}/{lid}"
    return {
        "vinculado": True,
        "lichess_id": lid,
        "lichess_url": lurl,
        "tipo": tipo,
        "auto_sync": bool(row.auto_sync),
        "ultima_sincronizacion": str(row.ultima_sincronizacion) if row.ultima_sincronizacion else None
    }

@router.post("/torneos/{torneo_id}/lichess/crear-torneo-automatico")
async def lichess_crear_torneo_automatico(
    torneo_id: str,
    payload: CrearTorneoLichessPayload,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea automáticamente un torneo en Lichess (formato Suizo o Arena) usando la API oficial de Lichess,
    guarda el ID en la base de datos y activa la sincronización automática.
    """
    token = (payload.lichess_token or "").strip() or os.getenv("LICHESS_API_TOKEN", "").strip()
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Se requiere un Token de API de Lichess con permiso 'tournament:write'. Podés crearlo en lichess.org/account/oauth/token."
        )

    # Buscar nombre del torneo local si no se pasó nombre personalizado
    t_q = await session.execute(text("""
        SELECT nombre FROM torneos.torneos WHERE id = CAST(:tid AS UUID)
        UNION
        SELECT nombre FROM torneos_generales.torneos WHERE id = CAST(:tid AS UUID)
        LIMIT 1
    """), {"tid": torneo_id})
    t_row = t_q.fetchone()
    torneo_nombre = payload.nombre or (t_row.nombre if t_row else "Torneo MiCancha")

    # Calcular tiempo de inicio (ms desde epoch)
    ahora_utc = datetime.now(timezone.utc)
    delta_min = max(payload.minutos_para_inicio or 5, 2)
    start_dt = ahora_utc + timedelta(minutes=delta_min)
    starts_at_ms = int(start_dt.timestamp() * 1000)

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    desc = payload.descripcion or f"Torneo oficial '{torneo_nombre}' organizado en MiCancha (micancha.com.py)."

    async with httpx.AsyncClient(timeout=15.0) as client:
        if payload.tipo == "swiss":
            team_id = (payload.team_id or "").strip() or os.getenv("LICHESS_TEAM_ID", "").strip()
            if not team_id:
                raise HTTPException(
                    status_code=400,
                    detail="Lichess requiere un 'ID de Club / Equipo (Team)' para crear torneos Suizos. Ingresá el ID de tu equipo en Lichess o seleccioná formato Arena."
                )

            url = f"https://lichess.org/api/swiss/new/{team_id}"
            form_data = {
                "name": torneo_nombre,
                "clock.limit": payload.minutos * 60,
                "clock.increment": payload.incremento,
                "nbRounds": max(1, min(payload.rondas or 5, 100)),
                "startsAt": starts_at_ms,
                "roundInterval": 60,
                "variant": "standard",
                "rated": "true" if payload.rated else "false",
                "description": desc
            }

            try:
                resp = await client.post(url, data=form_data, headers=headers)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error de comunicación con Lichess: {e}")

            if resp.status_code not in (200, 201):
                err_text = resp.text
                try:
                    err_json = resp.json()
                    err_text = err_json.get("error") or err_json.get("message") or resp.text
                except Exception:
                    pass
                raise HTTPException(status_code=400, detail=f"Error de Lichess API ({resp.status_code}): {err_text}")

            res_json = resp.json()
            lichess_id = res_json.get("id")
            lichess_url = f"https://lichess.org/swiss/{lichess_id}"
            lichess_tipo = "swiss"

        else: # Arena
            url = "https://lichess.org/api/tournament"
            form_data = {
                "name": torneo_nombre,
                "clockTime": payload.minutos,
                "clockIncrement": payload.incremento,
                "minutes": payload.duracion_minutos or 60,
                "startDate": starts_at_ms,
                "variant": "standard",
                "rated": "true" if payload.rated else "false",
                "description": desc
            }
            if payload.team_id:
                form_data["conditions.teamMember.teamId"] = payload.team_id.strip()

            try:
                resp = await client.post(url, data=form_data, headers=headers)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error de comunicación con Lichess: {e}")

            if resp.status_code not in (200, 201):
                err_text = resp.text
                try:
                    err_json = resp.json()
                    err_text = err_json.get("error") or err_json.get("message") or resp.text
                except Exception:
                    pass
                raise HTTPException(status_code=400, detail=f"Error de Lichess API ({resp.status_code}): {err_text}")

            res_json = resp.json()
            lichess_id = res_json.get("id")
            lichess_url = f"https://lichess.org/tournament/{lichess_id}"
            lichess_tipo = "arena"

    # Asegurar que la tabla de sincronización exista
    await _ensure_chess_tables(session)

    # Registrar en base de datos
    await session.execute(text("""
        INSERT INTO torneos_generales.ajedrez_lichess_sync (torneo_id, lichess_id, tipo, auto_sync, ultima_sincronizacion)
        VALUES (CAST(:tid AS UUID), :lid, :tipo, :auto_sync, NOW())
        ON CONFLICT (torneo_id) DO UPDATE SET
            lichess_id = EXCLUDED.lichess_id,
            tipo = EXCLUDED.tipo,
            auto_sync = EXCLUDED.auto_sync,
            ultima_sincronizacion = NOW()
    """), {
        "tid": torneo_id,
        "lid": lichess_id,
        "tipo": lichess_tipo,
        "auto_sync": payload.auto_sync
    })

    # Actualizar configuración del torneo en torneos.torneos si existe
    try:
        await session.execute(text("""
            UPDATE torneos.torneos
            SET configuracion = COALESCE(configuracion, '{}'::jsonb) || jsonb_build_object('lichess_id', :lid, 'lichess_url', :lurl)
            WHERE id = CAST(:tid AS UUID)
        """), {"tid": torneo_id, "lid": lichess_id, "lurl": lichess_url})
    except Exception:
        pass

    await session.commit()

    return {
        "success": True,
        "lichess_id": lichess_id,
        "lichess_url": lichess_url,
        "tipo": lichess_tipo,
        "nombre": torneo_nombre,
        "auto_sync": payload.auto_sync,
        "mensaje": f"✅ Torneo {lichess_tipo.upper()} creado exitosamente en Lichess: {lichess_url}"
    }

@router.post("/torneos/{torneo_id}/lichess/preview-torneo")
async def lichess_preview_torneo(
    torneo_id: str,
    payload: ImportarTorneoLichessPayload,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene los metadatos de un torneo suizo en Lichess y compara sus jugadores
    con los registrados en el torneo local.
    """
    t_id = _extraer_lichess_tournament_id(payload.lichess_url)
    
    url_info = f"https://lichess.org/api/swiss/{t_id}"
    req_info = urllib.request.Request(url_info, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req_info, timeout=10.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo cargar el torneo Suizo de Lichess. Verifica la URL. Error: {e}")

    url_res = f"https://lichess.org/api/swiss/{t_id}/results"
    req_res = urllib.request.Request(url_res, headers={"Accept": "application/x-ndjson"})
    lichess_players = []
    try:
        with urllib.request.urlopen(req_res, timeout=10.0) as resp:
            for line in resp:
                if line.strip():
                    p_data = json.loads(line.decode("utf-8"))
                    lichess_players.append(p_data.get("username", ""))
    except Exception:
        pass 

    part_q = await session.execute(text("""
        SELECT id, usuario_lichess, nombre, apellido
        FROM torneos_generales.participantes
        WHERE torneo_id = :tid
    """), {"tid": torneo_id})
    loc_parts = part_q.fetchall()
    
    loc_lichess_users = {p.usuario_lichess.lower(): p for p in loc_parts if p.usuario_lichess}
    
    match_count = 0
    missing_players = []
    
    for lp in lichess_players:
        if not lp: continue
        if lp.lower() in loc_lichess_users:
            match_count += 1
        else:
            missing_players.append(lp)
            
    return {
        "lichess_id": data.get("id"),
        "nombre": data.get("name"),
        "rondas_totales": data.get("nbRounds", 0),
        "jugadores_totales_lichess": data.get("nbPlayers", 0),
        "jugadores_empatados": match_count,
        "jugadores_faltantes": missing_players,
        "status": data.get("status")
    }


@router.post("/torneos/{torneo_id}/lichess/sync-torneo")
async def lichess_sync_torneo(
    torneo_id: str,
    payload: SyncTorneoLichessPayload,
    session: AsyncSession = Depends(get_session)
):
    """
    Sincroniza un torneo suizo completo desde Lichess.
    1. Crea usuarios faltantes si se solicita.
    2. Borra rondas y partidas existentes.
    3. Descarga partidas e inserta rondas.
    """
    # Asegurar que el torneo exista en torneos_generales.torneos
    await session.execute(text("""
        INSERT INTO torneos_generales.torneos (id, nombre, estado)
        SELECT id, nombre, estado FROM torneos.torneos WHERE id = :tid
        ON CONFLICT (id) DO NOTHING
    """), {"tid": torneo_id})
    await session.commit()
    url_info = f"https://lichess.org/api/swiss/{payload.lichess_id}"
    req_info = urllib.request.Request(url_info, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req_info, timeout=10.0) as resp:
            t_data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Error leyendo metadata del torneo")

    if payload.crear_usuarios_faltantes:
        url_res = f"https://lichess.org/api/swiss/{payload.lichess_id}/results"
        req_res = urllib.request.Request(url_res, headers={"Accept": "application/x-ndjson"})
        try:
            with urllib.request.urlopen(req_res, timeout=10.0) as resp:
                for line in resp:
                    if not line.strip(): continue
                    p_data = json.loads(line.decode("utf-8"))
                    username = p_data.get("username")
                    if not username: continue
                    
                    exists_q = await session.execute(text("""
                        SELECT id FROM torneos_generales.participantes
                        WHERE torneo_id = :tid AND LOWER(usuario_lichess) = :usr
                    """), {"tid": torneo_id, "usr": username.lower()})
                    
                    if not exists_q.fetchone():
                        await session.execute(text("""
                            INSERT INTO torneos_generales.participantes 
                            (torneo_id, nombre, apellido, usuario_lichess, categoria_base, estado, rating_fide, documento, fecha_nacimiento, genero, modalidad, nivel_experiencia)
                            VALUES (:tid, :nom, '', :usr, 'Abierta', 'confirmado', :rat, :doc, '1900-01-01', 'N/A', 'Ajedrez', 'Aficionado')
                        """), {
                            "tid": torneo_id, 
                            "nom": username, 
                            "usr": username,
                            "rat": p_data.get("rating", 0),
                            "doc": f"LICHESS-{username}"
                        })
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"Error creando usuarios faltantes: {e}")

    part_q = await session.execute(text("""
        SELECT id, usuario_lichess FROM torneos_generales.participantes WHERE torneo_id = :tid
    """), {"tid": torneo_id})
    user_map = {p.usuario_lichess.lower(): str(p.id) for p in part_q.fetchall() if p.usuario_lichess}

    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_partidas 
        WHERE ronda_id IN (SELECT id FROM torneos_generales.ajedrez_rondas WHERE torneo_id = :tid)
    """), {"tid": torneo_id})
    await session.execute(text("""
        DELETE FROM torneos_generales.ajedrez_rondas WHERE torneo_id = :tid
    """), {"tid": torneo_id})
    await session.commit()

    url_games = f"https://lichess.org/api/swiss/{payload.lichess_id}/games"
    req_games = urllib.request.Request(url_games, headers={"Accept": "application/x-ndjson"})
    games = []
    try:
        with urllib.request.urlopen(req_games, timeout=30.0) as resp:
            for line in resp:
                if line.strip():
                    games.append(json.loads(line.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudieron descargar las partidas: {e}")

    rondas_totales = t_data.get("nbRounds", 1)
    rondas_ids = []
    for r in range(1, rondas_totales + 1):
        ronda_id_q = await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_rondas (torneo_id, numero_ronda, estado)
            VALUES (:tid, :num, 'finalizada') RETURNING id
        """), {"tid": torneo_id, "num": r})
        rondas_ids.append(ronda_id_q.scalar())

    partidas_creadas = 0
    games.reverse() # Lichess envia primero las mas nuevas, hacemos reverse para orden cronologico
    
    # Asignar partidas a las rondas de forma uniforme o si no inferimos
    # En NDJSON de swiss a veces no hay round id facil sin PGN, usamos division equitativa de partidas por tablero
    # pero como Lichess devuelve todo en NDJSON lo mas simple para un import basico es asignar todo a la ronda 1
    # o mejor, si hay PGN data, parsear, pero los games en json no tienen siempre. 
    # Para simplicidad asignaremos todas las rondas a la 1 hasta refinar.
    ronda_id_default = rondas_ids[0]

    for idx, g in enumerate(games):
        w_user = g.get("players", {}).get("white", {}).get("user", {}).get("id", "")
        b_user = g.get("players", {}).get("black", {}).get("user", {}).get("id", "")
        
        w_id = user_map.get(w_user.lower())
        b_id = user_map.get(b_user.lower())
        
        if not w_id or not b_id:
            continue
            
        status = g.get("status")
        winner = g.get("winner")
        
        res_str = "*"
        pts_w = 0.0
        pts_b = 0.0
        if status in ["mate", "resign", "outoftime", "forfeit", "timeout"]:
            if winner == "white":
                res_str = "1-0"
                pts_w = 1.0
            else:
                res_str = "0-1"
                pts_b = 1.0
        elif status in ["draw", "stalemate"]:
            res_str = "1/2-1/2"
            pts_w = 0.5
            pts_b = 0.5
            
        await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_partidas
            (ronda_id, tablero_numero, blancas_id, negras_id, resultado, puntos_blancas, puntos_negras, estado, url_partida)
            VALUES (:rid, :tab, :wid, :bid, :res, :pw, :pb, 'finalizada', :url)
        """), {
            "rid": ronda_id_default, "tab": idx + 1, "wid": w_id, "bid": b_id,
            "res": res_str, "pw": pts_w, "pb": pts_b,
            "url": f"https://lichess.org/{g.get('id')}"
        })
        partidas_creadas += 1

    await session.commit()
    
    # Recalcular ranking 
    await _calcular_posiciones(torneo_id, 1, session)

    if payload.auto_sync:
        await session.execute(text("""
            INSERT INTO torneos_generales.ajedrez_lichess_sync (torneo_id, lichess_id, auto_sync, ultima_sincronizacion)
            VALUES (:tid, :lid, TRUE, NOW())
            ON CONFLICT (torneo_id) DO UPDATE SET 
                lichess_id = EXCLUDED.lichess_id,
                auto_sync = EXCLUDED.auto_sync,
                ultima_sincronizacion = NOW()
        """), {"tid": torneo_id, "lid": payload.lichess_id})
        await session.commit()

    return {
        "mensaje": "Sincronización completada",
        "partidas_creadas": partidas_creadas
    }


@router.post("/partidas/{partida_id}/live-move")
async def registrar_movimiento_en_vivo(
    partida_id: str,
    payload: LiveMovePayload,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Registra el estado actual de una partida nativa en tiempo real (FEN, tiempos, último movimiento, jugadas y telemetría antitrampa).
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

    analisis = partida.analisis_partida or {}
    if isinstance(analisis, str):
        try:
            analisis = json.loads(analisis)
        except Exception:
            analisis = {}

    # Telemetría Antitrampa / Fair Play
    antitrampa = payload.antitrampa or analisis.get("antitrampa") or {}
    move_times_w = antitrampa.get("move_times_w") or []
    move_times_b = antitrampa.get("move_times_b") or []
    blur_w = antitrampa.get("blur_count_w", 0)
    blur_b = antitrampa.get("blur_count_b", 0)

    eval_w = _evaluar_ritmo_tiempos(move_times_w)
    eval_b = _evaluar_ritmo_tiempos(move_times_b)

    alertas = []
    if blur_w >= 3:
        alertas.append(f"Blancas salieron {blur_w} veces de la pestaña del juego.")
    if blur_b >= 3:
        alertas.append(f"Negras salieron {blur_b} veces de la pestaña del juego.")
    if eval_w.get("sospechoso"):
        alertas.append(f"Blancas: {eval_w.get('motivo')}")
    if eval_b.get("sospechoso"):
        alertas.append(f"Negras: {eval_b.get('motivo')}")

    antitrampa["blancas_ritmo"] = eval_w
    antitrampa["negras_ritmo"] = eval_b
    antitrampa["blur_count_w"] = blur_w
    antitrampa["blur_count_b"] = blur_b
    antitrampa["alerta_sospecha"] = len(alertas) > 0
    antitrampa["resumen_alerta"] = " | ".join(alertas) if alertas else "Parámetros normales de juego"

    analisis["live"] = {
        "fen": payload.fen,
        "last_move": payload.last_move,
        "turn": payload.turn,
        "white_time": payload.white_time,
        "black_time": payload.black_time,
        "history": payload.history or [],
        "pgn": payload.pgn,
        "game_over": payload.game_over,
        "total_jugadas": payload.total_jugadas or len(payload.history or []),
        "updated_at": datetime.utcnow().isoformat(),
    }
    analisis["antitrampa"] = antitrampa
    analisis["origen"] = "tablero_nativo"
    if payload.pgn:
        analisis["pgn"] = payload.pgn
    if payload.total_jugadas:
        analisis["total_jugadas"] = payload.total_jugadas

    nuevo_estado = partida.estado
    nuevo_resultado = partida.resultado
    if payload.game_over and isinstance(payload.game_over, dict) and payload.game_over.get("result"):
        nuevo_resultado = payload.game_over.get("result")
        nuevo_estado = 'finalizada'
    elif partida.estado == 'pendiente' and (payload.total_jugadas or 0) > 0:
        nuevo_estado = 'en_curso'

    await session.execute(text("""
        UPDATE torneos_generales.ajedrez_partidas
        SET analisis_partida = CAST(:analisis AS JSONB),
            modalidad_partida = 'tablero_nativo',
            estado = :estado,
            resultado = :resultado,
            actualizado_en = NOW()
        WHERE id = :pid
    """), {
        "pid": partida_id,
        "analisis": json.dumps(analisis),
        "estado": nuevo_estado,
        "resultado": nuevo_resultado,
    })
    await session.commit()

    return {"status": "ok", "live": analisis["live"], "antitrampa": antitrampa}


@router.get("/partidas/{partida_id}/live")
async def obtener_partida_en_vivo(
    partida_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene el estado en vivo de una partida para espectadores (Público).
    """
    partida_q = await session.execute(text("""
        SELECT p.*, r.torneo_id, r.numero_ronda,
               pb.nombre as b_nom, pb.apellido as b_ape, pb.rating_fide as b_fide, pb.rating_nacional as b_nac,
               pn.nombre as n_nom, pn.apellido as n_ape, pn.rating_fide as n_fide, pn.rating_nacional as n_nac
        FROM torneos_generales.ajedrez_partidas p
        JOIN torneos_generales.ajedrez_rondas r ON r.id = p.ronda_id
        LEFT JOIN torneos_generales.participantes pb ON p.blancas_id = pb.id
        LEFT JOIN torneos_generales.participantes pn ON p.negras_id = pn.id
        WHERE p.id = :pid
    """), {"pid": partida_id})
    partida = partida_q.fetchone()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    analisis = partida.analisis_partida or {}
    if isinstance(analisis, str):
        try:
            analisis = json.loads(analisis)
        except Exception:
            analisis = {}

    nom_b = f"{partida.b_nom or ''} {partida.b_ape or ''}".strip() or "Blancas"
    nom_n = f"{partida.n_nom or ''} {partida.n_ape or ''}".strip() or "Negras"

    live = analisis.get("live", None)
    estado = partida.estado
    resultado = partida.resultado

    # Cálculo dinámico de reloj continuo si la partida está en curso
    if live and isinstance(live, dict) and estado == 'en_curso' and not resultado:
        is_over = live.get("game_over") and isinstance(live["game_over"], dict) and live["game_over"].get("over")
        if not is_over:
            updated_at_str = live.get("updated_at")
            if updated_at_str:
                try:
                    updated_at_dt = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                    now_dt = datetime.now(timezone.utc)
                    if updated_at_dt.tzinfo is None:
                        updated_at_dt = updated_at_dt.replace(tzinfo=timezone.utc)
                    elapsed = max(0, int((now_dt - updated_at_dt).total_seconds()))

                    turn = live.get("turn", "w")
                    w_time = live.get("white_time", 300)
                    b_time = live.get("black_time", 300)

                    if turn == "w":
                        current_w_time = max(0, w_time - elapsed)
                        current_b_time = b_time
                        if current_w_time <= 0:
                            resultado = "0-1"
                            estado = "finalizada"
                            live["game_over"] = {
                                "over": True,
                                "result": "0-1",
                                "reason": "Tiempo agotado (Ganan Negras por Bandera ⏱️)"
                            }
                            analisis["live"] = live
                            await session.execute(text("""
                                UPDATE torneos_generales.ajedrez_partidas
                                SET estado = 'finalizada',
                                    resultado = '0-1',
                                    analisis_partida = CAST(:analisis AS JSONB),
                                    actualizado_en = NOW()
                                WHERE id = :pid
                            """), {
                                "pid": str(partida.id),
                                "analisis": json.dumps(analisis)
                            })
                            await session.commit()
                        live["white_time"] = current_w_time
                        live["black_time"] = current_b_time
                    else:
                        current_w_time = w_time
                        current_b_time = max(0, b_time - elapsed)
                        if current_b_time <= 0:
                            resultado = "1-0"
                            estado = "finalizada"
                            live["game_over"] = {
                                "over": True,
                                "result": "1-0",
                                "reason": "Tiempo agotado (Ganan Blancas por Bandera ⏱️)"
                            }
                            analisis["live"] = live
                            await session.execute(text("""
                                UPDATE torneos_generales.ajedrez_partidas
                                SET estado = 'finalizada',
                                    resultado = '1-0',
                                    analisis_partida = CAST(:analisis AS JSONB),
                                    actualizado_en = NOW()
                                WHERE id = :pid
                            """), {
                                "pid": str(partida.id),
                                "analisis": json.dumps(analisis)
                            })
                            await session.commit()
                        live["white_time"] = current_w_time
                        live["black_time"] = current_b_time
                except Exception:
                    pass

    return {
        "partida_id": str(partida.id),
        "torneo_id": str(partida.torneo_id),
        "numero_ronda": partida.numero_ronda,
        "tablero_numero": partida.tablero_numero or 1,
        "estado": estado,
        "resultado": resultado,
        "blancas": {
            "id": str(partida.blancas_id) if partida.blancas_id else None,
            "nombre": nom_b,
            "rating": partida.b_fide or partida.b_nac or 0
        },
        "negras": {
            "id": str(partida.negras_id) if partida.negras_id else None,
            "nombre": nom_n,
            "rating": partida.n_fide or partida.n_nac or 0
        },
        "modalidad_partida": partida.modalidad_partida or "tablero_nativo",
        "url_partida": partida.url_partida,
        "live": live,
        "pgn": analisis.get("pgn", None),
        "antitrampa": analisis.get("antitrampa", None),
        "analisis_partida": analisis,
        "actualizado_en": partida.actualizado_en.isoformat() if partida.actualizado_en else None
    }


@router.get("/torneos/{torneo_id}/rondas/{numero_ronda}/pgn-export")
async def exportar_ronda_pgn(
    torneo_id: str,
    numero_ronda: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Exporta todas las partidas de una ronda en formato PGN estándar multi-partida para screening FIDE / Fair Play.
    """
    ronda_q = await session.execute(text("""
        SELECT r.id, r.numero_ronda, t.nombre as torneo_nombre, t.fecha_inicio
        FROM torneos_generales.ajedrez_rondas r
        JOIN torneos_generales.torneos t ON t.id = r.torneo_id
        WHERE r.torneo_id = :tid AND r.numero_ronda = :nr
    """), {"tid": torneo_id, "nr": numero_ronda})
    ronda = ronda_q.fetchone()
    if not ronda:
        raise HTTPException(status_code=404, detail="Ronda no encontrada")

    partidas_q = await session.execute(text("""
        SELECT p.*,
               pb.nombre as b_nom, pb.apellido as b_ape, pb.rating_fide as b_fide, pb.rating_nacional as b_nac,
               pn.nombre as n_nom, pn.apellido as n_ape, pn.rating_fide as n_fide, pn.rating_nacional as n_nac
        FROM torneos_generales.ajedrez_partidas p
        LEFT JOIN torneos_generales.participantes pb ON p.blancas_id = pb.id
        LEFT JOIN torneos_generales.participantes pn ON p.negras_id = pn.id
        WHERE p.ronda_id = :rid
        ORDER BY p.tablero_numero ASC
    """), {"rid": str(ronda.id)})
    partidas = partidas_q.fetchall()

    pgn_output = []
    fecha_str = (ronda.fecha_inicio.strftime("%Y.%m.%d") if ronda.fecha_inicio else datetime.utcnow().strftime("%Y.%m.%d"))
    torneo_nom = ronda.torneo_nombre or "Torneo de Ajedrez"

    for p in partidas:
        nom_b = f"{p.b_nom or ''} {p.b_ape or ''}".strip() or "Blancas"
        nom_n = f"{p.n_nom or ''} {p.n_ape or ''}".strip() or "Negras"
        elo_b = str(p.b_fide or p.b_nac or "")
        elo_n = str(p.n_fide or p.n_nac or "")
        res = p.resultado or "*"

        analisis = p.analisis_partida or {}
        if isinstance(analisis, str):
            try:
                analisis = json.loads(analisis)
            except Exception:
                analisis = {}

        game_pgn = analisis.get("pgn") or ""
        if "[Event " not in game_pgn:
            headers = [
                f'[Event "{torneo_nom}"]',
                f'[Site "Mi Cancha"]',
                f'[Date "{fecha_str}"]',
                f'[Round "{numero_ronda}"]',
                f'[Board "{p.tablero_numero or 1}"]',
                f'[White "{nom_b}"]',
                f'[Black "{nom_n}"]',
                f'[Result "{res}"]',
                f'[WhiteElo "{elo_b}"]',
                f'[BlackElo "{elo_n}"]',
            ]
            moves_text = game_pgn.strip() or "*"
            game_pgn = "\n".join(headers) + "\n\n" + moves_text + "\n"

        pgn_output.append(game_pgn.strip())

    full_pgn_text = "\n\n\n".join(pgn_output) + "\n"
    filename = f"torneo_ronda_{numero_ronda}.pgn"

    return PlainTextResponse(
        content=full_pgn_text,
        media_type="application/x-chess-pgn",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


