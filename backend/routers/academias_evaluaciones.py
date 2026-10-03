# routers/academias_evaluaciones.py
"""
Módulo de Evaluaciones Deportivas, Ficha Técnica y Boletines de Rendimiento en PDF para SAD-M.
Permite:
  1. Registrar evaluaciones periódicas de atletas con notas por fundamentos
     (Técnico, Táctico, Físico, Actitudinal).
  2. Seguimiento de evolución histórica (comparativa automática con evaluación anterior).
  3. Diagnósticos personalizados, fortalezas y recomendaciones de desarrollo deportivo.
  4. Generación y consulta de boletín oficial (PDF / vista pública para padres).
  5. Envío automatizado de ficha deportiva por WhatsApp al tutor principal.
"""
from __future__ import annotations

import os
import uuid
import json
import traceback
from datetime import date, datetime
from typing import Optional, List, Dict, Any, Union

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field

from database import get_session
from security import get_current_user
from routers.academias import get_academia_context, require_roles
from services.whatsapp_service import send_whatsapp_text, format_paraguay_phone

router = APIRouter(prefix="/academia/evaluaciones", tags=["Evaluaciones y Rendimiento"])
public_router = APIRouter(prefix="/api/public/boletin", tags=["Boletín Público"])


# ================================================================
# TABLAS AUTO-CREACIÓN
# ================================================================

_tables_initialized = False

