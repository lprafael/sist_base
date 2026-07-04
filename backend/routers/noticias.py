from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
import os

from database import get_session
from auth import get_current_user

router = APIRouter(prefix="/api/noticias", tags=["noticias"])

# Variable preparada para integración futura (Requerimiento del usuario)
# TODO: Configurar en .env cuando se implemente Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

class NoticiaCreate(BaseModel):
    torneo_id: str
    titulo: str
    contenido: str
    autor: Optional[str] = "Organización"
    es_ia: bool = False
    prompt_usado: Optional[str] = None

class IA_Prompt(BaseModel):
    torneo_id: str
    contexto: str # Ej: "El partido finalizó 3 a 2 con un gol de tiro libre en el último minuto"

@router.get("/torneo/{torneo_id}")
async def get_noticias_torneo(torneo_id: str, session: AsyncSession = Depends(get_session)):
    q = text("""
        SELECT id, titulo, contenido, autor, fecha_publicacion, es_ia 
        FROM torneos.noticias 
        WHERE torneo_id = :torneo_id
        ORDER BY fecha_publicacion DESC
    """)
    res = await session.execute(q, {"torneo_id": torneo_id})
    return [{"id": r.id, "titulo": r.titulo, "contenido": r.contenido, "autor": r.autor, "fecha_publicacion": r.fecha_publicacion, "es_ia": r.es_ia} for r in res.fetchall()]

@router.post("/")
async def create_noticia(payload: NoticiaCreate, session: AsyncSession = Depends(get_session), current_user = Depends(get_current_user)):
    q = text("""
        INSERT INTO torneos.noticias (torneo_id, titulo, contenido, autor, es_ia, prompt_usado)
        VALUES (:torneo_id, :titulo, :contenido, :autor, :es_ia, :prompt_usado)
        RETURNING id
    """)
    res = await session.execute(q, {
        "torneo_id": payload.torneo_id,
        "titulo": payload.titulo,
        "contenido": payload.contenido,
        "autor": payload.autor,
        "es_ia": payload.es_ia,
        "prompt_usado": payload.prompt_usado
    })
    await session.commit()
    return {"id": res.scalar(), "mensaje": "Noticia publicada exitosamente."}

@router.delete("/{noticia_id}")
async def delete_noticia(noticia_id: str, session: AsyncSession = Depends(get_session), current_user = Depends(get_current_user)):
    q = text("DELETE FROM torneos.noticias WHERE id = :id RETURNING id")
    res = await session.execute(q, {"id": noticia_id})
    if not res.scalar():
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    await session.commit()
    return {"mensaje": "Noticia eliminada"}

@router.post("/generar-ia")
async def generar_noticia_ia(payload: IA_Prompt, current_user = Depends(get_current_user)):
    """
    Endpoint preparado para generar noticias usando Inteligencia Artificial.
    Actualmente devuelve un mock para que el frontend pueda implementarlo.
    """
    if not GEMINI_API_KEY:
        # Aquí irá la lógica de integración con google-genai
        # ej: client = genai.Client(api_key=GEMINI_API_KEY)
        # response = client.models.generate_content(...)
        
        # MOCK de respuesta para que el frontend pueda avanzar
        return {
            "titulo": "¡Increíble jornada en el torneo!",
            "contenido": f"La inteligencia artificial redactará aquí una crónica basada en: {payload.contexto}. \n\n[NOTA: Integración de Gemini pendiente de activación. Configure GEMINI_API_KEY y añada la librería google-genai]",
            "es_ia": True
        }
    
    # Placeholder si la API estuviera activa
    return {"error": "Lógica de IA no implementada aún, pero API_KEY detectada."}
