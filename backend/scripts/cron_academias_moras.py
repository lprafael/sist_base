import asyncio
import sys
import os
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta

# Add parent path to access backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session
from sqlalchemy import text

async def run_cron_moras():
    print(f"[{datetime.now()}] Iniciando CRON de revisión de moras de Academias...")
    async with async_session() as session:
        # 1. Obtener todas las cuotas pendientes que ya pasaron su fecha de vencimiento
        # 2. Hacer JOIN con config_cuotas para saber los dias de gracia y multas de cada academia
        # 3. Hacer JOIN con alumnos/tutores para saber el email
        query = text("""
            SELECT q.id, q.monto_final, q.fecha_vencimiento, q.monto_penalizacion,
                   c.cobro_retraso_activo, c.monto_por_retraso, c.dias_gracia_retraso,
                   a.nombre AS alumno_nombre, t.email AS tutor_email, aca.nombre AS academia_nombre
            FROM academias.cuotas q
            JOIN academias.alumnos a ON a.id = q.alumno_id
            LEFT JOIN academias.tutores t ON t.id = a.tutor_id
            JOIN academias.academias aca ON aca.id = a.academia_id
            JOIN academias.config_cuotas c ON c.academia_id = a.academia_id
            WHERE q.estado = 'pendiente' 
              AND q.monto_penalizacion = 0
              AND c.cobro_retraso_activo = TRUE
        """)
        
        result = await session.execute(query)
        rows = result.fetchall()
        
        updated_count = 0
        notified_count = 0
        
        hoy = datetime.now().date()

        for row in rows:
            cuota_id = row[0]
            monto_final = row[1]
            fecha_venc = row[2]
            
            monto_retraso = row[5]
            dias_gracia = row[6]
            
            alumno_nombre = row[7]
            tutor_email = row[8]
            academia_nombre = row[9]
            
            fecha_limite = fecha_venc + timedelta(days=dias_gracia)
            
            if hoy > fecha_limite:
                # 1. Aplicar la multa
                nuevo_monto = monto_final + monto_retraso
                
                await session.execute(text("""
                    UPDATE academias.cuotas 
                    SET monto_penalizacion = :multa,
                        monto_final = :nuevo_monto
                    WHERE id = :id
                """), {
                    "multa": monto_retraso,
                    "nuevo_monto": nuevo_monto,
                    "id": cuota_id
                })
                updated_count += 1
                
                # 2. Notificar al tutor (simulación / log)
                if tutor_email:
                    print(f" -> [NOTIFICACIÓN] Enviando correo a {tutor_email} (Tutor de {alumno_nombre}). Motivo: Cuota vencida + Multa en {academia_nombre}.")
                    # Aquí se llamaría a AWS SES, SendGrid, etc.
                    notified_count += 1
        
        await session.commit()
        print(f"[{datetime.now()}] CRON Finalizado. {updated_count} cuotas penalizadas. {notified_count} tutores notificados.")

if __name__ == "__main__":
    asyncio.run(run_cron_moras())
