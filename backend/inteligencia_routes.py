"""
inteligencia_routes.py
Módulo de Inteligencia Territorial para SIGEL
Provee endpoints para:
  - Cargar insights manualmente o desde texto libre
  - Analizar texto con OpenAI (categoría, sentimiento, urgencia)
  - Generar guiones de visita territorial
  - Consultar resúmenes por zona/distrito
"""

import os
import json
import logging
from typing import List, Optional, Any
from datetime import datetime, date, timedelta

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, desc
from dotenv import load_dotenv

from database import get_session
from security import get_current_user, verify_token

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/inteligencia", tags=["Inteligencia Territorial"])

# ──────────────────────────────────────────────
# SCHEMAS PYDANTIC
# ──────────────────────────────────────────────

class InsightCreate(BaseModel):
    departamento_id: int
    distrito_id: int
    zona: Optional[str] = None
    fuente: Optional[str] = "manual"
    texto_original: Optional[str] = None
    categoria: Optional[str] = None
    sentimiento: Optional[str] = None
    urgencia: Optional[int] = None
    temas_clave: Optional[List[str]] = None
    resumen_ia: Optional[str] = None
    fecha_insight: Optional[str] = None   # ISO date string YYYY-MM-DD

class InsightAnalyzeRequest(BaseModel):
    texto: str
    departamento_id: int
    distrito_id: int
    zona: Optional[str] = None
    fuente: Optional[str] = "manual"

class GuionRequest(BaseModel):
    departamento_id: int
    distrito_id: int
    zona: Optional[str] = None
    dias_atras: int = 30          # cuántos días de insights considerar

# ──────────────────────────────────────────────
# AUTH INGEST: API Key (N8N/servicios) o Bearer (usuario)
# ──────────────────────────────────────────────

_http_bearer_optional = HTTPBearer(auto_error=False)
INGEST_API_KEY_ENV = "INTELIGENCIA_INGEST_API_KEY"
INGEST_USER_ID_ENV = "INTELIGENCIA_INGEST_USER_ID"


