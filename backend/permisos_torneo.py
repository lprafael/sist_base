"""
permisos_torneo.py
Quién puede operar un torneo (mesa, Video Review, llaves, pesaje):
el organizador dueño del torneo o un administrador del sistema.
"""
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

ROLES_ADMIN = {"admin", "super", "superadmin"}


def _rol(user: dict) -> str:
    return str(user.get("role") or user.get("rol") or "").lower()


async def verificar_gestor_torneo(session: AsyncSession, torneo_id: Optional[str], user: dict) -> None:
    """Lanza 403 si el usuario no es admin ni el organizador dueño del torneo."""
    if _rol(user) in ROLES_ADMIN:
        return
    if not torneo_id:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    uid = user.get("user_id") or user.get("id")
    es_dueno = (await session.execute(text("""
        SELECT 1
        FROM torneos.torneos t
        JOIN cancha.organizadores o ON o.id = t.organizador_id
        WHERE t.id::text = :tid AND o.usuario_id = :uid
    """), {"tid": str(torneo_id), "uid": uid})).scalar()
    if not es_dueno:
        raise HTTPException(
            status_code=403,
            detail="Solo el organizador de este torneo o un administrador puede realizar esta acción.",
        )


async def torneo_de_partido(session: AsyncSession, partido_id: str) -> Optional[str]:
    return (await session.execute(
        text("SELECT torneo_id::text FROM torneos.partidos WHERE id::text = :pid"),
        {"pid": str(partido_id)},
    )).scalar()


async def verificar_gestor_partido(session: AsyncSession, partido_id: str, user: dict) -> None:
    await verificar_gestor_torneo(session, await torneo_de_partido(session, partido_id), user)
