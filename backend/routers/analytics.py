from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_session
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_stats(session: AsyncSession = Depends(get_session), current_user = Depends(get_current_user)):
    """
    Obtiene métricas clave para el dashboard en tiempo real.
    """
    # Ingresos de hoy
    q_ingresos = text("""
        SELECT SUM(precio_total) as ingresos 
        FROM cancha.reservas 
        WHERE DATE(inicio) = CURRENT_DATE AND estado IN ('confirmada', 'finalizada')
    """)
    res_ingresos = await session.execute(q_ingresos)
    ingresos = res_ingresos.scalar() or 0
    
    # Ocupación
    q_ocupacion = text("""
        SELECT COUNT(id) as total_reservas
        FROM cancha.reservas 
        WHERE DATE(inicio) = CURRENT_DATE AND estado IN ('confirmada', 'finalizada', 'en_curso')
    """)
    res_ocup = await session.execute(q_ocupacion)
    total_reservas = res_ocup.scalar() or 0
    
    # Ingresos mensuales por semana
    q_tendencia = text("""
        SELECT 
            TO_CHAR(DATE_TRUNC('week', inicio), 'YYYY-MM-DD') as semana,
            SUM(precio_total) as ingresos
        FROM cancha.reservas
        WHERE inicio >= CURRENT_DATE - INTERVAL '30 days' AND estado IN ('confirmada', 'finalizada')
        GROUP BY DATE_TRUNC('week', inicio)
        ORDER BY semana ASC
    """)
    res_tend = await session.execute(q_tendencia)
    tendencia = [{"semana": r.semana, "ingresos": r.ingresos} for r in res_tend.fetchall()]
    
    return {
        "ingresos_hoy": ingresos,
        "total_reservas_hoy": total_reservas,
        "tendencia_ingresos": tendencia
    }