async def get_ingest_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_http_bearer_optional),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    Acepta autenticación por X-API-Key (para N8N/cron) o Bearer JWT (usuario).
    Devuelve {"user_id": int} para usar en creado_por.
    """
    api_key = request.headers.get("X-API-Key")
    env_key = os.getenv(INGEST_API_KEY_ENV, "").strip()
    if api_key and env_key and api_key == env_key:
        uid = os.getenv(INGEST_USER_ID_ENV, "1").strip()
        try:
            return {"user_id": int(uid)}
        except ValueError:
            return {"user_id": 1}
    if credentials:
        try:
            payload = verify_token(credentials.credentials)
            username = payload.get("sub")
            if username:
                r = await session.execute(
                    text("SELECT id FROM sistema.usuarios WHERE username = :u"),
                    {"u": username}
                )
                row = r.fetchone()
                if row:
                    return {"user_id": row[0]}
        except HTTPException:
            pass
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Requiere X-API-Key válida o Authorization: Bearer <token>",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ──────────────────────────────────────────────
# UTILIDAD: LLAMAR A OPENAI
# ──────────────────────────────────────────────

async def analizar_con_ia(texto: str) -> dict:
    """
    Intenta analizar el texto usando la IA (priorizando Gemini, luego OpenAI).
    Si no hay llaves configuradas, usa el modo demo.
    """
    # 1. Verificar si hay Gemini API Key (Gratis y Preferida)
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    # 2. Verificar OpenAI (Opcional)
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    if not gemini_key and not openai_key:
        # Modo demo: análisis simulado sin API
        return {
            "categoria": "Infraestructura",
            "sentimiento": "Negativo",
            "urgencia": 7,
            "temas_clave": ["raudales", "baches", "iluminación"],
            "resumen_ia": (
                "[MODO DEMO - Configure GEMINI_API_KEY en el .env para análisis real gratuito] "
                f"Texto recibido: {texto[:120]}..."
            )
        }

    prompt = f"""Analiza el siguiente texto en español y extrae la información en formato JSON estricto.
    
    Texto:
    \"\"\"
    {texto}
    \"\"\"

    Responde ÚNICAMENTE con este JSON (sin texto extra, sin markdown, solo el objeto):
    {{
      "categoria": "<una de: Salud, Seguridad, Infraestructura, Educación, Empleo, Medio Ambiente, Transporte, Corrupción, Servicios Públicos, Otro>",
      "sentimiento": "<uno de: Positivo, Neutro, Negativo>",
      "urgencia": <número entero del 1 al 10>,
      "temas_clave": ["<tema1>", "<tema2>", "<tema3>"],
      "resumen_ia": "<resumen en 1-2 oraciones de la queja o hallazgo>"
    }}"""

    # --- FLUJO GEMINI ---
    if gemini_key:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "response_mime_type": "application/json"
                        }
                    }
                )
                resp.raise_for_status()
                data = resp.json()
                content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return json.loads(content)
        except Exception as e:
            logger.error(f"Error en Gemini API: {e}")
            # Si falla Gemini y hay OpenAI, intentar con OpenAI
            if not openai_key:
                raise HTTPException(status_code=502, detail=f"Error al contactar Gemini: {str(e)}")

    # --- FLUJO OPENAI (Fallback) ---
    if openai_key:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                if "```json" in content:
                    content = content.replace("```json", "").replace("```", "").strip()
                return json.loads(content)
        except Exception as e:
            logger.error(f"Error llamando a OpenAI: {e}")
            raise HTTPException(status_code=502, detail=f"Error al contactar OpenAI: {str(e)}")

async def generar_guion_ia(insights: list, perfil: dict, zona: str) -> dict:
    """
    Genera 3 puntos clave de discurso para la zona indicada usando Gemini u OpenAI.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    resumen_insights = "\n".join([
        f"- [{i.get('categoria','?')}] {i.get('resumen_ia') or i.get('texto_original','')[:120]} (Urgencia: {i.get('urgencia','?')}/10)"
        for i in insights[:10]
    ])

    if not gemini_key and not openai_key:
        return {
            "punto_1": f"[MODO DEMO] Abordar la preocupación principal de {zona}: {insights[0].get('categoria','infraestructura') if insights else 'infraestructura'} deficiente.",
            "punto_2": "[MODO DEMO] Propuesta concreta que conecte con la audiencia local.",
            "punto_3": "[MODO DEMO] Mensaje de cierre empático hacia la comunidad.",
            "nota": "Configure GEMINI_API_KEY en el .env para guiones reales."
        }

    prompt = f"""Sos un estratega político de campaña en Paraguay. Basándote en los siguientes hallazgos de inteligencia territorial para la zona "{zona}":

    PROBLEMAS DETECTADOS:
    {resumen_insights}

    PERFIL DE ADHERENTES EN LA ZONA:
    - Total de simpatizantes registrados: {perfil.get('total_adherentes', 0)}
    - Grado de seguridad promedio: {perfil.get('seguridad_promedio', 0)}/5

    Redacta 3 PUNTOS CLAVE que el candidato debe mencionar en su visita para conectar emocionalmente con esta audiencia.
    Sé específico, empático y orientado a propuestas concretas.

    Responde ÚNICAMENTE con este JSON estricto (sin markdown):
    {{
      "punto_1": "<primer punto clave>",
      "punto_2": "<segundo punto clave>",
      "punto_3": "<tercer punto clave>",
      "nota": "<observación estratégica opcional>"
    }}"""

    # --- FLUJO GEMINI ---
    if gemini_key:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"response_mime_type": "application/json"}
                    }
                )
                resp.raise_for_status()
                data = resp.json()
                content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return json.loads(content)
        except Exception as e:
            logger.error(f"Error en Gemini API (Guion): {e}")
            if not openai_key:
                raise HTTPException(status_code=502, detail=f"Error al generar guion con Gemini: {str(e)}")

    # --- FLUJO OPENAI ---
    if openai_key:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.5
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                if "```json" in content:
                    content = content.replace("```json", "").replace("```", "").strip()
                return json.loads(content)
        except Exception as e:
            logger.error(f"Error generando guion con OpenAI: {e}")
            raise HTTPException(status_code=502, detail=f"Error al generar guion: {str(e)}")


