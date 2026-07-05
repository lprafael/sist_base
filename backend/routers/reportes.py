import os
import uuid
from io import BytesIO
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_session

import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm

router = APIRouter(
    prefix="/cancha/torneos",
    tags=["Reportes"]
)

@router.get("/{torneo_id}/partidos/{partido_id}/planilla-pdf", summary="Generar Planilla de Partido en PDF")
async def generar_planilla_pdf(torneo_id: str, partido_id: str, session: AsyncSession = Depends(get_session)):
    try:
        # 1. Obtener detalles del partido
        partido_sql = """
            SELECT p.id, p.fecha, p.hora_inicio, p.fase,
                   el.id as local_id, el.nombre as local_nombre, 
                   ev.id as visitante_id, ev.nombre as visitante_nombre,
                   t.nombre as torneo_nombre, t.deporte, t.formato
            FROM torneos_futbol.partidos p
            JOIN torneos_futbol.equipos el ON p.equipo_local_id = el.id
            JOIN torneos_futbol.equipos ev ON p.equipo_visitante_id = ev.id
            JOIN torneos_futbol.torneos t ON p.torneo_id = t.id
            WHERE p.id = :pid AND p.torneo_id = :tid
        """
        res_partido = await session.execute(text(partido_sql), {"pid": partido_id, "tid": torneo_id})
        partido = res_partido.fetchone()
        
        if not partido:
            raise HTTPException(status_code=404, detail="Partido no encontrado")

        # 2. Obtener plantillas
        plantilla_sql = """
            SELECT torneo_equipo_id, nombre, numero_camiseta, dni
            FROM cancha.tournament_players
            WHERE (torneo_equipo_id = :el_id OR torneo_equipo_id = :ev_id)
              AND estado = 'habilitado'
            ORDER BY torneo_equipo_id, numero_camiseta ASC NULLS LAST, nombre ASC
        """
        res_plantilla = await session.execute(text(plantilla_sql), {"el_id": partido.local_id, "ev_id": partido.visitante_id})
        jugadores = res_plantilla.fetchall()

        jugadores_local = [j for j in jugadores if str(j.torneo_equipo_id) == str(partido.local_id)]
        jugadores_visitante = [j for j in jugadores if str(j.torneo_equipo_id) == str(partido.visitante_id)]

        # 3. Preparar el buffer PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        elements = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=1, fontSize=16, spaceAfter=10)
        subtitle_style = ParagraphStyle('SubtitleStyle', parent=styles['Normal'], alignment=1, fontSize=12, spaceAfter=20)
        
        # 4. Generar QR Code
        # En una app real, la URL del QR apuntaría a la pantalla del veedor.
        qr_url = f"https://micancha.com/admin/torneos/{torneo_id}?tab=acta&partido={partido_id}"
        qr = qrcode.QRCode(version=1, box_size=4, border=1)
        qr.add_data(qr_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Guardar QR temporalmente en /tmp (o en el directorio actual)
        tmp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "uploads", "tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        qr_path = os.path.join(tmp_dir, f"qr_{uuid.uuid4().hex[:8]}.png")
        img.save(qr_path)

        # Encabezado con QR
        fecha_str = partido.fecha.isoformat() if isinstance(partido.fecha, date) else str(partido.fecha)
        elements.append(Paragraph(f"<b>PLANILLA OFICIAL DE PARTIDO</b>", title_style))
        elements.append(Paragraph(f"Torneo: {partido.torneo_nombre} ({partido.deporte})", subtitle_style))
        elements.append(Paragraph(f"<b>{partido.local_nombre}</b> vs <b>{partido.visitante_nombre}</b>", title_style))
        elements.append(Paragraph(f"Fase: {partido.fase} | Fecha: {fecha_str} | Hora: {partido.hora_inicio}", subtitle_style))
        
        elements.append(Image(qr_path, width=1.5*inch, height=1.5*inch))
        elements.append(Spacer(1, 0.2*inch))

        # 5. Tablas de Jugadores
        def crear_tabla_equipo(titulo, lista_jugadores):
            data = [[titulo, '', '', '', '', ''],
                    ['#', 'Nombre', 'DNI', 'Firma/Check', 'Goles', 'Tarjetas']]
            for i, j in enumerate(lista_jugadores):
                cam = str(j.numero_camiseta) if j.numero_camiseta else '-'
                data.append([cam, j.nombre, j.dni, '', '', ''])
            
            # Completar filas vacías para llenar la hoja (mínimo 12 filas)
            for _ in range(max(0, 12 - len(lista_jugadores))):
                data.append(['', '', '', '', '', ''])

            t = Table(data, colWidths=[30, 180, 70, 80, 60, 60])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('SPAN', (0, 0), (-1, 0)),
                
                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#e2e8f0')),
                ('TEXTCOLOR', (0, 1), (-1, 1), colors.black),
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
                
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.black),
                ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
                ('ALIGN', (0, 2), (0, -1), 'CENTER'), # Camiseta center
                ('ALIGN', (2, 2), (2, -1), 'CENTER'), # DNI center
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            return t

        elements.append(crear_tabla_equipo(f"LOCAL: {partido.local_nombre}", jugadores_local))
        elements.append(Spacer(1, 0.3*inch))
        elements.append(crear_tabla_equipo(f"VISITANTE: {partido.visitante_nombre}", jugadores_visitante))
        
        elements.append(Spacer(1, 0.5*inch))
        
        # Firmas
        firmas_data = [['Firma Capitán Local', 'Firma Capitán Visitante', 'Firma Árbitro/Veedor'],
                       ['', '', '']]
        t_firmas = Table(firmas_data, colWidths=[150, 150, 150], rowHeights=[20, 60])
        t_firmas.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.black),
            ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]))
        elements.append(t_firmas)

        doc.build(elements)
        
        # Limpiar QR
        if os.path.exists(qr_path):
            os.remove(qr_path)

        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        filename = f"Planilla_{partido.torneo_nombre}_{partido.local_nombre}_vs_{partido.visitante_nombre}.pdf"
        # Limpiar filename de caracteres raros
        filename = filename.replace(' ', '_').replace('/', '-')
        
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
