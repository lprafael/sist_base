"""
routers/guias.py
Gestión de Guías y Documentaciones públicas de la plataforma MiCancha.
Permite listar materiales públicos y administrarlos (CRUD + subida de archivos)
desde el panel de administración.
"""
from __future__ import annotations

import os
import re
import shutil
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from security import get_current_user

router = APIRouter(prefix="/api/guias", tags=["Guías y Documentaciones"])

ROLES_ADMIN = {"admin", "super", "superadmin", "administrador"}


def _require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    rol = str(current_user.get("role") or current_user.get("rol") or "").lower()
    if rol not in ROLES_ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden gestionar guías y documentaciones.")
    return current_user


_schema_ready = False


async def _ensure_schema(session: AsyncSession):
    global _schema_ready
    if _schema_ready:
        return
    await session.execute(text("CREATE SCHEMA IF NOT EXISTS cancha"))
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS cancha.guias_documentacion (
            id SERIAL PRIMARY KEY,
            titulo VARCHAR(200) NOT NULL,
            descripcion TEXT DEFAULT '',
            tipo VARCHAR(30) NOT NULL DEFAULT 'guia',
            categoria VARCHAR(80) DEFAULT 'General',
            url VARCHAR(600) NOT NULL,
            orden INTEGER DEFAULT 0,
            activo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """))
    count = (await session.execute(text("SELECT COUNT(*) FROM cancha.guias_documentacion"))).scalar() or 0
    if count == 0:
        await session.execute(
            text("""
                INSERT INTO cancha.guias_documentacion (titulo, descripcion, tipo, categoria, url, orden, activo)
                VALUES
                (
                    'Tutorial — Torneo de Karate WKF',
                    'Guía paso a paso con capturas reales para crear, configurar, pesar atletas, armar llaves y arbitrar torneos de Karate WKF con Video Review.',
                    'guia',
                    'Karate WKF',
                    '/guia_torneo_karate/index.html',
                    1,
                    TRUE
                ),
                (
                    'Video Tutorial — Plataforma Mi Cancha',
                    'Demostración en video sobre el uso y operación de la plataforma Mi Cancha.',
                    'video',
                    'Karate WKF',
                    'https://youtu.be/zNBAPoPXAPc?si=0vmwWZJW1P1sgEId',
                    2,
                    TRUE
                );
            """)
        )
    await session.commit()
    _schema_ready = True


class GuiaPayload(BaseModel):
    titulo: str
    descripcion: Optional[str] = ""
    tipo: str = "guia"  # guia | video | pdf | enlace
    categoria: Optional[str] = "General"
    url: str
    orden: Optional[int] = 0
    activo: Optional[bool] = True


def _serialize(row) -> dict:
    return {
        "id": row.id,
        "titulo": row.titulo,
        "descripcion": row.descripcion or "",
        "tipo": row.tipo or "guia",
        "categoria": row.categoria or "General",
        "url": row.url,
        "orden": row.orden or 0,
        "activo": bool(row.activo),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("")
async def listar_guias_publicas(session: AsyncSession = Depends(get_session)):
    """Lista las guías y documentaciones activas para la pantalla principal."""
    await _ensure_schema(session)
    res = await session.execute(
        text("""
            SELECT id, titulo, descripcion, tipo, categoria, url, orden, activo, created_at, updated_at
            FROM cancha.guias_documentacion
            WHERE activo = TRUE
            ORDER BY orden ASC, id ASC
        """)
    )
    return [_serialize(r) for r in res.fetchall()]


@router.get("/admin")
async def listar_guias_admin(
    session: AsyncSession = Depends(get_session),
    _admin: dict = Depends(_require_admin),
):
    """Lista todas las guías (activas e inactivas) para el panel de administración."""
    await _ensure_schema(session)
    res = await session.execute(
        text("""
            SELECT id, titulo, descripcion, tipo, categoria, url, orden, activo, created_at, updated_at
            FROM cancha.guias_documentacion
            ORDER BY orden ASC, id ASC
        """)
    )
    return [_serialize(r) for r in res.fetchall()]


@router.post("")
async def crear_guia(
    body: GuiaPayload,
    session: AsyncSession = Depends(get_session),
    _admin: dict = Depends(_require_admin),
):
    await _ensure_schema(session)
    titulo = body.titulo.strip()
    url = body.url.strip()
    if not titulo or not url:
        raise HTTPException(status_code=400, detail="Título y URL son obligatorios.")
    tipo = (body.tipo or "guia").strip().lower()
    if tipo not in {"guia", "video", "pdf", "enlace"}:
        tipo = "guia"
    res = await session.execute(
        text("""
            INSERT INTO cancha.guias_documentacion (titulo, descripcion, tipo, categoria, url, orden, activo)
            VALUES (:titulo, :descripcion, :tipo, :categoria, :url, :orden, :activo)
            RETURNING id, titulo, descripcion, tipo, categoria, url, orden, activo, created_at, updated_at
        """),
        {
            "titulo": titulo[:200],
            "descripcion": (body.descripcion or "").strip(),
            "tipo": tipo,
            "categoria": (body.categoria or "General").strip()[:80] or "General",
            "url": url[:600],
            "orden": int(body.orden or 0),
            "activo": bool(body.activo if body.activo is not None else True),
        },
    )
    row = res.fetchone()
    await session.commit()
    return _serialize(row)


@router.put("/{guia_id}")
async def actualizar_guia(
    guia_id: int,
    body: GuiaPayload,
    session: AsyncSession = Depends(get_session),
    _admin: dict = Depends(_require_admin),
):
    await _ensure_schema(session)
    titulo = body.titulo.strip()
    url = body.url.strip()
    if not titulo or not url:
        raise HTTPException(status_code=400, detail="Título y URL son obligatorios.")
    tipo = (body.tipo or "guia").strip().lower()
    if tipo not in {"guia", "video", "pdf", "enlace"}:
        tipo = "guia"
    res = await session.execute(
        text("""
            UPDATE cancha.guias_documentacion
            SET titulo = :titulo,
                descripcion = :descripcion,
                tipo = :tipo,
                categoria = :categoria,
                url = :url,
                orden = :orden,
                activo = :activo,
                updated_at = NOW()
            WHERE id = :id
            RETURNING id, titulo, descripcion, tipo, categoria, url, orden, activo, created_at, updated_at
        """),
        {
            "id": guia_id,
            "titulo": titulo[:200],
            "descripcion": (body.descripcion or "").strip(),
            "tipo": tipo,
            "categoria": (body.categoria or "General").strip()[:80] or "General",
            "url": url[:600],
            "orden": int(body.orden or 0),
            "activo": bool(body.activo if body.activo is not None else True),
        },
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")
    await session.commit()
    return _serialize(row)


@router.delete("/{guia_id}")
async def eliminar_guia(
    guia_id: int,
    session: AsyncSession = Depends(get_session),
    _admin: dict = Depends(_require_admin),
):
    await _ensure_schema(session)
    res = await session.execute(
        text("DELETE FROM cancha.guias_documentacion WHERE id = :id RETURNING id"),
        {"id": guia_id},
    )
    if not res.fetchone():
        raise HTTPException(status_code=404, detail="Guía no encontrada.")
    await session.commit()
    return {"ok": True, "id": guia_id}


@router.post("/upload")
async def subir_archivo_guia(
    request: Request,
    file: UploadFile = File(...),
    _admin: dict = Depends(_require_admin),
):
    """Permite subir un PDF o documento HTML desde el panel admin para enlazarlo como guía."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".pdf", ".html", ".htm", ".doc", ".docx"}:
        raise HTTPException(status_code=400, detail="Formato permitido: .pdf, .html, .htm, .doc, .docx")
    upload_dir = os.path.join("static", "uploads", "guias")
    os.makedirs(upload_dir, exist_ok=True)
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", Path(file.filename or "guia").stem)[:60]
    filename = f"{stem}_{int(time.time())}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as out:
        shutil.copyfileobj(file.file, out)

    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    if "micancha.com.py" in host or os.name != "nt":
        base = "https://api.micancha.com.py"
    else:
        base = f"http://{host or 'localhost:8002'}"
    return {"ok": True, "url": f"{base}/static/uploads/guias/{filename}", "filename": filename}