async def _ensure_evaluaciones_table(session: AsyncSession):
    global _tables_initialized
    if _tables_initialized:
        return
    try:
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS academias.evaluaciones (
                id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
                academia_id          UUID          NOT NULL REFERENCES academias.academias(id) ON DELETE CASCADE,
                alumno_id            UUID          NOT NULL REFERENCES academias.alumnos(id) ON DELETE CASCADE,
                sucursal_id          UUID          REFERENCES academias.sucursales(id) ON DELETE SET NULL,
                categoria_id         UUID          REFERENCES academias.categorias(id) ON DELETE SET NULL,
                evaluador_id         INTEGER       REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
                evaluador_nombre     VARCHAR(150),
                fecha                DATE          NOT NULL DEFAULT CURRENT_DATE,
                periodo              VARCHAR(60)   NOT NULL,
                titulo               VARCHAR(150)  NOT NULL DEFAULT 'Evaluación Integral de Rendimiento',
                tipo                 VARCHAR(50)   NOT NULL DEFAULT 'trimestral',
                posicion             VARCHAR(60),
                pierna_habil         VARCHAR(30)   DEFAULT 'Diestro',
                dorsal               VARCHAR(10),
                altura_cm            NUMERIC(5,1),
                peso_kg              NUMERIC(5,1),
                promedio_general     NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
                promedio_tecnico     NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
                promedio_tactico     NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
                promedio_fisico      NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
                promedio_actitudinal NUMERIC(4,2)  NOT NULL DEFAULT 0.0,
                nivel_global         VARCHAR(50)   NOT NULL DEFAULT 'En Desarrollo',
                fundamentos          JSONB         NOT NULL DEFAULT '[]'::jsonb,
                fortalezas           TEXT,
                areas_mejora         TEXT,
                recomendaciones      TEXT,
                observaciones        TEXT,
                estado               VARCHAR(20)   NOT NULL DEFAULT 'publicado',
                creado_en            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                actualizado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_evaluaciones_acad ON academias.evaluaciones(academia_id);
            CREATE INDEX IF NOT EXISTS idx_evaluaciones_alumno ON academias.evaluaciones(alumno_id);
            CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON academias.evaluaciones(fecha);
            CREATE INDEX IF NOT EXISTS idx_evaluaciones_periodo ON academias.evaluaciones(periodo);
        """))
        await session.commit()
        _tables_initialized = True
    except Exception as e:
        await session.rollback()
        print(f"[AVISO _ensure_evaluaciones_table]: {e}")


# ================================================================
# SCHEMAS PYDANTIC
# ================================================================

class FundamentoItem(BaseModel):
    nombre: str
    categoria: str = "tecnico"  # 'tecnico', 'tactico', 'fisico', 'actitudinal'
    nota: float = Field(..., ge=1.0, le=10.0)
    obs: Optional[str] = None


class EvaluacionCreate(BaseModel):
    alumno_id: str
    sucursal_id: Optional[str] = None
    categoria_id: Optional[str] = None
    evaluador_nombre: Optional[str] = None
    fecha: Optional[str] = None  # YYYY-MM-DD
    periodo: str  # Ej: "1° Trimestre 2026", "Evaluación Diagnóstica", etc.
    titulo: Optional[str] = "Evaluación Integral de Rendimiento"
    tipo: Optional[str] = "trimestral"
    posicion: Optional[str] = None
    pierna_habil: Optional[str] = "Diestro"
    dorsal: Optional[str] = None
    altura_cm: Optional[float] = None
    peso_kg: Optional[float] = None
    fundamentos: List[FundamentoItem] = []
    fortalezas: Optional[str] = None
    areas_mejora: Optional[str] = None
    recomendaciones: Optional[str] = None
    observaciones: Optional[str] = None
    estado: Optional[str] = "publicado"


class EvaluacionUpdate(BaseModel):
    sucursal_id: Optional[str] = None
    categoria_id: Optional[str] = None
    evaluador_nombre: Optional[str] = None
    fecha: Optional[str] = None
    periodo: Optional[str] = None
    titulo: Optional[str] = None
    tipo: Optional[str] = None
    posicion: Optional[str] = None
    pierna_habil: Optional[str] = None
    dorsal: Optional[str] = None
    altura_cm: Optional[float] = None
    peso_kg: Optional[float] = None
    fundamentos: Optional[List[FundamentoItem]] = None
    fortalezas: Optional[str] = None
    areas_mejora: Optional[str] = None
    recomendaciones: Optional[str] = None
    observaciones: Optional[str] = None
    estado: Optional[str] = None


def _calcular_promedios_y_nivel(fundamentos: List[FundamentoItem]) -> Dict[str, Any]:
    """Calcula promedios por área y nivel global del atleta."""
    if not fundamentos:
        return {
            "promedio_general": 0.0,
            "promedio_tecnico": 0.0,
            "promedio_tactico": 0.0,
            "promedio_fisico": 0.0,
            "promedio_actitudinal": 0.0,
            "nivel_global": "Sin Calificar",
        }

    cats: Dict[str, List[float]] = {
        "tecnico": [],
        "tactico": [],
        "fisico": [],
        "actitudinal": [],
    }
    all_notas: List[float] = []

    for f in fundamentos:
        val = float(f.nota)
        all_notas.append(val)
        cat = (f.categoria or "").lower().strip()
        if cat in cats:
            cats[cat].append(val)
        else:
            cats["tecnico"].append(val)

    prom_gen = round(sum(all_notas) / len(all_notas), 2) if all_notas else 0.0
    prom_tec = round(sum(cats["tecnico"]) / len(cats["tecnico"]), 2) if cats["tecnico"] else 0.0
    prom_tac = round(sum(cats["tactico"]) / len(cats["tactico"]), 2) if cats["tactico"] else 0.0
    prom_fis = round(sum(cats["fisico"]) / len(cats["fisico"]), 2) if cats["fisico"] else 0.0
    prom_act = round(sum(cats["actitudinal"]) / len(cats["actitudinal"]), 2) if cats["actitudinal"] else 0.0

    if prom_gen >= 9.0:
        nivel = "Destacado"
    elif prom_gen >= 7.5:
        nivel = "Avanzado"
    elif prom_gen >= 6.0:
        nivel = "En Desarrollo"
    else:
        nivel = "Iniciación"

    return {
        "promedio_general": prom_gen,
        "promedio_tecnico": prom_tec,
        "promedio_tactico": prom_tac,
        "promedio_fisico": prom_fis,
        "promedio_actitudinal": prom_act,
        "nivel_global": nivel,
    }


# ================================================================
# ENDPOINTS EVALUACIONES
# ================================================================

@router.get("")
async def listar_evaluaciones(
    alumno_id: Optional[str] = None,
    categoria_id: Optional[str] = None,
    periodo: Optional[str] = None,
    search: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Lista las evaluaciones de la academia con datos de alumnos y promedios.
    """
    await _ensure_evaluaciones_table(session)
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    conditions = ["e.academia_id = CAST(:aid AS UUID)"]
    params: Dict[str, Any] = {"aid": aid}

    if alumno_id:
        conditions.append("e.alumno_id = CAST(:alid AS UUID)")
        params["alid"] = alumno_id

    if categoria_id:
        conditions.append("e.categoria_id = CAST(:catid AS UUID)")
        params["catid"] = categoria_id

    if periodo:
        conditions.append("e.periodo = :periodo")
        params["periodo"] = periodo

    if search:
        conditions.append("(a.nombre ILIKE :q OR a.apellido ILIKE :q OR e.evaluador_nombre ILIKE :q)")
        params["q"] = f"%{search.strip()}%"

    where_clause = " AND ".join(conditions)

    sql = text(f"""
        SELECT 
            e.id, e.alumno_id, e.sucursal_id, e.categoria_id, e.evaluador_nombre,
            e.fecha, e.periodo, e.titulo, e.tipo, e.posicion, e.pierna_habil, e.dorsal,
            e.altura_cm, e.peso_kg, e.promedio_general, e.promedio_tecnico, e.promedio_tactico,
            e.promedio_fisico, e.promedio_actitudinal, e.nivel_global, e.fundamentos,
            e.fortalezas, e.areas_mejora, e.recomendaciones, e.observaciones, e.estado,
            e.creado_en,
            a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.foto_perfil AS alumno_foto,
            a.fecha_nacimiento AS alumno_fecha_nac,
            cat.nombre AS categoria_nombre,
            suc.nombre AS sucursal_nombre
        FROM academias.evaluaciones e
        JOIN academias.alumnos a ON a.id = e.alumno_id
        LEFT JOIN academias.categorias cat ON cat.id = e.categoria_id
        LEFT JOIN academias.sucursales suc ON suc.id = e.sucursal_id
        WHERE {where_clause}
        ORDER BY e.fecha DESC, e.creado_en DESC
    """)

    res = await session.execute(sql, params)
    rows = res.fetchall()

    items = []
    for r in rows:
        fn = r.alumno_fecha_nac
        edad = None
        if fn:
            today = date.today()
            edad = today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))

        fundamentos_data = r.fundamentos
        if isinstance(fundamentos_data, str):
            try:
                fundamentos_data = json.loads(fundamentos_data)
            except Exception:
                fundamentos_data = []

        items.append({
            "id": str(r.id),
            "alumno_id": str(r.alumno_id),
            "alumno_nombre": f"{r.alumno_nombre} {r.alumno_apellido or ''}".strip(),
            "alumno_foto": r.alumno_foto,
            "alumno_edad": edad,
            "sucursal_id": str(r.sucursal_id) if r.sucursal_id else None,
            "sucursal_nombre": r.sucursal_nombre,
            "categoria_id": str(r.categoria_id) if r.categoria_id else None,
            "categoria_nombre": r.categoria_nombre,
            "evaluador_nombre": r.evaluador_nombre,
            "fecha": r.fecha.isoformat() if r.fecha else None,
            "periodo": r.periodo,
            "titulo": r.titulo,
            "tipo": r.tipo,
            "posicion": r.posicion,
            "pierna_habil": r.pierna_habil,
            "dorsal": r.dorsal,
            "altura_cm": float(r.altura_cm) if r.altura_cm is not None else None,
            "peso_kg": float(r.peso_kg) if r.peso_kg is not None else None,
            "promedio_general": float(r.promedio_general or 0),
            "promedio_tecnico": float(r.promedio_tecnico or 0),
            "promedio_tactico": float(r.promedio_tactico or 0),
            "promedio_fisico": float(r.promedio_fisico or 0),
            "promedio_actitudinal": float(r.promedio_actitudinal or 0),
            "nivel_global": r.nivel_global,
            "fundamentos_count": len(fundamentos_data) if isinstance(fundamentos_data, list) else 0,
            "fundamentos": fundamentos_data,
            "fortalezas": r.fortalezas,
            "areas_mejora": r.areas_mejora,
            "recomendaciones": r.recomendaciones,
            "observaciones": r.observaciones,
            "estado": r.estado,
            "creado_en": r.creado_en.isoformat() if r.creado_en else None,
        })

    return items


