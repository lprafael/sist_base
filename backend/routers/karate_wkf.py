"""
routers/karate_wkf.py
Flujo oficial de torneos de Karate WKF sobre las tablas reales del torneo
(torneos.torneos / categorias / divisiones / equipos / tournament_players / partidos).

Reemplaza a los endpoints de routers/marciales.py (agrupacion-wkf, generar-sorteo-llaves-wkf,
pesaje-oficial), que trabajaban sobre torneos_generales.* y no encontraban los torneos
creados desde el panel del organizador.

Endpoints (prefijo /api/karate/torneos/{torneo_id}):
  GET  /atletas   → atletas con dojo, categoría, división y límite de peso
  POST /agrupar   → asigna a cada atleta su categoría/división (género, edad, peso, modalidad)
  POST /sorteo    → genera la llave de eliminación directa por división con byes,
                    separación de compañeros de dojo y tatami fijo por división
  POST /pesaje    → registra el pesaje oficial (±tolerancia) y aplica walkover si excede

avanzar_llave_karate(session, partido_id) se llama desde PATCH /cancha/torneos/partidos/{id}
al finalizar un combate: registra el ganador y lo coloca en el combate siguiente de la llave.
"""

import json
import math
import random
import re
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from security import get_current_user

router = APIRouter(prefix="/api/karate/torneos", tags=["Karate WKF"])

# ─── Esquema ──────────────────────────────────────────────────────────────────

_schema_ok = False


async def _ensure_schema(session: AsyncSession):
    """Agrega tournament_players.division_id (división asignada al atleta) si no existe."""
    global _schema_ok
    if _schema_ok:
        return
    await session.execute(text("""
        ALTER TABLE torneos.tournament_players
        ADD COLUMN IF NOT EXISTS division_id UUID
        REFERENCES torneos.divisiones(id) ON DELETE SET NULL
    """))
    await session.commit()
    _schema_ok = True


# ─── Interpretación de categorías / divisiones ────────────────────────────────

RE_EDAD_RANGO = re.compile(r"(\d{1,2})\s*(?:-|–|a|y)\s*(\d{1,2})\s*a[ñn]os")
RE_EDAD_HASTA = re.compile(r"hasta\s*(\d{1,2})\s*a[ñn]os")
RE_EDAD_MAS = re.compile(r"\+\s*(\d{1,2})\s*a[ñn]os")
RE_PESO = re.compile(r"([+-])\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilos)")

EDADES_WKF = [  # (palabra clave, edad_min, edad_max)
    ("sub-14", 12, 13), ("sub 14", 12, 13), ("u14", 12, 13),
    ("sub-21", 18, 20), ("sub 21", 18, 20), ("u21", 18, 20), ("under 21", 18, 20),
    ("cadete", 14, 15), ("junior", 16, 17), ("master", 35, 99),
    ("senior", 18, 99), ("sénior", 18, 99),
]


def _norm_genero(g: Optional[str]) -> Optional[str]:
    g = (g or "").strip().lower()
    if g.startswith("f") or g.startswith("dam") or g.startswith("muj"):
        return "F"
    if g.startswith("m") or g.startswith("var") or g.startswith("hom"):
        return "M"
    return None


def _norm_modalidad(m: Optional[str]) -> Optional[str]:
    m = (m or "").strip().lower()
    if m in ("formas", "kata", "forma"):
        return "formas"
    if m in ("combate", "kumite", "combates"):
        return "combate"
    return None


