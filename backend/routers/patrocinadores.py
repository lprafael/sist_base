from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from database import get_session
from security import get_current_user

router = APIRouter(tags=["Patrocinadores"])

class PatrocinadorRequest(BaseModel):
    titulo: str
    logo_url: Optional[str] = None
    banner_app_url: Optional[str] = None
    banner_sitio_url: Optional[str] = None
    tiempo_banner: Optional[int] = 7
    sitio_web: Optional[str] = None
    telefono: Optional[str] = None

@router.get("/api/patrocinadores")
async def listar_patrocinadores(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    res = await session.execute(text("SELECT id, titulo, logo_url, banner_app_url, banner_sitio_url, tiempo_banner, sitio_web, telefono FROM sistema.patrocinadores WHERE usuario_id = :uid ORDER BY id DESC"), {"uid": current_user["user_id"]})
    rows = res.fetchall()
    return [
        {
            "id": r[0], "titulo": r[1], "logo_url": r[2], "banner_app_url": r[3],
            "banner_sitio_url": r[4], "tiempo_banner": r[5], "sitio_web": r[6], "telefono": r[7]
        } for r in rows
    ]

@router.post("/api/patrocinadores")
async def crear_patrocinador(data: PatrocinadorRequest, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    query = text("""
        INSERT INTO sistema.patrocinadores 
        (usuario_id, titulo, logo_url, banner_app_url, banner_sitio_url, tiempo_banner, sitio_web, telefono)
        VALUES (:uid, :tit, :logo, :b_app, :b_sitio, :tiempo, :web, :tel)
        RETURNING id
    """)
    res = await session.execute(query, {
        "uid": current_user["user_id"],
        "tit": data.titulo,
        "logo": data.logo_url,
        "b_app": data.banner_app_url,
        "b_sitio": data.banner_sitio_url,
        "tiempo": data.tiempo_banner,
        "web": data.sitio_web,
        "tel": data.telefono
    })
    new_id = res.scalar()
    await session.commit()
    return {"id": new_id, "message": "Patrocinador creado"}

@router.put("/api/patrocinadores/{patrocinador_id}")
async def editar_patrocinador(patrocinador_id: int, data: PatrocinadorRequest, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    check = await session.execute(text("SELECT id FROM sistema.patrocinadores WHERE id = :pid AND usuario_id = :uid"), {"pid": patrocinador_id, "uid": current_user["user_id"]})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="No encontrado")

    query = text("""
        UPDATE sistema.patrocinadores SET
        titulo = :tit, logo_url = :logo, banner_app_url = :b_app, banner_sitio_url = :b_sitio,
        tiempo_banner = :tiempo, sitio_web = :web, telefono = :tel
        WHERE id = :pid
    """)
    await session.execute(query, {
        "tit": data.titulo,
        "logo": data.logo_url,
        "b_app": data.banner_app_url,
        "b_sitio": data.banner_sitio_url,
        "tiempo": data.tiempo_banner,
        "web": data.sitio_web,
        "tel": data.telefono,
        "pid": patrocinador_id
    })
    await session.commit()
    return {"message": "Patrocinador actualizado"}

@router.delete("/api/patrocinadores/{patrocinador_id}")
async def eliminar_patrocinador(patrocinador_id: int, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    check = await session.execute(text("SELECT id FROM sistema.patrocinadores WHERE id = :pid AND usuario_id = :uid"), {"pid": patrocinador_id, "uid": current_user["user_id"]})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="No encontrado")

    await session.execute(text("DELETE FROM sistema.patrocinadores WHERE id = :pid"), {"pid": patrocinador_id})
    await session.commit()
    return {"message": "Patrocinador eliminado"}
