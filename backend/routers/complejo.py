# routers/complejo.py
# Router principal para el Sistema de Gestión de Complejos Deportivos y Reservas de Canchas (SAD-Canchas)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, time, timedelta
import uuid

from database import get_session
from security import get_current_user

router = APIRouter(tags=["Complejos Deportivos"])

# ================================================================
# HELPER: Contexto del Complejo
# ================================================================

async def get_complejo_context(current_user: dict, session: AsyncSession) -> dict:
    """
    Resuelve el complejo_id asociado al usuario autenticado.
    Si no existe aún un complejo asociado a este usuario admin/complejo,
    crea uno por defecto para que pueda empezar inmediatamente a configurarlo.
    """
    uid = current_user["user_id"]
    role = current_user.get("role", "")
    username = current_user.get("username", "")

    # 1. Buscar en cancha.admins_complejo
    res = await session.execute(
        text("SELECT complejo_id, rol FROM cancha.admins_complejo WHERE usuario_id = :uid AND activo = TRUE LIMIT 1"),
        {"uid": uid}
    )
    row = res.fetchone()
    if row:
        return {"complejo_id": row[0], "rol": row[1]}

    # 2. Buscar por email/nombre en cancha.complejos
    email = current_user.get("email", "")
    res2 = await session.execute(
        text("SELECT id FROM cancha.complejos WHERE email = :em OR id::text = :uid_str LIMIT 1"),
        {"em": email, "uid_str": str(uid)}
    )
    row2 = res2.fetchone()
    if row2:
        # Vincular en admins_complejo
        await session.execute(
            text("INSERT INTO cancha.admins_complejo (id, complejo_id, usuario_id, rol, activo) VALUES (:id, :cid, :uid, 'dueno', true) ON CONFLICT DO NOTHING"),
            {"id": str(uuid.uuid4()), "cid": row2[0], "uid": uid}
        )
        await session.commit()
        return {"complejo_id": row2[0], "rol": "dueno"}

    # 3. Si no existe ninguno, crear Complejo por defecto para el usuario
    new_cid = str(uuid.uuid4())
    nombre_def = f"Complejo Deportivo {username.capitalize()}"
    slug_def = f"complejo-{username.lower()}"
    
    await session.execute(
        text("""
            INSERT INTO cancha.complejos (
                id, nombre, descripcion, telefono, email, direccion, ciudad, departamento,
                horario_apertura, horario_cierre, es_publico, configuracion, activo
            ) VALUES (
                :cid, :nom, 'Complejo deportivo con canchas equipadas para entrenamientos y partidos.',
                '0981-100-200', :em, 'Av. Principal 123', 'Asunción', 'Central',
                '07:00:00', '23:00:00', true,
                jsonb_build_object('slug', :slug, 'color_primario', '#10B981', 'anuncios_altavoz', true), true
            )
        """),
        {"cid": new_cid, "nom": nombre_def, "em": email or f"{username}@micancha.com.py", "slug": slug_def}
    )
    
    await session.execute(
        text("INSERT INTO cancha.admins_complejo (id, complejo_id, usuario_id, rol, activo) VALUES (:id, :cid, :uid, 'dueno', true)"),
        {"id": str(uuid.uuid4()), "cid": new_cid, "uid": uid}
    )
    await session.commit()

    return {"complejo_id": new_cid, "rol": "dueno"}


# ================================================================
# SCHEMAS PYDANTIC
# ================================================================