def meta_division(cat: dict, div: dict) -> dict:
    """Restricciones de una división: estructuradas en la categoría o deducidas del nombre."""
    texto = f"{cat.get('nombre') or ''} {div.get('nombre') or ''} {cat.get('descripcion') or ''}".lower()

    modalidad = _norm_modalidad(cat.get("modalidad"))
    if not modalidad:
        if "kata" in texto or "formas" in texto:
            modalidad = "formas"
        elif "kumite" in texto or "combate" in texto:
            modalidad = "combate"

    genero = _norm_genero(cat.get("genero"))
    if not genero:
        if re.search(r"femen|damas|mujer", texto):
            genero = "F"
        elif re.search(r"mascul|varon|varón|hombre", texto):
            genero = "M"

    edad_min, edad_max = cat.get("edad_min"), cat.get("edad_max")
    if edad_min is None and edad_max is None:
        m = RE_EDAD_RANGO.search(texto)
        if m:
            edad_min, edad_max = int(m.group(1)), int(m.group(2))
        elif RE_EDAD_HASTA.search(texto):
            edad_min, edad_max = 0, int(RE_EDAD_HASTA.search(texto).group(1))
        elif RE_EDAD_MAS.search(texto):
            edad_min, edad_max = int(RE_EDAD_MAS.search(texto).group(1)), 99
        else:
            for clave, emin, emax in EDADES_WKF:
                if clave in texto:
                    edad_min, edad_max = emin, emax
                    # WKF 2026: Kata Sénior admite desde 16 años
                    if clave.startswith("s") and "enior" in clave and modalidad == "formas":
                        edad_min = 16
                    break

    peso_min = float(cat["peso_min"]) if cat.get("peso_min") is not None else None
    peso_max = float(cat["peso_max"]) if cat.get("peso_max") is not None else None
    if peso_min is None and peso_max is None:
        # El peso suele estar en el nombre de la división ("-54 kg", "+75 kg")
        m = RE_PESO.search((div.get("nombre") or "").lower()) or RE_PESO.search(texto)
        if m:
            valor = float(m.group(2).replace(",", "."))
            if m.group(1) == "-":
                peso_max = valor
            else:
                peso_min = valor

    return {
        "modalidad": modalidad, "genero": genero,
        "edad_min": edad_min, "edad_max": edad_max,
        "peso_min": peso_min, "peso_max": peso_max,
    }


def _edad(fecha_nac: Optional[date], fecha_ref: Optional[date]) -> Optional[int]:
    if not fecha_nac:
        return None
    ref = fecha_ref or date.today()
    return ref.year - fecha_nac.year - ((ref.month, ref.day) < (fecha_nac.month, fecha_nac.day))


def evaluar_atleta(at: dict, meta: dict, edad: Optional[int], tolerancia: float) -> tuple[bool, str]:
    """(compatible, motivo_si_no). El peso usa la tolerancia reglamentaria."""
    if meta["modalidad"] and at.get("modalidad") and _norm_modalidad(at["modalidad"]) != meta["modalidad"]:
        return False, "modalidad distinta"
    if meta["genero"] and _norm_genero(at.get("genero")) and _norm_genero(at["genero"]) != meta["genero"]:
        return False, "género distinto"
    if meta["edad_min"] is not None or meta["edad_max"] is not None:
        if edad is None:
            return False, "sin fecha de nacimiento"
        if meta["edad_min"] is not None and edad < meta["edad_min"]:
            return False, "edad fuera de rango"
        if meta["edad_max"] is not None and edad > meta["edad_max"]:
            return False, "edad fuera de rango"
    if meta["modalidad"] != "formas" and (meta["peso_min"] is not None or meta["peso_max"] is not None):
        peso = at.get("peso_verificado")
        if peso is None:
            return False, "sin pesaje"
        peso = float(peso)
        if meta["peso_max"] is not None and peso > meta["peso_max"] + tolerancia:
            return False, "peso excedido"
        if meta["peso_min"] is not None and peso <= meta["peso_min"]:
            return False, "peso por debajo del mínimo"
    return True, ""


