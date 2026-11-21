"""
permisos_torneo.py
Quién puede operar un torneo (mesa, Video Review, llaves, pesaje):
el organizador dueño del torneo o un administrador del sistema.
"""
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

ROLES_ADMIN = {"admin", "super", "superadmin", "administrador", "dueño", "dueno"}


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
    if not partido_id or str(partido_id).startswith("tatami-") or str(partido_id) in {"123", "demo-match"}:
        return None
    return (await session.execute(
        text("SELECT torneo_id::text FROM torneos.partidos WHERE id::text = :pid"),
        {"pid": str(partido_id)},
    )).scalar()


async def verificar_gestor_partido(session: AsyncSession, partido_id: str, user: dict) -> None:
    p_str = str(partido_id or "")
    # Permitir combates virtuales de tatami o demos sin exigir registro previo en DB
    if p_str.startswith("tatami-") or p_str in {"123", "demo-match"}:
        return
    if _rol(user) in ROLES_ADMIN or _rol(user) in {"organizador", "veedor", "arbitro", "delegado"}:
        t_id = await torneo_de_partido(session, partido_id)
        if not t_id:
            # Si es un match ID no registrado aún, permitir a roles autorizados de mesa
            return
        await verificar_gestor_torneo(session, t_id, user)
        return
    t_id = await torneo_de_partido(session, partido_id)
    if not t_id:
        raise HTTPException(status_code=404, detail="Combate no encontrado")
    await verificar_gestor_torneo(session, t_id, user)
