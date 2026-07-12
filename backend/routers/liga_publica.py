from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from database import get_session

router = APIRouter(tags=["Liga Publica"])

@router.get("/liga/{enlace_sitio}")
async def obtener_liga_publica(enlace_sitio: str, session: AsyncSession = Depends(get_session)):
    res = await session.execute(text("""
        SELECT o.id as org_id, po.logo_url, po.banner_url, po.color_primario, po.texto_1, po.texto_2,
               po.acerca_de, po.idioma, po.pais, po.departamento, po.ciudad, po.ubicacion_exacta,
               po.facebook, po.instagram, po.youtube, po.twitch, po.twitter, po.whatsapp, po.email, po.telefono, po.opcion_chat
        FROM sistema.perfil_organizador po
        JOIN cancha.organizadores o ON o.usuario_id = po.usuario_id
        WHERE po.enlace_sitio = :enlace AND po.visibilidad = 'publico'
    """), {"enlace": enlace_sitio})
    
    perfil = res.fetchone()
    if not perfil:
        raise HTTPException(status_code=404, detail="Liga no encontrada o no es pública")
        
    org_id = perfil[0]
    
    # Obtener torneos publicos (estado = 'activo' o 'borrador' pero para MVP traemos todos)
    res_torneos = await session.execute(text("""
        SELECT id, nombre, deporte, formato, tipo_campeonato
        FROM torneos.torneos
        WHERE organizador_id = :oid
    """), {"oid": org_id})
    
    torneos = [{"id": r[0], "nombre": r[1], "deporte": r[2], "formato": r[3], "tipo": r[4]} for r in res_torneos.fetchall()]
    
    return {
        "perfil": {
            "logo_url": perfil[1],
            "banner_url": perfil[2],
            "color_primario": perfil[3],
            "nombre_liga": perfil[4],
            "descripcion": perfil[5],
            "acerca_de": perfil[6],
            "idioma": perfil[7],
            "pais": perfil[8],
            "departamento": perfil[9],
            "ciudad": perfil[10],
            "ubicacion_exacta": perfil[11],
            "facebook": perfil[12],
            "instagram": perfil[13],
            "youtube": perfil[14],
            "twitch": perfil[15],
            "twitter": perfil[16],
            "whatsapp": perfil[17],
            "email": perfil[18],
            "telefono": perfil[19],
            "opcion_chat": perfil[20]
        },
        "torneos": torneos
    }

@router.get("/liga/torneo/{torneo_id}/estadisticas")
async def obtener_estadisticas_torneo(torneo_id: str, session: AsyncSession = Depends(get_session)):
    # MOCK DATA para MVP
    return {
        "posiciones": [
            {"equipo": "Los Galacticos", "pj": 5, "pg": 4, "pe": 1, "pp": 0, "gf": 12, "gc": 3, "pts": 13},
            {"equipo": "Deportivo FC", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 8, "gc": 5, "pts": 10},
            {"equipo": "Atlético Nacional", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 6, "gc": 8, "pts": 6},
        ],
        "goleadores": [
            {"jugador": "Juan Pérez", "equipo": "Los Galacticos", "goles": 7},
            {"jugador": "Carlos López", "equipo": "Deportivo FC", "goles": 5},
        ]
    }