async def _cargar_contexto(session: AsyncSession, torneo_id: str):
    t = (await session.execute(
        text("SELECT id, fecha_inicio FROM torneos.torneos WHERE id = CAST(:tid AS UUID)"),
        {"tid": torneo_id},
    )).mappings().first()
    if not t:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    divisiones = [dict(r) for r in (await session.execute(text("""
        SELECT d.id AS division_id, d.nombre AS division_nombre,
               c.id AS categoria_id, c.nombre, c.descripcion, c.genero, c.edad_min, c.edad_max,
               c.peso_min, c.peso_max, c.modalidad
        FROM torneos.divisiones d
        JOIN torneos.categorias c ON c.id = d.categoria_id
        WHERE c.torneo_id = CAST(:tid AS UUID)
        ORDER BY c.nombre, d.nombre
    """), {"tid": torneo_id})).mappings().all()]
    for d in divisiones:
        d["meta"] = meta_division(d, {"nombre": d["division_nombre"]})

    atletas = [dict(r) for r in (await session.execute(text("""
        SELECT j.id, j.nombre, j.genero, j.fecha_nacimiento, j.modalidad, j.peso_verificado,
               j.estado, j.categoria_id, j.division_id, j.torneo_equipo_id,
               e.nombre AS equipo_nombre, e.inscripcion_confirmada
        FROM torneos.tournament_players j
        JOIN torneos.equipos e ON e.id = j.torneo_equipo_id
        WHERE e.torneo_id = CAST(:tid AS UUID) AND COALESCE(j.activo, TRUE)
        ORDER BY j.nombre
    """), {"tid": torneo_id})).mappings().all()]
    return t, divisiones, atletas


# ─── 1. Atletas ───────────────────────────────────────────────────────────────

@router.get("/{torneo_id}/atletas")
async def listar_atletas(torneo_id: str, session: AsyncSession = Depends(get_session)):
    await _ensure_schema(session)
    t, divisiones, atletas = await _cargar_contexto(session, torneo_id)
    por_div = {str(d["division_id"]): d for d in divisiones}
    salida = []
    for a in atletas:
        d = por_div.get(str(a["division_id"])) if a["division_id"] else None
        salida.append({
            "id": str(a["id"]), "nombre": a["nombre"], "genero": a["genero"],
            "edad": _edad(a["fecha_nacimiento"], t["fecha_inicio"]),
            "modalidad": a["modalidad"], "peso_verificado": float(a["peso_verificado"]) if a["peso_verificado"] is not None else None,
            "estado": a["estado"], "equipo_nombre": a["equipo_nombre"],
            "division_id": str(a["division_id"]) if a["division_id"] else None,
            "division_nombre": f"{d['nombre']} {d['division_nombre']}" if d else None,
            "peso_max": d["meta"]["peso_max"] if d else None,
            "peso_min": d["meta"]["peso_min"] if d else None,
        })
    return {
        "atletas": salida,
        "divisiones": [{
            "id": str(d["division_id"]), "nombre": f"{d['nombre']} — {d['division_nombre']}",
            **{k: v for k, v in d["meta"].items()},
        } for d in divisiones],
    }


# ─── 2. Agrupación ────────────────────────────────────────────────────────────

class AgruparRequest(BaseModel):
    respetar_asignaciones: bool = True   # no tocar atletas que ya tienen división
    tolerancia_kg: float = 1.0


@router.post("/{torneo_id}/agrupar")
async def agrupar(torneo_id: str, payload: AgruparRequest = AgruparRequest(),
                  session: AsyncSession = Depends(get_session),
                  current_user: dict = Depends(get_current_user)):
    await _ensure_schema(session)
    t, divisiones, atletas = await _cargar_contexto(session, torneo_id)
    if not divisiones:
        raise HTTPException(status_code=400, detail="El torneo no tiene categorías con divisiones.")

    asignados, sin_categoria = {}, []
    for a in atletas:
        if (a["estado"] or "").lower() == "descalificado":
            sin_categoria.append({"id": str(a["id"]), "nombre": a["nombre"], "razon": "descalificado"})
            continue
        if payload.respetar_asignaciones and a["division_id"]:
            asignados.setdefault(str(a["division_id"]), []).append(a["nombre"])
            continue
        edad = _edad(a["fecha_nacimiento"], t["fecha_inicio"])
        candidatas, motivos = [], set()
        for d in divisiones:
            ok, motivo = evaluar_atleta(a, d["meta"], edad, payload.tolerancia_kg)
            if ok:
                # más restricciones definidas = división más específica
                especificidad = sum(v is not None for v in d["meta"].values())
                candidatas.append((especificidad, d))
            else:
                motivos.add(motivo)
        if not candidatas:
            razon = ", ".join(sorted(m for m in motivos if m)) or "ninguna división compatible"
            sin_categoria.append({"id": str(a["id"]), "nombre": a["nombre"], "razon": razon})
            continue
        candidatas.sort(key=lambda x: -x[0])
        d = candidatas[0][1]
        await session.execute(text("""
            UPDATE torneos.tournament_players
            SET division_id = CAST(:did AS UUID), categoria_id = CAST(:cid AS UUID)
            WHERE id = CAST(:jid AS UUID)
        """), {"did": str(d["division_id"]), "cid": str(d["categoria_id"]), "jid": str(a["id"])})
        asignados.setdefault(str(d["division_id"]), []).append(a["nombre"])
    await session.commit()

    nombres = {str(d["division_id"]): f"{d['nombre']} — {d['division_nombre']}" for d in divisiones}
    resumen = [{"division_id": k, "categoria": nombres.get(k, k), "atletas": len(v)} for k, v in asignados.items()]
    return {
        "mensaje": f"{sum(r['atletas'] for r in resumen)} atletas agrupados en {len(resumen)} divisiones.",
        "resumen": sorted(resumen, key=lambda r: r["categoria"]),
        "sin_categoria": sin_categoria,
    }


