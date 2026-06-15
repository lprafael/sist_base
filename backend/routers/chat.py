from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json
from datetime import datetime
from database import get_session
from security import get_current_user, ALGORITHM, SECRET_KEY
from jose import jwt, JWTError

async def get_current_user_ws(token: str, session: AsyncSession):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None
    
    query = text("SELECT id FROM sistema.usuarios WHERE username = :username")
    result = await session.execute(query, {"username": username})
    user = result.fetchone()
    return user


router = APIRouter(prefix="/api/chat", tags=["chat"])

class ConnectionManager:
    def __init__(self):
        # Mapea user_id a un WebSocket activo
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, session: AsyncSession = Depends(get_session)):
    """
    Endpoint de WebSocket para chat en tiempo real.
    Autentica al usuario usando el token JWT pasado en la URL.
    """
    user = await get_current_user_ws(token, session)
    if not user:
        await websocket.close(code=1008)
        return
        
    user_id = user.id
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Formato esperado: {"receiver_id": 2, "contenido": "Hola", "conversacion_id": "uuid"}
            receiver_id = message_data.get("receiver_id")
            contenido = message_data.get("contenido")
            conversacion_id = message_data.get("conversacion_id")
            
            if receiver_id and contenido and conversacion_id:
                # 1. Guardar mensaje en base de datos
                query = text("""
                    INSERT INTO cancha.mensajes (conversacion_id, sender_id, contenido)
                    VALUES (:conv_id, :sender_id, :contenido)
                    RETURNING id, creado_en
                """)
                result = await session.execute(query, {
                    "conv_id": conversacion_id,
                    "sender_id": user_id,
                    "contenido": contenido
                })
                msg_record = result.fetchone()
                await session.commit()
                
                # 2. Reenviar mensaje al receptor si está conectado
                payload = {
                    "id": str(msg_record.id),
                    "conversacion_id": conversacion_id,
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "contenido": contenido,
                    "creado_en": msg_record.creado_en.isoformat()
                }
                
                # Enviar al receptor y al propio emisor para confirmación visual
                await manager.send_personal_message(json.dumps(payload), receiver_id)
                await manager.send_personal_message(json.dumps(payload), user_id)
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        manager.disconnect(user_id)
        await websocket.close(code=1011)

@router.get("/conversaciones")
async def get_conversaciones(session: AsyncSession = Depends(get_session), current_user = Depends(get_current_user)):
    """
    Obtiene las conversaciones del usuario actual.
    """
    query = text("""
        SELECT 
            c.id as conversacion_id,
            u1.id as p1_id, u1.nombre_completo as p1_nombre,
            u2.id as p2_id, u2.nombre_completo as p2_nombre,
            (SELECT contenido FROM cancha.mensajes m WHERE m.conversacion_id = c.id ORDER BY m.creado_en DESC LIMIT 1) as ultimo_mensaje,
            (SELECT creado_en FROM cancha.mensajes m WHERE m.conversacion_id = c.id ORDER BY m.creado_en DESC LIMIT 1) as fecha_ultimo_mensaje
        FROM cancha.conversaciones c
        JOIN sistema.usuarios u1 ON c.participante1_id = u1.id
        JOIN sistema.usuarios u2 ON c.participante2_id = u2.id
        WHERE c.participante1_id = :user_id OR c.participante2_id = :user_id
        ORDER BY fecha_ultimo_mensaje DESC NULLS LAST
    """)
    result = await session.execute(query, {"user_id": current_user.id})
    conversaciones = []
    for row in result.fetchall():
        other_user_id = row.p2_id if row.p1_id == current_user.id else row.p1_id
        other_user_nombre = row.p2_nombre if row.p1_id == current_user.id else row.p1_nombre
        
        conversaciones.append({
            "id": row.conversacion_id,
            "other_user_id": other_user_id,
            "other_user_nombre": other_user_nombre,
            "ultimo_mensaje": row.ultimo_mensaje,
            "fecha_ultimo_mensaje": row.fecha_ultimo_mensaje
        })
    return conversaciones

@router.get("/mensajes/{conversacion_id}")
async def get_mensajes(conversacion_id: str, session: AsyncSession = Depends(get_session), current_user = Depends(get_current_user)):
    """
    Obtiene el historial de una conversación.
    """
    # Verificar que el usuario pertenece a la conversación
    query_verif = text("SELECT id FROM cancha.conversaciones WHERE id = :conv_id AND (participante1_id = :user_id OR participante2_id = :user_id)")
    if not (await session.execute(query_verif, {"conv_id": conversacion_id, "user_id": current_user.id})).fetchone():
        raise HTTPException(status_code=403, detail="No tienes acceso a esta conversación")
        
    query = text("""
        SELECT id, sender_id, contenido, leido, creado_en
        FROM cancha.mensajes
        WHERE conversacion_id = :conv_id
        ORDER BY creado_en ASC
    """)
    result = await session.execute(query, {"conv_id": conversacion_id})
    mensajes = [{"id": r.id, "sender_id": r.sender_id, "contenido": r.contenido, "leido": r.leido, "creado_en": r.creado_en} for r in result.fetchall()]
    return mensajes
