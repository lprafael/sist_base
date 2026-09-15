# scheduler.py
# Motor de procesamiento de campañas de mensajería en segundo plano con APScheduler

import asyncio
import os
import httpx
from datetime import datetime
from sqlalchemy import select, text
from sqlalchemy.sql import func
from sqlalchemy.orm import selectinload
from database import SessionLocal
from models import (
    MensajeCampania, MensajeDestinatario, Persona, 
    PadronElectoral, LocalVotacion, Referente, PosibleVotante
)
from email_service import email_service
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Instancia global del planificador
scheduler = AsyncIOScheduler()

def construir_mensaje_personalizado(plantilla: str, persona: dict) -> str:
    """
    Reemplaza placeholders de llave única con los datos del votante/candidato.
    """
    mapeo = {
        "{nombre_apellido}": f"{persona.get('nombres', '')} {persona.get('apellidos', '')}".strip() or "Votante",
        "{local}": persona.get("nombre_local") or "No asignado",
        "{mesa}": str(persona.get("mesa", "Sin mesa")),
        "{candidato}": persona.get("nombre_candidato") or "Candidato"
    }
    
    mensaje = plantilla
    for tag, valor in mapeo.items():
        mensaje = mensaje.replace(tag, valor)
    return mensaje

async def enviar_mensaje_canal(destinatario: MensajeDestinatario, canal: str, nombre_campania: str, webhook_url: str = None) -> (bool, str):
    """
    Envía un mensaje individual a través de la pasarela seleccionada.
    """
    # 1. CANAL CORREO ELECTRÓNICO (SMTP de email_service.py)
    if canal == 'email':
        if not destinatario.email:
            return False, "Email no disponible"
        
        # Enviar de forma asíncrona usando la función bloqueante SMTP en hilo separado para no trabar el event loop
        loop = asyncio.get_running_loop()
        success = await loop.run_in_executor(
            None,
            email_service.send_email,
            destinatario.email,
            f"Campaña: {nombre_campania}",
            destinatario.mensaje_personalizado,
            False # Texto plano
        )
        if success:
            return True, ""
        return False, "Error al enviar correo (SMTP)"
        
    # 2. CANAL WEBHOOK N8N (Orquestación Externa)
    elif canal == 'n8n':
        if not webhook_url:
            webhook_url = os.getenv("N8N_WEBHOOK_URL", "http://SIGEL-n8n:5678/webhook/sigel-mensajeria")
        
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "destinatario_id": destinatario.id,
                    "campania_id": destinatario.campania_id,
                    "cedula": destinatario.cedula,
                    "telefono": destinatario.telefono,
                    "email": destinatario.email,
                    "mensaje": destinatario.mensaje_personalizado
                }
                res = await client.post(webhook_url, json=payload, timeout=10.0)
                if res.status_code in [200, 201, 204]:
                    return True, ""
                return False, f"n8n respondió con error {res.status_code}: {res.text[:100]}"
        except Exception as e:
            return False, f"Excepción de conexión con n8n: {str(e)}"
            
    # 3. CANALES DE TEXTO / WHATSAPP / SMS (Simulado y con opción de Twilio)
    else:
        if not destinatario.telefono or len(destinatario.telefono) < 8:
            return False, "Número de teléfono no disponible o inválido"
            
        # Comprobar si hay credenciales de Twilio configuradas para envíos reales
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_number = os.getenv("TWILIO_FROM_NUMBER")
        
        if twilio_sid and twilio_token and twilio_number:
            # Envío real vía Twilio API
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
                auth = (twilio_sid, twilio_token)
                
                # Formatear número de teléfono (ej. de Paraguay: +595981...)
                tel = destinatario.telefono.strip()
                if tel.startswith('09'):
                    tel = '+595' + tel[1:]
                elif not tel.startswith('+'):
                    tel = '+595' + tel
                    
                # Determinar el número emisor según el canal
                if canal == 'whatsapp':
                    from_number = os.getenv("TWILIO_FROM_NUMBER_WHATSAPP", twilio_number)
                    data_from = f"whatsapp:{from_number}" if not from_number.startswith("whatsapp:") else from_number
                    data_to = f"whatsapp:{tel}"
                else:
                    from_number = os.getenv("TWILIO_FROM_NUMBER_SMS", twilio_number)
                    data_from = from_number
                    data_to = tel
                    
                data = {
                    "From": data_from,
                    "To": data_to,
                    "Body": destinatario.mensaje_personalizado
                }
                    
                async with httpx.AsyncClient() as client:
                    res = await client.post(url, auth=auth, data=data, timeout=10.0)
                    if res.status_code in [200, 201]:
                        return True, ""
                    return False, f"Error Twilio: {res.status_code} - {res.text[:100]}"
            except Exception as e:
                return False, f"Excepción de conexión con Twilio: {str(e)}"
        else:
            # SIMULADOR / MOCK GATEWAY (Para desarrollo sin costo)
            await asyncio.sleep(0.02) # Pequeña simulación de red
            # Imprimir en logs para verificación
            print(f"[MOCK {canal.upper()}] Enviando a {destinatario.telefono}: {destinatario.mensaje_personalizado[:40]}...")
            return True, ""

