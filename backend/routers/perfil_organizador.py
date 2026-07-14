from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import uuid
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
    acerca_de: Optional[str] = None
    idioma: Optional[str] = 'Spanish'
    pais: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    ubicacion_exacta: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    twitch: Optional[str] = None
    twitter: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    opcion_chat: Optional[bool] = False
    opcion_publicidad: Optional[str] = 'ninguno'
    posicion_banner: Optional[str] = 'inferior_flotante'

@router.get("/organizador/perfil")
async def obtener_perfil_organizador(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    query = text("""
        SELECT enlace_sitio, logo_url, banner_url, color_primario, texto_1, texto_2, visibilidad, tipo_sede,
               acerca_de, idioma, pais, departamento, ciudad, ubicacion_exacta,
               facebook, instagram, youtube, twitch, twitter, whatsapp, email, telefono, opcion_chat, opcion_publicidad, posicion_banner
        FROM sistema.perfil_organizador 
        WHERE usuario_id = :uid
    """)
    res = await session.execute(query, {"uid": current_user["user_id"]})
    row = res.fetchone()
    
    if not row:
        return {
            "enlace_sitio": None, "logo_url": None, "banner_url": None,
            "color_primario": "#1e3a8a", "texto_1": "", "texto_2": "",
            "visibilidad": "publico", "tipo_sede": "fisico",
            "acerca_de": "", "idioma": "Spanish", "pais": "", "departamento": "", "ciudad": "", "ubicacion_exacta": "",
            "facebook": "", "instagram": "", "youtube": "", "twitch": "", "twitter": "", "whatsapp": "",
            "email": "", "telefono": "", "opcion_chat": False, "opcion_publicidad": "ninguno", "posicion_banner": "inferior_flotante"
        }
        
    return {
        "enlace_sitio": row[0], "logo_url": row[1], "banner_url": row[2],
        "color_primario": row[3], "texto_1": row[4], "texto_2": row[5],
        "visibilidad": row[6], "tipo_sede": row[7],
        "acerca_de": row[8], "idioma": row[9], "pais": row[10], "departamento": row[11], "ciudad": row[12], "ubicacion_exacta": row[13],
        "facebook": row[14], "instagram": row[15], "youtube": row[16], "twitch": row[17], "twitter": row[18], "whatsapp": row[19],
        "email": row[20], "telefono": row[21], "opcion_chat": row[22], "opcion_publicidad": row[23],
        "posicion_banner": row[24]
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
            (usuario_id, enlace_sitio, logo_url, banner_url, color_primario, texto_1, texto_2, visibilidad, tipo_sede,
             acerca_de, idioma, pais, departamento, ciudad, ubicacion_exacta,
             facebook, instagram, youtube, twitch, twitter, whatsapp, email, telefono, opcion_chat, opcion_publicidad, posicion_banner)
        VALUES 
            (:uid, :enlace, :logo, :banner, :color, :t1, :t2, :vis, :sede,
             :acerca_de, :idioma, :pais, :departamento, :ciudad, :ubicacion_exacta,
             :facebook, :instagram, :youtube, :twitch, :twitter, :whatsapp, :email, :telefono, :opcion_chat, :opcion_publicidad, :posicion_banner)
        ON CONFLICT (usuario_id) DO UPDATE SET
            enlace_sitio = EXCLUDED.enlace_sitio,
            logo_url = EXCLUDED.logo_url,
            banner_url = EXCLUDED.banner_url,
            color_primario = EXCLUDED.color_primario,
            texto_1 = EXCLUDED.texto_1,
            texto_2 = EXCLUDED.texto_2,
            visibilidad = EXCLUDED.visibilidad,
            tipo_sede = EXCLUDED.tipo_sede,
            acerca_de = EXCLUDED.acerca_de,
            idioma = EXCLUDED.idioma,
            pais = EXCLUDED.pais,
            departamento = EXCLUDED.departamento,
            ciudad = EXCLUDED.ciudad,
            ubicacion_exacta = EXCLUDED.ubicacion_exacta,
            facebook = EXCLUDED.facebook,
            instagram = EXCLUDED.instagram,
            youtube = EXCLUDED.youtube,
            twitch = EXCLUDED.twitch,
            twitter = EXCLUDED.twitter,
            whatsapp = EXCLUDED.whatsapp,
            email = EXCLUDED.email,
            telefono = EXCLUDED.telefono,
            opcion_chat = EXCLUDED.opcion_chat,
            opcion_publicidad = EXCLUDED.opcion_publicidad,
            posicion_banner = EXCLUDED.posicion_banner,
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
        "sede": data.tipo_sede,
        "acerca_de": data.acerca_de,
        "idioma": data.idioma,
        "pais": data.pais,
        "departamento": data.departamento,
        "ciudad": data.ciudad,
        "ubicacion_exacta": data.ubicacion_exacta,
        "facebook": data.facebook,
        "instagram": data.instagram,
        "youtube": data.youtube,
        "twitch": data.twitch,
        "twitter": data.twitter,
        "whatsapp": data.whatsapp,
        "email": data.email,
        "telefono": data.telefono,
        "opcion_chat": data.opcion_chat,
        "opcion_publicidad": data.opcion_publicidad,
        "posicion_banner": data.posicion_banner
    })
    
    await session.commit()
    return {"message": "Perfil de organizador guardado exitosamente"}

@router.post("/organizador/perfil/logo", summary="Subir logo del organizador")
async def upload_organizador_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "perfil_org")
        os.makedirs(upload_dir, exist_ok=True)

        ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        filename = f"logo_org_{current_user['user_id']}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(upload_dir, filename)

        with open(filepath, "wb") as buffer:
            buffer.write(await file.read())

        url = f"https://api.micancha.com.py/static/uploads/perfil_org/{filename}"
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/organizador/perfil/banner", summary="Subir banner del organizador")
async def upload_organizador_banner(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "perfil_org")
        os.makedirs(upload_dir, exist_ok=True)

        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"banner_org_{current_user['user_id']}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(upload_dir, filename)

        with open(filepath, "wb") as buffer:
            buffer.write(await file.read())

        url = f"https://api.micancha.com.py/static/uploads/perfil_org/{filename}"
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
