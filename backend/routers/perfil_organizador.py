from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from database import get_session
from security import get_current_user

router = APIRouter(tags=["Perfil Organizador"])

class PerfilOrganizadorRequest(BaseModel):
    enlace_sitio: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    color_primario: Optional[str] = '#1e3a8a'
    texto_1: Optional[str] = None
    texto_2: Optional[str] = None
    visibilidad: Optional[str] = 'publico'
    tipo_sede: Optional[str] = 'fisico'

@router.get("/organizador/perfil")
async def obtener_perfil_organizador(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT enlace_sitio, logo_url, banner_url, color_primario, texto_1, texto_2, visibilidad, tipo_sede
        FROM sistema.perfil_organizador 
        WHERE usuario_id = :uid
    """)
    res = await session.execute(query, {"uid": current_user["user_id"]})
    row = res.fetchone()
    
    if not row:
        return {
            "enlace_sitio": None, "logo_url": None, "banner_url": None,
            "color_primario": "#1e3a8a", "texto_1": "", "texto_2": "",
            "visibilidad": "publico", "tipo_sede": "fisico"
        }
        
    return {
        "enlace_sitio": row[0], "logo_url": row[1], "banner_url": row[2],
        "color_primario": row[3], "texto_1": row[4], "texto_2": row[5],
        "visibilidad": row[6], "tipo_sede": row[7]
    }

@router.post("/organizador/perfil")
async def guardar_perfil_organizador(data: PerfilOrganizadorRequest, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    
    # 1. Verificar si el enlace está tomado por otro usuario
    if data.enlace_sitio:
        check = await session.execute(text("SELECT usuario_id FROM sistema.perfil_organizador WHERE enlace_sitio = :enlace AND usuario_id != :uid"), {"enlace": data.enlace_sitio, "uid": current_user["user_id"]})
        if check.fetchone():
            raise HTTPException(status_code=400, detail="El enlace del sitio ya está en uso por otro organizador.")

    # 2. Upsert
    query = text("""
        INSERT INTO sistema.perfil_organizador 
            (usuario_id, enlace_sitio, logo_url, banner_url, color_primario, texto_1, texto_2, visibilidad, tipo_sede)
        VALUES 
            (:uid, :enlace, :logo, :banner, :color, :t1, :t2, :vis, :sede)
        ON CONFLICT (usuario_id) DO UPDATE SET
            enlace_sitio = EXCLUDED.enlace_sitio,
            logo_url = EXCLUDED.logo_url,
            banner_url = EXCLUDED.banner_url,
            color_primario = EXCLUDED.color_primario,
            texto_1 = EXCLUDED.texto_1,
            texto_2 = EXCLUDED.texto_2,
            visibilidad = EXCLUDED.visibilidad,
            tipo_sede = EXCLUDED.tipo_sede,
            actualizado_en = NOW()
    """)
    
    await session.execute(query, {
        "uid": current_user["user_id"],
        "enlace": data.enlace_sitio,
        "logo": data.logo_url,
        "banner": data.banner_url,
        "color": data.color_primario,
        "t1": data.texto_1,
        "t2": data.texto_2,
        "vis": data.visibilidad,
        "sede": data.tipo_sede
    })
    
    await session.commit()
    return {"message": "Perfil de organizador guardado exitosamente"}
