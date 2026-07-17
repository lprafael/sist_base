from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
import os
import uuid
import shutil
from pathlib import Path

from database import get_session
from security import get_current_user

router = APIRouter(prefix="/multimedia", tags=["Multimedia"])

# Directorio donde se guardarán las subidas
UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    torneo_id: Optional[str] = Form(None),
    tipo_medio: str = Form('galeria'),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="No autenticado")
        
    try:
        # Generar nombre único
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = UPLOAD_DIR / filename
        
        # Guardar archivo físicamente
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        url = f"/static/uploads/{filename}"
        
        # Validar torneo_id si se provee
        t_id = f"'{torneo_id}'" if torneo_id and torneo_id != 'undefined' and torneo_id.strip() != '' else "NULL"
        
        query = text(f"""
            INSERT INTO cancha.multimedia (organizador_id, torneo_id, tipo_medio, url)
            VALUES (:org_id, {t_id}, :tipo, :url)
            RETURNING id, url, creado_en
        """)
        
        res = await session.execute(query, {
            "org_id": current_user["id"],
            "tipo": tipo_medio,
            "url": url
        })
        await session.commit()
        row = res.fetchone()
        
        return {
            "id": row[0],
            "url": row[1],
            "creado_en": row[2]
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/torneo/{torneo_id}")
async def get_multimedia_torneo(
    torneo_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        query = text("""
            SELECT id, tipo_medio, url, creado_en
            FROM cancha.multimedia
            WHERE torneo_id = :torneo_id
            ORDER BY creado_en DESC
        """)
        res = await session.execute(query, {"torneo_id": torneo_id})
        rows = res.fetchall()
        return [{"id": r[0], "tipo_medio": r[1], "url": r[2], "creado_en": r[3]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/organizador")
async def get_multimedia_organizador(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="No autenticado")
        
    try:
        query = text("""
            SELECT id, tipo_medio, url, creado_en, torneo_id
            FROM cancha.multimedia
            WHERE organizador_id = :org_id
            ORDER BY creado_en DESC
        """)
        res = await session.execute(query, {"org_id": current_user["id"]})
        rows = res.fetchall()
        return [{"id": r[0], "tipo_medio": r[1], "url": r[2], "creado_en": r[3], "torneo_id": r[4]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
