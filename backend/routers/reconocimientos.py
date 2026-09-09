"""
Router para Menciones, Reconocimientos y Placas Conmemorativas
Permite a los organizadores de torneos crear, listar, editar y personalizar
menciones de agradecimiento y diplomas de honor con plantillas imprimibles.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_session
from security import get_current_user

router = APIRouter(tags=["Menciones y Reconocimientos"])

class ReconocimientoRequest(BaseModel):
    torneo_id: Optional[str] = None
    titulo: str
    subtitulo: Optional[str] = None
    destinatario: str
    texto_agradecimiento: str
    otorgado_por: Optional[str] = "El Comité Organizador"
    ciudad_fecha: Optional[str] = None
    plantilla: Optional[str] = "placa_madera"
    logo_url: Optional[str] = None
    firma_url: Optional[str] = None
    cargo_firmante: Optional[str] = None
    nombre_firmante: Optional[str] = None

@router.get("/api/reconocimientos")
async def listar_reconocimientos(
    torneo_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query_str = """
        SELECT id, usuario_id, torneo_id, titulo, subtitulo, destinatario,
               texto_agradecimiento, otorgado_por, ciudad_fecha, plantilla,
               logo_url, firma_url, cargo_firmante, nombre_firmante, created_at, updated_at
        FROM sistema.reconocimientos
        WHERE usuario_id = :uid
    """
    params = {"uid": current_user["user_id"]}
    if torneo_id:
        query_str += " AND torneo_id = :tid"
        params["tid"] = str(torneo_id)

    query_str += " ORDER BY id DESC"
    res = await session.execute(text(query_str), params)
    rows = res.fetchall()

    return [
        {
            "id": r[0],
            "usuario_id": r[1],
            "torneo_id": r[2],
            "titulo": r[3],
            "subtitulo": r[4],
            "destinatario": r[5],
            "texto_agradecimiento": r[6],
            "otorgado_por": r[7],
            "ciudad_fecha": r[8],
            "plantilla": r[9],
            "logo_url": r[10],
            "firma_url": r[11],
            "cargo_firmante": r[12],
            "nombre_firmante": r[13],
            "created_at": r[14].isoformat() if r[14] else None,
            "updated_at": r[15].isoformat() if r[15] else None
        }
        for r in rows
    ]

@router.get("/api/reconocimientos/{reconocimiento_id}")
async def obtener_reconocimiento(
    reconocimiento_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(
        text("""
            SELECT id, usuario_id, torneo_id, titulo, subtitulo, destinatario,
                   texto_agradecimiento, otorgado_por, ciudad_fecha, plantilla,
                   logo_url, firma_url, cargo_firmante, nombre_firmante, created_at, updated_at
            FROM sistema.reconocimientos
            WHERE id = :rid AND usuario_id = :uid
        """),
        {"rid": reconocimiento_id, "uid": current_user["user_id"]}
    )
    r = res.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Mención o reconocimiento no encontrado")

    return {
        "id": r[0],
        "usuario_id": r[1],
        "torneo_id": r[2],
        "titulo": r[3],
        "subtitulo": r[4],
        "destinatario": r[5],
        "texto_agradecimiento": r[6],
        "otorgado_por": r[7],
        "ciudad_fecha": r[8],
        "plantilla": r[9],
        "logo_url": r[10],
        "firma_url": r[11],
        "cargo_firmante": r[12],
        "nombre_firmante": r[13],
        "created_at": r[14].isoformat() if r[14] else None,
        "updated_at": r[15].isoformat() if r[15] else None
    }

@router.post("/api/reconocimientos")
async def crear_reconocimiento(
    data: ReconocimientoRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = text("""
        INSERT INTO sistema.reconocimientos (
            usuario_id, torneo_id, titulo, subtitulo, destinatario,
            texto_agradecimiento, otorgado_por, ciudad_fecha, plantilla,
            logo_url, firma_url, cargo_firmante, nombre_firmante,
            created_at, updated_at
        ) VALUES (
            :uid, :tid, :tit, :sub, :dest,
            :txt, :otorg, :cf, :plantilla,
            :logo, :firma, :cargo, :nombre_f,
            NOW(), NOW()
        )
        RETURNING id
    """)
    res = await session.execute(query, {
        "uid": current_user["user_id"],
        "tid": data.torneo_id,
        "tit": data.titulo,
        "sub": data.subtitulo,
        "dest": data.destinatario,
        "txt": data.texto_agradecimiento,
        "otorg": data.otorgado_por,
        "cf": data.ciudad_fecha,
        "plantilla": data.plantilla or "placa_madera",
        "logo": data.logo_url,
        "firma": data.firma_url,
        "cargo": data.cargo_firmante,
        "nombre_f": data.nombre_firmante
    })
    new_id = res.scalar()
    await session.commit()
    return {"id": new_id, "message": "Reconocimiento guardado exitosamente"}

@router.put("/api/reconocimientos/{reconocimiento_id}")
async def editar_reconocimiento(
    reconocimiento_id: int,
    data: ReconocimientoRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    check = await session.execute(
        text("SELECT id FROM sistema.reconocimientos WHERE id = :rid AND usuario_id = :uid"),
        {"rid": reconocimiento_id, "uid": current_user["user_id"]}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Reconocimiento no encontrado")

    query = text("""
        UPDATE sistema.reconocimientos SET
            torneo_id = :tid,
            titulo = :tit,
            subtitulo = :sub,
            destinatario = :dest,
            texto_agradecimiento = :txt,
            otorgado_por = :otorg,
            ciudad_fecha = :cf,
            plantilla = :plantilla,
            logo_url = :logo,
            firma_url = :firma,
            cargo_firmante = :cargo,
            nombre_firmante = :nombre_f,
            updated_at = NOW()
        WHERE id = :rid AND usuario_id = :uid
    """)
    await session.execute(query, {
        "rid": reconocimiento_id,
        "uid": current_user["user_id"],
        "tid": data.torneo_id,
        "tit": data.titulo,
        "sub": data.subtitulo,
        "dest": data.destinatario,
        "txt": data.texto_agradecimiento,
        "otorg": data.otorgado_por,
        "cf": data.ciudad_fecha,
        "plantilla": data.plantilla or "placa_madera",
        "logo": data.logo_url,
        "firma": data.firma_url,
        "cargo": data.cargo_firmante,
        "nombre_f": data.nombre_firmante
    })
    await session.commit()
    return {"message": "Reconocimiento actualizado correctamente"}

@router.delete("/api/reconocimientos/{reconocimiento_id}")
async def eliminar_reconocimiento(
    reconocimiento_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    check = await session.execute(
        text("SELECT id FROM sistema.reconocimientos WHERE id = :rid AND usuario_id = :uid"),
        {"rid": reconocimiento_id, "uid": current_user["user_id"]}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Reconocimiento no encontrado")

    await session.execute(
        text("DELETE FROM sistema.reconocimientos WHERE id = :rid AND usuario_id = :uid"),
        {"rid": reconocimiento_id, "uid": current_user["user_id"]}
    )
    await session.commit()
    return {"message": "Reconocimiento eliminado exitosamente"}