@router.get("/{evaluacion_id}")
async def obtener_evaluacion(
    evaluacion_id: str,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene el detalle completo de una evaluación con análisis de evolución
    respecto a la evaluación anterior del atleta.
    """
    await _ensure_evaluaciones_table(session)
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(text("""
        SELECT 
            e.id, e.academia_id, e.alumno_id, e.sucursal_id, e.categoria_id,
            e.evaluador_nombre, e.fecha, e.periodo, e.titulo, e.tipo,
            e.posicion, e.pierna_habil, e.dorsal, e.altura_cm, e.peso_kg,
            e.promedio_general, e.promedio_tecnico, e.promedio_tactico,
            e.promedio_fisico, e.promedio_actitudinal, e.nivel_global,
            e.fundamentos, e.fortalezas, e.areas_mejora, e.recomendaciones,
            e.observaciones, e.estado, e.creado_en,
            a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
            a.foto_perfil AS alumno_foto, a.fecha_nacimiento AS alumno_fecha_nac,
            a.tipo_sangre, a.alergias, a.condiciones_medicas,
            cat.nombre AS categoria_nombre,
            suc.nombre AS sucursal_nombre,
            acad.nombre AS academia_nombre, acad.logo_url AS academia_logo,
            t.nombre || ' ' || COALESCE(t.apellido, '') AS tutor_nombre,
            t.telefono AS tutor_telefono, t.email AS tutor_email
        FROM academias.evaluaciones e
        JOIN academias.academias acad ON acad.id = e.academia_id
        JOIN academias.alumnos a ON a.id = e.alumno_id
        LEFT JOIN academias.categorias cat ON cat.id = e.categoria_id
        LEFT JOIN academias.sucursales suc ON suc.id = e.sucursal_id
        LEFT JOIN academias.alumno_tutores at2 ON at2.alumno_id = a.id AND at2.es_tutor_principal = TRUE
        LEFT JOIN academias.tutores t ON t.id = at2.tutor_id
        WHERE e.id = CAST(:eid AS UUID) AND e.academia_id = CAST(:aid AS UUID)
    """), {"eid": evaluacion_id, "aid": aid})
    r = res.fetchone()

    if not r:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada.")

    # Buscar la evaluación inmediatamente anterior para comparar evolución
    prev_res = await session.execute(text("""
        SELECT id, fecha, periodo, promedio_general, promedio_tecnico,
               promedio_tactico, promedio_fisico, promedio_actitudinal, nivel_global, fundamentos
        FROM academias.evaluaciones
        WHERE alumno_id = :alid AND academia_id = :aid AND id != :eid AND fecha <= :curr_date
        ORDER BY fecha DESC, creado_en DESC
        LIMIT 1
    """), {"alid": r.alumno_id, "aid": aid, "eid": r.id, "curr_date": r.fecha})
    prev_r = prev_res.fetchone()

    evolucion = None
    if prev_r:
        delta_gen = round(float(r.promedio_general) - float(prev_r.promedio_general), 2)
        delta_tec = round(float(r.promedio_tecnico) - float(prev_r.promedio_tecnico), 2)
        delta_tac = round(float(r.promedio_tactico) - float(prev_r.promedio_tactico), 2)
        delta_fis = round(float(r.promedio_fisico) - float(prev_r.promedio_fisico), 2)
        delta_act = round(float(r.promedio_actitudinal) - float(prev_r.promedio_actitudinal), 2)

        evolucion = {
            "anterior_id": str(prev_r.id),
            "anterior_periodo": prev_r.periodo,
            "anterior_fecha": prev_r.fecha.isoformat() if prev_r.fecha else None,
            "anterior_promedio": float(prev_r.promedio_general),
            "delta_general": delta_gen,
            "delta_tecnico": delta_tec,
            "delta_tactico": delta_tac,
            "delta_fisico": delta_fis,
            "delta_actitudinal": delta_act,
            "tendencia": "subio" if delta_gen > 0 else ("bajo" if delta_gen < 0 else "igual"),
        }

    fundamentos_data = r.fundamentos
    if isinstance(fundamentos_data, str):
        try:
            fundamentos_data = json.loads(fundamentos_data)
        except Exception:
            fundamentos_data = []

    fn = r.alumno_fecha_nac
    edad = None
    if fn:
        today = date.today()
        edad = today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))

    return {
        "id": str(r.id),
        "academia_id": str(r.academia_id),
        "academia_nombre": r.academia_nombre,
        "academia_logo": r.academia_logo,
        "alumno_id": str(r.alumno_id),
        "alumno_nombre": f"{r.alumno_nombre} {r.alumno_apellido or ''}".strip(),
        "alumno_foto": r.alumno_foto,
        "alumno_fecha_nac": r.alumno_fecha_nac.isoformat() if r.alumno_fecha_nac else None,
        "alumno_edad": edad,
        "alumno_tipo_sangre": r.tipo_sangre,
        "alumno_alergias": r.alergias,
        "alumno_condiciones_medicas": r.condiciones_medicas,
        "tutor_nombre": r.tutor_nombre,
        "tutor_telefono": r.tutor_telefono,
        "tutor_email": r.tutor_email,
        "sucursal_id": str(r.sucursal_id) if r.sucursal_id else None,
        "sucursal_nombre": r.sucursal_nombre,
        "categoria_id": str(r.categoria_id) if r.categoria_id else None,
        "categoria_nombre": r.categoria_nombre,
        "evaluador_nombre": r.evaluador_nombre,
        "fecha": r.fecha.isoformat() if r.fecha else None,
        "periodo": r.periodo,
        "titulo": r.titulo,
        "tipo": r.tipo,
        "posicion": r.posicion,
        "pierna_habil": r.pierna_habil,
        "dorsal": r.dorsal,
        "altura_cm": float(r.altura_cm) if r.altura_cm is not None else None,
        "peso_kg": float(r.peso_kg) if r.peso_kg is not None else None,
        "promedio_general": float(r.promedio_general or 0),
        "promedio_tecnico": float(r.promedio_tecnico or 0),
        "promedio_tactico": float(r.promedio_tactico or 0),
        "promedio_fisico": float(r.promedio_fisico or 0),
        "promedio_actitudinal": float(r.promedio_actitudinal or 0),
        "nivel_global": r.nivel_global,
        "fundamentos": fundamentos_data,
        "fortalezas": r.fortalezas,
        "areas_mejora": r.areas_mejora,
        "recomendaciones": r.recomendaciones,
        "observaciones": r.observaciones,
        "estado": r.estado,
        "creado_en": r.creado_en.isoformat() if r.creado_en else None,
        "evolucion": evolucion,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_evaluacion(
    data: EvaluacionCreate,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """
    Crea una nueva evaluación deportiva con notas por fundamento y cálculo automático de promedios.
    """
    await _ensure_evaluaciones_table(session)
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])
    uid = current_user.get("user_id")

    # Validar que el alumno pertenece a la academia
    res_al = await session.execute(
        text("SELECT id, sucursal_id FROM academias.alumnos WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": data.alumno_id, "aid": aid}
    )
    row_al = res_al.fetchone()
    if not row_al:
        raise HTTPException(status_code=404, detail="Alumno no encontrado en esta academia.")

    sucursal_final = data.sucursal_id or (str(row_al[1]) if row_al[1] else None)
    eval_calcs = _calcular_promedios_y_nivel(data.fundamentos)

    eval_fecha = datetime.strptime(data.fecha, "%Y-%m-%d").date() if data.fecha else date.today()
    fundamentos_json = [f.dict() for f in data.fundamentos]

    eval_id = uuid.uuid4()

    await session.execute(text("""
        INSERT INTO academias.evaluaciones (
            id, academia_id, alumno_id, sucursal_id, categoria_id, evaluador_id, evaluador_nombre,
            fecha, periodo, titulo, tipo, posicion, pierna_habil, dorsal, altura_cm, peso_kg,
            promedio_general, promedio_tecnico, promedio_tactico, promedio_fisico, promedio_actitudinal,
            nivel_global, fundamentos, fortalezas, areas_mejora, recomendaciones, observaciones, estado
        ) VALUES (
            :id, :aid, :alid, :sucid, :catid, :euid, :eunom,
            :fec, :per, :tit, :tip, :pos, :pie, :dor, :alt, :pes,
            :pgen, :ptec, :ptac, :pfis, :pact,
            :niv, CAST(:fund AS jsonb), :fort, :amej, :recom, :obs, :est
        )
    """), {
        "id": str(eval_id),
        "aid": aid,
        "alid": data.alumno_id,
        "sucid": sucursal_final,
        "catid": data.categoria_id,
        "euid": uid,
        "eunom": data.evaluador_nombre or current_user.get("nombre") or "Profesor / DT",
        "fec": eval_fecha,
        "per": data.periodo.strip(),
        "tit": data.titulo or "Evaluación Integral de Rendimiento",
        "tip": data.tipo or "trimestral",
        "pos": data.posicion,
        "pie": data.pierna_habil or "Diestro",
        "dor": data.dorsal,
        "alt": data.altura_cm,
        "pes": data.peso_kg,
        "pgen": eval_calcs["promedio_general"],
        "ptec": eval_calcs["promedio_tecnico"],
        "ptac": eval_calcs["promedio_tactico"],
        "pfis": eval_calcs["promedio_fisico"],
        "pact": eval_calcs["promedio_actitudinal"],
        "niv": eval_calcs["nivel_global"],
        "fund": json.dumps(fundamentos_json),
        "fort": data.fortalezas,
        "amej": data.areas_mejora,
        "recom": data.recomendaciones,
        "obs": data.observaciones,
        "est": data.estado or "publicado"
    })

    await session.commit()

    return {
        "message": "Evaluación registrada exitosamente.",
        "id": str(eval_id),
        "promedios": eval_calcs
    }


@router.put("/{evaluacion_id}")
async def actualizar_evaluacion(
    evaluacion_id: str,
    data: EvaluacionUpdate,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """
    Actualiza una evaluación existente y recalcula sus promedios.
    """
    await _ensure_evaluaciones_table(session)
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("SELECT id, fundamentos FROM academias.evaluaciones WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": evaluacion_id, "aid": aid}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada.")

    updates = []
    params: Dict[str, Any] = {"id": evaluacion_id, "aid": aid}

    if data.fecha is not None:
        updates.append("fecha = :fecha")
        params["fecha"] = datetime.strptime(data.fecha, "%Y-%m-%d").date()

    if data.periodo is not None:
        updates.append("periodo = :periodo")
        params["periodo"] = data.periodo.strip()

    if data.titulo is not None:
        updates.append("titulo = :titulo")
        params["titulo"] = data.titulo

    if data.tipo is not None:
        updates.append("tipo = :tipo")
        params["tipo"] = data.tipo

    if data.sucursal_id is not None:
        updates.append("sucursal_id = :sucursal_id")
        params["sucursal_id"] = data.sucursal_id

    if data.categoria_id is not None:
        updates.append("categoria_id = :categoria_id")
        params["categoria_id"] = data.categoria_id

    if data.evaluador_nombre is not None:
        updates.append("evaluador_nombre = :evaluador_nombre")
        params["evaluador_nombre"] = data.evaluador_nombre

    if data.posicion is not None:
        updates.append("posicion = :posicion")
        params["posicion"] = data.posicion

    if data.pierna_habil is not None:
        updates.append("pierna_habil = :pierna_habil")
        params["pierna_habil"] = data.pierna_habil

    if data.dorsal is not None:
        updates.append("dorsal = :dorsal")
        params["dorsal"] = data.dorsal

    if data.altura_cm is not None:
        updates.append("altura_cm = :altura_cm")
        params["altura_cm"] = data.altura_cm

    if data.peso_kg is not None:
        updates.append("peso_kg = :peso_kg")
        params["peso_kg"] = data.peso_kg

    if data.fortalezas is not None:
        updates.append("fortalezas = :fortalezas")
        params["fortalezas"] = data.fortalezas

    if data.areas_mejora is not None:
        updates.append("areas_mejora = :areas_mejora")
        params["areas_mejora"] = data.areas_mejora

    if data.recomendaciones is not None:
        updates.append("recomendaciones = :recomendaciones")
        params["recomendaciones"] = data.recomendaciones

    if data.observaciones is not None:
        updates.append("observaciones = :observaciones")
        params["observaciones"] = data.observaciones

    if data.estado is not None:
        updates.append("estado = :estado")
        params["estado"] = data.estado

    if data.fundamentos is not None:
        calcs = _calcular_promedios_y_nivel(data.fundamentos)
        updates.append("fundamentos = CAST(:fundamentos AS jsonb)")
        updates.append("promedio_general = :promedio_general")
        updates.append("promedio_tecnico = :promedio_tecnico")
        updates.append("promedio_tactico = :promedio_tactico")
        updates.append("promedio_fisico = :promedio_fisico")
        updates.append("promedio_actitudinal = :promedio_actitudinal")
        updates.append("nivel_global = :nivel_global")

        params["fundamentos"] = json.dumps([f.dict() for f in data.fundamentos])
        params["promedio_general"] = calcs["promedio_general"]
        params["promedio_tecnico"] = calcs["promedio_tecnico"]
        params["promedio_tactico"] = calcs["promedio_tactico"]
        params["promedio_fisico"] = calcs["promedio_fisico"]
        params["promedio_actitudinal"] = calcs["promedio_actitudinal"]
        params["nivel_global"] = calcs["nivel_global"]

    updates.append("actualizado_en = NOW()")

    sql = f"""
        UPDATE academias.evaluaciones
        SET {", ".join(updates)}
        WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
    """

    await session.execute(text(sql), params)
    await session.commit()

    return {"message": "Evaluación actualizada exitosamente."}


@router.delete("/{evaluacion_id}")
async def eliminar_evaluacion(
    evaluacion_id: str,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador")),
    session: AsyncSession = Depends(get_session)
):
    """Elimina una evaluación deportiva."""
    await _ensure_evaluaciones_table(session)
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(
        text("DELETE FROM academias.evaluaciones WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)"),
        {"id": evaluacion_id, "aid": aid}
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada.")

    await session.commit()
    return {"message": "Evaluación eliminada exitosamente."}


@router.get("/alumnos/{alumno_id}/evolucion")
async def obtener_evolucion_alumno(
    alumno_id: str,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor", "tesorero")),
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna la trayectoria de evolución del atleta (histórico de evaluaciones,
    gráficos de radar consolidados y progreso en fundamentos).
    """
    await _ensure_evaluaciones_table(session)
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res_al = await session.execute(text("""
        SELECT id, nombre, apellido, foto_perfil, fecha_nacimiento
        FROM academias.alumnos
        WHERE id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
    """), {"id": alumno_id, "aid": aid})
    alumno = res_al.fetchone()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    res_evals = await session.execute(text("""
        SELECT id, fecha, periodo, titulo, promedio_general, promedio_tecnico,
               promedio_tactico, promedio_fisico, promedio_actitudinal, nivel_global,
               fundamentos, evaluador_nombre
        FROM academias.evaluaciones
        WHERE alumno_id = CAST(:id AS UUID) AND academia_id = CAST(:aid AS UUID)
        ORDER BY fecha ASC, creado_en ASC
    """), {"id": alumno_id, "aid": aid})
    evals = res_evals.fetchall()

    cronologia = []
    radar_acumulado = {
        "tecnico": [],
        "tactico": [],
        "fisico": [],
        "actitudinal": [],
    }

    for ev in evals:
        f_list = ev.fundamentos
        if isinstance(f_list, str):
            try: f_list = json.loads(f_list)
            except Exception: f_list = []

        radar_acumulado["tecnico"].append(float(ev.promedio_tecnico or 0))
        radar_acumulado["tactico"].append(float(ev.promedio_tactico or 0))
        radar_acumulado["fisico"].append(float(ev.promedio_fisico or 0))
        radar_acumulado["actitudinal"].append(float(ev.promedio_actitudinal or 0))

        cronologia.append({
            "id": str(ev.id),
            "fecha": ev.fecha.isoformat() if ev.fecha else None,
            "periodo": ev.periodo,
            "titulo": ev.titulo,
            "evaluador": ev.evaluador_nombre,
            "promedio_general": float(ev.promedio_general or 0),
            "promedio_tecnico": float(ev.promedio_tecnico or 0),
            "promedio_tactico": float(ev.promedio_tactico or 0),
            "promedio_fisico": float(ev.promedio_fisico or 0),
            "promedio_actitudinal": float(ev.promedio_actitudinal or 0),
            "nivel_global": ev.nivel_global,
        })

    # Calcular promedios consolidados
    def _avg(lst: List[float]) -> float:
        return round(sum(lst) / len(lst), 2) if lst else 0.0

    radar_actual = {
        "tecnico": _avg(radar_acumulado["tecnico"]),
        "tactico": _avg(radar_acumulado["tactico"]),
        "fisico": _avg(radar_acumulado["fisico"]),
        "actitudinal": _avg(radar_acumulado["actitudinal"]),
    }

    return {
        "alumno_id": str(alumno.id),
        "alumno_nombre": f"{alumno.nombre} {alumno.apellido or ''}".strip(),
        "alumno_foto": alumno.foto_perfil,
        "total_evaluaciones": len(cronologia),
        "cronologia": cronologia,
        "radar_actual": radar_actual,
    }


# ================================================================
# ENVÍO POR WHATSAPP AL TUTOR
# ================================================================

@router.post("/{evaluacion_id}/enviar-whatsapp")
async def enviar_boletin_whatsapp(
    evaluacion_id: str,
    request: Request = None,
    current_user: dict = Depends(require_roles("dueño", "administrador", "profesor")),
    session: AsyncSession = Depends(get_session)
):
    """
    Envía el informe de rendimiento y ficha técnica por WhatsApp al tutor principal del alumno.
    Retorna el estado de envío y el enlace web directo a WhatsApp para contingencia.
    """
    await _ensure_evaluaciones_table(session)
    ctx = await get_academia_context(request, current_user, session)
    aid = str(ctx["academia_id"])

    res = await session.execute(text("""
        SELECT 
            e.id, e.periodo, e.titulo, e.promedio_general, e.promedio_tecnico,
            e.promedio_tactico, e.promedio_fisico, e.promedio_actitudinal,
            e.nivel_global, e.fortalezas, e.areas_mejora, e.recomendaciones,
            e.evaluador_nombre,
            a.nombre || ' ' || COALESCE(a.apellido, '') AS alumno,
            acad.nombre AS academia_nombre,
            t.nombre || ' ' || COALESCE(t.apellido, '') AS tutor,
            t.telefono AS tutor_telefono
        FROM academias.evaluaciones e
        JOIN academias.academias acad ON acad.id = e.academia_id
        JOIN academias.alumnos a ON a.id = e.alumno_id
        LEFT JOIN academias.alumno_tutores at2 ON at2.alumno_id = a.id AND at2.es_tutor_principal = TRUE
        LEFT JOIN academias.tutores t ON t.id = at2.tutor_id
        WHERE e.id = CAST(:eid AS UUID) AND e.academia_id = CAST(:aid AS UUID)
    """), {"eid": evaluacion_id, "aid": aid})
    row = res.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada.")

    (
        eid, periodo, titulo, prom_gen, prom_tec, prom_tac, prom_fis, prom_act,
        nivel, fortalezas, areas_mejora, recomendaciones, evaluador,
        alumno, acad_nombre, tutor, telefono
    ) = row

    if not telefono:
        raise HTTPException(status_code=400, detail=f"El tutor de {alumno} no tiene número de teléfono registrado.")

    tutor_saludo = f"Estimado/a {tutor}" if tutor else f"Estimados padres de {alumno}"
    dt_nombre = evaluador or "Cuerpo Técnico"

    link_boletin = f"https://micancha.com.py/boletin/{eid}"

    msg = (
        f"⚽ *{acad_nombre.upper()} — INFORME DE DESARROLLO DEPORTIVO*\n\n"
        f"Hola {tutor_saludo} 👋🏼\n"
        f"Compartimos el boletín oficial de rendimiento y evolución de *{alumno}* ({periodo}):\n\n"
        f"🏆 *Nivel Alcanzado:* {nivel.upper()}\n"
        f"⭐ *Nota Global:* {float(prom_gen):.1f} / 10.0\n\n"
        f"📊 *Fundamentos Evaluados:*\n"
        f"  • Técnico: {float(prom_tec):.1f}/10\n"
        f"  • Táctico: {float(prom_tac):.1f}/10\n"
        f"  • Físico: {float(prom_fis):.1f}/10\n"
        f"  • Actitudinal: {float(prom_act):.1f}/10\n\n"
    )

    if fortalezas:
        msg += f"💪 *Fortalezas:* {fortalezas}\n"
    if areas_mejora:
        msg += f"🎯 *Objetivo a trabajar:* {areas_mejora}\n"
    if recomendaciones:
        msg += f"💡 *Recomendación del DT ({dt_nombre}):* {recomendaciones}\n"

    msg += (
        f"\n📄 *Ver Ficha Técnica y Boletín PDF en alta calidad:*\n"
        f"{link_boletin}\n\n"
        f"¡Agradecemos el compromiso y acompañamiento a su desarrollo deportivo! 👏🏼⚽"
    )

    clean_tel = format_paraguay_phone(telefono) or telefono.replace("+", "").replace(" ", "").replace("-", "")
    whatsapp_url = f"https://api.whatsapp.com/send?phone={clean_tel}&text={msg}"

    # Intento de envío vía Evolution API
    sent_auto = False
    error_msg = None
    try:
        res_send = await send_whatsapp_text(telefono, msg)
        sent_auto = bool(res_send.get("success"))
        if not sent_auto:
            error_msg = res_send.get("error")
    except Exception as e:
        error_msg = str(e)

    return {
        "success": True,
        "enviado_automatico": sent_auto,
        "telefono": clean_tel,
        "alumno": alumno,
        "tutor": tutor,
        "mensaje": msg,
        "whatsapp_url": whatsapp_url,
        "error_gateway": error_msg if not sent_auto else None,
    }


# ================================================================
# RUTA PÚBLICA PARA EL PADRE / BOLETÍN
# ================================================================

@public_router.get("/{evaluacion_id}")
async def ver_boletin_publico(
    evaluacion_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Vista pública del boletín oficial del atleta para que los padres puedan abrirlo
    desde el enlace de WhatsApp en su celular y descargarlo en PDF.
    """
    await _ensure_evaluaciones_table(session)

    res = await session.execute(text("""
        SELECT 
            e.id, e.fecha, e.periodo, e.titulo, e.tipo, e.posicion, e.pierna_habil, e.dorsal,
            e.altura_cm, e.peso_kg, e.promedio_general, e.promedio_tecnico, e.promedio_tactico,
            e.promedio_fisico, e.promedio_actitudinal, e.nivel_global, e.fundamentos,
            e.fortalezas, e.areas_mejora, e.recomendaciones, e.observaciones, e.evaluador_nombre,
            a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.foto_perfil AS alumno_foto,
            a.fecha_nacimiento AS alumno_fecha_nac,
            cat.nombre AS categoria_nombre,
            acad.nombre AS academia_nombre, acad.logo_url AS academia_logo, acad.telefono AS academia_telefono,
            acad.email AS academia_email, acad.ciudad AS academia_ciudad
        FROM academias.evaluaciones e
        JOIN academias.academias acad ON acad.id = e.academia_id
        JOIN academias.alumnos a ON a.id = e.alumno_id
        LEFT JOIN academias.categorias cat ON cat.id = e.categoria_id
        WHERE e.id = CAST(:eid AS UUID) AND e.estado = 'publicado'
    """), {"eid": evaluacion_id})
    r = res.fetchone()

    if not r:
        raise HTTPException(status_code=404, detail="Boletín no encontrado o no publicado.")

    fundamentos_data = r.fundamentos
    if isinstance(fundamentos_data, str):
        try: fundamentos_data = json.loads(fundamentos_data)
        except Exception: fundamentos_data = []

    fn = r.alumno_fecha_nac
    edad = None
    if fn:
        today = date.today()
        edad = today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))

    return {
        "id": str(r.id),
        "academia_nombre": r.academia_nombre,
        "academia_logo": r.academia_logo,
        "academia_telefono": r.academia_telefono,
        "academia_email": r.academia_email,
        "academia_ciudad": r.academia_ciudad,
        "alumno_nombre": f"{r.alumno_nombre} {r.alumno_apellido or ''}".strip(),
        "alumno_foto": r.alumno_foto,
        "alumno_edad": edad,
        "categoria_nombre": r.categoria_nombre,
        "fecha": r.fecha.isoformat() if r.fecha else None,
        "periodo": r.periodo,
        "titulo": r.titulo,
        "posicion": r.posicion,
        "pierna_habil": r.pierna_habil,
        "dorsal": r.dorsal,
        "altura_cm": float(r.altura_cm) if r.altura_cm is not None else None,
        "peso_kg": float(r.peso_kg) if r.peso_kg is not None else None,
        "promedio_general": float(r.promedio_general or 0),
        "promedio_tecnico": float(r.promedio_tecnico or 0),
        "promedio_tactico": float(r.promedio_tactico or 0),
        "promedio_fisico": float(r.promedio_fisico or 0),
        "promedio_actitudinal": float(r.promedio_actitudinal or 0),
        "nivel_global": r.nivel_global,
        "fundamentos": fundamentos_data,
        "fortalezas": r.fortalezas,
        "areas_mejora": r.areas_mejora,
        "recomendaciones": r.recomendaciones,
        "observaciones": r.observaciones,
        "evaluador_nombre": r.evaluador_nombre,
    }
