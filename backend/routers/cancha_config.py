from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_session
from security import get_current_user

router = APIRouter(tags=["Configuracion Cancha"])

@router.get("/organizador/deportes-formatos")
async def obtener_deportes_formatos_organizador(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # 1. Obtener organizador_id del usuario actual
    q_org = text("SELECT id FROM cancha.organizadores WHERE usuario_id = :uid")
    res_org = await session.execute(q_org, {"uid": current_user["user_id"]})
    row_org = res_org.fetchone()
    
    if not row_org:
        return {"deportes": []}
        
    organizador_id = row_org[0]
    
    # 2. Obtener deportes del organizador
    q_dep = text("""
        SELECT d.id, d.nombre 
        FROM cancha.deportes d
        JOIN cancha.organizador_deporte od ON od.deporte_id = d.id
        WHERE od.organizador_id = :oid
    """)
    res_dep = await session.execute(q_dep, {"oid": organizador_id})
    deportes = res_dep.fetchall()
    
    resultado = []
    
    # 3. Para cada deporte, obtener sus formatos
    for dep in deportes:
        q_form = text("""
            SELECT f.id, f.nombre, f.descripcion
            FROM cancha.formatos_torneo f
            JOIN cancha.deporte_formato df ON df.formato_id = f.id
            WHERE df.deporte_id = :did
        """)
        res_form = await session.execute(q_form, {"did": dep[0]})
        formatos = res_form.fetchall()
        
        resultado.append({
            "id": dep[0],
            "nombre": dep[1],
            "formatos": [{"id": f[0], "nombre": f[1], "descripcion": f[2]} for f in formatos]
        })
        
    return {"deportes": resultado}