# ─── 3. Sorteo de llaves ──────────────────────────────────────────────────────

class SorteoRequest(BaseModel):
    tatamis: int = 3
    aleatorio: bool = True
    reemplazar: bool = False       # regenerar llaves de divisiones sin combates finalizados
    division_id: Optional[str] = None


def orden_siembra(n: int) -> list[int]:
    """Posición de cada cabeza de serie en una llave de n (potencia de 2): 1 y 2 en mitades opuestas."""
    orden = [1]
    while len(orden) < n:
        m = len(orden) * 2 + 1
        orden = [x for s in orden for x in (s, m - s)]
    return orden


def nombre_ronda(partidos_en_ronda: int) -> str:
    return {1: "Final", 2: "Semifinal", 4: "Cuartos de Final", 8: "Octavos de Final"}.get(
        partidos_en_ronda, f"Ronda de {partidos_en_ronda * 2}")


def _intercalar_por_dojo(atletas: list[dict], aleatorio: bool) -> list[dict]:
    """Ordena para la siembra intercalando dojos: compañeros quedan en mitades distintas."""
    grupos: dict[str, list] = {}
    for a in atletas:
        grupos.setdefault(str(a["torneo_equipo_id"]), []).append(a)
    listas = list(grupos.values())
    if aleatorio:
        for l in listas:
            random.shuffle(l)
        random.shuffle(listas)
    listas.sort(key=len, reverse=True)
    orden = []
    while any(listas):
        for l in listas:
            if l:
                orden.append(l.pop(0))
    return orden


def _stats_iniciales(area: int, bracket: dict, kata: bool) -> dict:
    base = {"puntos": 0, "yuko": 0, "waza_ari": 0, "ippon": 0, "senshu": False,
            "penalizaciones": 0, "jogai": 0, "video_review": "ACTIVE"}
    return {
        "tipo_reglamento": "WKF", "modalidad": "kata" if kata else "kumite",
        "area": area, "bracket": bracket,
        "local": {"color": "AKA", **base}, "visitante": {"color": "AO", **base},
    }