async def procesar_campania(campania_id: int):
    """
    Carga los destinatarios de la campaña, genera los mensajes y realiza el envío.
    """
    print(f"[SCHEDULER] Iniciando procesamiento de campaña ID: {campania_id}")
    async with SessionLocal() as db:
        # 1. Obtener la campaña con bloqueo pesimista para evitar colisiones
        stmt = select(MensajeCampania).where(MensajeCampania.id == campania_id).with_for_update()
        res = await db.execute(stmt)
        camp = res.scalar_one_or_none()
        
        if not camp or camp.estado != 'pendiente':
            print(f"[SCHEDULER] Campaña {campania_id} no está pendiente o no existe.")
            return
            
        camp.estado = 'en_progreso'
        await db.commit()
        
        # 2. Obtener el nombre del candidato asociado a la jerarquía del creador
        cand_name = "Candidato Principal"
        if camp.creado_por:
            res_cand = await db.execute(text("""
                SELECT c.nombre_candidato FROM electoral.referentes r
                JOIN electoral.candidatos c ON r.id_candidato = c.id
                WHERE r.id_usuario_sistema = :user_id LIMIT 1
            """), {"user_id": camp.creado_por})
            cand_row = res_cand.fetchone()
            if cand_row:
                cand_name = cand_row[0]

        # 3. Obtener destinatarios (Seguidores vs Padrón Completo)
        destinatarios_lista = []
        
        if camp.tipo_destinatario == 'seguidores':
            # Simpatizantes asignados al candidato / referentes de su equipo
            query_dest = select(Persona, PadronElectoral.mesa, LocalVotacion.nombre_local).\
                join(PosibleVotante, Persona.cedula == PosibleVotante.cedula_votante).\
                join(Referente, PosibleVotante.id_referente == Referente.id).\
                outerjoin(PadronElectoral, (Persona.cedula == PadronElectoral.cedula) & (PadronElectoral.eleccion_id == camp.eleccion_id)).\
                outerjoin(LocalVotacion, PadronElectoral.local_id == LocalVotacion.id)
            
            # Filtro de jerarquía: Si el creador no es admin, limitar a su candidatura
            res_user = await db.execute(text("SELECT rol, id FROM sistema.usuarios WHERE id = :uid"), {"uid": camp.creado_por})
            u_row = res_user.fetchone()
            if u_row and u_row[0] != 'admin':
                res_cand_id = await db.execute(text("SELECT id_candidato FROM electoral.referentes WHERE id_usuario_sistema = :uid LIMIT 1"), {"uid": camp.creado_por})
                c_id_row = res_cand_id.fetchone()
                if c_id_row and c_id_row[0]:
                    query_dest = query_dest.where(Referente.id_candidato == c_id_row[0])
            
            result = await db.execute(query_dest)
            rows = result.all()
            for persona_obj, mesa, local_name in rows:
                destinatarios_lista.append({
                    "cedula": persona_obj.cedula,
                    "nombres": persona_obj.nombres,
                    "apellidos": persona_obj.apellidos,
                    "telefono": persona_obj.telefono,
                    "email": persona_obj.email,
                    "mesa": mesa,
                    "nombre_local": local_name,
                    "nombre_candidato": cand_name
                })
                
        else: # padron_completo
            # Todo el padrón electoral según filtros geográficos
            filtros = camp.filtros or {}
            dep_id = filtros.get("departamento_id")
            dist_id = filtros.get("distrito_id")
            loc_id = filtros.get("local_id")
            
            query_dest = select(Persona, PadronElectoral.mesa, LocalVotacion.nombre_local).\
                join(PadronElectoral, Persona.cedula == PadronElectoral.cedula).\
                outerjoin(LocalVotacion, PadronElectoral.local_id == LocalVotacion.id).\
                where(PadronElectoral.eleccion_id == camp.eleccion_id)
                
            if dep_id is not None and dep_id != "":
                query_dest = query_dest.where(PadronElectoral.departamento_id == int(dep_id))
            if dist_id is not None and dist_id != "":
                query_dest = query_dest.where(PadronElectoral.distrito_id == int(dist_id))
            if loc_id is not None and loc_id != "":
                query_dest = query_dest.where(PadronElectoral.local_id == int(loc_id))
                
            result = await db.execute(query_dest)
            rows = result.all()
            for persona_obj, mesa, local_name in rows:
                destinatarios_lista.append({
                    "cedula": persona_obj.cedula,
                    "nombres": persona_obj.nombres,
                    "apellidos": persona_obj.apellidos,
                    "telefono": persona_obj.telefono,
                    "email": persona_obj.email,
                    "mesa": mesa,
                    "nombre_local": local_name,
                    "nombre_candidato": cand_name
                })

        # 4. Registrar destinatarios y realizar los envíos
        camp.total_destinatarios = len(destinatarios_lista)
        await db.commit()
        
        if camp.total_destinatarios == 0:
            camp.estado = 'enviado'
            await db.commit()
            print(f"[SCHEDULER] Campaña {campania_id} terminada con 0 destinatarios.")
            return
            
        exito = 0
        fallido = 0
        webhook_url = camp.filtros.get("n8n_webhook_url") if camp.filtros else None
        
        # Enviar uno a uno registrando el resultado
        for dest_data in destinatarios_lista:
            msg_personalizado = construir_mensaje_personalizado(camp.plantilla_mensaje, dest_data)
            
            dest_obj = MensajeDestinatario(
                campania_id=camp.id,
                cedula=dest_data["cedula"],
                telefono=dest_data["telefono"],
                email=dest_data["email"],
                mensaje_personalizado=msg_personalizado,
                estado='pendiente'
            )
            db.add(dest_obj)
            await db.flush() # Obtener el ID del destinatario
            
            # Llamar a la pasarela
            ok, err_msg = await enviar_mensaje_canal(dest_obj, camp.canal, camp.nombre_campania, webhook_url)
            if ok:
                dest_obj.estado = 'enviado'
                dest_obj.fecha_envio = datetime.now()
                exito += 1
            else:
                dest_obj.estado = 'fallido'
                dest_obj.error_mensaje = err_msg
                fallido += 1
                
            # Hacer commit en bloques de 20 para reportar progreso en tiempo real
            if (exito + fallido) % 20 == 0:
                camp.enviados_exito = exito
                camp.enviados_fallido = fallido
                await db.commit()
                
        # Guardar resultado definitivo
        camp.enviados_exito = exito
        camp.enviados_fallido = fallido
        camp.estado = 'enviado'
        await db.commit()
        print(f"[SCHEDULER] Campaña {campania_id} procesada. Éxito: {exito}, Fallas: {fallido}")

async def tick_scheduler():
    """
    Consulta periódica cada 60 segundos buscando campañas programadas pendientes de envío.
    """
    async with SessionLocal() as db:
        now = datetime.now()
        stmt = select(MensajeCampania.id).where(
            MensajeCampania.estado == 'pendiente',
            MensajeCampania.fecha_programada <= now
        )
        res = await db.execute(stmt)
        ids_campanias = res.scalars().all()
        
        for c_id in ids_campanias:
            # Ejecuta como tarea independiente no bloqueante
            asyncio.create_task(procesar_campania(c_id))

async def init_scheduler():
    """
    Inicializa el daemon de APScheduler si no está activo.
    """
    if not scheduler.running:
        scheduler.add_job(tick_scheduler, 'interval', minutes=1, id='check_campanias_job')
        scheduler.start()
        print("[SCHEDULER] APScheduler se ha iniciado correctamente.")

async def shutdown_scheduler():
    """
    Detiene el daemon de APScheduler.
    """
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] APScheduler se ha detenido.")
