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
    
    # KPIs de Torneos
    q_torneos_activos = text("SELECT COUNT(id) FROM torneos.torneos WHERE estado IN ('abierto', 'en_curso')")
    torneos_activos = (await session.execute(q_torneos_activos)).scalar() or 0

    q_partidos_hoy = text("SELECT COUNT(id) FROM torneos.partidos WHERE DATE(fecha_hora) = CURRENT_DATE AND estado != 'finalizado'")
    partidos_hoy = (await session.execute(q_partidos_hoy)).scalar() or 0

    q_equipos_pendientes = text("SELECT COUNT(id) FROM torneos.equipos WHERE estado_inscripcion = 'pendiente'")
    equipos_pendientes = (await session.execute(q_equipos_pendientes)).scalar() or 0

    q_equipos_deuda = text("""
        SELECT COUNT(DISTINCT equipo_id) FROM cancha.cuenta_corriente_equipos
        WHERE estado = 'pendiente'
    """)
    equipos_deuda = (await session.execute(q_equipos_deuda)).scalar() or 0

    q_proximos_partidos = text("""
        SELECT 
            TO_CHAR(p.fecha_hora, 'HH24:MI') as hora,
            el.nombre as local,
            ev.nombre as visitante,
            COALESCE(c.nombre, 'Sin Asignar') as cancha
        FROM torneos.partidos p
        JOIN torneos.equipos el ON p.equipo_local_id = el.id
        JOIN torneos.equipos ev ON p.equipo_visitante_id = ev.id
        LEFT JOIN cancha.canchas c ON p.cancha_id = c.id
        WHERE p.fecha_hora >= CURRENT_TIMESTAMP 
          AND p.fecha_hora < CURRENT_DATE + INTERVAL '2 days'
          AND p.estado = 'programado'
        ORDER BY p.fecha_hora ASC
        LIMIT 5
    """)
    res_prox = await session.execute(q_proximos_partidos)
    proximos_partidos = [
        {"hora": r.hora, "local": r.local, "visitante": r.visitante, "cancha": r.cancha}
        for r in res_prox.fetchall()
    ]

    return {
        "ingresos_hoy": ingresos,
        "total_reservas_hoy": total_reservas,
        "tendencia_ingresos": tendencia,
        "torneos_activos": torneos_activos,
        "partidos_hoy": partidos_hoy,
        "equipos_pendientes_validacion": equipos_pendientes,
        "equipos_con_deuda": equipos_deuda,
        "proximos_partidos": proximos_partidos
    }