@router.post("/{torneo_id}/sorteo")
async def sorteo(torneo_id: str, payload: SorteoRequest = SorteoRequest(),
                 session: AsyncSession = Depends(get_session),
                 current_user: dict = Depends(get_current_user)):
    await _ensure_schema(session)
    t, divisiones, atletas = await _cargar_contexto(session, torneo_id)
    tatamis = max(1, min(int(payload.tatamis or 1), 12))

    por_div: dict[str, list] = {}
    for a in atletas:
        if a["division_id"] and (a["estado"] or "").lower() != "descalificado":
            por_div.setdefault(str(a["division_id"]), []).append(a)

    objetivo = [d for d in divisiones if not payload.division_id or str(d["division_id"]) == payload.division_id]
    avisos, creadas = [], []

    # Divisiones con llave existente
    existentes = {str(r["division_id"]): r for r in (await session.execute(text("""
        SELECT division_id, COUNT(*) AS total,
               COUNT(*) FILTER (WHERE estado = 'finalizado') AS finalizados,
               MIN((estadisticas->>'area')::int) AS area
        FROM torneos.partidos
        WHERE torneo_id = CAST(:tid AS UUID) AND estadisticas->'bracket' IS NOT NULL
        GROUP BY division_id
    """), {"tid": torneo_id})).mappings().all()}

    # Carga actual por tatami (para repartir divisiones)
    carga = {i: 0 for i in range(1, tatamis + 1)}
    for r in existentes.values():
        if r["area"] in carga:
            carga[r["area"]] += r["total"]

    plan = []
    for d in objetivo:
        did = str(d["division_id"])
        nombre = f"{d['nombre']} — {d['division_nombre']}"
        lista = por_div.get(did, [])
        if did in existentes:
            ex = existentes[did]
            if not payload.reemplazar:
                avisos.append(f"{nombre}: ya tiene llave (usar 'reemplazar' para regenerarla).")
                continue
            if ex["finalizados"]:
                avisos.append(f"{nombre}: no se regenera porque ya tiene combates finalizados.")
                continue
            await session.execute(text("""
                DELETE FROM torneos.partidos
                WHERE torneo_id = CAST(:tid AS UUID) AND division_id = CAST(:did AS UUID)
                  AND estadisticas->'bracket' IS NOT NULL
            """), {"tid": torneo_id, "did": did})
            carga[ex["area"]] = max(0, carga.get(ex["area"], 0) - ex["total"])
        if len(lista) < 2:
            avisos.append(f"{nombre}: {len(lista)} atleta(s), no se genera llave.")
            continue
        plan.append((d, lista))

    # Divisiones más grandes primero, cada una al tatami con menos combates
    plan.sort(key=lambda x: -len(x[1]))
    seed_global = random.randint(1, 10**6)
    for d, lista in plan:
        did = str(d["division_id"])
        kata = d["meta"]["modalidad"] == "formas"
        n = len(lista)
        size = 2 ** math.ceil(math.log2(n))
        rondas = int(math.log2(size))
        area = min(carga, key=lambda k: (carga[k], k))

        orden = _intercalar_por_dojo(lista, payload.aleatorio)
        posiciones = orden_siembra(size)          # posiciones[i] = cabeza de serie en el hueco i
        huecos = [orden[s - 1] if s <= n else None for s in posiciones]

        # Crear todos los combates de la llave (ronda 1 .. final). Los que aún no tienen
        # ambos atletas quedan "programado" sin rival: las pantallas los muestran como "Esperando rivales"
        ids = {}
        for r in range(1, rondas + 1):
            en_ronda = size // (2 ** r)
            for pos in range(en_ronda):
                mid = str(uuid.uuid4())
                ids[(r, pos)] = mid
                bracket = {"division_id": did, "ronda": r, "pos": pos, "rondas": rondas,
                           "size": size, "seed": seed_global}
                await session.execute(text("""
                    INSERT INTO torneos.partidos
                        (id, torneo_id, division_id, fase, fase_nombre, ronda, numero_ronda, jornada,
                         estado, goles_local, goles_visitante, estadisticas)
                    VALUES (CAST(:id AS UUID), CAST(:tid AS UUID), CAST(:did AS UUID), 'eliminatoria',
                            :rn, :rn, :r, :jor, 'programado', 0, 0, :st)
                """), {"id": mid, "tid": torneo_id, "did": did, "rn": nombre_ronda(en_ronda),
                       "r": r, "jor": pos + 1, "st": json.dumps(_stats_iniciales(area, bracket, kata))})

        # Ubicar atletas en ronda 1; los byes pasan directo a ronda 2
        async def colocar(r, pos, lado, atleta):
            await session.execute(text(f"""
                UPDATE torneos.partidos
                SET jugador_{lado}_id = CAST(:jid AS UUID), equipo_{lado}_id = CAST(:eid AS UUID)
                WHERE id = CAST(:mid AS UUID)
            """), {"jid": str(atleta["id"]), "eid": str(atleta["torneo_equipo_id"]), "mid": ids[(r, pos)]})

        byes = []
        for pos in range(size // 2):
            a1, a2 = huecos[2 * pos], huecos[2 * pos + 1]
            if a1 and a2:
                await colocar(1, pos, "local", a1)
                await colocar(1, pos, "visitante", a2)
            else:
                unico = a1 or a2
                if unico and rondas > 1:
                    await colocar(2, pos // 2, "local" if pos % 2 == 0 else "visitante", unico)
                    byes.append(unico["nombre"])
                # el combate de ronda 1 con bye no se disputa
                await session.execute(text("DELETE FROM torneos.partidos WHERE id = CAST(:mid AS UUID)"),
                                      {"mid": ids[(1, pos)]})

        disputados = sum(1 for pos in range(size // 2) if huecos[2 * pos] and huecos[2 * pos + 1]) \
            + (size // 2 - 1 if rondas > 1 else 0)
        carga[area] += disputados
        creadas.append({"division": f"{d['nombre']} — {d['division_nombre']}", "atletas": n,
                        "combates": disputados, "tatami": area, "byes": byes})

    await session.commit()
    return {
        "mensaje": f"Sorteo generado: {len(creadas)} llave(s), {sum(c['combates'] for c in creadas)} combates.",
        "llaves": creadas,
        "avisos": avisos,
    }


# ─── 4. Avance de llave ───────────────────────────────────────────────────────

def _lado_ganador(p: dict) -> Optional[str]:
    st = p.get("estadisticas") or {}
    if isinstance(st, str):
        try:
            st = json.loads(st)
        except Exception:
            st = {}
    if st.get("ganador_lado") in ("local", "visitante"):
        return st["ganador_lado"]
    gl, gv = p.get("goles_local") or 0, p.get("goles_visitante") or 0
    if gl != gv:
        return "local" if gl > gv else "visitante"
    loc, vis = st.get("local") or {}, st.get("visitante") or {}
    if loc.get("senshu") != vis.get("senshu"):
        return "local" if loc.get("senshu") else "visitante"
    for campo in ("ippon", "waza_ari"):
        if (loc.get(campo) or 0) != (vis.get(campo) or 0):
            return "local" if (loc.get(campo) or 0) > (vis.get(campo) or 0) else "visitante"
    return None  # empate sin Hantei: no se avanza


async def avanzar_llave_karate(session: AsyncSession, partido_id: str) -> Optional[dict]:
    p = (await session.execute(text("""
        SELECT id, torneo_id, division_id, estado, estadisticas, goles_local, goles_visitante,
               jugador_local_id, jugador_visitante_id, equipo_local_id, equipo_visitante_id
        FROM torneos.partidos WHERE id = CAST(:pid AS UUID)
    """), {"pid": str(partido_id)})).mappings().first()
    if not p or p["estado"] != "finalizado":
        return None
    p = dict(p)
    st = p["estadisticas"] if isinstance(p["estadisticas"], dict) else json.loads(p["estadisticas"] or "{}")
    br = st.get("bracket")
    lado = _lado_ganador(p)
    if not lado:
        return None
    jug = p[f"jugador_{lado}_id"]
    eq = p[f"equipo_{lado}_id"]
    await session.execute(text("""
        UPDATE torneos.partidos
        SET ganador_jugador_id = CAST(:jid AS UUID), ganador_id = CAST(:eid AS UUID)
        WHERE id = CAST(:pid AS UUID)
    """), {"jid": str(jug) if jug else None, "eid": str(eq) if eq else None, "pid": str(partido_id)})

    resultado = {"ganador_lado": lado}
    if br and br.get("ronda", 0) < br.get("rondas", 0) and jug:
        sig_r, sig_pos = br["ronda"] + 1, br["pos"] // 2
        destino = "local" if br["pos"] % 2 == 0 else "visitante"
        sig = (await session.execute(text("""
            SELECT id FROM torneos.partidos
            WHERE torneo_id = CAST(:tid AS UUID) AND division_id = CAST(:did AS UUID)
              AND (estadisticas->'bracket'->>'ronda')::int = :r
              AND (estadisticas->'bracket'->>'pos')::int = :pos
        """), {"tid": str(p["torneo_id"]), "did": str(p["division_id"]), "r": sig_r, "pos": sig_pos})).scalar()
        if sig:
            await session.execute(text(f"""
                UPDATE torneos.partidos
                SET jugador_{destino}_id = CAST(:jid AS UUID), equipo_{destino}_id = CAST(:eid AS UUID)
                WHERE id = CAST(:sid AS UUID) AND estado <> 'finalizado'
            """), {"jid": str(jug), "eid": str(eq) if eq else None, "sid": str(sig)})
            resultado["siguiente_partido"] = str(sig)
    await session.commit()
    return resultado


# ─── 5. Pesaje oficial ────────────────────────────────────────────────────────

class PesajeRequest(BaseModel):
    jugador_id: str
    peso: float
    tolerancia_kg: float = 1.0
    limite_kg: Optional[float] = None   # si no se envía, se usa el de la división del atleta


@router.post("/{torneo_id}/pesaje")
async def pesaje(torneo_id: str, payload: PesajeRequest,
                 session: AsyncSession = Depends(get_session),
                 current_user: dict = Depends(get_current_user)):
    await _ensure_schema(session)
    t, divisiones, atletas = await _cargar_contexto(session, torneo_id)
    a = next((x for x in atletas if str(x["id"]) == payload.jugador_id), None)
    if not a:
        raise HTTPException(status_code=404, detail="Atleta no encontrado en este torneo")

    d = next((x for x in divisiones if a["division_id"] and str(x["division_id"]) == str(a["division_id"])), None)
    limite = payload.limite_kg if payload.limite_kg is not None else (d["meta"]["peso_max"] if d else None)
    if limite is None:
        raise HTTPException(status_code=400, detail="El atleta no tiene división con límite de peso. Agrupá primero o indicá el límite.")

    limite_efectivo = round(limite + payload.tolerancia_kg, 2)
    apto = payload.peso <= limite_efectivo
    await session.execute(text("""
        UPDATE torneos.tournament_players
        SET peso_verificado = :peso, estado = :estado
        WHERE id = CAST(:jid AS UUID)
    """), {"peso": payload.peso, "estado": "habilitado" if apto else "descalificado", "jid": payload.jugador_id})

    wo = []
    if not apto:
        # Walkover en los combates pendientes donde el rival ya está definido
        filas = (await session.execute(text("""
            SELECT id, jugador_local_id, jugador_visitante_id, estadisticas
            FROM torneos.partidos
            WHERE torneo_id = CAST(:tid AS UUID) AND estado <> 'finalizado'
              AND (jugador_local_id = CAST(:jid AS UUID) OR jugador_visitante_id = CAST(:jid AS UUID))
              AND jugador_local_id IS NOT NULL AND jugador_visitante_id IS NOT NULL
        """), {"tid": torneo_id, "jid": payload.jugador_id})).mappings().all()
        for f in filas:
            ganador = "visitante" if str(f["jugador_local_id"]) == payload.jugador_id else "local"
            st = f["estadisticas"] if isinstance(f["estadisticas"], dict) else json.loads(f["estadisticas"] or "{}")
            st["ganador_lado"] = ganador
            st["metodo_victoria"] = f"Walkover: rival excedió el peso ({payload.peso} kg > {limite_efectivo} kg)"
            await session.execute(text("""
                UPDATE torneos.partidos SET estado = 'finalizado', es_wo = TRUE, estadisticas = :st
                WHERE id = CAST(:pid AS UUID)
            """), {"st": json.dumps(st), "pid": str(f["id"])})
            await session.commit()
            await avanzar_llave_karate(session, str(f["id"]))
            wo.append(str(f["id"]))
    await session.commit()

    return {
        "apto": apto,
        "atleta": a["nombre"],
        "division": f"{d['nombre']} — {d['division_nombre']}" if d else None,
        "limite_kg": limite,
        "limite_efectivo": limite_efectivo,
        "diferencia": round(payload.peso - limite_efectivo, 2),
        "walkovers_aplicados": wo,
        "mensaje": "Apto para competir" if apto else "Peso excedido: atleta descalificado"
                   + (f" y walkover en {len(wo)} combate(s)" if wo else ""),
    }