class PerfilComplejoRequest(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    foto_perfil: Optional[str] = None
    foto_portada: Optional[str] = None
    horario_apertura: Optional[str] = '07:00'
    horario_cierre: Optional[str] = '23:00'
    es_publico: Optional[bool] = True
    slug: Optional[str] = None
    color_primario: Optional[str] = '#10B981'
    anuncios_altavoz: Optional[bool] = True


class CanchaRequest(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    deporte: str  # Fútbol 5, Fútbol 7, Pádel, Tenis, Básquet, Vóley
    superficie: Optional[str] = 'Sintético'
    dimensiones: Optional[str] = None
    capacidad_jugadores: Optional[int] = 10
    precio_hora: float
    precio_hora_nocturna: Optional[float] = None
    hora_inicio_nocturna: Optional[str] = '18:00'
    color: Optional[str] = '#3B82F6'
    activo: Optional[bool] = True


class ReservaRequest(BaseModel):
    cancha_id: str
    cliente_nombre: str
    cliente_telefono: Optional[str] = None
    fecha: str  # YYYY-MM-DD
    hora_inicio: str  # HH:MM
    hora_fin: str  # HH:MM
    precio_total: Optional[float] = None
    seña_pagada: Optional[float] = 0
    estado: Optional[str] = 'confirmada'  # pendiente, confirmada, en_curso, finalizada, cancelada
    estado_pago: Optional[str] = 'pendiente'  # pendiente, parcial, pagada
    notas: Optional[str] = None


# ================================================================
# ENDPOINTS ADMINISTRADOR COMPLEJO
# ================================================================

@router.get("/api/complejo/perfil")
async def get_perfil_complejo(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    res = await session.execute(
        text("""
            SELECT id, nombre, descripcion, telefono, email, direccion, ciudad, departamento,
                   foto_portada, horario_apertura, horario_cierre, es_publico, configuracion, activo
            FROM cancha.complejos WHERE id = :cid
        """),
        {"cid": cid}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Complejo no encontrado.")

    cfg = row[12] if isinstance(row[12], dict) else {}
    return {
        "id": str(row[0]),
        "nombre": row[1],
        "descripcion": row[2] or "",
        "telefono": row[3] or "",
        "email": row[4] or "",
        "direccion": row[5] or "",
        "ciudad": row[6] or "",
        "departamento": row[7] or "",
        "foto_perfil": cfg.get("foto_perfil", ""),
        "foto_portada": row[8] or "",
        "horario_apertura": str(row[9])[:5] if row[9] else "07:00",
        "horario_cierre": str(row[10])[:5] if row[10] else "23:00",
        "es_publico": row[11] if row[11] is not None else True,
        "slug": cfg.get("slug", f"complejo-{str(row[0])[:8]}"),
        "color_primario": cfg.get("color_primario", "#10B981"),
        "anuncios_altavoz": cfg.get("anuncios_altavoz", True),
        "activo": row[13]
    }



@router.put("/api/complejo/perfil")
async def update_perfil_complejo(
    data: PerfilComplejoRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    res = await session.execute(text("SELECT configuracion FROM cancha.complejos WHERE id = :cid"), {"cid": cid})
    row = res.fetchone()
    cfg = row[0] if row and isinstance(row[0], dict) else {}

    cfg["slug"] = data.slug or cfg.get("slug", f"complejo-{cid[:8]}")
    cfg["foto_perfil"] = data.foto_perfil or cfg.get("foto_perfil", "")
    cfg["color_primario"] = data.color_primario or "#10B981"
    cfg["anuncios_altavoz"] = data.anuncios_altavoz if data.anuncios_altavoz is not None else True


    import json
    await session.execute(
        text("""
            UPDATE cancha.complejos SET
                nombre = :nom,
                descripcion = :desc,
                telefono = :tel,
                email = :em,
                direccion = :dir,
                ciudad = :ciu,
                departamento = :depa,
                foto_portada = :foto,
                horario_apertura = CAST(:hap AS time),
                horario_cierre = CAST(:hcie AS time),
                es_publico = :pub,
                configuracion = CAST(:cfg AS jsonb),
                actualizado_en = NOW()

            WHERE id = :cid
        """),
        {
            "cid": cid, "nom": data.nombre, "desc": data.descripcion,
            "tel": data.telefono, "em": data.email, "dir": data.direccion,
            "ciu": data.ciudad, "depa": data.departamento, "foto": data.foto_portada,
            "hap": data.horario_apertura, "hcie": data.horario_cierre,
            "pub": data.es_publico, "cfg": json.dumps(cfg)
        }
    )
    await session.commit()
    return {"status": "ok", "mensaje": "Perfil del complejo actualizado exitosamente."}


# ================================================================
# CANCHAS CRUD
# ================================================================

@router.get("/api/complejo/canchas")
async def get_canchas_complejo(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    res = await session.execute(
        text("""
            SELECT id, nombre, descripcion, deporte, superficie, dimensiones,
                   capacidad_jugadores, precio_hora, precio_hora_nocturna,
                   hora_inicio_nocturna, color, activo, numero_orden
            FROM cancha.canchas
            WHERE complejo_id = :cid
            ORDER BY numero_orden ASC, nombre ASC
        """),
        {"cid": cid}
    )
    rows = res.fetchall()
    return [
        {
            "id": str(r[0]),
            "nombre": r[1],
            "descripcion": r[2] or "",
            "deporte": r[3],
            "superficie": r[4] or "Sintético",
            "dimensiones": r[5] or "",
            "capacidad_jugadores": r[6] or 10,
            "precio_hora": float(r[7]),
            "precio_hora_nocturna": float(r[8]) if r[8] is not None else float(r[7]),
            "hora_inicio_nocturna": str(r[9])[:5] if r[9] else "18:00",
            "color": r[10] or "#3B82F6",
            "activo": r[11],
            "numero_orden": r[12] or 1
        }
        for r in rows
    ]


@router.post("/api/complejo/canchas")
async def create_cancha(
    data: CanchaRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]
    new_id = str(uuid.uuid4())

    await session.execute(
        text("""
            INSERT INTO cancha.canchas (
                id, complejo_id, nombre, descripcion, deporte, superficie, dimensiones,
                capacidad_jugadores, precio_hora, precio_hora_nocturna, hora_inicio_nocturna,
                color, activo
            ) VALUES (
                :id, :cid, :nom, :desc, :dep, :sup, :dim,
                :cap, :pr, :pr_noc, CAST(:h_noc AS time), :col, :act

            )
        """),
        {
            "id": new_id, "cid": cid, "nom": data.nombre, "desc": data.descripcion,
            "dep": data.deporte, "sup": data.superficie, "dim": data.dimensiones,
            "cap": data.capacidad_jugadores, "pr": data.precio_hora,
            "pr_noc": data.precio_hora_nocturna or data.precio_hora,
            "h_noc": data.hora_inicio_nocturna or "18:00",
            "col": data.color or "#3B82F6", "act": data.activo if data.activo is not None else True
        }
    )
    await session.commit()
    return {"id": new_id, "status": "ok", "mensaje": "Cancha creada exitosamente."}


@router.put("/api/complejo/canchas/{cancha_id}")
async def update_cancha(
    cancha_id: str,
    data: CanchaRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    await session.execute(
        text("""
            UPDATE cancha.canchas SET
                nombre = :nom,
                descripcion = :desc,
                deporte = :dep,
                superficie = :sup,
                dimensiones = :dim,
                capacidad_jugadores = :cap,
                precio_hora = :pr,
                precio_hora_nocturna = :pr_noc,
                hora_inicio_nocturna = CAST(:h_noc AS time),
                color = :col,
                activo = :act,
                actualizado_en = NOW()
            WHERE id = :id AND complejo_id = :cid
        """),
        {
            "id": cancha_id, "cid": cid, "nom": data.nombre, "desc": data.descripcion,
            "dep": data.deporte, "sup": data.superficie, "dim": data.dimensiones,
            "cap": data.capacidad_jugadores, "pr": data.precio_hora,
            "pr_noc": data.precio_hora_nocturna or data.precio_hora,
            "h_noc": data.hora_inicio_nocturna or "18:00",
            "col": data.color or "#3B82F6", "act": data.activo if data.activo is not None else True
        }
    )
    await session.commit()
    return {"status": "ok", "mensaje": "Cancha actualizada."}


@router.delete("/api/complejo/canchas/{cancha_id}")
async def delete_cancha(
    cancha_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    await session.execute(
        text("DELETE FROM cancha.canchas WHERE id = :id AND complejo_id = :cid"),
        {"id": cancha_id, "cid": cid}
    )
    await session.commit()
    return {"status": "ok", "mensaje": "Cancha eliminada."}


# ================================================================
# RESERVAS Y TURNOS (ADMIN)
# ================================================================

@router.get("/api/complejo/reservas")
async def get_reservas_complejo(
    fecha: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]
    target_date = fecha or date.today().isoformat()

    res = await session.execute(
        text("""
            SELECT r.id, r.cancha_id, c.nombre as cancha_nombre, c.deporte, c.color,
                   r.cliente_nombre, r.cliente_telefono, r.inicio, r.fin, r.duracion_minutos,
                   r.precio_hora, r.precio_total, r.seña_pagada, r.estado, r.estado_pago,
                   r.origen, r.notas, r.notif_inicio_enviada, r.notif_5min_enviada, r.notif_fin_enviada
            FROM cancha.reservas r
            JOIN cancha.canchas c ON c.id = r.cancha_id
            WHERE r.complejo_id = :cid
            AND DATE(r.inicio) = CAST(:fec AS date)
            ORDER BY r.inicio ASC
        """),
        {"cid": cid, "fec": target_date}
    )

    rows = res.fetchall()

    return [
        {
            "id": str(r[0]),
            "cancha_id": str(r[1]),
            "cancha_nombre": r[2],
            "deporte": r[3],
            "color": r[4] or "#3B82F6",
            "cliente_nombre": r[5] or "Cliente General",
            "cliente_telefono": r[6] or "",
            "inicio": r[7].isoformat(),
            "fin": r[8].isoformat(),
            "hora_inicio": r[7].strftime("%H:%M"),
            "hora_fin": r[8].strftime("%H:%M"),
            "duracion_minutos": r[9] or int((r[8] - r[7]).total_seconds() / 60),
            "precio_hora": float(r[10]),
            "precio_total": float(r[11]),
            "seña_pagada": float(r[12]) if r[12] else 0,
            "estado": r[13],  # pendiente, confirmada, en_curso, finalizada, cancelada
            "estado_pago": r[14],  # pendiente, parcial, pagada
            "origen": r[15] or "panel_admin",
            "notas": r[16] or "",
            "notif_inicio_enviada": bool(r[17]),
            "notif_5min_enviada": bool(r[18]),
            "notif_fin_enviada": bool(r[19])
        }
        for r in rows
    ]


@router.post("/api/complejo/reservas")
async def create_reserva_admin(
    data: ReservaRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    dt_inicio = datetime.fromisoformat(f"{data.fecha}T{data.hora_inicio}:00")
    dt_fin = datetime.fromisoformat(f"{data.fecha}T{data.hora_fin}:00")
    duracion_mins = int((dt_fin - dt_inicio).total_seconds() / 60)

    # Validar solapamientos
    chk = await session.execute(
        text("""
            SELECT id FROM cancha.reservas
            WHERE cancha_id = :chid AND estado NOT IN ('cancelada')
            AND (inicio < :fin AND fin > :ini)
        """),
        {"chid": data.cancha_id, "ini": dt_inicio, "fin": dt_fin}
    )
    if chk.fetchone():
        raise HTTPException(status_code=400, detail="El horario seleccionado ya se encuentra ocupado.")

    # Obtener precio de la cancha
    res_c = await session.execute(
        text("SELECT precio_hora, precio_hora_nocturna, hora_inicio_nocturna FROM cancha.canchas WHERE id = :chid"),
        {"chid": data.cancha_id}
    )
    row_c = res_c.fetchone()
    if not row_c:
        raise HTTPException(status_code=404, detail="Cancha no encontrada.")

    p_norm = float(row_c[0])
    p_noc = float(row_c[1]) if row_c[1] else p_norm
    h_noc = row_c[2] or time(18, 0)

    is_night = dt_inicio.time() >= h_noc
    precio_h = p_noc if is_night else p_norm
    precio_tot = data.precio_total if data.precio_total is not None else (precio_h * (duracion_mins / 60.0))

    new_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO cancha.reservas (
                id, cancha_id, complejo_id, cliente_nombre, cliente_telefono,
                inicio, fin, precio_hora, precio_total, seña_pagada,
                estado, estado_pago, origen, notas
            ) VALUES (
                :id, :chid, :cid, :cnom, :ctel,
                :ini, :fin, :ph, :ptot, :sena,
                :est, :estp, 'admin', :notas
            )

        """),
        {
            "id": new_id, "chid": data.cancha_id, "cid": cid,
            "cnom": data.cliente_nombre, "ctel": data.cliente_telefono,
            "ini": dt_inicio, "fin": dt_fin,
            "ph": precio_h, "ptot": precio_tot, "sena": data.seña_pagada or 0,
            "est": data.estado or "confirmada", "estp": data.estado_pago or "pendiente",
            "notas": data.notas
        }

    )
    await session.commit()
    return {"id": new_id, "status": "ok", "mensaje": "Reserva creada exitosamente."}


@router.put("/api/complejo/reservas/{reserva_id}")
async def update_reserva_admin(
    reserva_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    estado = data.get("estado")
    estado_pago = data.get("estado_pago")
    seña_pagada = data.get("seña_pagada")
    notas = data.get("notas")

    updates = []
    params = {"rid": reserva_id, "cid": cid}

    if estado:
        updates.append("estado = :est")
        params["est"] = estado
    if estado_pago:
        updates.append("estado_pago = :estp")
        params["estp"] = estado_pago
    if seña_pagada is not None:
        updates.append("seña_pagada = :sena")
        params["sena"] = float(seña_pagada)
    if notas is not None:
        updates.append("notas = :notas")
        params["notas"] = notas

    if not updates:
        return {"status": "ok"}

    sql = f"UPDATE cancha.reservas SET {', '.join(updates)}, actualizado_en = NOW() WHERE id = :rid AND complejo_id = :cid"
    await session.execute(text(sql), params)
    await session.commit()

    return {"status": "ok", "mensaje": "Reserva actualizada."}


@router.delete("/api/complejo/reservas/{reserva_id}")
async def delete_reserva_admin(
    reserva_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    await session.execute(
        text("DELETE FROM cancha.reservas WHERE id = :rid AND complejo_id = :cid"),
        {"rid": reserva_id, "cid": cid}
    )
    await session.commit()
    return {"status": "ok", "mensaje": "Reserva eliminada."}


# ================================================================
# MOTOR DE ALTAVOZ / LOCUCIÓN POR VOZ EN TIEMPO REAL
# ================================================================

@router.get("/api/complejo/altavoz/eventos")
async def get_altavoz_eventos(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Evalúa continuamente las reservas del complejo para la jornada actual y retorna
    alertas sonoras para el altavoz:
      - inicio_turno: Turno que está comenzando ahora
      - alerta_5min: Quedan 5 minutos para finalizar el turno
      - proximo_turno: Se acerca el inicio de un nuevo turno
      - fin_turno: Turno que acaba de finalizar
    """
    ctx = await get_complejo_context(current_user, session)
    cid = ctx["complejo_id"]

    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    today_end = datetime(now.year, now.month, now.day, 23, 59, 59)

    res = await session.execute(
        text("""
            SELECT r.id, c.nombre as cancha_nombre, r.cliente_nombre, r.inicio, r.fin,
                   r.notif_inicio_enviada, r.notif_5min_enviada, r.notif_fin_enviada, r.estado
            FROM cancha.reservas r
            JOIN cancha.canchas c ON c.id = r.cancha_id
            WHERE r.complejo_id = :cid
            AND r.estado NOT IN ('cancelada')
            AND r.inicio >= :tstart AND r.inicio <= :tend
            ORDER BY r.inicio ASC
        """),
        {"cid": cid, "tstart": today_start, "tend": today_end}
    )
    reservas = res.fetchall()

    anuncios = []

    for r in reservas:
        rid = str(r[0])
        cancha_nom = r[1]
        cliente_nom = r[2] or "Jugador"
        inicio = r[3]
        fin = r[4]
        notif_inicio = bool(r[5])
        notif_5min = bool(r[6])
        notif_fin = bool(r[7])

        diff_inicio_mins = (now - inicio).total_seconds() / 60.0
        diff_fin_mins = (fin - now).total_seconds() / 60.0

        # 1. INICIO DE TURNO (Entre 2 minutos antes y 3 minutos después)
        if -2 <= diff_inicio_mins <= 3 and not notif_inicio:
            msg = f"Atención por favor. Inicio de turno para el usuario {cliente_nom} en la {cancha_nom}."
            anuncios.append({
                "id": f"{rid}-inicio",
                "tipo": "inicio_turno",
                "cancha": cancha_nom,
                "cliente": cliente_nom,
                "mensaje": msg,
                "timestamp": now.strftime("%H:%M:%S")
            })
            await session.execute(
                text("UPDATE cancha.reservas SET notif_inicio_enviada = true, estado = 'en_curso' WHERE id = :rid"),
                {"rid": rid}
            )

        # 2. ALERTA DE 5 MINUTOS RESTANTES (Entre 4 y 6 minutos antes del fin)
        elif 3.5 <= diff_fin_mins <= 6.5 and not notif_5min:
            msg = f"Atención usuarios. Quedan 5 minutos restantes de turno para {cliente_nom} en la {cancha_nom}."
            anuncios.append({
                "id": f"{rid}-5min",
                "tipo": "alerta_5min",
                "cancha": cancha_nom,
                "cliente": cliente_nom,
                "mensaje": msg,
                "timestamp": now.strftime("%H:%M:%S")
            })
            await session.execute(
                text("UPDATE cancha.reservas SET notif_5min_enviada = true WHERE id = :rid"),
                {"rid": rid}
            )

        # 3. SE ACERCA INICIO DE TURNO (Entre 7 y 12 minutos antes del inicio)
        elif -12 <= diff_inicio_mins <= -7:
            # Anuncio preventivo no persistido
            msg = f"Atención. Se acerca el inicio de turno de {cliente_nom} en la {cancha_nom}."
            anuncios.append({
                "id": f"{rid}-proximo",
                "tipo": "proximo_turno",
                "cancha": cancha_nom,
                "cliente": cliente_nom,
                "mensaje": msg,
                "timestamp": now.strftime("%H:%M:%S")
            })

        # 4. FINALIZACIÓN DE TURNO (Hasta 4 minutos después del fin)
        elif -1 <= diff_fin_mins <= 4 and not notif_fin:
            msg = f"Atención. Finalización de turno de {cliente_nom} en la {cancha_nom}. Favor liberar la cancha."
            anuncios.append({
                "id": f"{rid}-fin",
                "tipo": "fin_turno",
                "cancha": cancha_nom,
                "cliente": cliente_nom,
                "mensaje": msg,
                "timestamp": now.strftime("%H:%M:%S")
            })
            await session.execute(
                text("UPDATE cancha.reservas SET notif_fin_enviada = true, estado = 'finalizada' WHERE id = :rid"),
                {"rid": rid}
            )

    await session.commit()

    return {
        "timestamp": now.isoformat(),
        "hora_actual": now.strftime("%H:%M:%S"),
        "total_anuncios": len(anuncios),
        "anuncios": anuncios
    }


# ================================================================
# API PÚBLICA (ACCESO SIN AUTENTICACIÓN)
# ================================================================

@router.get("/api/complejos/public/{slug_or_id}")
async def get_complejo_public(
    slug_or_id: str,
    fecha: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene la página pública y grilla de disponibilidad de turnos de un complejo deportivo.
    """
    # 1. Buscar por id o por slug en configuracion->>'slug'
    res = await session.execute(
        text("""
            SELECT id, nombre, descripcion, telefono, email, direccion, ciudad, departamento,
                   foto_portada, horario_apertura, horario_cierre, configuracion
            FROM cancha.complejos
            WHERE CAST(id AS text) = :sid OR configuracion->>'slug' = :sid
            LIMIT 1
        """),
        {"sid": slug_or_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Complejo deportivo no encontrado.")

    cid = str(row[0])
    cfg = row[11] if isinstance(row[11], dict) else {}

    # 2. Canchas del complejo
    res_c = await session.execute(
        text("""
            SELECT id, nombre, descripcion, deporte, superficie, dimensiones, capacidad_jugadores,
                   precio_hora, precio_hora_nocturna, hora_inicio_nocturna, color
            FROM cancha.canchas
            WHERE complejo_id = :cid AND activo = TRUE
            ORDER BY numero_orden ASC, nombre ASC
        """),
        {"cid": cid}
    )
    canchas = [
        {
            "id": str(c[0]), "nombre": c[1], "descripcion": c[2] or "", "deporte": c[3],
            "superficie": c[4] or "Sintético", "dimensiones": c[5] or "", "capacidad_jugadores": c[6] or 10,
            "precio_hora": float(c[7]), "precio_hora_nocturna": float(c[8]) if c[8] else float(c[7]),
            "hora_inicio_nocturna": str(c[9])[:5] if c[9] else "18:00", "color": c[10] or "#3B82F6"
        }
        for c in res_c.fetchall()
    ]

    # 3. Reservas del día solicitado
    target_date = fecha or date.today().isoformat()
    res_r = await session.execute(
        text("""
            SELECT cancha_id, inicio, fin, estado
            FROM cancha.reservas
            WHERE complejo_id = :cid AND DATE(inicio) = CAST(:fec AS date)
            AND estado NOT IN ('cancelada')
        """),
        {"cid": cid, "fec": target_date}
    )
    reservas = [
        {
            "cancha_id": str(r[0]),
            "inicio": r[1].strftime("%H:%M"),
            "fin": r[2].strftime("%H:%M"),
            "estado": r[3]
        }
        for r in res_r.fetchall()
    ]

    return {
        "complejo": {
            "id": cid,
            "nombre": row[1],
            "descripcion": row[2] or "",
            "telefono": row[3] or "",
            "email": row[4] or "",
            "direccion": row[5] or "",
            "ciudad": row[6] or "",
            "departamento": row[7] or "",
            "foto_perfil": cfg.get("foto_perfil", "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80"),
            "foto_portada": row[8] or "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80",
            "horario_apertura": str(row[9])[:5] if row[9] else "07:00",
            "horario_cierre": str(row[10])[:5] if row[10] else "23:00",
            "slug": cfg.get("slug", slug_or_id),
            "color_primario": cfg.get("color_primario", "#10B981")
        },
        "fecha": target_date,
        "canchas": canchas,
        "reservas_ocupadas": reservas
    }


@router.post("/api/complejos/public/{slug_or_id}/reservar")
async def reservar_public(
    slug_or_id: str,
    data: ReservaRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Permite a un cliente público enviar una solicitud de reserva online.
    """
    res = await session.execute(
        text("SELECT id FROM cancha.complejos WHERE id::text = :sid OR configuracion->>'slug' = :sid LIMIT 1"),
        {"sid": slug_or_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Complejo no encontrado.")
    cid = str(row[0])

    dt_inicio = datetime.fromisoformat(f"{data.fecha}T{data.hora_inicio}:00")
    dt_fin = datetime.fromisoformat(f"{data.fecha}T{data.hora_fin}:00")
    duracion_mins = int((dt_fin - dt_inicio).total_seconds() / 60)

    # Validar solapamientos
    chk = await session.execute(
        text("""
            SELECT id FROM cancha.reservas
            WHERE cancha_id = :chid AND estado NOT IN ('cancelada')
            AND (inicio < :fin AND fin > :ini)
        """),
        {"chid": data.cancha_id, "ini": dt_inicio, "fin": dt_fin}
    )
    if chk.fetchone():
        raise HTTPException(status_code=400, detail="El horario seleccionado ya fue reservado por otro cliente.")

    # Precio
    res_c = await session.execute(
        text("SELECT precio_hora, precio_hora_nocturna, hora_inicio_nocturna FROM cancha.canchas WHERE id = :chid"),
        {"chid": data.cancha_id}
    )
    row_c = res_c.fetchone()
    p_norm = float(row_c[0]) if row_c else 120000
    p_noc = float(row_c[1]) if row_c and row_c[1] else p_norm
    h_noc = row_c[2] if row_c and row_c[2] else time(18, 0)

    is_night = dt_inicio.time() >= h_noc
    precio_h = p_noc if is_night else p_norm
    precio_tot = precio_h * (duracion_mins / 60.0)

    new_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO cancha.reservas (
                id, cancha_id, complejo_id, cliente_nombre, cliente_telefono,
                inicio, fin, precio_hora, precio_total, seña_pagada,
                estado, estado_pago, origen, notas
            ) VALUES (
                :id, :chid, :cid, :cnom, :ctel,
                :ini, :fin, :ph, :ptot, 0,
                'pendiente', 'pendiente', 'web', :notas
            )

        """),
        {
            "id": new_id, "chid": data.cancha_id, "cid": cid,
            "cnom": data.cliente_nombre, "ctel": data.cliente_telefono,
            "ini": dt_inicio, "fin": dt_fin,
            "ph": precio_h, "ptot": precio_tot, "notas": data.notas or "Reserva pública online"
        }

    )
    await session.commit()

    return {
        "id": new_id,
        "status": "ok",
        "precio_total": precio_tot,
        "mensaje": "¡Reserva enviada exitosamente! El complejo se pondrá en contacto para confirmar el pago de seña."
    }