# ──────────────────────────────────────────────
# ENDPOINT 1: Analizar texto y guardar insight
# ──────────────────────────────────────────────

@router.post("/analizar", summary="Analizar texto con IA y guardar como insight")
async def analizar_y_guardar(
    body: InsightAnalyzeRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Recibe un texto (queja, noticia, post de red social), lo analiza con IA
    (OpenAI), y guarda el resultado como un insight territorial.
    """
    # Obtener usuario actual
    user_result = await session.execute(
        text("SELECT id FROM sistema.usuarios WHERE username = :u"),
        {"u": current_user.get("sub")}
    )
    row = user_result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user_id = row[0]

    # Analizar con IA
    analisis = await analizar_con_ia(body.texto)

    # Insertar en BD
    result = await session.execute(
        text("""
            INSERT INTO electoral.territorial_insights
                (departamento_id, distrito_id, zona, fuente, texto_original,
                 categoria, sentimiento, urgencia, temas_clave, resumen_ia, creado_por)
            VALUES
                (:dep, :dis, :zona, :fuente, :texto,
                 :cat, :sent, :urg, :temas::jsonb, :resumen, :uid)
            RETURNING id
        """),
        {
            "dep": body.departamento_id,
            "dis": body.distrito_id,
            "zona": body.zona,
            "fuente": body.fuente,
            "texto": body.texto,
            "cat": analisis.get("categoria"),
            "sent": analisis.get("sentimiento"),
            "urg": analisis.get("urgencia"),
            "temas": json.dumps(analisis.get("temas_clave", []), ensure_ascii=False),
            "resumen": analisis.get("resumen_ia"),
            "uid": user_id,
        }
    )
    new_id = result.fetchone()[0]
    await session.commit()

    return {
        "id": new_id,
        "mensaje": "Insight guardado exitosamente",
        "analisis": analisis
    }


# ──────────────────────────────────────────────
# ENDPOINT 1b: Ingestión desde redes (API Key o Bearer) — para N8N/cron
# ──────────────────────────────────────────────

@router.post("/ingest", summary="Ingestar texto desde redes (API Key o JWT)")
async def ingest_social(
    body: InsightAnalyzeRequest,
    session: AsyncSession = Depends(get_session),
    auth: dict = Depends(get_ingest_auth),
):
    """
    Mismo flujo que POST /analizar: analiza el texto con IA y guarda el insight.
    Acepta autenticación por header X-API-Key (configurar INTELIGENCIA_INGEST_API_KEY
    y opcionalmente INTELIGENCIA_INGEST_USER_ID en .env) o por Bearer JWT.
    Pensado para N8N, Zapier, cron jobs, etc.
    """
    user_id = auth["user_id"]
    analisis = await analizar_con_ia(body.texto)
    result = await session.execute(
        text("""
            INSERT INTO electoral.territorial_insights
                (departamento_id, distrito_id, zona, fuente, texto_original,
                 categoria, sentimiento, urgencia, temas_clave, resumen_ia, creado_por)
            VALUES
                (:dep, :dis, :zona, :fuente, :texto,
                 :cat, :sent, :urg, :temas::jsonb, :resumen, :uid)
            RETURNING id
        """),
        {
            "dep": body.departamento_id,
            "dis": body.distrito_id,
            "zona": body.zona,
            "fuente": body.fuente,
            "texto": body.texto,
            "cat": analisis.get("categoria"),
            "sent": analisis.get("sentimiento"),
            "urg": analisis.get("urgencia"),
            "temas": json.dumps(analisis.get("temas_clave", []), ensure_ascii=False),
            "resumen": analisis.get("resumen_ia"),
            "uid": user_id,
        }
    )
    new_id = result.fetchone()[0]
    await session.commit()
    return {
        "id": new_id,
        "mensaje": "Insight ingerido exitosamente",
        "analisis": analisis,
    }


# ──────────────────────────────────────────────
# ENDPOINT 2: Crear insight manual (sin IA)
# ──────────────────────────────────────────────

@router.post("/insights", summary="Crear insight manual sin análisis IA")
async def crear_insight_manual(
    body: InsightCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    user_result = await session.execute(
        text("SELECT id FROM sistema.usuarios WHERE username = :u"),
        {"u": current_user.get("sub")}
    )
    row = user_result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user_id = row[0]

    fecha_ok = body.fecha_insight or str(date.today())

    result = await session.execute(
        text("""
            INSERT INTO electoral.territorial_insights
                (departamento_id, distrito_id, zona, fuente, texto_original,
                 categoria, sentimiento, urgencia, temas_clave, resumen_ia,
                 creado_por, fecha_insight)
            VALUES
                (:dep, :dis, :zona, :fuente, :texto,
                 :cat, :sent, :urg, :temas::jsonb, :resumen,
                 :uid, :fecha)
            RETURNING id
        """),
        {
            "dep": body.departamento_id,
            "dis": body.distrito_id,
            "zona": body.zona,
            "fuente": body.fuente,
            "texto": body.texto_original,
            "cat": body.categoria,
            "sent": body.sentimiento,
            "urg": body.urgencia,
            "temas": json.dumps(body.temas_clave or [], ensure_ascii=False),
            "resumen": body.resumen_ia,
            "uid": user_id,
            "fecha": fecha_ok,
        }
    )
    new_id = result.fetchone()[0]
    await session.commit()

    return {"id": new_id, "mensaje": "Insight creado exitosamente"}


# ──────────────────────────────────────────────
# ENDPOINT 3: Listar insights de un distrito
# ──────────────────────────────────────────────

@router.get("/insights", summary="Listar insights territoriales")
async def listar_insights(
    departamento_id: Optional[int] = None,
    distrito_id: Optional[int] = None,
    zona: Optional[str] = None,
    categoria: Optional[str] = None,
    sentimiento: Optional[str] = None,
    dias_atras: int = 30,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Devuelve insights filtrados por territorio, categoría, sentimiento y rango de fechas.
    """
    desde_iso = (date.today() - timedelta(days=dias_atras)).isoformat()
    filtros = ["ti.activo = TRUE", f"ti.fecha_insight >= '{desde_iso}'"]
    params: dict[str, Any] = {"limit": limit, "offset": offset}

    if departamento_id is not None:
        filtros.append("ti.departamento_id = :dep")
        params["dep"] = departamento_id
    if distrito_id is not None:
        filtros.append("ti.distrito_id = :dis")
        params["dis"] = distrito_id
    if zona:
        filtros.append("ti.zona ILIKE :zona")
        params["zona"] = f"%{zona}%"
    if categoria:
        filtros.append("ti.categoria = :cat")
        params["cat"] = categoria
    if sentimiento:
        filtros.append("ti.sentimiento = :sent")
        params["sent"] = sentimiento

    where = " AND ".join(filtros)

    result = await session.execute(
        text(f"""
            SELECT ti.id, ti.departamento_id, ti.distrito_id, ti.zona,
                   ti.fuente, ti.categoria, ti.sentimiento, ti.urgencia,
                   ti.temas_clave, ti.resumen_ia, ti.texto_original,
                   ti.fecha_insight, ti.fecha_registro,
                   rd.descripcion AS nombre_departamento,
                   rdist.descripcion AS nombre_distrito
            FROM electoral.territorial_insights ti
            LEFT JOIN electoral.ref_departamentos rd    ON rd.id = ti.departamento_id
            LEFT JOIN electoral.ref_distritos rdist
                   ON rdist.departamento_id = ti.departamento_id AND rdist.id = ti.distrito_id
            WHERE {where}
            ORDER BY ti.urgencia DESC, ti.fecha_registro DESC
            LIMIT :limit OFFSET :offset
        """),
        params
    )
    rows = result.mappings().all()

    # Total
    count_result = await session.execute(
        text(f"""
            SELECT COUNT(*) FROM electoral.territorial_insights ti
            WHERE {where}
        """),
        {k: v for k, v in params.items() if k not in ("limit", "offset")}
    )
    total = count_result.scalar()

    return {
        "total": total,
        "insights": [dict(r) for r in rows]
    }


# ──────────────────────────────────────────────
# ENDPOINT 4: Estadísticas por zona
# ──────────────────────────────────────────────

@router.get("/estadisticas", summary="Estadísticas de inteligencia territorial")
async def estadisticas_territorio(
    departamento_id: Optional[int] = None,
    distrito_id: Optional[int] = None,
    dias_atras: int = 30,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna: distribución de categorías, sentimientos, urgencia promedio y
    hallazgos por zona para el período indicado.
    """
    desde_iso = (date.today() - timedelta(days=dias_atras)).isoformat()
    filtros = ["activo = TRUE", f"fecha_insight >= '{desde_iso}'"]
    params: dict[str, Any] = {}

    if departamento_id is not None:
        filtros.append("departamento_id = :dep")
        params["dep"] = departamento_id
    if distrito_id is not None:
        filtros.append("distrito_id = :dis")
        params["dis"] = distrito_id

    where = " AND ".join(filtros)

    # Por categoría
    cat_result = await session.execute(
        text(f"""
            SELECT categoria, COUNT(*) as total
            FROM electoral.territorial_insights
            WHERE {where} AND categoria IS NOT NULL
            GROUP BY categoria ORDER BY total DESC
        """),
        params
    )
    por_categoria = [{"categoria": r[0], "total": r[1]} for r in cat_result.fetchall()]

    # Por sentimiento
    sent_result = await session.execute(
        text(f"""
            SELECT sentimiento, COUNT(*) as total
            FROM electoral.territorial_insights
            WHERE {where} AND sentimiento IS NOT NULL
            GROUP BY sentimiento ORDER BY total DESC
        """),
        params
    )
    por_sentimiento = [{"sentimiento": r[0], "total": r[1]} for r in sent_result.fetchall()]

    # Por zona (top 10)
    zona_result = await session.execute(
        text(f"""
            SELECT zona, COUNT(*) as total, ROUND(AVG(urgencia),1) as urgencia_avg,
                   MODE() WITHIN GROUP (ORDER BY sentimiento) as sentimiento_dominante,
                   MODE() WITHIN GROUP (ORDER BY categoria) as categoria_dominante
            FROM electoral.territorial_insights
            WHERE {where} AND zona IS NOT NULL
            GROUP BY zona ORDER BY urgencia_avg DESC, total DESC
            LIMIT 10
        """),
        params
    )
    por_zona = [
        {
            "zona": r[0], "total": r[1], "urgencia_avg": float(r[2] or 0),
            "sentimiento_dominante": r[3], "categoria_dominante": r[4]
        }
        for r in zona_result.fetchall()
    ]

    # Urgencia promedio global
    urg_result = await session.execute(
        text(f"""
            SELECT ROUND(AVG(urgencia),1), COUNT(*)
            FROM electoral.territorial_insights
            WHERE {where}
        """),
        params
    )
    urg_row = urg_result.fetchone()
    urgencia_global = float(urg_row[0] or 0)
    total_global = urg_row[1]

    return {
        "total_insights": total_global,
        "urgencia_promedio": urgencia_global,
        "por_categoria": por_categoria,
        "por_sentimiento": por_sentimiento,
        "por_zona": por_zona,
        "periodo_dias": dias_atras
    }


# ──────────────────────────────────────────────
# ENDPOINT 5: Generar guion de visita con IA
# ──────────────────────────────────────────────

@router.post("/generar-guion", summary="Generar guion de visita con IA")
async def generar_guion_visita(
    body: GuionRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Toma los insights recientes de la zona y el perfil de adherentes,
    y genera 3 puntos clave de discurso con IA.
    """
    user_result = await session.execute(
        text("SELECT id FROM sistema.usuarios WHERE username = :u"),
        {"u": current_user.get("sub")}
    )
    row = user_result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user_id = row[0]

    desde = str(date.today() - timedelta(days=body.dias_atras))
    filtros = [
        "activo = TRUE",
        "fecha_insight >= :desde",
        "departamento_id = :dep",
        "distrito_id = :dis"
    ]
    params: dict[str, Any] = {
        "desde": desde,
        "dep": body.departamento_id,
        "dis": body.distrito_id
    }
    if body.zona:
        filtros.append("zona ILIKE :zona")
        params["zona"] = f"%{body.zona}%"

    where = " AND ".join(filtros)

    # Obtener insights recientes
    ins_result = await session.execute(
        text(f"""
            SELECT categoria, sentimiento, urgencia, resumen_ia, texto_original
            FROM electoral.territorial_insights
            WHERE {where}
            ORDER BY urgencia DESC LIMIT 10
        """),
        params
    )
    insights_data = [dict(r) for r in ins_result.mappings().all()]

    if not insights_data:
        raise HTTPException(
            status_code=404,
            detail="No hay insights registrados para esta zona en el período indicado"
        )

    # Obtener perfil de adherentes
    perf_result = await session.execute(
        text("""
            SELECT
                COUNT(*) AS total_adherentes,
                ROUND(AVG(grado_seguridad)::numeric, 1) AS seguridad_promedio
            FROM electoral.posibles_votantes pv
            JOIN electoral.referentes r ON pv.id_referente = r.id
            JOIN sistema.usuarios u ON r.id_usuario_sistema = u.id
            WHERE u.departamento_id = :dep AND u.distrito_id = :dis
        """),
        {"dep": body.departamento_id, "dis": body.distrito_id}
    )
    perf_row = perf_result.fetchone()
    perfil = {
        "total_adherentes": perf_row[0] if perf_row else 0,
        "seguridad_promedio": float(perf_row[1] or 0) if perf_row else 0
    }

    zona_label = body.zona or "el distrito"
    guion = await generar_guion_ia(insights_data, perfil, zona_label)

    # Guardar el guion generado
    await session.execute(
        text("""
            INSERT INTO electoral.guiones_visita
                (departamento_id, distrito_id, zona, puntos_clave, perfil_audiencia, creado_por)
            VALUES
                (:dep, :dis, :zona, :puntos::jsonb, :perfil, :uid)
        """),
        {
            "dep": body.departamento_id,
            "dis": body.distrito_id,
            "zona": body.zona,
            "puntos": json.dumps(guion, ensure_ascii=False),
            "perfil": json.dumps(perfil, ensure_ascii=False),
            "uid": user_id,
        }
    )
    await session.commit()

    return {
        "zona": zona_label,
        "perfil_audiencia": perfil,
        "insights_considerados": len(insights_data),
        "guion": guion
    }


# ──────────────────────────────────────────────
# ENDPOINT 6: Eliminar insight
# ──────────────────────────────────────────────

@router.delete("/insights/{insight_id}", summary="Eliminar (desactivar) un insight")
async def eliminar_insight(
    insight_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    await session.execute(
        text("""
            UPDATE electoral.territorial_insights
            SET activo = FALSE
            WHERE id = :id
        """),
        {"id": insight_id}
    )
    await session.commit()
    return {"mensaje": "Insight eliminado"}


# ──────────────────────────────────────────────
# ENDPOINT 7: Listar guiones generados
# ──────────────────────────────────────────────

@router.get("/guiones", summary="Listar guiones de visita generados")
async def listar_guiones(
    departamento_id: Optional[int] = None,
    distrito_id: Optional[int] = None,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    filtros = []
    params: dict[str, Any] = {"limit": limit}
    if departamento_id is not None:
        filtros.append("g.departamento_id = :dep")
        params["dep"] = departamento_id
    if distrito_id is not None:
        filtros.append("g.distrito_id = :dis")
        params["dis"] = distrito_id

    where = ("WHERE " + " AND ".join(filtros)) if filtros else ""

    result = await session.execute(
        text(f"""
            SELECT g.id, g.departamento_id, g.distrito_id, g.zona,
                   g.puntos_clave, g.perfil_audiencia, g.fecha_generacion,
                   u.nombre_completo AS generado_por
            FROM electoral.guiones_visita g
            LEFT JOIN sistema.usuarios u ON u.id = g.creado_por
            {where}
            ORDER BY g.fecha_generacion DESC
            LIMIT :limit
        """),
        params
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]
