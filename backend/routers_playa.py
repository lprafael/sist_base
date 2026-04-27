import os
import uuid
import shutil
import json
import io
import requests
import httpx
import asyncio
import logging
from datetime import datetime, date
from typing import List, Optional, Sequence, Union

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Response, Query, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import join, and_, or_, func, case, text, delete, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, selectinload
from datetime import date, timedelta, datetime
from decimal import Decimal
from pydantic import BaseModel
import calendar
from database import get_session
from PIL import Image
from models import Playa

def add_months(sourcedate: date, months: int) -> date:
    """
    Suma meses a una fecha manteniendo el mismo día del mes.
    Si el día no existe en el mes destino (ej. 31 de febrero), 
    devuelve el último día de ese mes.
    """
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

from models_playa import (
    CategoriaVehiculo, Producto, Cliente, Venta, Pagare, Pago, 
    TipoGastoProducto, GastoProducto, TipoGastoEmpresa, GastoEmpresa, 
    ConfigCalificacion, DetalleVenta, Vendedor, Gante, Referencia, 
    UbicacionCliente, Estado, Cuenta, Movimiento, DocumentoImportacion, Escribania,
    ImagenProducto, HistorialCalificacion, Refuerzo, GastoAdicional, HistorialPropietario,
    TipoVehiculoCatalogo, MarcaCatalogo, ModeloCatalogo,
)
from schemas_playa import (
    CategoriaVehiculoCreate, CategoriaVehiculoResponse,
    VendedorCreate, VendedorResponse,
    ProductoCreate, ProductoUpdate, ProductoResponse,
    PlayaPublicResponse,
    ProductoPublicCatalogItem,
    OfertaParticularCreate,
    OfertaParticularUpdate,
    ClienteCreate, ClienteResponse,
    VentaCreate, VentaResponse,
    PagoCreate, PagoResponse,
    PagareUpdate, PagareResponse,
    TipoGastoProductoCreate, TipoGastoProductoResponse, GastoProductoCreate, GastoProductoResponse,
    TipoGastoEmpresaCreate, TipoGastoEmpresaResponse, GastoEmpresaCreate, GastoEmpresaResponse,
    ConfigCalificacionCreate, ConfigCalificacionResponse,
    GanteCreate, GanteResponse, ReferenciaCreate, ReferenciaResponse, ClienteResponseFull,
    UbicacionClienteCreate, UbicacionClienteResponse,
    EstadoCreate, EstadoResponse,
    CuentaCreate, CuentaResponse,
    MovimientoCreate, MovimientoResponse,
    DocumentoImportacionResponse, AnalizarDocumentosResponse, VinculacionProducto,
    EscribaniaCreate, EscribaniaResponse,
    ImagenProductoCreate, ImagenProductoUpdate, ImagenProductoResponse,
    GastoAdicionalCreate, GastoAdicionalResponse,
    HistorialPropietarioCreate, HistorialPropietarioUpdate, HistorialPropietarioResponse,
    TipoVehiculoCatalogoCreate, TipoVehiculoCatalogoResponse,
    MarcaCatalogoCreate, MarcaCatalogoResponse,
    ModeloCatalogoCreate, ModeloCatalogoResponse,
)
from security import (
    get_current_user,
    check_permission,
    require_admin,
    assert_resource_playa,
    get_current_user_optional,
)
from audit_utils import log_audit_action

router = APIRouter(prefix="/playa", tags=["Playa de Vehículos"])

# Imágenes de productos (ruta absoluta; compartida por playa y catálogo público)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads", "imagenes_productos")
os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.info("Directorio de uploads de imágenes de productos: %s", UPLOAD_DIR)

# Categoría global para publicaciones MiCoche (particulares, sin playa)
MICOCHE_CATEGORIA_PARTICULAR_NOMBRE = "Público/Particular"
MICOCHE_MAX_FOTOS_PARTICULAR = 8
MICOCHE_MAX_BYTES_FOTO = 8 * 1024 * 1024


async def get_or_create_categoria_publico_particular(session: AsyncSession) -> int:
    res = await session.execute(
        select(CategoriaVehiculo).where(
            CategoriaVehiculo.nombre == MICOCHE_CATEGORIA_PARTICULAR_NOMBRE,
            CategoriaVehiculo.id_playa.is_(None),
        )
    )
    row = res.scalar_one_or_none()
    if row:
        return row.id_categoria
    cat = CategoriaVehiculo(
        nombre=MICOCHE_CATEGORIA_PARTICULAR_NOMBRE,
        descripcion="Vehículos publicados por particulares en MiCoche (sin playa)",
        id_playa=None,
    )
    session.add(cat)
    await session.flush()
    return cat.id_categoria


async def persist_imagenes_desde_uploads(
    session: AsyncSession,
    id_producto: int,
    imagenes: Sequence[UploadFile],
    *,
    aplicar_marca_agua: bool = True,
    marcar_primera_como_principal: bool = False,
) -> List[ImagenProducto]:
    """Guarda archivos en disco + registros ImagenProducto. Sin commit."""
    watermark_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "marca_agua.png")
    new_records: List[ImagenProducto] = []
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    for idx, img in enumerate(imagenes):
        if not img.content_type or not img.content_type.startswith("image/"):
            continue
        ext = os.path.splitext(img.filename or "")[1]
        if not ext:
            ext = ".jpg"
        unique_id = uuid.uuid4()
        filename = f"{unique_id}{ext}"
        filename_wm = f"wm_{unique_id}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        filepath_wm = os.path.join(UPLOAD_DIR, filename_wm)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(img.file, buffer)

        img.file.seek(0)
        imagen_bytes = img.file.read()
        if len(imagen_bytes) > MICOCHE_MAX_BYTES_FOTO:
            continue

        imagen_wm_rel_path = f"/static/uploads/imagenes_productos/{filename_wm}"
        imagen_wm_bytes = None

        if aplicar_marca_agua and os.path.exists(watermark_path):
            try:
                base_img = Image.open(io.BytesIO(imagen_bytes)).convert("RGBA")
                wm_img = Image.open(watermark_path).convert("RGBA")
                base_w, base_h = base_img.size
                wm_w, wm_h = wm_img.size
                new_wm_w = int(base_w * 0.4)
                new_wm_h = int(wm_h * (new_wm_w / wm_w))
                wm_img = wm_img.resize((new_wm_w, new_wm_h), Image.Resampling.LANCZOS)
                r, g, b, a = wm_img.split()
                a = a.point(lambda p: p * 0.5)
                wm_img = Image.merge("RGBA", (r, g, b, a))
                pos = ((base_w - new_wm_w) // 2, (base_h - new_wm_h) // 2)
                transparent = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
                transparent.paste(base_img, (0, 0))
                transparent.paste(wm_img, pos, mask=wm_img)
                final_img = transparent.convert("RGB")
                buffered = io.BytesIO()
                final_img.save(buffered, format="JPEG", quality=90)
                imagen_wm_bytes = buffered.getvalue()
                final_img.save(filepath_wm, "JPEG", quality=90)
            except Exception as e:
                logger.error("Error al aplicar marca de agua: %s", e)

        if imagen_wm_bytes is None:
            shutil.copy2(filepath, filepath_wm)
            imagen_wm_rel_path = f"/static/uploads/imagenes_productos/{filename}"

        new_row = ImagenProducto(
            id_producto=id_producto,
            nombre_archivo=img.filename,
            ruta_archivo=f"/static/uploads/imagenes_productos/{filename}",
            imagen=imagen_bytes,
            imagen_con_marca=imagen_wm_rel_path,
            es_principal=False,
            orden=len(new_records),
        )
        session.add(new_row)
        new_records.append(new_row)

    if new_records and marcar_primera_como_principal:
        await session.execute(
            update(ImagenProducto)
            .where(ImagenProducto.id_producto == id_producto)
            .values(es_principal=False)
        )
        new_records[0].es_principal = True

    return new_records

@router.get("/mi-playa")
async def get_mi_playa_info(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Obtiene la información de la playa vinculada al usuario actual."""
    id_playa = current_user.get("id_playa")
    if not id_playa:
        raise HTTPException(status_code=400, detail="El usuario no tiene una playa vinculada.")
    
    res = await session.execute(select(Playa).where(Playa.id == id_playa))
    playa = res.scalar_one_or_none()
    
    if not playa:
        raise HTTPException(status_code=404, detail="Información de playa no encontrada.")
    
    return {
        "id": playa.id,
        "nombre": playa.nombre,
        "razon_social": playa.razon_social,
        "ruc": playa.ruc,
        "direccion": playa.direccion,
        "telefono": playa.telefono,
        "email": playa.email
    }

@router.get("/vehiculos/top-vendidos")
async def get_top_vendidos(
    id_playa: int = Query(..., description="ID de la playa (catálogo público por tenant)"),
    session: AsyncSession = Depends(get_session),
):
    """
    Retorna los 5 binomios Marca/Modelo más vendidos para una playa.
    Requiere id_playa para no mezclar estadísticas entre tenants.
    """
    res = await session.execute(
        select(
            Producto.marca,
            Producto.modelo,
            func.count(Venta.id_venta).label('cantidad')
        ).join(Venta, Producto.id_producto == Venta.id_producto)
        .where(Venta.estado_venta != 'ANULADA')
        .where(Producto.id_playa == id_playa)
        .where(Venta.id_playa == id_playa)
        .group_by(Producto.marca, Producto.modelo)
        .order_by(text('cantidad DESC'))
        .limit(5)
    )
    return [
        {"marca": row.marca, "modelo": row.modelo, "cantidad": row.cantidad}
        for row in res.all()
    ]


# ===== CATÁLOGO PÚBLICO (MiCoche — todas las playas + particulares) =====
@router.get("/public/playas", response_model=List[PlayaPublicResponse])
async def public_list_playas_adheridas(session: AsyncSession = Depends(get_session)):
    """Playas activas del sistema con conteo de vehículos disponibles en stock."""
    count_stmt = (
        select(Producto.id_playa, func.count(Producto.id_producto))
        .where(Producto.activo == True)
        .where(Producto.estado_disponibilidad == "DISPONIBLE")
        .where(Producto.id_playa.isnot(None))
        .group_by(Producto.id_playa)
    )
    count_res = await session.execute(count_stmt)
    por_playa = {row[0]: int(row[1]) for row in count_res.all()}

    res = await session.execute(
        select(Playa).where(Playa.activo == True).order_by(Playa.nombre.asc())
    )
    playas = res.scalars().all()
    return [
        PlayaPublicResponse(
            id=p.id,
            nombre=p.nombre,
            razon_social=p.razon_social,
            telefono=p.telefono,
            direccion=p.direccion,
            email=p.email,
            vehiculos_disponibles=por_playa.get(p.id, 0),
        )
        for p in playas
    ]


@router.get("/public/catalogo", response_model=List[ProductoPublicCatalogItem])
async def public_catalogo_todas_playas(
    session: AsyncSession = Depends(get_session),
    q: Optional[str] = Query(None, description="Buscar en marca, modelo o chasis"),
    id_playa: Optional[int] = Query(None, description="Filtrar por playa"),
    solo_particulares: bool = Query(False),
    excluir_particulares: bool = Query(False),
    marca: Optional[str] = Query(None),
    modelo: Optional[str] = Query(None),
    año_desde: Optional[int] = Query(None),
    año_hasta: Optional[int] = Query(None),
    combustible: Optional[str] = Query(None),
    transmision: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    limit: int = Query(120, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Vehículos disponibles de todas las playas adheridas y publicaciones de particulares (id_playa nulo).
    El chasis es único a nivel global; no se mezcla stock entre playas.
    """
    subq_gastos = (
        select(
            GastoProducto.id_producto,
            func.sum(GastoProducto.monto).label("total_gastos"),
        )
        .group_by(GastoProducto.id_producto)
        .subquery()
    )

    query = (
        select(
            Producto,
            func.coalesce(subq_gastos.c.total_gastos, 0).label("total_gastos"),
            Playa.nombre.label("nombre_playa"),
        )
        .outerjoin(subq_gastos, Producto.id_producto == subq_gastos.c.id_producto)
        .outerjoin(Playa, Producto.id_playa == Playa.id)
        .options(
            selectinload(Producto.imagenes),
            selectinload(Producto.gastos).selectinload(GastoProducto.tipo_gasto),
            joinedload(Producto.tipo_vehiculo_rel),
            joinedload(Producto.marca_rel),
            joinedload(Producto.modelo_rel)
        )
        .where(Producto.activo == True)
        .where(Producto.estado_disponibilidad == "DISPONIBLE")
    )

    if solo_particulares:
        query = query.where(Producto.id_playa.is_(None))
    elif excluir_particulares:
        query = query.where(Producto.id_playa.isnot(None))
    elif id_playa is not None:
        query = query.where(Producto.id_playa == id_playa)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Producto.marca.ilike(term),
                Producto.modelo.ilike(term),
                Producto.chasis.ilike(term),
            )
        )
    if marca and marca.strip():
        query = query.where(Producto.marca.ilike(f"%{marca.strip()}%"))
    if modelo and modelo.strip():
        query = query.where(Producto.modelo.ilike(f"%{modelo.strip()}%"))
    if año_desde is not None:
        query = query.where(Producto.año >= año_desde)
    if año_hasta is not None:
        query = query.where(Producto.año <= año_hasta)
    if combustible and combustible.strip():
        query = query.where(Producto.combustible.ilike(f"%{combustible.strip()}%"))
    if transmision and transmision.strip():
        query = query.where(Producto.transmision.ilike(f"%{transmision.strip()}%"))
    if color and color.strip():
        query = query.where(Producto.color.ilike(f"%{color.strip()}%"))

    query = query.order_by(Producto.fecha_registro.desc()).limit(limit).offset(offset)

    result = await session.execute(query)
    rows = result.all()
    out: List[ProductoPublicCatalogItem] = []
    for p, total_gastos, nombre_playa in rows:
        p.total_gastos = total_gastos
        p.costo_final = (p.costo_base or 0) + total_gastos
        base = ProductoPublicCatalogItem.model_validate(p, from_attributes=True)
        out.append(
            base.model_copy(
                update={
                    "nombre_playa": nombre_playa,
                    "es_particular": p.id_playa is None,
                }
            )
        )
    return out


@router.get("/public/catalogo/tipos-vehiculo", response_model=List[TipoVehiculoCatalogoResponse])
async def public_list_catalogo_tipos_vehiculo(
    session: AsyncSession = Depends(get_session),
):
    """Lista pública de tipos de vehículo para el catálogo."""
    q = select(TipoVehiculoCatalogo).where(TipoVehiculoCatalogo.activo == True).order_by(TipoVehiculoCatalogo.nombre.asc())
    res = await session.execute(q)
    return res.scalars().all()


@router.get("/public/catalogo/marcas", response_model=List[MarcaCatalogoResponse])
async def public_list_catalogo_marcas(
    session: AsyncSession = Depends(get_session),
):
    """Lista pública de marcas para el catálogo."""
    q = select(MarcaCatalogo).where(MarcaCatalogo.activo == True).order_by(MarcaCatalogo.nombre.asc())
    res = await session.execute(q)
    return res.scalars().all()


@router.get("/public/catalogo/modelos", response_model=List[ModeloCatalogoResponse])
async def public_list_catalogo_modelos(
    id_marca: Optional[int] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """Lista pública de modelos para una marca en el catálogo."""
    q = select(ModeloCatalogo).where(ModeloCatalogo.activo == True).order_by(ModeloCatalogo.nombre.asc())
    if id_marca is not None:
        q = q.where(ModeloCatalogo.id_marca == id_marca)
    res = await session.execute(q)
    return res.scalars().all()


def _normalizar_lista_uploads(fotos: Union[List[UploadFile], UploadFile, None]) -> List[UploadFile]:
    if fotos is None:
        return []
    if isinstance(fotos, list):
        return [f for f in fotos if f is not None]
    return [fotos]


@router.post("/public/oferta-particular-json", response_model=ProductoPublicCatalogItem)
async def public_crear_oferta_particular_json(
    payload: OfertaParticularCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Misma lógica que el formulario web, sin fotos (útil para integraciones)."""
    return await _public_crear_oferta_particular_core(session, payload, fotos=[], id_usuario=current_user["user_id"])


@router.post("/public/oferta-particular", response_model=ProductoPublicCatalogItem)
async def public_crear_oferta_particular(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
    marca: str = Form(...),
    modelo: str = Form(...),
    chasis: str = Form(...),
    precio_pyg: str = Form(...),
    telefono: str = Form(...),
    año: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    combustible: Optional[str] = Form(None),
    transmision: Optional[str] = Form(None),
    nombre_contacto: Optional[str] = Form(None),
    id_marca: Optional[int] = Form(None),
    id_modelo: Optional[int] = Form(None),
    id_tipo_vehiculo: Optional[int] = Form(None),
    ciudad: Optional[str] = Form(None),
    observaciones: Optional[str] = Form(None),
    fotos: Optional[List[UploadFile]] = File(None),
):
    """
    Publicación de un particular (multipart): datos + fotos opcionales (máx. 8, 8 MB c/u).
    Categoría `Público/Particular` (global, id_playa nulo). Sin tabla aparte: fila en playa.productos.
    """
    precio_digits = "".join(c for c in (precio_pyg or "") if c.isdigit())
    if not precio_digits:
        raise HTTPException(status_code=400, detail="Precio inválido.")
    precio_dec = Decimal(precio_digits)
    año_int = None
    if año and str(año).strip():
        try:
            año_int = int(str(año).strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Año inválido.")

    def _f(s: Optional[str]) -> Optional[str]:
        if s is None:
            return None
        t = str(s).strip()
        return t or None

    payload = OfertaParticularCreate(
        marca=marca.strip(),
        modelo=modelo.strip(),
        id_marca=id_marca,
        id_modelo=id_modelo,
        id_tipo_vehiculo=id_tipo_vehiculo,
        chasis=chasis.strip(),
        año=año_int,
        color=_f(color),
        combustible=_f(combustible),
        transmision=_f(transmision),
        precio_pyg=precio_dec,
        telefono=telefono.strip(),
        nombre_contacto=_f(nombre_contacto),
        ciudad=_f(ciudad),
        observaciones=_f(observaciones),
    )
    files = _normalizar_lista_uploads(fotos)
    if len(files) > MICOCHE_MAX_FOTOS_PARTICULAR:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo {MICOCHE_MAX_FOTOS_PARTICULAR} fotos.",
        )
    return await _public_crear_oferta_particular_core(session, payload, fotos=files, id_usuario=current_user["user_id"])


@router.get("/public/mis-ofertas", response_model=List[ProductoPublicCatalogItem])
async def public_listar_mis_ofertas(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Listado de vehículos publicados por el usuario actual (particulares)."""
    uid = current_user.get("user_id")
    query = (
        select(Producto)
        .options(
            selectinload(Producto.imagenes),
            joinedload(Producto.tipo_vehiculo_rel),
            joinedload(Producto.marca_rel),
            joinedload(Producto.modelo_rel)
        )
        .where(Producto.id_usuario == uid)
        .order_by(Producto.fecha_registro.desc())
    )
    res = await session.execute(query)
    rows = res.scalars().all()
    
    out: List[ProductoPublicCatalogItem] = []
    for p in rows:
        p.total_gastos = Decimal(0)
        p.costo_final = p.costo_base or Decimal(0)
        base = ProductoPublicCatalogItem.model_validate(p, from_attributes=True)
        out.append(base.model_copy(update={"nombre_playa": None, "es_particular": True}))
    return out


@router.put("/public/mis-ofertas/{id_producto}", response_model=ProductoPublicCatalogItem)
async def public_actualizar_mi_oferta(
    id_producto: int,
    payload: OfertaParticularUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Actualiza una publicación propia (particulares)."""
    uid = current_user.get("user_id")
    res = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    prod = res.scalar_one_or_none()
    
    if not prod:
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")
    
    if prod.id_usuario != uid:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar esta publicación.")

    update_data = payload.model_dump(exclude_unset=True)
    
    # Mapeo de campos especiales de la oferta a Producto
    if "precio_pyg" in update_data:
        prod.costo_base = update_data["precio_pyg"]
        prod.precio_contado_sugerido = update_data["precio_pyg"]
        del update_data["precio_pyg"]
    
    # Ciudad mapea a ubicacion_actual
    if "ciudad" in update_data:
        prod.ubicacion_actual = update_data["ciudad"]
        del update_data["ciudad"]
        
    for field, value in update_data.items():
        setattr(prod, field, value)

    await session.commit()
    await session.refresh(prod)
    
    # Re-cargar con relaciones
    res_merged = await session.execute(
        select(Producto)
        .options(
            selectinload(Producto.imagenes),
            joinedload(Producto.marca_rel),
            joinedload(Producto.modelo_rel),
            joinedload(Producto.tipo_vehiculo_rel)
        )
        .where(Producto.id_producto == id_producto)
    )
    p = res_merged.scalar_one()
    p.total_gastos = Decimal(0)
    p.costo_final = p.costo_base or Decimal(0)
    base = ProductoPublicCatalogItem.model_validate(p, from_attributes=True)
    return base.model_copy(update={"nombre_playa": None, "es_particular": True})


@router.delete("/public/mis-ofertas/{id_producto}")
async def public_eliminar_mi_oferta(
    id_producto: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Elimina (desactiva) una publicación propia (particulares)."""
    uid = current_user.get("user_id")
    res = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    prod = res.scalar_one_or_none()
    
    if not prod:
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")
    
    if prod.id_usuario != uid:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta publicación.")

    # Desactivar
    prod.activo = False
    await session.commit()
    return {"message": "Publicación eliminada correctamente."}


async def _public_crear_oferta_particular_core(
    session: AsyncSession,
    payload: OfertaParticularCreate,
    fotos: List[UploadFile],
    id_usuario: Optional[int] = None,
) -> ProductoPublicCatalogItem:
    id_cat = await get_or_create_categoria_publico_particular(session)
    chasis_norm = payload.chasis.strip().upper()
    dup = await session.execute(select(Producto).where(Producto.chasis == chasis_norm))
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un vehículo u oferta registrada con ese número de chasis.",
        )

    partes_obs = []
    if payload.nombre_contacto:
        partes_obs.append(f"Contacto: {payload.nombre_contacto.strip()}")
    partes_obs.append(f"Tel: {payload.telefono.strip()}")
    if payload.ciudad:
        partes_obs.append(f"Ciudad: {payload.ciudad.strip()}")
    if payload.observaciones:
        partes_obs.append(payload.observaciones.strip())
    observaciones = " | ".join(partes_obs)

    codigo_interno = f"MICOCHE-PUB-{uuid.uuid4().hex[:16].upper()}"
    prod = Producto(
        id_playa=None,
        id_categoria=id_cat,
        id_tipo_vehiculo=payload.id_tipo_vehiculo,
        id_marca=payload.id_marca,
        id_modelo=payload.id_modelo,
        codigo_interno=codigo_interno,
        marca=payload.marca.strip(),
        modelo=payload.modelo.strip(),
        año=payload.año,
        color=payload.color.strip() if payload.color else None,
        chasis=chasis_norm,
        combustible=payload.combustible.strip() if payload.combustible else None,
        transmision=payload.transmision.strip() if payload.transmision else None,
        costo_base=payload.precio_pyg,
        precio_contado_sugerido=payload.precio_pyg,
        estado_disponibilidad="DISPONIBLE",
        observaciones=observaciones or None,
        ubicacion_actual=payload.ciudad.strip() if payload.ciudad else None,
        activo=True,
        id_usuario=id_usuario,
    )
    session.add(prod)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo registrar: chasis o código interno duplicado.",
        )

    # Re-cargar con relaciones para devolver objeto normalizado
    res_merged = await session.execute(
        select(Producto)
        .options(
            joinedload(Producto.marca_rel),
            joinedload(Producto.modelo_rel),
            joinedload(Producto.tipo_vehiculo_rel)
        )
        .where(Producto.id_producto == prod.id_producto)
    )
    prod = res_merged.scalar_one()

    if fotos:
        await persist_imagenes_desde_uploads(
            session,
            prod.id_producto,
            fotos,
            aplicar_marca_agua=False,
            marcar_primera_como_principal=True,
        )

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo registrar: chasis o código interno duplicado.",
        )
    await session.refresh(prod)

    res = await session.execute(
        select(Producto)
        .options(selectinload(Producto.imagenes))
        .where(Producto.id_producto == prod.id_producto)
    )
    p = res.scalar_one()
    p.total_gastos = Decimal(0)
    p.costo_final = p.costo_base or Decimal(0)
    base = ProductoPublicCatalogItem.model_validate(p, from_attributes=True)
    return base.model_copy(update={"nombre_playa": None, "es_particular": True})


# ===== CATEGORÍAS =====
@router.get("/categorias", response_model=List[CategoriaVehiculoResponse])
async def list_categorias(
    session: AsyncSession = Depends(get_session),
):
    """Listado global de categorías compartido por todas las playas."""
    query = select(CategoriaVehiculo).order_by(CategoriaVehiculo.id_categoria.asc())
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/categorias", response_model=CategoriaVehiculoResponse)
async def create_categoria(
    categoria_data: CategoriaVehiculoCreate,
    current_user: dict = Depends(require_admin), # Solo admin sistema
    session: AsyncSession = Depends(get_session)
):
    # Verificar si ya existe
    res = await session.execute(
        select(CategoriaVehiculo)
        .where(func.lower(CategoriaVehiculo.nombre) == func.lower(categoria_data.nombre))
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La categoría '{categoria_data.nombre}' ya existe.")

    new_cat_data = categoria_data.model_dump()
    new_cat_data["id_playa"] = None # Global
    new_cat = CategoriaVehiculo(**new_cat_data)
    session.add(new_cat)
    await session.commit()
    await session.refresh(new_cat)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="categorias_vehiculos",
        record_id=new_cat.id_categoria,
        new_data=categoria_data.model_dump(exclude_none=True),
        details=f"Categoría de vehículo creada: {new_cat.nombre}"
    )
    
    return new_cat

@router.put("/categorias/{id_categoria}", response_model=CategoriaVehiculoResponse)
async def update_categoria(
    id_categoria: int,
    categoria_data: CategoriaVehiculoCreate,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(CategoriaVehiculo).where(CategoriaVehiculo.id_categoria == id_categoria))
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    dup = await session.execute(
        select(CategoriaVehiculo)
        .where(
            and_(
                func.lower(CategoriaVehiculo.nombre) == func.lower(categoria_data.nombre),
                CategoriaVehiculo.id_categoria != id_categoria,
            )
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La categoría '{categoria_data.nombre}' ya existe.")

    old_data = {
        "id_categoria": cat.id_categoria,
        "nombre": cat.nombre,
        "descripcion": cat.descripcion,
    }

    cat.nombre = categoria_data.nombre
    cat.descripcion = categoria_data.descripcion

    await session.commit()
    await session.refresh(cat)

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="categorias_vehiculos",
        record_id=cat.id_categoria,
        previous_data=old_data,
        new_data=categoria_data.model_dump(exclude_none=True),
        details=f"Categoría de vehículo actualizada: {cat.nombre}"
    )

    return cat

@router.delete("/categorias/{id_categoria}")
async def delete_categoria(
    id_categoria: int,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(CategoriaVehiculo).where(CategoriaVehiculo.id_categoria == id_categoria))
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    en_uso = await session.execute(
        select(Producto.id_producto)
        .where(Producto.id_categoria == id_categoria)
        .limit(1)
    )
    if en_uso.first() is not None:
        raise HTTPException(status_code=400, detail="No se puede eliminar la categoría porque tiene vehículos asociados")

    old_data = {
        "id_categoria": cat.id_categoria,
        "nombre": cat.nombre,
        "descripcion": cat.descripcion,
    }

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="categorias_vehiculos",
        record_id=cat.id_categoria,
        previous_data=old_data,
        details=f"Categoría de vehículo eliminada: {cat.nombre}"
    )

    await session.delete(cat)
    await session.commit()

    return {"message": "Categoría eliminada correctamente"}

# ===== HISTORIAL DE PROPIETARIOS =====
@router.get("/propietarios", response_model=List[HistorialPropietarioResponse])
async def list_propietarios(
    id_producto: Optional[int] = None,
    session: AsyncSession = Depends(get_session)
):
    query = select(HistorialPropietario).order_by(HistorialPropietario.fecha_registro.desc())
    if id_producto:
        query = query.where(HistorialPropietario.id_producto == id_producto)
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/propietarios", response_model=HistorialPropietarioResponse)
async def create_propietario(
    data: HistorialPropietarioCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_propietario = HistorialPropietario(**data.model_dump())
    session.add(new_propietario)
    await session.commit()
    await session.refresh(new_propietario)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="historial_propietarios",
        record_id=new_propietario.id_historial,
        new_data=data.model_dump(exclude_none=True),
        details=f"Historial de propietario creado para {new_propietario.nombre_propietario}"
    )
    return new_propietario

@router.put("/propietarios/{id_historial}", response_model=HistorialPropietarioResponse)
async def update_propietario(
    id_historial: int,
    data: HistorialPropietarioUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(HistorialPropietario).where(HistorialPropietario.id_historial == id_historial))
    propietario = res.scalar_one_or_none()
    if not propietario:
        raise HTTPException(status_code=404, detail="Registro de propietario no encontrado")
    
    old_data = {c.name: getattr(propietario, c.name) for c in propietario.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(propietario, field, value)
    
    await session.commit()
    await session.refresh(propietario)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="historial_propietarios",
        record_id=id_historial,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Historial de propietario actualizado para {propietario.nombre_propietario}"
    )
    return propietario

@router.delete("/propietarios/{id_historial}")
async def delete_propietario(
    id_historial: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(HistorialPropietario).where(HistorialPropietario.id_historial == id_historial))
    propietario = res.scalar_one_or_none()
    if not propietario:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    await session.delete(propietario)
    await session.commit()
    return {"message": "Registro eliminado correctamente"}

# ===== VENDEDORES =====
@router.get("/vendedores", response_model=List[VendedorResponse])
async def list_vendedores(
    active_only: bool = False,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(Vendedor).order_by(Vendedor.nombre.asc())
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(Vendedor.id_playa == id_playa)
    if active_only:
        query = query.where(Vendedor.activo == True)
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/vendedores", response_model=VendedorResponse)
async def create_vendedor(
    data: VendedorCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_vendedor_data = data.model_dump()
    new_vendedor_data["id_playa"] = current_user.get("id_playa")
    new_vendedor = Vendedor(**new_vendedor_data)
    session.add(new_vendedor)
    await session.commit()
    await session.refresh(new_vendedor)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="vendedores",
        record_id=new_vendedor.id_vendedor,
        new_data=data.model_dump(exclude_none=True),
        details=f"Vendedor creado: {new_vendedor.nombre} {new_vendedor.apellido}"
    )
    return new_vendedor

@router.put("/vendedores/{id_vendedor}", response_model=VendedorResponse)
async def update_vendedor(
    id_vendedor: int,
    data: VendedorCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Vendedor).where(Vendedor.id_vendedor == id_vendedor))
    vendedor = res.scalar_one_or_none()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    
    old_data = {c.name: getattr(vendedor, c.name) for c in vendedor.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(vendedor, field, value)
    
    await session.commit()
    await session.refresh(vendedor)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="vendedores",
        record_id=id_vendedor,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Vendedor actualizado: {vendedor.nombre} {vendedor.apellido}"
    )
    return vendedor

@router.delete("/vendedores/{id_vendedor}")
async def delete_vendedor(
    id_vendedor: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Vendedor).where(Vendedor.id_vendedor == id_vendedor))
    vendedor = res.scalar_one_or_none()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    
    # Verificar si tiene ventas asociadas
    res_v = await session.execute(select(func.count(Venta.id_venta)).where(Venta.id_vendedor == id_vendedor))
    if res_v.scalar_one() > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar un vendedor con ventas asociadas. Marque como inactivo en su lugar.")

    await session.delete(vendedor)
    await session.commit()
    return {"message": "Vendedor eliminado correctamente"}

# ===== ESCRIBANÍAS =====
@router.get("/escribanias", response_model=List[EscribaniaResponse])
async def list_escribanias(
    active_only: bool = False,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(Escribania).order_by(Escribania.nombre.asc())
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(or_(Escribania.id_playa == id_playa, Escribania.id_playa.is_(None)))
    if active_only:
        query = query.where(Escribania.activo == True)
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/escribanias", response_model=EscribaniaResponse)
async def create_escribania(
    data: EscribaniaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    payload = data.model_dump()
    if current_user.get("id_playa") is not None:
        payload["id_playa"] = current_user.get("id_playa")
    new_escribania = Escribania(**payload)
    session.add(new_escribania)
    await session.commit()
    await session.refresh(new_escribania)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="escribanias",
        record_id=new_escribania.id_escribania,
        new_data=data.model_dump(exclude_none=True),
        details=f"Escribanía creada: {new_escribania.nombre}"
    )
    return new_escribania

@router.put("/escribanias/{id_escribania}", response_model=EscribaniaResponse)
async def update_escribania(
    id_escribania: int,
    data: EscribaniaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Escribania).where(Escribania.id_escribania == id_escribania))
    escribania = res.scalar_one_or_none()
    if not escribania:
        raise HTTPException(status_code=404, detail="Escribanía no encontrada")
    assert_resource_playa(current_user, escribania.id_playa)
    
    old_data = {c.name: getattr(escribania, c.name) for c in escribania.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(escribania, field, value)
    
    await session.commit()
    await session.refresh(escribania)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="escribanias",
        record_id=id_escribania,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Escribanía actualizada: {escribania.nombre}"
    )
    return escribania

@router.delete("/escribanias/{id_escribania}")
async def delete_escribania(
    id_escribania: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Escribania).where(Escribania.id_escribania == id_escribania))
    escribania = res.scalar_one_or_none()
    if not escribania:
        raise HTTPException(status_code=404, detail="Escribanía no encontrada")
    assert_resource_playa(current_user, escribania.id_playa)
    
    # Verificar si tiene ventas asociadas
    res_v = await session.execute(select(func.count(Venta.id_venta)).where(Venta.id_escribania == id_escribania))
    if res_v.scalar_one() > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar una escribanía con ventas asociadas. Marque como inactiva en su lugar.")

    await session.delete(escribania)
    await session.commit()
    return {"message": "Escribanía eliminada correctamente"}


# ===== CATÁLOGOS GLOBALES (lectura: usuarios autenticados; alta/edición/baja: solo admin) =====
@router.get("/catalogo/tipos-vehiculo", response_model=List[TipoVehiculoCatalogoResponse])
async def list_catalogo_tipos_vehiculo(
    todo: bool = False,
    _user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    q = select(TipoVehiculoCatalogo).order_by(TipoVehiculoCatalogo.nombre.asc())
    if not todo:
        q = q.where(TipoVehiculoCatalogo.activo == True)
    res = await session.execute(q)
    return res.scalars().all()


@router.post("/catalogo/tipos-vehiculo", response_model=TipoVehiculoCatalogoResponse)
async def create_catalogo_tipo_vehiculo(
    data: TipoVehiculoCatalogoCreate,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(
        select(TipoVehiculoCatalogo).where(
            func.lower(TipoVehiculoCatalogo.nombre) == func.lower(data.nombre.strip())
        )
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un tipo con ese nombre.")
    row = TipoVehiculoCatalogo(nombre=data.nombre.strip(), activo=data.activo if data.activo is not None else True)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="catalogo_tipos_vehiculo",
        record_id=row.id_tipo,
        new_data={"nombre": row.nombre, "activo": row.activo},
        details=f"Catálogo tipo vehículo: {row.nombre}",
    )
    return row


@router.put("/catalogo/tipos-vehiculo/{id_tipo}", response_model=TipoVehiculoCatalogoResponse)
async def update_catalogo_tipo_vehiculo(
    id_tipo: int,
    data: TipoVehiculoCatalogoCreate,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(TipoVehiculoCatalogo).where(TipoVehiculoCatalogo.id_tipo == id_tipo))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    dup = await session.execute(
        select(TipoVehiculoCatalogo).where(
            TipoVehiculoCatalogo.id_tipo != id_tipo,
            func.lower(TipoVehiculoCatalogo.nombre) == func.lower(data.nombre.strip()),
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe otro tipo con ese nombre.")
    old = {"nombre": row.nombre, "activo": row.activo}
    row.nombre = data.nombre.strip()
    row.activo = data.activo if data.activo is not None else True
    await session.commit()
    await session.refresh(row)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="catalogo_tipos_vehiculo",
        record_id=id_tipo,
        previous_data=old,
        new_data={"nombre": row.nombre, "activo": row.activo},
        details=f"Catálogo tipo vehículo actualizado: {row.nombre}",
    )
    return row


@router.delete("/catalogo/tipos-vehiculo/{id_tipo}")
async def delete_catalogo_tipo_vehiculo(
    id_tipo: int,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(TipoVehiculoCatalogo).where(TipoVehiculoCatalogo.id_tipo == id_tipo))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    await session.delete(row)
    await session.commit()
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="catalogo_tipos_vehiculo",
        record_id=id_tipo,
        previous_data={"nombre": row.nombre},
        details=f"Catálogo tipo vehículo eliminado: {row.nombre}",
    )
    return {"message": "Eliminado correctamente"}


@router.get("/catalogo/marcas", response_model=List[MarcaCatalogoResponse])
async def list_catalogo_marcas(
    todo: bool = False,
    _user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    q = select(MarcaCatalogo).order_by(MarcaCatalogo.nombre.asc())
    if not todo:
        q = q.where(MarcaCatalogo.activo == True)
    res = await session.execute(q)
    return res.scalars().all()


@router.post("/catalogo/marcas", response_model=MarcaCatalogoResponse)
async def create_catalogo_marca(
    data: MarcaCatalogoCreate,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(
        select(MarcaCatalogo).where(func.lower(MarcaCatalogo.nombre) == func.lower(data.nombre.strip()))
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe una marca con ese nombre.")
    row = MarcaCatalogo(nombre=data.nombre.strip(), activo=data.activo if data.activo is not None else True)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="catalogo_marcas",
        record_id=row.id_marca,
        new_data={"nombre": row.nombre},
        details=f"Catálogo marca: {row.nombre}",
    )
    return row


@router.put("/catalogo/marcas/{id_marca}", response_model=MarcaCatalogoResponse)
async def update_catalogo_marca(
    id_marca: int,
    data: MarcaCatalogoCreate,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(MarcaCatalogo).where(MarcaCatalogo.id_marca == id_marca))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    dup = await session.execute(
        select(MarcaCatalogo).where(
            MarcaCatalogo.id_marca != id_marca,
            func.lower(MarcaCatalogo.nombre) == func.lower(data.nombre.strip()),
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe otra marca con ese nombre.")
    old = {"nombre": row.nombre, "activo": row.activo}
    row.nombre = data.nombre.strip()
    row.activo = data.activo if data.activo is not None else True
    await session.commit()
    await session.refresh(row)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="catalogo_marcas",
        record_id=id_marca,
        previous_data=old,
        new_data={"nombre": row.nombre, "activo": row.activo},
        details=f"Catálogo marca actualizada: {row.nombre}",
    )
    return row


@router.delete("/catalogo/marcas/{id_marca}")
async def delete_catalogo_marca(
    id_marca: int,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(MarcaCatalogo).where(MarcaCatalogo.id_marca == id_marca))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    cnt = await session.execute(select(func.count()).select_from(ModeloCatalogo).where(ModeloCatalogo.id_marca == id_marca))
    if cnt.scalar_one() > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar: existen modelos asociados a esta marca.")
    await session.delete(row)
    await session.commit()
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="catalogo_marcas",
        record_id=id_marca,
        previous_data={"nombre": row.nombre},
        details=f"Catálogo marca eliminada: {row.nombre}",
    )
    return {"message": "Eliminado correctamente"}


@router.get("/catalogo/modelos", response_model=List[ModeloCatalogoResponse])
async def list_catalogo_modelos(
    id_marca: Optional[int] = None,
    todo: bool = False,
    _user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    q = select(ModeloCatalogo).order_by(ModeloCatalogo.nombre.asc())
    if id_marca is not None:
        q = q.where(ModeloCatalogo.id_marca == id_marca)
    if not todo:
        q = q.where(ModeloCatalogo.activo == True)
    res = await session.execute(q)
    return res.scalars().all()


@router.post("/catalogo/modelos", response_model=ModeloCatalogoResponse)
async def create_catalogo_modelo(
    data: ModeloCatalogoCreate,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    m = await session.execute(select(MarcaCatalogo).where(MarcaCatalogo.id_marca == data.id_marca))
    if not m.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Marca no válida.")
    res = await session.execute(
        select(ModeloCatalogo).where(
            ModeloCatalogo.id_marca == data.id_marca,
            func.lower(ModeloCatalogo.nombre) == func.lower(data.nombre.strip()),
        )
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe ese modelo para la marca seleccionada.")
    row = ModeloCatalogo(
        id_marca=data.id_marca,
        nombre=data.nombre.strip(),
        activo=data.activo if data.activo is not None else True,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="catalogo_modelos",
        record_id=row.id_modelo,
        new_data={"id_marca": row.id_marca, "nombre": row.nombre},
        details=f"Catálogo modelo: {row.nombre}",
    )
    return row


@router.put("/catalogo/modelos/{id_modelo}", response_model=ModeloCatalogoResponse)
async def update_catalogo_modelo(
    id_modelo: int,
    data: ModeloCatalogoCreate,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(ModeloCatalogo).where(ModeloCatalogo.id_modelo == id_modelo))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")
    m = await session.execute(select(MarcaCatalogo).where(MarcaCatalogo.id_marca == data.id_marca))
    if not m.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Marca no válida.")
    dup = await session.execute(
        select(ModeloCatalogo).where(
            ModeloCatalogo.id_modelo != id_modelo,
            ModeloCatalogo.id_marca == data.id_marca,
            func.lower(ModeloCatalogo.nombre) == func.lower(data.nombre.strip()),
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe ese modelo para la marca seleccionada.")
    old = {"id_marca": row.id_marca, "nombre": row.nombre, "activo": row.activo}
    row.id_marca = data.id_marca
    row.nombre = data.nombre.strip()
    row.activo = data.activo if data.activo is not None else True
    await session.commit()
    await session.refresh(row)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="catalogo_modelos",
        record_id=id_modelo,
        previous_data=old,
        new_data={"id_marca": row.id_marca, "nombre": row.nombre, "activo": row.activo},
        details=f"Catálogo modelo actualizado: {row.nombre}",
    )
    return row


@router.delete("/catalogo/modelos/{id_modelo}")
async def delete_catalogo_modelo(
    id_modelo: int,
    current_user: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(ModeloCatalogo).where(ModeloCatalogo.id_modelo == id_modelo))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")
    await session.delete(row)
    await session.commit()
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="catalogo_modelos",
        record_id=id_modelo,
        previous_data={"nombre": row.nombre, "id_marca": row.id_marca},
        details=f"Catálogo modelo eliminado: {row.nombre}",
    )
    return {"message": "Eliminado correctamente"}


# ===== CONFIGURACIÓN DE CALIFICACIONES =====
@router.get("/config-calificaciones", response_model=List[ConfigCalificacionResponse])
async def list_config_calificaciones(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(ConfigCalificacion).order_by(ConfigCalificacion.id_config.asc())
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(
            or_(ConfigCalificacion.id_playa == id_playa, ConfigCalificacion.id_playa.is_(None))
        )
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/config-calificaciones", response_model=ConfigCalificacionResponse)
async def create_config_calificacion(
    config_data: ConfigCalificacionCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar duplicado por nombre
    res = await session.execute(
        select(ConfigCalificacion)
        .where(func.lower(ConfigCalificacion.nombre) == func.lower(config_data.nombre))
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La configuración de calificación '{config_data.nombre}' ya existe.")

    new_config = ConfigCalificacion(**config_data.model_dump())
    session.add(new_config)
    await session.commit()
    await session.refresh(new_config)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="config_calificaciones",
        record_id=new_config.id_config,
        new_data=config_data.model_dump(exclude_none=True),
        details=f"Configuración de calificación creada: {new_config.nombre} - {new_config.calificacion}"
    )
    
    return new_config

@router.put("/config-calificaciones/{id_config}", response_model=ConfigCalificacionResponse)
async def update_config_calificacion(
    id_config: int,
    config_data: ConfigCalificacionCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(ConfigCalificacion).where(ConfigCalificacion.id_config == id_config))
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de calificación no encontrada")

    dup = await session.execute(
        select(ConfigCalificacion)
        .where(
            and_(
                func.lower(ConfigCalificacion.nombre) == func.lower(config_data.nombre),
                ConfigCalificacion.id_config != id_config,
            )
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"La configuración de calificación '{config_data.nombre}' ya existe.")

    old_data = {
        "id_config": config.id_config,
        "nombre": config.nombre,
        "dias_atraso_desde": config.dias_atraso_desde,
        "dias_atraso_hasta": config.dias_atraso_hasta,
        "calificacion": config.calificacion,
        "descripcion": config.descripcion,
        "activo": config.activo,
    }

    config.nombre = config_data.nombre
    config.dias_atraso_desde = config_data.dias_atraso_desde
    config.dias_atraso_hasta = config_data.dias_atraso_hasta
    config.calificacion = config_data.calificacion
    config.descripcion = config_data.descripcion
    config.activo = config_data.activo

    await session.commit()
    await session.refresh(config)

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="config_calificaciones",
        record_id=config.id_config,
        previous_data=old_data,
        new_data=config_data.model_dump(exclude_none=True),
        details=f"Configuración de calificación actualizada: {config.nombre} - {config.calificacion}"
    )

    return config

@router.delete("/config-calificaciones/{id_config}")
async def delete_config_calificacion(
    id_config: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(ConfigCalificacion).where(ConfigCalificacion.id_config == id_config))
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de calificación no encontrada")

    old_data = {
        "id_config": config.id_config,
        "nombre": config.nombre,
        "dias_atraso_desde": config.dias_atraso_desde,
        "dias_atraso_hasta": config.dias_atraso_hasta,
        "calificacion": config.calificacion,
        "descripcion": config.descripcion,
        "activo": config.activo,
    }

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="config_calificaciones",
        record_id=config.id_config,
        previous_data=old_data,
        details=f"Configuración de calificación eliminada: {config.nombre} - {config.calificacion}"
    )

    await session.delete(config)
    await session.commit()

    return {"message": "Configuración de calificación eliminada correctamente"}

# ===== VEHÍCULOS =====
logger = logging.getLogger(__name__)

@router.get("/vehiculos", response_model=List[ProductoResponse])
async def list_vehiculos(
    available_only: bool = False,
    id_playa_publico: Optional[int] = Query(None, description="Obligatorio si no hay token (catálogo público)"),
    current_user: Optional[dict] = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session)
):
    try:
        # Subquery para sumar gastos por producto
        subq_gastos = (
            select(
                GastoProducto.id_producto,
                func.sum(GastoProducto.monto).label("total_gastos")
            )
            .group_by(GastoProducto.id_producto)
            .subquery()
        )

        query = (
            select(
                Producto,
                func.coalesce(subq_gastos.c.total_gastos, 0).label("total_gastos")
            )
            .outerjoin(subq_gastos, Producto.id_producto == subq_gastos.c.id_producto)
            .options(
                selectinload(Producto.ventas).selectinload(Venta.cliente),
                selectinload(Producto.imagenes),
                selectinload(Producto.gastos).selectinload(GastoProducto.tipo_gasto),
                joinedload(Producto.tipo_vehiculo_rel),
                joinedload(Producto.marca_rel),
                joinedload(Producto.modelo_rel)
            )
        )

        if current_user is None:
            if id_playa_publico is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Autenticación requerida o indique id_playa como query param",
                )
            id_playa = id_playa_publico
        else:
            uid = current_user.get("id_playa")
            if uid is not None:
                id_playa = uid
            else:
                id_playa = id_playa_publico
        if id_playa is not None:
            query = query.where(Producto.id_playa == id_playa)

        if available_only:
            query = query.where(Producto.estado_disponibilidad == 'DISPONIBLE')

        result = await session.execute(query)
        rows = result.all()

        vehiculos_list = []
        for p, total_gastos in rows:
            p.total_gastos = total_gastos
            p.costo_final = (p.costo_base or 0) + total_gastos
            vehiculos_list.append(p)

        return vehiculos_list
    except Exception as e:
        logger.exception("Error en list_vehiculos")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehiculos/{id_producto}", response_model=ProductoResponse)
async def get_vehiculo(
    id_producto: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Producto)
        .options(
            selectinload(Producto.ventas).selectinload(Venta.cliente),
            selectinload(Producto.imagenes),
            selectinload(Producto.gastos).selectinload(GastoProducto.tipo_gasto),
            joinedload(Producto.tipo_vehiculo_rel),
            joinedload(Producto.marca_rel),
            joinedload(Producto.modelo_rel)
        )
        .where(Producto.id_producto == id_producto)
    )
    vehiculo = result.scalar_one_or_none()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    assert_resource_playa(current_user, vehiculo.id_playa)
    return vehiculo

@router.post("/vehiculos", response_model=ProductoResponse)
async def create_vehiculo(
    vehiculo_data: ProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar chasis duplicado solo dentro de la misma playa
    user_playa = current_user.get("id_playa")
    dup_q = select(Producto).where(Producto.chasis == vehiculo_data.chasis)
    if user_playa is not None:
        dup_q = dup_q.where(Producto.id_playa == user_playa)
    res = await session.execute(dup_q)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Ya existe un vehículo registrado con el chasis '{vehiculo_data.chasis}'.")

    new_vehiculo_data = vehiculo_data.dict()
    new_vehiculo_data["id_playa"] = current_user.get("id_playa")
    new_vehiculo = Producto(**new_vehiculo_data)
    session.add(new_vehiculo)
    await session.commit()
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="productos",
        record_id=new_vehiculo.id_producto,
        new_data=vehiculo_data.model_dump(exclude_none=True),
        details=f"Vehículo registrado: {new_vehiculo.marca} {new_vehiculo.modelo}"
    )
    
    # Re-obtener con relaciones para la respuesta
    result = await session.execute(
        select(Producto)
        .options(
            selectinload(Producto.ventas).selectinload(Venta.cliente),
            selectinload(Producto.imagenes),
            joinedload(Producto.tipo_vehiculo_rel),
            joinedload(Producto.marca_rel),
            joinedload(Producto.modelo_rel)
        )
        .where(Producto.id_producto == new_vehiculo.id_producto)
    )
    return result.scalar_one()
@router.put("/vehiculos/{id_producto}", response_model=ProductoResponse)
async def update_vehiculo(
    id_producto: int,
    vehiculo_data: ProductoUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    vehiculo = result.scalar_one_or_none()
    
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    assert_resource_playa(current_user, vehiculo.id_playa)
    
    # Verificar chasis duplicado si cambió (misma playa)
    if vehiculo_data.chasis and vehiculo_data.chasis != vehiculo.chasis:
        user_playa = current_user.get("id_playa")
        dup_q = select(Producto).where(
            Producto.chasis == vehiculo_data.chasis,
            Producto.id_producto != id_producto,
        )
        if user_playa is not None:
            dup_q = dup_q.where(Producto.id_playa == user_playa)
        res = await session.execute(dup_q)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Ya existe otro vehículo registrado con el chasis '{vehiculo_data.chasis}'.")

    # Auditoría: datos anteriores
    old_data = {
        column.name: getattr(vehiculo, column.name)
        for column in vehiculo.__table__.columns
    }
    # Convertir decimales y fechas para JSON
    for key, value in old_data.items():
        if isinstance(value, Decimal):
            old_data[key] = float(value)
        elif isinstance(value, (date, datetime)):
            old_data[key] = value.isoformat()

    # Actualizar campos
    update_data = vehiculo_data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(vehiculo, field, value)
    
    await session.commit()
    
    # Auditoría: nuevos datos
    new_data_for_audit = update_data.copy()
    for key, value in new_data_for_audit.items():
        if isinstance(value, Decimal):
            new_data_for_audit[key] = float(value)
        elif isinstance(value, (date, datetime)):
            new_data_for_audit[key] = value.isoformat()

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="productos",
        record_id=vehiculo.id_producto,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Vehículo actualizado: {vehiculo.marca} {vehiculo.modelo}"
    )
    
    # Re-obtener con relaciones para la respuesta
    result = await session.execute(
        select(Producto)
        .options(
            selectinload(Producto.ventas).selectinload(Venta.cliente),
            selectinload(Producto.imagenes)
        )
        .where(Producto.id_producto == id_producto)
    )
    return result.scalar_one()

@router.delete("/vehiculos/{id_producto}")
async def delete_vehiculo(
    id_producto: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Solo administradores pueden borrar
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")

    result = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    vehiculo = result.scalar_one_or_none()
    
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    assert_resource_playa(current_user, vehiculo.id_playa)
    
    # 1. Verificar si tiene ventas relacionadas
    ventas_check = await session.execute(select(Venta).where(Venta.id_producto == id_producto).limit(1))
    if ventas_check.first() is not None:
        raise HTTPException(status_code=400, detail="No se puede eliminar el vehículo porque ya tiene una venta asociada")
    
    # 2. Verificar si tiene gastos asociados
    gastos_check = await session.execute(select(GastoProducto).where(GastoProducto.id_producto == id_producto).limit(1))
    if gastos_check.first() is not None:
        raise HTTPException(status_code=400, detail="No se puede eliminar el vehículo porque tiene gastos registrados")

    # 3. Eliminar imágenes relacionadas (limpieza automática)
    await session.execute(delete(ImagenProducto).where(ImagenProducto.id_producto == id_producto))

    # Auditoría: datos antes de borrar
    old_data = {
        column.name: getattr(vehiculo, column.name)
        for column in vehiculo.__table__.columns
    }
    # Convertir decimales y fechas para JSON
    for key, value in old_data.items():
        if isinstance(value, Decimal):
            old_data[key] = float(value)
        elif isinstance(value, (date, datetime)):
            old_data[key] = value.isoformat()

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="productos",
        record_id=id_producto,
        previous_data=old_data,
        details=f"Vehículo eliminado: {vehiculo.marca} {vehiculo.modelo}"
    )

    await session.delete(vehiculo)
    await session.commit()
    
    return {"message": "Vehículo eliminado correctamente"}

# ===== IMÁGENES DE PRODUCTOS =====
@router.get("/vehiculos/{id_producto}/imagenes", response_model=List[ImagenProductoResponse])
async def list_imagenes_producto(
    id_producto: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    res_p = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    prod = res_p.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    assert_resource_playa(current_user, prod.id_playa)
    result = await session.execute(
        select(ImagenProducto)
        .where(ImagenProducto.id_producto == id_producto)
        .order_by(ImagenProducto.orden.asc(), ImagenProducto.id_imagen.asc())
    )
    return result.scalars().all()

@router.post("/vehiculos/{id_producto}/imagenes", response_model=List[ImagenProductoResponse])
async def upload_imagenes(
    id_producto: int,
    imagenes: List[UploadFile] = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    # Verificar que el producto exista y pertenezca a la playa del usuario
    res = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    prod = res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    assert_resource_playa(current_user, prod.id_playa)

    new_records = await persist_imagenes_desde_uploads(
        session,
        id_producto,
        imagenes,
        aplicar_marca_agua=True,
        marcar_primera_como_principal=False,
    )
    await session.commit()
    for rec in new_records:
        await session.refresh(rec)
    return new_records

@router.delete("/vehiculos/imagenes/{id_imagen}")
async def delete_imagen(
    id_imagen: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    img = await session.get(ImagenProducto, id_imagen)
    if not img:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
        
    # Eliminar archivo físico (usar UPLOAD_DIR para no depender del cwd)
    if img.ruta_archivo:
        filename = os.path.basename(img.ruta_archivo)
        abs_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except Exception as e:
                logging.warning(f"No se pudo eliminar el archivo {abs_path}: {e}")
                
    if img.imagen_con_marca and isinstance(img.imagen_con_marca, str):
        filename_wm = os.path.basename(img.imagen_con_marca)
        abs_path_wm = os.path.join(UPLOAD_DIR, filename_wm)
        if os.path.exists(abs_path_wm):
            try:
                os.remove(abs_path_wm)
            except Exception as e:
                logging.warning(f"No se pudo eliminar el archivo con marca {abs_path_wm}: {e}")
            
    await session.delete(img)
    await session.commit()
    return {"message": "Imagen eliminada"}

@router.patch("/vehiculos/imagenes/{id_imagen}/principal")
async def set_principal(
    id_imagen: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    img = await session.get(ImagenProducto, id_imagen)
    if not img:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
        
    # Desmarcar todas las demás del mismo producto
    await session.execute(
        update(ImagenProducto)
        .where(ImagenProducto.id_producto == img.id_producto)
        .values(es_principal=False)
    )
    
    img.es_principal = True
    await session.commit()
    return {"message": "Imagen establecida como principal"}

# ===== PUBLICACIÓN EN REDES SOCIALES =====
class SocialPostRequest(BaseModel):
    id_producto: int
    texto: str
    redes: List[str]
    imagenes: List[int]
    con_marca_agua: bool = True

@router.get("/vehiculos/{id_producto}/generar-texto-redes")
async def generar_texto_redes(
    id_producto: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un texto atractivo para redes sociales usando IA (Ollama/OpenAI) 
    basado en la ficha del vehículo.
    """
    # 1. Obtener info del vehículo
    res = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    vehiculo = res.scalar_one_or_none()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    # 2. Preparar el pormpt con los datos del vehículo
    detalles = [
        f"Marca: {vehiculo.marca}",
        f"Modelo: {vehiculo.modelo}",
        f"Año: {vehiculo.año}",
        f"Color: {vehiculo.color or 'A elección'}",
        f"Motor: {vehiculo.motor or 'N/A'}",
        f"Transmisión: {vehiculo.transmision or 'N/A'}",
        f"Combustible: {vehiculo.combustible or 'N/A'}",
    ]
    
    # Manejo inteligente de kilometraje para evitar alucinaciones de "0km" en usados
    if vehiculo.kilometraje and vehiculo.kilometraje > 0:
        detalles.append(f"Kilometraje: {vehiculo.kilometraje:,} km")
    elif vehiculo.año and int(vehiculo.año) < 2024:
        # Si es viejo y no hay kilometraje, no mandamos 0 para que la IA no mienta
        pass
    else:
        detalles.append("Kilometraje: 0 km (Nuevo)")

    precios = []
    # No mandamos montos reales al prompt si la instrucción es "No des precios" 
    # para evitar que la IA se confunda y los ponga
    if vehiculo.precio_contado_sugerido or vehiculo.precio_financiado_sugerido:
        precios.append("- Planes de financiación propia y bancaria.")
        precios.append("- Recibimos tu usado como parte de pago.")

    prompt = f"""
ROL:
Sos el mejor vendedor de autos usados recién importados de "Peralta Automotores" en Paraguay.
Vendés con tono profesional, confiable, cercano y entusiasta, pero sin exagerar ni inventar nada.

OBJETIVO:
Redactar una publicación atractiva para Facebook y WhatsApp que genere consultas reales.

DATOS DEL VEHÍCULO:
{chr(10).join(detalles)}

OBSERVACIONES:
{vehiculo.observaciones or 'Impecable estado, listo para transferir.'}

REGLAS OBLIGATORIAS (NO ROMPER ESTAS REGLAS):

1. PROHIBIDO inventar datos técnicos, kilometraje, equipamiento o beneficios que no estén en los DATOS DEL VEHÍCULO.
2. SOLO usar la información proporcionada.
3. Español latino/paraguayo. No usar "tú". Usar "vos" o trato neutro cordial.
4. NUNCA usar la palabra "Excluyente".
5. NO mencionar precios ni montos de cuotas. Solo decir: "Consultá por nuestros planes de financiación".
6. Si el vehículo es del año {vehiculo.año}, NO decir que es nuevo ni 0km salvo que esté explícitamente indicado.
7. NO exagerar con frases irreales como:
   - "nuevo como un cuadro"
   - "único en el universo"
   - "el mejor del mundo"
8. NO repetir información ya mencionada.
9. No hacer preguntas forzadas tipo vendedor insistente.
10. No decir “actúe ahora”.
11. No presentarse ni hablar de la empresa en primera persona.
12. No inventar beneficios emocionales que no estén respaldados por los datos.

ESTRUCTURA OBLIGATORIA:

1️⃣ Primera línea llamativa con emojis y modelo + año  
2️⃣ Lista clara de características en viñetas  
3️⃣ Breve párrafo destacando beneficios reales según los datos  
4️⃣ Llamado a la acción natural y paraguayo  
5️⃣ Línea final de contacto obligatoria:

"📲 Consultas: 0981431983  
🌐 www.peraltaautomotores.com.py"

FORMATO:
- Usar emojis moderadamente.
- Párrafos cortos.
- Fácil de leer en celular.
- Profesional pero cercano.

RESPONDER ÚNICAMENTE CON EL TEXTO FINAL DE LA PUBLICACIÓN.
"""


    # 3. Llamar al LLM (Reusando lógica de _extract_with_llm pero simplificada para texto plano)
    import os
    import requests
    from openai import OpenAI
    
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("DOCUMENTOS_LLM_URL")
    model = os.getenv("DOCUMENTOS_LLM_MODEL", "llama3.2")

    if not api_key and not base_url:
        # Fallback si no hay IA: generar un texto básico manual
        l1 = f"🚗 ¡NUEVO INGRESO! {vehiculo.marca} {vehiculo.modelo} {vehiculo.año} 🚗"
        l2 = f"✨ Color {vehiculo.color}. Transmisión {vehiculo.transmision}. Motor {vehiculo.motor}."
        l3 = f"💰 {chr(10).join(precios)}"
        l4 = "\n📍 ¡Visítanos hoy mismo en nuestra playa!"
        return {"texto": f"{l1}\n\n{l2}\n\n{l3}\n{l4}"}

    try:
        if base_url:
            base_url = base_url.rstrip("/")
            
            # --- AUTO-DETECCIÓN DE MODELO OLLAMA ---
            # Si es Ollama (no OpenAI), intentamos verificar si el modelo existe
            # Si no existe, intentamos usar el primero disponible
            if "11434" in base_url or "ollama" in base_url.lower():
                try:
                    tags_url = f"{base_url}/api/tags"
                    tags_resp = requests.get(tags_url, timeout=5)
                    if tags_resp.status_code == 200:
                        available_models = [m["name"] for m in tags_resp.json().get("models", [])]
                        if available_models:
                            # Si el modelo configurado no está en la lista, usamos el primero que encontremos
                            model_found = False
                            for m in available_models:
                                if model in m: # match parcial llama3.2 con llama3.2:latest
                                    model = m
                                    model_found = True
                                    break
                            
                            if not model_found:
                                logger.warning(f"Modelo '{model}' no encontrado en Ollama. Usando '{available_models[0]}' en su lugar.")
                                model = available_models[0]
                except Exception as ex:
                    logger.warning(f"No se pudo verificar modelos en Ollama: {ex}")

            if "/v1" in base_url:
                url = base_url + "/chat/completions"
                payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "stream": False}
                r = requests.post(url, json=payload, timeout=180) # Aumentado a 180s
                r.raise_for_status()
                content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                url = base_url + "/api/chat"
                payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "stream": False, "options": {"temperature": 0.7}}
                r = requests.post(url, json=payload, timeout=180) # Aumentado a 180s
                r.raise_for_status()
                content = r.json().get("message", {}).get("content", "")
        else:
            client = OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model=os.getenv("DOCUMENTOS_LLM_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            content = resp.choices[0].message.content or ""
        
        if not content:
            raise Exception("La IA devolvió un texto vacío.")

        return {"texto": content.strip()}
    except Exception as e:
        logger.error(f"Error al generar texto con IA ({model}): {e}")
        # Fallback por error con más info
        error_info = ""
        if "timeout" in str(e).lower():
            error_info = "\n\n(Nota: La IA tardó demasiado en responder. Verifica que Ollama esté activo y tenga recursos suficientes)"
        elif "404" in str(e):
            error_info = "\n\n(Nota: El modelo 'llama3.2' no está en tu Ollama. Ejecuta 'ollama pull llama3.2' en tu terminal)"
        elif "Connection" in str(e) or "Max retries" in str(e):
            error_info = "\n\n(Nota: No se pudo conectar con Ollama. Asegúrate de que esté abierto y con OLLAMA_HOST=0.0.0.0)"
        
        return {"texto": f"🚗 {vehiculo.marca} {vehiculo.modelo} {vehiculo.año} 🚗\n\nConsultar precio y financiación.{error_info}"}

@router.post("/social-post")
async def social_post(
    data: SocialPostRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint para publicar contenido en redes sociales.
    Aquí se integrarán las APIs de Facebook, Instagram, X, etc.
    """
    # 0. Reforzar validación de marca de agua solo para el usuario "admin" real
    if not data.con_marca_agua and current_user.get("sub") != "admin":
        data.con_marca_agua = True

    try:
        # 1. Obtener info del vehículo e imágenes
        res_veh = await session.execute(select(Producto).where(Producto.id_producto == data.id_producto))
        vehiculo = res_veh.scalar_one_or_none()
        
        if not vehiculo:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        res_img = await session.execute(select(ImagenProducto).where(ImagenProducto.id_imagen.in_(data.imagenes)))
        imagenes_existentes = res_img.scalars().all()
        # Respetar el orden de selección enviado desde el frontend
        id_to_img = {img.id_imagen: img for img in imagenes_existentes}
        imagenes_obj = [id_to_img[id_img] for id_img in data.imagenes if id_img in id_to_img]

        # 2. Lógica de publicación (Async/Parallel)
        results = {}
        fb_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
        fb_page_id = os.getenv("FACEBOOK_PAGE_ID")
        ig_id = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
        public_url = os.getenv("PUBLIC_BASE_URL")
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            for red in data.redes:
                if red == 'facebook' and fb_token and fb_page_id != "PONER_ID_AQUI":
                    try:
                        base_url = public_url.rstrip("/")
                        if len(imagenes_obj) > 0 and public_url and "PONER_URL" not in public_url:
                            if len(imagenes_obj) == 1:
                                # Caso 1: Imagen única
                                img = imagenes_obj[0]
                                filename = os.path.basename(img.ruta_archivo)
                                ruta_wm = img.ruta_archivo.replace(filename, f"wm_{filename}")
                                abs_path_wm = os.path.join(UPLOAD_DIR, f"wm_{filename}")
                                ruta_a_usar = ruta_wm if (data.con_marca_agua and os.path.exists(abs_path_wm)) else img.ruta_archivo
                                img_url = f"{base_url}/static{ruta_a_usar}" if not ruta_a_usar.startswith("/static") else f"{base_url}{ruta_a_usar}"
                                
                                resp = await client.post(
                                    f"https://graph.facebook.com/v22.0/{fb_page_id}/photos",
                                    params={"access_token": fb_token},
                                    data={"url": img_url, "caption": data.texto}
                                )
                                fb_res_json = resp.json()
                            else:
                                # Caso 2: Múltiples imágenes (PARALELO)
                                upload_tasks = []
                                for img in imagenes_obj:
                                    filename = os.path.basename(img.ruta_archivo)
                                    ruta_wm = img.ruta_archivo.replace(filename, f"wm_{filename}")
                                    abs_path_wm = os.path.join(UPLOAD_DIR, f"wm_{filename}")
                                    ruta_a_usar = ruta_wm if (data.con_marca_agua and os.path.exists(abs_path_wm)) else img.ruta_archivo
                                    img_url = f"{base_url}/static{ruta_a_usar}" if not ruta_a_usar.startswith("/static") else f"{base_url}{ruta_a_usar}"
                                    
                                    upload_tasks.append(client.post(
                                        f"https://graph.facebook.com/v22.0/{fb_page_id}/photos",
                                        params={"access_token": fb_token},
                                        data={"url": img_url, "published": "false"}
                                    ))
                                
                                # Ejecutar todas las subidas en paralelo
                                upload_responses = await asyncio.gather(*upload_tasks)
                                media_ids = []
                                for r in upload_responses:
                                    r_json = r.json()
                                    if "id" in r_json:
                                        media_ids.append({"media_fbid": r_json["id"]})
                                
                                # Publicar el post final con todas las fotos
                                resp = await client.post(
                                    f"https://graph.facebook.com/v22.0/{fb_page_id}/feed",
                                    params={"access_token": fb_token},
                                    data={
                                        "message": data.texto,
                                        "attached_media": json.dumps(media_ids)
                                    }
                                )
                                fb_res_json = resp.json()
                        else:
                            # Caso 3: Solo texto
                            resp = await client.post(
                                f"https://graph.facebook.com/v22.0/{fb_page_id}/feed",
                                params={"access_token": fb_token},
                                data={"message": data.texto}
                            )
                            fb_res_json = resp.json()

                        if resp.status_code == 200:
                            results['facebook'] = f"Publicado exitosamente ID: {fb_res_json.get('id')}"
                        else:
                            results['facebook'] = f"Error: {fb_res_json.get('error', {}).get('message', 'Desconocido')}"
                    except Exception as e:
                        results['facebook'] = f"Error de conexión: {str(e)}"

                elif red == 'instagram' and fb_token and ig_id != "PONER_ID_AQUI":
                    try:
                        if not imagenes_obj:
                            results['instagram'] = "Error: Instagram requiere imagen."
                            continue
                        
                        # Instagram solo permite una imagen en este flujo simplificado
                        img = imagenes_obj[0]
                        filename = os.path.basename(img.ruta_archivo)
                        ruta_wm = img.ruta_archivo.replace(filename, f"wm_{filename}")
                        abs_path_wm = os.path.join(UPLOAD_DIR, f"wm_{filename}")
                        ruta_a_usar = ruta_wm if (data.con_marca_agua and os.path.exists(abs_path_wm)) else img.ruta_archivo
                        img_url = f"{public_url}{ruta_a_usar}"
                        
                        # 1. Crear contenedor
                        resp = await client.post(f"https://graph.facebook.com/v19.0/{ig_id}/media", data={
                            "image_url": img_url,
                            "caption": data.texto,
                            "access_token": fb_token
                        })
                        if resp.status_code == 200:
                            creation_id = resp.json().get('id')
                            # 2. Publicar
                            resp_pub = await client.post(f"https://graph.facebook.com/v19.0/{ig_id}/media_publish", data={
                                "creation_id": creation_id,
                                "access_token": fb_token
                            })
                            if resp_pub.status_code == 200:
                                results['instagram'] = f"Publicado exitosamente ID: {resp_pub.json().get('id')}"
                            else:
                                results['instagram'] = f"Error al publicar: {resp_pub.text}"
                        else:
                            results['instagram'] = f"Error al crear contenedor: {resp.text}"
                    except Exception as e:
                        results['instagram'] = f"Error: {str(e)}"

                elif red == 'twitter':
                    results['twitter'] = "Simulado: Twitter"
                elif red == 'whatsapp':
                    results['whatsapp'] = "Simulado: WhatsApp"

        # 3. Registrar en auditoría
        await log_audit_action(
            session=session,
            username=current_user["sub"],
            user_id=current_user["user_id"],
            action="social_publish",
            table="productos",
            record_id=vehiculo.id_producto,
            new_data={"redes": data.redes, "texto": data.texto, "con_marca_agua": data.con_marca_agua},
            details=f"Publicación en redes para {vehiculo.marca} {vehiculo.modelo}"
        )

        return {"status": "success", "message": "Proceso completado", "details": results}

    except Exception as e:
        logger.exception(f"Error crítico en social_post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# ===== CLIENTES =====
@router.get("/clientes", response_model=List[ClienteResponse])
async def list_clientes(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(Cliente)
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(Cliente.id_playa == id_playa)
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/clientes", response_model=ClienteResponse)
async def create_cliente(
    cliente_data: ClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar si ya existe
    check = await session.execute(select(Cliente).where(Cliente.numero_documento == cliente_data.numero_documento))
    if check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El documento ya está registrado")
        
    new_cliente_data = cliente_data.model_dump()
    new_cliente_data["id_playa"] = current_user.get("id_playa")
    new_cliente = Cliente(**new_cliente_data)
    session.add(new_cliente)
    await session.commit()
    await session.refresh(new_cliente)
    
    # Auditoría
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = cliente_data.model_dump(exclude_none=True)
    if 'ingreso_mensual' in new_data_for_audit and new_data_for_audit['ingreso_mensual']:
        new_data_for_audit['ingreso_mensual'] = float(new_data_for_audit['ingreso_mensual'])
    if 'fecha_nacimiento' in new_data_for_audit and new_data_for_audit['fecha_nacimiento']:
        if hasattr(new_data_for_audit['fecha_nacimiento'], 'isoformat'):
            new_data_for_audit['fecha_nacimiento'] = new_data_for_audit['fecha_nacimiento'].isoformat()
        else:
            new_data_for_audit['fecha_nacimiento'] = str(new_data_for_audit['fecha_nacimiento'])
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="clientes",
        record_id=new_cliente.id_cliente,
        new_data=new_data_for_audit,
        details=f"Cliente registrado: {new_cliente.nombre} {new_cliente.apellido} - CI: {new_cliente.numero_documento}"
    )
    
    await session.refresh(new_cliente)
    return new_cliente

@router.put("/clientes/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(
    cliente_id: int,
    cliente_data: ClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Obtener el cliente existente
    result = await session.execute(select(Cliente).where(Cliente.id_cliente == cliente_id))
    cliente = result.scalar_one_or_none()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Verificar si el nuevo documento ya existe (si es diferente)
    if cliente.numero_documento != cliente_data.numero_documento:
        check = await session.execute(select(Cliente).where(Cliente.numero_documento == cliente_data.numero_documento))
        if check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El documento ya está registrado")
    
    # Guardar datos antiguos para auditoría
    old_data = {
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "fecha_nacimiento": cliente.fecha_nacimiento.isoformat() if cliente.fecha_nacimiento else None,
        "telefono": cliente.telefono,
        "celular": cliente.celular,
        "email": cliente.email,
        "direccion": cliente.direccion,
        "ciudad": cliente.ciudad,
        "departamento": cliente.departamento,
        "codigo_postal": cliente.codigo_postal,
        "estado_civil": cliente.estado_civil,
        "profesion": cliente.profesion,
        "lugar_trabajo": cliente.lugar_trabajo,
        "telefono_trabajo": cliente.telefono_trabajo,
        "ingreso_mensual": float(cliente.ingreso_mensual) if cliente.ingreso_mensual else None,
        "observaciones": cliente.observaciones,
        "activo": cliente.activo
    }
    
    # Actualizar campos
    for field, value in cliente_data.model_dump(exclude_none=True).items():
        setattr(cliente, field, value)
    
    await session.commit()
    await session.refresh(cliente)
    
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = cliente_data.model_dump(exclude_none=True)
    if 'ingreso_mensual' in new_data_for_audit and new_data_for_audit['ingreso_mensual']:
        new_data_for_audit['ingreso_mensual'] = float(new_data_for_audit['ingreso_mensual'])
    if 'fecha_nacimiento' in new_data_for_audit and new_data_for_audit['fecha_nacimiento']:
        if hasattr(new_data_for_audit['fecha_nacimiento'], 'isoformat'):
            new_data_for_audit['fecha_nacimiento'] = new_data_for_audit['fecha_nacimiento'].isoformat()
        else:
            new_data_for_audit['fecha_nacimiento'] = str(new_data_for_audit['fecha_nacimiento'])
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="clientes",
        record_id=cliente_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Cliente actualizado: {cliente_data.nombre} {cliente_data.apellido}"
    )
    
    await session.refresh(cliente)
    return cliente

@router.delete("/clientes/{cliente_id}")
async def delete_cliente(
    cliente_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Cliente).where(Cliente.id_cliente == cliente_id))
    cliente = result.scalar_one_or_none()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Verificar si tiene ventas relacionadas
    ventas_check = await session.execute(select(Venta).where(Venta.id_cliente == cliente_id))
    if ventas_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="No se puede eliminar el cliente porque tiene ventas registradas")
    
    # Guardar datos para auditoría
    old_data = {
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "fecha_nacimiento": cliente.fecha_nacimiento.isoformat() if cliente.fecha_nacimiento else None,
        "telefono": cliente.telefono,
        "celular": cliente.celular,
        "email": cliente.email,
        "direccion": cliente.direccion,
        "ciudad": cliente.ciudad,
        "departamento": cliente.departamento,
        "codigo_postal": cliente.codigo_postal,
        "estado_civil": cliente.estado_civil,
        "profesion": cliente.profesion,
        "lugar_trabajo": cliente.lugar_trabajo,
        "telefono_trabajo": cliente.telefono_trabajo,
        "ingreso_mensual": float(cliente.ingreso_mensual) if cliente.ingreso_mensual else None,
        "observaciones": cliente.observaciones,
        "activo": cliente.activo
    }
    
    # Auditoría (antes de eliminar)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="clientes",
        record_id=cliente_id,
        previous_data=old_data,
        details=f"Cliente eliminado: {cliente.nombre} {cliente.apellido}"
    )
    
    await session.delete(cliente)
    await session.commit()
    
    return {"message": "Cliente eliminado correctamente"}

# ===== GARANTES =====
@router.get("/clientes/{cliente_id}/full", response_model=ClienteResponseFull)
async def get_cliente_full(
    cliente_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Cliente)
        .options(
            joinedload(Cliente.garantes).joinedload(Gante.referencias),
            joinedload(Cliente.referencias),
            joinedload(Cliente.ubicaciones)
        )
        .where(Cliente.id_cliente == cliente_id)
    )
    cliente = result.unique().scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    assert_resource_playa(current_user, cliente.id_playa)
    return cliente

@router.get("/garantes", response_model=List[GanteResponse])
async def list_garantes(
    id_cliente: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(Gante).options(joinedload(Gante.referencias))
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(or_(Gante.id_playa == id_playa, Gante.id_playa.is_(None)))
    if id_cliente:
        query = query.where(Gante.id_cliente == id_cliente)
    result = await session.execute(query)
    return result.unique().scalars().all()

@router.post("/garantes", response_model=GanteResponse)
async def create_garante(
    data: GanteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar si ya existe este documento para este cliente (evitar duplicados)
    check = await session.execute(
        select(Gante).where(
            and_(
                Gante.id_cliente == data.id_cliente,
                Gante.numero_documento == data.numero_documento
            )
        )
    )
    if check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este garante ya está registrado para este cliente")

    new_garante = Gante(**data.model_dump())
    session.add(new_garante)
    await session.commit()
    await session.refresh(new_garante)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="garantes",
        record_id=new_garante.id_garante,
        new_data=data.model_dump(exclude_none=True),
        details=f"Garante registrado para cliente ID {data.id_cliente}: {new_garante.nombre} {new_garante.apellido}"
    )
    
    # Recargar para incluir referencias (vacías)
    result = await session.execute(select(Gante).options(joinedload(Gante.referencias)).where(Gante.id_garante == new_garante.id_garante))
    return result.unique().scalar_one()

@router.put("/garantes/{id_garante}", response_model=GanteResponse)
async def update_garante(
    id_garante: int,
    data: GanteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Gante).where(Gante.id_garante == id_garante))
    garante = result.scalar_one_or_none()
    if not garante:
        raise HTTPException(status_code=404, detail="Garante no encontrado")
    
    old_data = {c.name: getattr(garante, c.name) for c in garante.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(garante, field, value)
        
    await session.commit()
    await session.refresh(garante)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="garantes",
        record_id=id_garante,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Gante actualizado: {garante.nombre} {garante.apellido}"
    )
    
    result = await session.execute(select(Gante).options(joinedload(Gante.referencias)).where(Gante.id_garante == id_garante))
    return result.unique().scalar_one()

@router.delete("/garantes/{id_garante}")
async def delete_garante(
    id_garante: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Gante).where(Gante.id_garante == id_garante))
    garante = result.scalar_one_or_none()
    if not garante:
        raise HTTPException(status_code=404, detail="Garante no encontrado")
    
    # Eliminar referencias asociadas
    await session.execute(delete(Referencia).where(and_(Referencia.id_cliente == id_garante, Referencia.tipo_entidad == 'GARANTE')))
    
    await session.delete(garante)
    await session.commit()
    
    return {"message": "Garante eliminado correctamente"}

# ===== REFERENCIAS =====
@router.post("/referencias", response_model=ReferenciaResponse)
async def create_referencia(
    data: ReferenciaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verificar si ya existe una referencia con el mismo nombre para este cliente/garante
    check = await session.execute(
        select(Referencia).where(
            and_(
                Referencia.id_cliente == data.id_cliente,
                Referencia.tipo_entidad == data.tipo_entidad,
                func.lower(Referencia.nombre) == func.lower(data.nombre)
            )
        )
    )
    if check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Esta referencia ya está registrada")

    new_ref = Referencia(**data.model_dump())
    session.add(new_ref)
    await session.commit()
    await session.refresh(new_ref)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="referencias",
        record_id=new_ref.id_referencia,
        new_data=data.model_dump(exclude_none=True),
        details=f"Referencia {data.tipo_referencia} creada para {data.tipo_entidad} ID {data.id_cliente}"
    )
    
    return new_ref

@router.put("/referencias/{id_referencia}", response_model=ReferenciaResponse)
async def update_referencia(
    id_referencia: int,
    data: ReferenciaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Referencia).where(Referencia.id_referencia == id_referencia))
    ref = result.scalar_one_or_none()
    if not ref:
        raise HTTPException(status_code=404, detail="Referencia no encontrada")
    
    old_data = {c.name: getattr(ref, c.name) for c in ref.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ref, field, value)
        
    await session.commit()
    await session.refresh(ref)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="referencias",
        record_id=id_referencia,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Referencia actualizada: {ref.nombre}"
    )
    
    return ref

@router.delete("/referencias/{id_referencia}")
async def delete_referencia(
    id_referencia: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Referencia).where(Referencia.id_referencia == id_referencia))
    ref = result.scalar_one_or_none()
    if not ref:
        raise HTTPException(status_code=404, detail="Referencia no encontrada")
    
    await session.delete(ref)
    await session.commit()
    
    return {"message": "Referencia eliminada correctamente"}

# ===== UBICACIONES CLIENTE =====
@router.post("/ubicaciones-cliente", response_model=UbicacionClienteResponse)
async def create_ubicacion_cliente(
    data: UbicacionClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_ub = UbicacionCliente(**data.model_dump())
    session.add(new_ub)
    await session.commit()
    await session.refresh(new_ub)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="ubicaciones_cliente",
        record_id=new_ub.id_ubicacion,
        new_data=data.model_dump(exclude_none=True),
        details=f"Ubicación '{data.nombre_lugar}' creada para cliente ID {data.id_cliente}"
    )
    
    return new_ub

@router.put("/ubicaciones-cliente/{id_ubicacion}", response_model=UbicacionClienteResponse)
async def update_ubicacion_cliente(
    id_ubicacion: int,
    data: UbicacionClienteCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(UbicacionCliente).where(UbicacionCliente.id_ubicacion == id_ubicacion))
    ub = result.scalar_one_or_none()
    if not ub:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    
    old_data = {c.name: getattr(ub, c.name) for c in ub.__table__.columns}
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ub, field, value)
        
    await session.commit()
    await session.refresh(ub)
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="ubicaciones_cliente",
        record_id=id_ubicacion,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Ubicación actualizada: {ub.nombre_lugar}"
    )
    
    return ub

@router.delete("/ubicaciones-cliente/{id_ubicacion}")
async def delete_ubicacion_cliente(
    id_ubicacion: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(UbicacionCliente).where(UbicacionCliente.id_ubicacion == id_ubicacion))
    ub = result.scalar_one_or_none()
    if not ub:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    
    await session.delete(ub)
    await session.commit()
    
    return {"message": "Ubicación eliminada correctamente"}

# ===== VENTAS Y PAGARÉS =====
@router.get("/ventas", response_model=List[VentaResponse])
async def list_ventas(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(Venta).options(
        joinedload(Venta.cliente),
        joinedload(Venta.producto).selectinload(Producto.imagenes),
        joinedload(Venta.escribania_rel),
        joinedload(Venta.detalles),
        selectinload(Venta.pagares).options(
            joinedload(Pagare.estado_rel),
            selectinload(Pagare.pagos)
        )
    )
    
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(Venta.id_playa == id_playa)
        
    result = await session.execute(query.order_by(Venta.fecha_registro.desc()))
    return result.unique().scalars().all()

@router.post("/ventas", response_model=VentaResponse)
async def create_venta(
    venta_data: VentaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # 1. Verificar disponibilidad del vehículo
    res_v = await session.execute(select(Producto).where(Producto.id_producto == venta_data.id_producto))
    vehiculo = res_v.scalar_one_or_none()
    
    if not vehiculo or vehiculo.estado_disponibilidad != 'DISPONIBLE':
        raise HTTPException(status_code=400, detail="El vehículo no está disponible para la venta")

    # 2. Crear la venta
    venta_dict = venta_data.dict()
    detalles_data = venta_dict.pop('detalles', [])
    id_cuenta_pago = venta_dict.pop('id_cuenta', None)
    pagos_cuentas_items = venta_dict.pop('pagos_cuentas', []) # Extraer antes de crear Venta
    id_playa = current_user.get("id_playa")
    new_venta = Venta(**venta_dict, id_playa=id_playa)
    session.add(new_venta)
    await session.flush() # Para obtener el ID de la venta

    # 2.1 Crear detalles de venta
    for det in detalles_data:
        nuevo_detalle = DetalleVenta(id_venta=new_venta.id_venta, **det)
        session.add(nuevo_detalle)

    # 3. Marcar vehículo como VENDIDO
    vehiculo.estado_disponibilidad = 'VENDIDO'
    
    # 4. Generar Pagarés
    hoy = new_venta.fecha_venta or date.today()
    
    # Obtener estados para asignar el ID correcto
    res_st = await session.execute(select(Estado))
    all_states = {s.nombre: s.id_estado for s in res_st.scalars().all()}
    id_pendiente = all_states.get('PENDIENTE')

        # 4.1 Pagaré de Entrega Inicial (Aplica para Contado y Financiado si hay entrega)
    if (new_venta.entrega_inicial or 0) > 0:
        id_pagado = all_states.get('PAGADO')
        pagare_ei = Pagare(
            id_venta=new_venta.id_venta,
            numero_pagare=f"{new_venta.numero_venta}-EI",
            numero_cuota=0,
            monto_cuota=new_venta.entrega_inicial,
            fecha_vencimiento=hoy,
            tipo_pagare='ENTREGA_CONTADO' if new_venta.tipo_venta == 'CONTADO' else 'ENTREGA_INICIAL',
            id_estado=id_pagado,  # Se registra directamente como PAGADO
            saldo_pendiente=0,     # Saldo cero al estar pagado
            cancelado=True,
            id_playa=id_playa
        )
        session.add(pagare_ei)
        await session.flush()  # Para obtener el id_pagare

        # 4.1.1 Determinar pagos a realizar
        pagos_a_procesar = []
        pagos_cuentas_data = pagos_cuentas_items
        
        if pagos_cuentas_data:
            for p_dict in pagos_cuentas_data:
                # p_dict es una instancia de PagoDistribucion (o dict si viene de model_dump)
                # Si viene de dict() del modelo, puede ser un dict
                monto_val = p_dict.get('monto') if isinstance(p_dict, dict) else getattr(p_dict, 'monto')
                id_cta_val = p_dict.get('id_cuenta') if isinstance(p_dict, dict) else getattr(p_dict, 'id_cuenta')
                forma_val = p_dict.get('forma_pago', 'EFECTIVO') if isinstance(p_dict, dict) else getattr(p_dict, 'forma_pago', 'EFECTIVO')
                ref_val = p_dict.get('numero_referencia') if isinstance(p_dict, dict) else getattr(p_dict, 'numero_referencia', None)
                
                pagos_a_procesar.append({
                    "id_cuenta": id_cta_val,
                    "monto": monto_val,
                    "forma_pago": forma_val,
                    "referencia": ref_val
                })
        elif id_cuenta_pago:
            pagos_a_procesar.append({
                "id_cuenta": id_cuenta_pago,
                "monto": new_venta.entrega_inicial,
                "forma_pago": 'EFECTIVO',
                "referencia": None
            })

        # 4.1.2 Procesar cada pago
        for i, pago_data in enumerate(pagos_a_procesar):
            monto_pago = Decimal(str(pago_data["monto"]))
            id_cta = pago_data["id_cuenta"]
            
            pago_ei = Pago(
                id_pagare=pagare_ei.id_pagare,
                id_venta=new_venta.id_venta,
                id_cuenta=id_cta,
                numero_recibo=f"REC-EI-{new_venta.numero_venta}-{i+1}" if len(pagos_a_procesar) > 1 else f"REC-EI-{new_venta.numero_venta}",
                fecha_pago=hoy,
                monto_pagado=monto_pago,
                forma_pago=pago_data["forma_pago"],
                numero_referencia=pago_data["referencia"],
                dias_atraso=0,
                mora_aplicada=0,
                descuento_aplicado=0,
                observaciones='Pago (distribuido) registrado automáticamente al crear la venta',
                id_playa=id_playa
            )
            session.add(pago_ei)

            # Impacto en cuenta si se especificó
            if id_cta:
                res_c = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == id_cta))
                cuenta = res_c.scalar_one_or_none()
                if cuenta:
                    if cuenta.saldo_actual is None: cuenta.saldo_actual = 0
                    cuenta.saldo_actual += monto_pago
                    
                    # Registrar movimiento
                    movimiento = Movimiento(
                        id_cuenta_destino=id_cta,
                        monto=monto_pago,
                        fecha=datetime.now(),
                        concepto=f"Ingreso por {'Venta al Contado' if new_venta.tipo_venta == 'CONTADO' else 'Entrega Inicial'} - Venta {new_venta.numero_venta}",
                        id_usuario=current_user.get("user_id"),
                        referencia=f"PAGO-{pago_ei.numero_recibo}",
                        id_playa=id_playa
                    )
                    session.add(movimiento)

    # 4.2 Pagarés de Financiación
    if venta_data.tipo_venta == 'FINANCIADO':
        # Pagarés de Cuotas
        if (venta_data.cantidad_cuotas or 0) > 0:
            for i in range(1, venta_data.cantidad_cuotas + 1):
                vencimiento = add_months(hoy, i)
                nuevo_pagare = Pagare(
                    id_venta=new_venta.id_venta,
                    numero_pagare=f"{new_venta.numero_venta}-C{i}",
                    numero_cuota=i,
                    monto_cuota=venta_data.monto_cuota,
                    fecha_vencimiento=vencimiento,
                    tipo_pagare='CUOTA',
                    # estado='PENDIENTE', # Removed
                    id_estado=id_pendiente,
                    saldo_pendiente=venta_data.monto_cuota,
                    id_playa=id_playa
                )
                session.add(nuevo_pagare)
        
        # Pagarés de Refuerzos
        if (venta_data.cantidad_refuerzos or 0) > 0:
            for i in range(1, venta_data.cantidad_refuerzos + 1):
                vencimiento = add_months(hoy, 12 * i)
                nuevo_pagare = Pagare(
                    id_venta=new_venta.id_venta,
                    numero_pagare=f"{new_venta.numero_venta}-R{i}",
                    numero_cuota=i,
                    monto_cuota=venta_data.monto_refuerzo,
                    fecha_vencimiento=vencimiento,
                    tipo_pagare='REFUERZO',
                    id_estado=id_pendiente,
                    saldo_pendiente=venta_data.monto_refuerzo,
                    id_playa=id_playa
                )
                session.add(nuevo_pagare)

    await session.commit()
    await session.refresh(new_venta)
    
    # Cargar la relación pagares y detalles para evitar error de lazy loading
    result = await session.execute(
        select(Venta)
        .options(
            joinedload(Venta.detalles),
            joinedload(Venta.escribania_rel),
            selectinload(Venta.pagares).options(
                joinedload(Pagare.estado_rel),
                selectinload(Pagare.pagos)
            )
        )
        .where(Venta.id_venta == new_venta.id_venta)
    )
    venta_with_relations = result.unique().scalar_one()
    
    # Auditoría
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = venta_data.dict(exclude_none=True)
    decimal_fields = ['precio_venta', 'descuento', 'precio_final', 'entrega_inicial', 'saldo_financiar', 'monto_cuota', 'tasa_interes', 'monto_refuerzo']
    for field in decimal_fields:
        if field in new_data_for_audit and new_data_for_audit[field] is not None:
            new_data_for_audit[field] = float(new_data_for_audit[field])
    
    # Convertir fecha_venta a string si existe
    if 'fecha_venta' in new_data_for_audit and new_data_for_audit['fecha_venta']:
        if hasattr(new_data_for_audit['fecha_venta'], 'isoformat'):
            new_data_for_audit['fecha_venta'] = new_data_for_audit['fecha_venta'].isoformat()
        else:
            new_data_for_audit['fecha_venta'] = str(new_data_for_audit['fecha_venta'])
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="ventas",
        record_id=venta_with_relations.id_venta,
        new_data=new_data_for_audit,
        details=f"Venta registrada: {venta_with_relations.numero_venta} - {venta_with_relations.tipo_venta} - Vehículo ID {venta_data.id_producto}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(Venta)
        .options(
            joinedload(Venta.cliente),
            joinedload(Venta.producto).selectinload(Producto.imagenes),
            joinedload(Venta.escribania_rel),
            joinedload(Venta.detalles),
            selectinload(Venta.pagares).options(
                joinedload(Pagare.estado_rel),
                selectinload(Pagare.pagos)
            )
        )
        .where(Venta.id_venta == new_venta.id_venta)
    )
    return result.unique().scalar_one()

@router.delete("/ventas/{venta_id}/anular")
async def anular_venta(
    venta_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Elimina completamente una venta y todos sus registros relacionados,
    siempre y cuando no tenga cuotas pagadas.
    - Elimina pagarés (y sus pagos asociados, si existieran sin pago aun)
    - Elimina detalles de venta
    - Elimina refuerzos
    - Revierte el vehículo a DISPONIBLE
    - Elimina la venta
    """
    # Traer la venta con relaciones
    result = await session.execute(
        select(Venta)
        .options(
            selectinload(Venta.pagares).selectinload(Pagare.pagos),
            selectinload(Venta.detalles),
            selectinload(Venta.refuerzos),
        )
        .where(Venta.id_venta == venta_id)
    )
    venta = result.unique().scalar_one_or_none()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    # Verificar si tiene pagos registrados (cualquier pago, de cualquier pagaré)
    pagos_result = await session.execute(
        select(func.count(Pago.id_pago)).where(Pago.id_venta == venta_id)
    )
    cantidad_pagos = pagos_result.scalar()
    if cantidad_pagos and cantidad_pagos > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar la venta porque tiene {cantidad_pagos} pago(s) registrado(s). Primero elimine los pagos."
        )


    # Guardar datos para auditoría antes de eliminar
    old_data = {
        "numero_venta": venta.numero_venta,
        "id_cliente": venta.id_cliente,
        "id_producto": venta.id_producto,
        "fecha_venta": venta.fecha_venta.isoformat() if venta.fecha_venta else None,
        "tipo_venta": venta.tipo_venta,
        "precio_venta": float(venta.precio_venta) if venta.precio_venta is not None else None,
        "precio_final": float(venta.precio_final) if venta.precio_final is not None else None,
        "estado_venta": venta.estado_venta,
        "cantidad_pagares": len(venta.pagares or []),
    }

    # 1. Eliminar historial_calificaciones vinculado a los pagarés de esta venta
    await session.execute(
        delete(HistorialCalificacion).where(HistorialCalificacion.id_venta == venta_id)
    )

    # 2. Eliminar pagarés (con su cascade en pagos si los hubiera, pero ya validamos que no hay)
    for pagare in list(venta.pagares or []):
        await session.delete(pagare)

    # 3. Eliminar refuerzos
    for refuerzo in list(venta.refuerzos or []):
        await session.delete(refuerzo)

    # 4. Eliminar detalles de venta (también tiene cascade pero por si acaso)
    for detalle in list(venta.detalles or []):
        await session.delete(detalle)

    # 5. Revertir vehículo a DISPONIBLE
    if venta.id_producto:
        res_v = await session.execute(
            select(Producto).where(Producto.id_producto == venta.id_producto)
        )
        vehiculo_para_revertir = res_v.scalar_one_or_none()
        if vehiculo_para_revertir:
            vehiculo_para_revertir.estado_disponibilidad = 'DISPONIBLE'

    # 6. Flush para que las deletes de relaciones se procesen antes de borrar la venta
    await session.flush()

    # 7. Eliminar la venta
    await session.delete(venta)

    await session.commit()

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="ventas",
        record_id=venta_id,
        previous_data=old_data,
        new_data={"eliminada": True},
        details=f"Venta eliminada: {old_data['numero_venta']}"
    )

    return {"ok": True, "message": f"Venta {old_data['numero_venta']} eliminada correctamente."}


@router.post("/ventas/{venta_id}/finiquito")
async def finiquitar_venta(
    venta_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Aplica un FINIQUITO a una venta:
    - NO elimina la venta ni sus pagos ya registrados.
    - Elimina únicamente los pagarés que NO tienen ningún pago asociado.
    - Pone cancelado=True en TODOS los pagarés restantes (los que tenían pago).
    - Pone id_estado=ANULADO en los pagarés sin pago (antes de eliminarlos, para el log).
    - Marca la venta como estado_venta='FINIQUITADO'.
    - Revierte el vehículo a estado_disponibilidad='DISPONIBLE'.
    Útil para casos como: el cliente devuelve el auto sin poder seguir pagando.
    """
    # 1. Traer la venta con todos sus pagarés y pagos
    result = await session.execute(
        select(Venta)
        .options(
            selectinload(Venta.pagares).selectinload(Pagare.pagos),
            selectinload(Venta.refuerzos),
        )
        .where(Venta.id_venta == venta_id)
    )
    venta = result.unique().scalar_one_or_none()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if venta.estado_venta == 'FINIQUITADO':
        raise HTTPException(status_code=400, detail="Esta venta ya tiene un finiquito aplicado.")

    if venta.estado_venta == 'ANULADA':
        raise HTTPException(status_code=400, detail="No se puede aplicar finiquito a una venta anulada.")

    # 2. Obtener el id del estado ANULADO dinámicamente
    res_st = await session.execute(select(Estado))
    all_states = {s.nombre: s.id_estado for s in res_st.scalars().all()}
    id_anulado = all_states.get('ANULADO')
    id_cancelado_estado = all_states.get('CANCELADO') or all_states.get('PAGADO')  # fallback

    if not id_anulado:
        raise HTTPException(status_code=500, detail="No se encontró el estado ANULADO en la base de datos.")

    # 3. Separar pagarés en: con pago y sin pago
    pagares_con_pago = []
    pagares_sin_pago = []
    for pagare in (venta.pagares or []):
        # El pagaré de ENTREGA_INICIAL siempre tiene cancelado=True; también lo incluimos
        tiene_pagos = bool(pagare.pagos)
        if tiene_pagos or pagare.tipo_pagare in ['ENTREGA_INICIAL', 'ENTREGA_CONTADO']:
            pagares_con_pago.append(pagare)
        else:
            pagares_sin_pago.append(pagare)

    cuotas_sin_pago = len(pagares_sin_pago)
    cuotas_con_pago = len(pagares_con_pago)

    # 4. Eliminar refuerzos asociados a pagarés sin pago
    ids_pagares_sin_pago = [p.id_pagare for p in pagares_sin_pago]
    if ids_pagares_sin_pago:
        await session.execute(
            delete(Refuerzo).where(Refuerzo.id_pagare.in_(ids_pagares_sin_pago))
        )

    # 5. Eliminar pagarés sin pago
    for pagare in pagares_sin_pago:
        await session.delete(pagare)

    # 6. Marcar todos los pagarés restantes (con pago) como cancelado=True
    for pagare in pagares_con_pago:
        pagare.cancelado = True
        # Si el pagaré aún estaba PENDIENTE (no hay razón, pero por si acaso), lo marcamos PAGADO
        # Los que ya estaban PAGADO se quedan igual.

    # 7. Marcar estado de la venta como FINIQUITADO
    venta.estado_venta = 'FINIQUITADO'

    # Agregar observación al campo de la venta
    obs_finiquito = f"[FINIQUITO {date.today().isoformat()}] Aplicado por {current_user['sub']}. " \
                    f"{cuotas_con_pago} pagaré(s) con pago conservados, {cuotas_sin_pago} pagaré(s) sin pago eliminados."
    venta.observaciones = (venta.observaciones or '') + '\n' + obs_finiquito if venta.observaciones else obs_finiquito

    # 8. Revertir vehículo a DISPONIBLE
    if venta.id_producto:
        res_v = await session.execute(
            select(Producto).where(Producto.id_producto == venta.id_producto)
        )
        vehiculo = res_v.scalar_one_or_none()
        if vehiculo:
            vehiculo.estado_disponibilidad = 'DISPONIBLE'

    await session.commit()

    # 9. Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="ventas",
        record_id=venta_id,
        previous_data={"estado_venta": "ACTIVA"},
        new_data={
            "estado_venta": "FINIQUITADO",
            "pagares_eliminados": cuotas_sin_pago,
            "pagares_conservados": cuotas_con_pago
        },
        details=f"Finiquito aplicado a venta {venta.numero_venta}: {cuotas_sin_pago} pagaré(s) eliminados, {cuotas_con_pago} conservados. Vehículo devuelto a DISPONIBLE."
    )

    return {
        "ok": True,
        "message": (
            f"Finiquito aplicado correctamente a la venta {venta.numero_venta}.\n"
            f"• {cuotas_con_pago} pagaré(s) con pago conservados (marcados como cancelados).\n"
            f"• {cuotas_sin_pago} pagaré(s) sin pago eliminados.\n"
            f"• El vehículo fue devuelto al inventario como DISPONIBLE."
        ),
        "pagares_eliminados": cuotas_sin_pago,
        "pagares_conservados": cuotas_con_pago
    }


@router.put("/ventas/{venta_id}", response_model=VentaResponse)
async def update_venta(
    venta_id: int,
    venta_data: VentaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(Venta)
        .options(
            joinedload(Venta.cliente),
            joinedload(Venta.producto).selectinload(Producto.imagenes),
            joinedload(Venta.escribania_rel),
            joinedload(Venta.detalles),
            selectinload(Venta.pagares).options(
                joinedload(Pagare.estado_rel),
                selectinload(Pagare.pagos)
            )
        )
        .where(Venta.id_venta == venta_id)
    )
    venta = result.unique().scalar_one_or_none()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if venta.estado_venta == 'ANULADA':
        raise HTTPException(status_code=400, detail="No se puede modificar una venta anulada")

    # Detectar cambios estructurales que requerirían recrear pagarés
    structural_fields = [
        'fecha_venta', 'tipo_venta', 'precio_venta', 'descuento', 'precio_final',
        'entrega_inicial', 'saldo_financiar', 'cantidad_cuotas', 'monto_cuota',
        'cantidad_refuerzos', 'monto_refuerzo'
    ]
    
    is_structural_change = False
    for field in structural_fields:
        new_val = getattr(venta_data, field)
        old_val = getattr(venta, field)
        
        # Normalizar para comparación (Decimal vs float/int)
        if isinstance(old_val, Decimal):
            if new_val is not None and Decimal(str(new_val)) != old_val:
                is_structural_change = True
                break
        elif old_val != new_val:
            is_structural_change = True
            break

    pagos_check = await session.execute(select(Pago).where(Pago.id_venta == venta_id).limit(1))
    has_pagos = pagos_check.scalars().first() is not None

    if has_pagos and is_structural_change:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No se puede modificar la estructura financiera de la venta (precios, cuotas, fechas) porque ya existen pagos registrados. Solo puede editar campos informativos o de interés."
        )

    if venta.id_producto != venta_data.id_producto:
        raise HTTPException(status_code=400, detail="No se puede cambiar el vehículo de una venta")

    if venta.numero_venta != venta_data.numero_venta:
        raise HTTPException(status_code=400, detail="No se puede cambiar el número de venta")

    old_data = {
        "numero_venta": venta.numero_venta,
        "id_cliente": venta.id_cliente,
        "id_producto": venta.id_producto,
        "fecha_venta": venta.fecha_venta.isoformat() if venta.fecha_venta else None,
        "tipo_venta": venta.tipo_venta,
        "precio_venta": float(venta.precio_venta) if venta.precio_venta is not None else None,
        "descuento": float(venta.descuento) if venta.descuento is not None else None,
        "precio_final": float(venta.precio_final) if venta.precio_final is not None else None,
        "entrega_inicial": float(venta.entrega_inicial) if venta.entrega_inicial is not None else None,
        "saldo_financiar": float(venta.saldo_financiar) if venta.saldo_financiar is not None else None,
        "cantidad_cuotas": venta.cantidad_cuotas,
        "monto_cuota": float(venta.monto_cuota) if venta.monto_cuota is not None else None,
        "estado_venta": venta.estado_venta,
        "pagares": [
            {
                "id_pagare": p.id_pagare,
                "numero_pagare": p.numero_pagare,
                "numero_cuota": p.numero_cuota,
                "monto_cuota": float(p.monto_cuota) if p.monto_cuota is not None else None,
                "fecha_vencimiento": p.fecha_vencimiento.isoformat() if p.fecha_vencimiento else None,
                "estado": p.estado_rel.nombre if p.estado_rel else None,
                "saldo_pendiente": float(p.saldo_pendiente) if p.saldo_pendiente is not None else None,
            }
            for p in (venta.pagares or [])
        ],
    }

    venta_dict = venta_data.dict()
    detalles_data = venta_dict.pop('detalles', [])
    
    for field, value in venta_dict.items():
        if field in ['precio_venta', 'descuento', 'precio_final', 'entrega_inicial', 'saldo_financiar', 'monto_cuota', 'monto_refuerzo']:
            setattr(venta, field, Decimal(str(value)) if value is not None else None)
        else:
            setattr(venta, field, value)

    pagares_eliminados = 0
    pagares_generados = 0

    if is_structural_change:
        # Eliminar detalles antiguos y crear nuevos
        for d in (venta.detalles or []):
            await session.delete(d)
        
        for det in detalles_data:
            nuevo_detalle = DetalleVenta(id_venta=venta.id_venta, **det)
            session.add(nuevo_detalle)

        for pagare in (venta.pagares or []):
            await session.delete(pagare)
            pagares_eliminados += 1

        base_date = venta.fecha_venta or date.today()

        # Obtener estados para asignar el ID correcto
        res_st = await session.execute(select(Estado))
        all_states = {s.nombre: s.id_estado for s in res_st.scalars().all()}
        id_pendiente = all_states.get('PENDIENTE')

        # 4.1 Pagaré de Entrega Inicial
        if (venta.entrega_inicial or 0) > 0:
            session.add(Pagare(
                id_venta=venta.id_venta,
                numero_pagare=f"{venta.numero_venta}-EI",
                numero_cuota=0,
                monto_cuota=venta.entrega_inicial,
                fecha_vencimiento=base_date,
                tipo_pagare='ENTREGA_CONTADO' if venta.tipo_venta == 'CONTADO' else 'ENTREGA_INICIAL',
                id_estado=id_pendiente,
                saldo_pendiente=venta.entrega_inicial
            ))
            pagares_generados += 1

        # 4.2 Pagarés de Financiación
        if venta_data.tipo_venta == 'FINANCIADO':
            # Cuotas
            if (venta_data.cantidad_cuotas or 0) > 0:
                for i in range(1, venta_data.cantidad_cuotas + 1):
                    vencimiento = add_months(base_date, i)
                    nuevo_pagare = Pagare(
                        id_venta=venta.id_venta,
                        numero_pagare=f"{venta.numero_venta}-C{i}",
                        numero_cuota=i,
                        monto_cuota=venta_data.monto_cuota,
                        fecha_vencimiento=vencimiento,
                        tipo_pagare='CUOTA',
                        saldo_pendiente=venta_data.monto_cuota,
                        id_estado=id_pendiente
                    )
                    session.add(nuevo_pagare)
                    pagares_generados += 1
            
            # Refuerzos
            if (venta_data.cantidad_refuerzos or 0) > 0:
                for i in range(1, venta_data.cantidad_refuerzos + 1):
                    vencimiento = add_months(base_date, 12 * i) # Refuerzos anuales por defecto
                    nuevo_pagare = Pagare(
                        id_venta=venta.id_venta,
                        numero_pagare=f"{venta.numero_venta}-R{i}",
                        numero_cuota=i,
                        monto_cuota=venta_data.monto_refuerzo,
                        fecha_vencimiento=vencimiento,
                        tipo_pagare='REFUERZO',
                        saldo_pendiente=venta_data.monto_refuerzo,
                        id_estado=id_pendiente
                    )
                    session.add(nuevo_pagare)
                    pagares_generados += 1

    await session.commit()
    await session.refresh(venta) # Refresh after commit to ensure relationships are loaded for audit

    new_data_for_audit = venta_data.model_dump(exclude_none=True)
    decimal_fields = ['precio_venta', 'descuento', 'precio_final', 'entrega_inicial', 'saldo_financiar', 'monto_cuota', 'tasa_interes', 'monto_refuerzo']
    for field in decimal_fields:
        if field in new_data_for_audit and new_data_for_audit[field] is not None:
            new_data_for_audit[field] = float(new_data_for_audit[field])
    if 'fecha_venta' in new_data_for_audit and new_data_for_audit['fecha_venta']:
        if hasattr(new_data_for_audit['fecha_venta'], 'isoformat'):
            new_data_for_audit['fecha_venta'] = new_data_for_audit['fecha_venta'].isoformat()
        else:
            new_data_for_audit['fecha_venta'] = str(new_data_for_audit['fecha_venta'])

    new_data_for_audit["pagares_eliminados"] = pagares_eliminados
    new_data_for_audit["pagares_generados"] = pagares_generados

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="ventas",
        record_id=venta_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Venta actualizada: {venta.numero_venta}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(Venta)
        .options(
            selectinload(Venta.pagares).options(
                joinedload(Pagare.estado_rel),
                selectinload(Pagare.pagos)
            ),
            joinedload(Venta.detalles),
            joinedload(Venta.escribania_rel)
        )
        .where(Venta.id_venta == venta_id)
    )
    return result.unique().scalar_one()
@router.get("/pagares/pendientes")
async def list_pagares_pendientes(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Traer pagarés con saldo pendiente (PENDIENTE o PARCIAL)
    query = (
        select(Pagare, Venta, Cliente, Producto, Estado)
        .options(selectinload(Pagare.pagos))
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .join(Cliente, Venta.id_cliente == Cliente.id_cliente)
        .join(Producto, Venta.id_producto == Producto.id_producto)
        .join(Estado, Pagare.id_estado == Estado.id_estado)
        .where(Estado.nombre.in_(['PENDIENTE', 'PARCIAL', 'VENCIDO']))
        .where(Pagare.cancelado == False)
        .order_by(Pagare.fecha_vencimiento)
    )
    
    result = await session.execute(query)
    pagares_list = result.all()
    
    # Obtener todos los IDs de venta únicos
    venta_ids = list(set([v.id_venta for _, v, _, _, _ in pagares_list]))
    
    # Obtener total de cuotas por venta en una sola consulta (solo tipo CUOTA, excluyendo ENTREGA_INICIAL)
    if venta_ids:
        count_query = (
            select(Pagare.id_venta, func.count(Pagare.id_pagare).label('total'))
            .where(Pagare.id_venta.in_(venta_ids))
            .where(Pagare.tipo_pagare == 'CUOTA')
            .group_by(Pagare.id_venta)
        )
        count_result = await session.execute(count_query)
        ventas_cuotas = {row.id_venta: row.total for row in count_result.all()}
    else:
        ventas_cuotas = {}
    
    data = []
    for p, v, c, prod, est in pagares_list: # Unpack est (Estado)
        # Para ENTREGA_INICIAL mostrar 0/0, para el resto el total de cuotas del tipo CUOTA
        if p.tipo_pagare in ['ENTREGA_INICIAL', 'ENTREGA_CONTADO']:
            total_cuotas = 0
        else:
            total_cuotas = ventas_cuotas.get(v.id_venta, 0)
        
        # Obtener fecha de pago si existe (para pagos parciales)
        fecha_pago_val = None
        if p.pagos:
            p_pagos = sorted(p.pagos, key=lambda x: x.fecha_pago, reverse=True)
            if p_pagos:
                fecha_pago_val = p_pagos[0].fecha_pago.isoformat() if hasattr(p_pagos[0].fecha_pago, 'isoformat') else str(p_pagos[0].fecha_pago)

        # Calcular estado dinámico para mayor claridad
        is_overdue = p.fecha_vencimiento < datetime.now().date()
        current_status = est.nombre
        
        if current_status == 'PAGADO':
            estado_display = 'PAGADO'
        elif current_status == 'PARCIAL':
            estado_display = 'PARCIAL(VENCIDO)' if is_overdue else 'PARCIAL'
        else:
            estado_display = 'VENCIDO' if is_overdue else 'PENDIENTE'

        data.append({
            "id_pagare": p.id_pagare,
            "id_venta": v.id_venta,
            "numero_cuota": p.numero_cuota,
            "tipo_pagare": p.tipo_pagare,
            "total_cuotas": total_cuotas,
            "monto_cuota": float(p.monto_cuota),
            "saldo_pendiente": float(p.saldo_pendiente) if p.saldo_pendiente is not None else float(p.monto_cuota),
            "fecha_vencimiento": p.fecha_vencimiento.isoformat() if hasattr(p.fecha_vencimiento, 'isoformat') else str(p.fecha_vencimiento),
            "fecha_pago": fecha_pago_val,
            "cliente": f"{c.nombre} {c.apellido}",
            "vehiculo": f"{prod.marca} {prod.modelo}",
            "chasis": prod.chasis,
            "numero_documento": c.numero_documento,
            "estado": estado_display, # Use calculated status
            "cancelado": p.cancelado if p.cancelado is not None else False,
            "periodo_int_mora": v.periodo_int_mora,
            "monto_int_mora": float(v.monto_int_mora) if v.monto_int_mora is not None else 0.0,
            "tasa_interes": float(v.tasa_interes) if v.tasa_interes is not None else 0.0,
            "dias_gracia": v.dias_gracia or 0,
            "pagos": [
                {
                    "id_pago": pago_item.id_pago,
                    "fecha_pago": pago_item.fecha_pago.isoformat() if hasattr(pago_item.fecha_pago, 'isoformat') else str(pago_item.fecha_pago),
                    "monto_pagado": float(pago_item.monto_pagado),
                    "numero_recibo": pago_item.numero_recibo,
                    "mora_aplicada": float(pago_item.mora_aplicada or 0),
                    "forma_pago": pago_item.forma_pago
                } for pago_item in sorted(p.pagos, key=lambda x: x.fecha_pago, reverse=True)
            ] if p.pagos else []
        })
    return data

@router.get("/pagares", response_model=List[PagareResponse])
async def list_pagares(
    id_venta: Optional[int] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(Pagare).options(selectinload(Pagare.pagos), joinedload(Pagare.estado_rel))
    
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(Pagare.id_playa == id_playa)
    if id_venta:
        query = query.where(Pagare.id_venta == id_venta)
    if estado:
        # Join with Estado to filter by name
        query = query.join(Estado, Pagare.id_estado == Estado.id_estado).where(Estado.nombre == estado)
    
    query = query.order_by(Pagare.fecha_vencimiento.asc())
    result = await session.execute(query)
    pagares = result.scalars().all()
    
    # Poblar fecha_pago con la fecha del último pago si existe
    for p in pagares:
        if p.pagos:
            # Ordenar por fecha_pago descendente y tomar la última
            pagos_ordenados = sorted(p.pagos, key=lambda x: x.fecha_pago, reverse=True)
            if pagos_ordenados:
                p.fecha_pago = pagos_ordenados[0].fecha_pago
        else:
            p.fecha_pago = None
            
    return pagares

@router.put("/pagares/{id_pagare}", response_model=PagareResponse)
async def update_pagare(
    id_pagare: int,
    data: PagareUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Pagare).where(Pagare.id_pagare == id_pagare))
    pagare = result.scalar_one_or_none()
    
    if not pagare:
        raise HTTPException(status_code=404, detail="Pagaré no encontrado")
        
    # Auditoría: datos anteriores
    old_data = {
        "id_pagare": pagare.id_pagare,
        "numero_pagare": pagare.numero_pagare,
        "monto_cuota": float(pagare.monto_cuota) if pagare.monto_cuota else None,
        "fecha_vencimiento": pagare.fecha_vencimiento.isoformat() if pagare.fecha_vencimiento else None,
        # "estado": pagare.estado, # Removed
        "saldo_pendiente": float(pagare.saldo_pendiente) if pagare.saldo_pendiente else None,
        "observaciones": pagare.observaciones
    }
    
    # Actualizar campos
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(pagare, field, value)
        
    await session.commit()

    # Auditoría: nuevos datos
    new_data_for_audit = update_data.copy()
    for key, value in new_data_for_audit.items():
        if isinstance(value, Decimal):
            new_data_for_audit[key] = float(value)
        elif isinstance(value, (date, datetime)):
            new_data_for_audit[key] = value.isoformat()

    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="pagares",
        record_id=id_pagare,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Pagaré actualizado: {pagare.numero_pagare}"
    )

    # Re-consultar con relaciones cargadas para serialización correcta
    result2 = await session.execute(
        select(Pagare)
        .options(
            joinedload(Pagare.estado_rel),
            selectinload(Pagare.pagos),
        )
        .where(Pagare.id_pagare == id_pagare)
    )
    return result2.scalar_one()

@router.post("/pagos", response_model=PagoResponse)
async def create_pago(
    pago_data: PagoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Establecer el search_path al inicio para asegurar que PostgreSQL encuentre las tablas del schema playa
    await session.execute(text("SET LOCAL search_path TO playa, public"))
    
    # 1. Obtener el pagaré con su venta asociada
    # 1. Obtener el pagaré con su venta asociada y estado
    res_p = await session.execute(
        select(Pagare)
        .options(joinedload(Pagare.venta), joinedload(Pagare.estado_rel)) # Load estado_rel
        .where(Pagare.id_pagare == pago_data.id_pagare)
    )
    pagare = res_p.scalar_one_or_none()
    
    if not pagare:
        raise HTTPException(status_code=404, detail="El pagaré no existe")
    
    # Check status using relationship
    if pagare.estado_rel and pagare.estado_rel.nombre == 'PAGADO':
        raise HTTPException(status_code=400, detail="El pagaré ya ha sido pagado completamente")

    # Asegurar que el saldo pendiente esté inicializado si es NULL para evitar errores en cálculos
    if pagare.saldo_pendiente is None:
        pagare.saldo_pendiente = pagare.monto_cuota

    # Obtener la venta asociada al pagaré
    if not pagare.id_venta:
        raise HTTPException(status_code=400, detail="El pagaré no tiene una venta asociada")
    
    # Obtener la venta directamente por id_venta para asegurar que existe
    res_v = await session.execute(
        select(Venta).where(Venta.id_venta == pagare.id_venta)
    )
    venta = res_v.scalar_one_or_none()
    
    if not venta:
        raise HTTPException(status_code=404, detail="No se encontró la venta asociada al pagaré")

    # 2. Calcular atraso y mora
    atraso_dias = 0
    mora_calculada = Decimal("0.00")
    
    if pago_data.fecha_pago > pagare.fecha_vencimiento:
        atraso_dias = (pago_data.fecha_pago - pagare.fecha_vencimiento).days
        
        # Si el usuario envió una mora (interés) editada, la respetamos (incluso si es 0)
        if pago_data.mora_aplicada is not None:
            mora_calculada = Decimal(str(pago_data.mora_aplicada))
        else:
            # Calcular mora automática
            # Verificar días de gracia
            dias_afectivos = atraso_dias - (venta.dias_gracia or 0)
            
            if dias_afectivos > 0:
                # Calcular periodos según configuración de la venta
                periodo = venta.periodo_int_mora or 'D'
                dias_por_periodo = 1
                if periodo == 'S': dias_por_periodo = 7
                elif periodo == 'M': dias_por_periodo = 30
                elif periodo == 'A': dias_por_periodo = 365
                
                # REGLA: Tasa % es una multa única sobre el saldo, Cargo Fijo es acumulativo por tramos.
                tasa_fine = venta.tasa_interes or Decimal("0.00")
                cargo_fijo_periodo = venta.monto_int_mora or Decimal("0.00")
                gracia = venta.dias_gracia or 0
                
                # 1. Multa del % sobre el saldo inicial atrasado (o actual si es el primer cobro)
                # Para ser consistentes con la solicitud "basándose en el saldo", usamos el saldo_pendiente actual.
                interes_fine = (pagare.saldo_pendiente or pagare.monto_cuota) * (tasa_fine / Decimal("100"))
                
                # 2. Acumulación trameada del cargo fijo
                mora_fija_acumulada = Decimal("0.00")
                
                # REGLA DE NEGOCIO: Si superó los días de gracia, la mora corre desde el vencimiento original.
                # (El chequeo anterior if dias_afectivos > ... ya asegura que no cobramos si está en gracia)
                fec_inicio_calculo = pagare.fecha_vencimiento
                
                if pago_data.fecha_pago > fec_inicio_calculo:
                    # Tramos de capital (basado en historial de pagos)
                    eventos = []
                    for h_pago in (pagare.pagos or []):
                        if h_pago.fecha_pago > fec_inicio_calculo and h_pago.fecha_pago < pago_data.fecha_pago:
                            eventos.append({'fecha': h_pago.fecha_pago, 'monto': h_pago.monto_pagado})
                    
                    eventos.sort(key=lambda x: x['fecha'])
                    
                    # Capital inicial al inicio del cálculo
                    cap_tramo = Decimal(str(pagare.monto_cuota))
                    for h_pago in (pagare.pagos or []):
                        if h_pago.fecha_pago <= fec_inicio_calculo:
                            cap_tramo -= Decimal(str(h_pago.monto_pagado))
                    
                    last_f = fec_inicio_calculo
                    for ev in eventos:
                        if cap_tramo <= 0: break
                        diff_dias = (ev['fecha'] - last_f).days
                        num_p = Decimal(str(diff_dias)) / Decimal(str(dias_por_periodo))
                        mora_fija_acumulada += num_p * cargo_fijo_periodo
                        cap_tramo -= Decimal(str(ev['monto']))
                        last_f = ev['fecha']
                    
                    # Tramo final hasta hoy
                    if cap_tramo > 0:
                        diff_dias = (pago_data.fecha_pago - last_f).days
                        num_p = Decimal(str(diff_dias)) / Decimal(str(dias_por_periodo))
                        mora_fija_acumulada += num_p * cargo_fijo_periodo

                # 3. Restar lo que ya se pagó por concepto de mora en pagos anteriores
                intereses_ya_pagados = sum(Decimal(str(p.mora_aplicada or 0)) for p in (pagare.pagos or []))
                
                generado_total = interes_fine + mora_fija_acumulada
                mora_calculada = max(Decimal("0.00"), generado_total - intereses_ya_pagados)

    elif pago_data.mora_aplicada is not None:
        # Incluso si no hay atraso, si el usuario forzó un interés, lo guardamos
        mora_calculada = Decimal(str(pago_data.mora_aplicada))

    # 3. Registrar el pago
    pago_dict = pago_data.model_dump()
    pago_dict['id_venta'] = venta.id_venta
    
    # Extraer campos que no van directamente a la tabla Pago
    cancelar_pagare = pago_dict.pop('cancelar_pagare', False)
    id_cuenta = pago_dict.get('id_cuenta')

    # Eliminar mora_aplicada para pasarla recalculada
    pago_dict.pop('mora_aplicada', None)
    
    id_playa = current_user.get("id_playa")
    new_pago = Pago(
        **pago_dict,
        dias_atraso=atraso_dias,
        mora_aplicada=mora_calculada.quantize(Decimal("1.00")),
        id_playa=id_playa
    )
    session.add(new_pago)
    
    # 3.1 Actualizar saldo de la cuenta si se especificó (Capital + Interés)
    if id_cuenta:
        res_c = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == id_cuenta))
        cuenta = res_c.scalar_one_or_none()
        if cuenta:
            if cuenta.saldo_actual is None: cuenta.saldo_actual = 0
            # IMPORTANTE: El ingreso total a la cuenta incluye el capital y el interés (mora)
            total_ingreso = Decimal(str(pago_data.monto_pagado)) + (mora_calculada or 0)
            cuenta.saldo_actual += total_ingreso

            # Registrar movimiento de cuenta
            movimiento = Movimiento(
                id_cuenta_destino=id_cuenta,
                monto=total_ingreso,
                fecha=datetime.now(),
                concepto=f"Cobro de {pagare.tipo_pagare} {pagare.numero_pagare} - Venta {venta.numero_venta}",
                id_usuario=current_user.get("user_id"),
                referencia=f"PAGO-{new_pago.numero_recibo}",
                id_playa=id_playa
            )
            session.add(movimiento)

    # 4. Actualizar estado del pagaré (SOPORTE PAGOS PARCIALES)
    # NOTA: El trigger de base de datos fue eliminado. Esta es la lógica oficial.
    monto_a_aplicar = Decimal(str(pago_data.monto_pagado))
    
    if pagare.saldo_pendiente is None:
        pagare.saldo_pendiente = pagare.monto_cuota
        
    pagare.saldo_pendiente -= monto_a_aplicar
    
    # Obtener estados por nombre para mayor seguridad
    res_st = await session.execute(select(Estado))
    all_states = {s.nombre: s.id_estado for s in res_st.scalars().all()}
    
    if cancelar_pagare:
        pagare.id_estado = all_states.get('PAGADO')
        pagare.saldo_pendiente = 0 # Forzar saldo 0 si se cancela manualmente
        pagare.cancelado = True
    else:
        # Si no se marca "cancelar", el estado es PARCIAL (o PENDIENTE si no se pagó nada)
        if pagare.saldo_pendiente <= 0:
            # Saldo cubierto pero no cancelado -> PARCIAL para permitir más cobros (ej: mora)
            pagare.id_estado = all_states.get('PARCIAL')
        elif pagare.saldo_pendiente >= pagare.monto_cuota:
            pagare.id_estado = all_states.get('PENDIENTE')
        else:
            pagare.id_estado = all_states.get('PARCIAL')
        pagare.cancelado = False
    
    await session.commit()
    await session.refresh(new_pago)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="pagos",
        record_id=new_pago.id_pago,
        new_data=pago_data.dict(exclude_none=True),
        details=f"Cobro registrado: Recibo {new_pago.numero_recibo} - Cuota {pagare.numero_cuota} Venta {pago_data.id_venta}. Mora calc: {mora_calculada}"
    )
    
    await session.refresh(new_pago)
    return new_pago

@router.get("/pagares/{id_pagare}/pagos", response_model=List[PagoResponse])
async def list_pagos_pagare(
    id_pagare: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(
        select(Pagare).options(joinedload(Pagare.venta)).where(Pagare.id_pagare == id_pagare)
    )
    pagare = res.scalar_one_or_none()
    if not pagare or not pagare.venta:
        raise HTTPException(status_code=404, detail="Pagaré no encontrado")
    assert_resource_playa(current_user, pagare.venta.id_playa)
    result = await session.execute(
        select(Pago).where(Pago.id_pagare == id_pagare).order_by(Pago.fecha_pago.desc())
    )
    return result.scalars().all()

@router.get("/pagos", response_model=List[PagoResponse])
async def list_todos_pagos(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Lista los últimos pagos registrados en el sistema de forma global."""
    await session.execute(text("SET LOCAL search_path TO playa, public"))
    # Necesitamos cargar el pagaré y la venta para mostrar a quién pertenece el pago
    query = select(Pago).options(
        joinedload(Pago.pagare).joinedload(Pagare.venta).joinedload(Venta.cliente),
        joinedload(Pago.pagare).joinedload(Pagare.venta).joinedload(Venta.producto)
    )
    
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(Pago.id_playa == id_playa)
        
    result = await session.execute(
        query.order_by(Pago.fecha_pago.desc(), Pago.id_pago.desc())
        .limit(limit)
    )
    pagos = result.scalars().all()
    
    # Mapear datos virtuales para la respuesta
    for p in pagos:
        try:
            if p.pagare and p.pagare.venta and p.pagare.venta.cliente:
                c = p.pagare.venta.cliente
                p.cliente_nombre = f"{c.nombre} {c.apellido}".strip()
            if p.pagare and p.pagare.venta and p.pagare.venta.producto:
                prod = p.pagare.venta.producto
                p.vehiculo = f"{prod.marca} {prod.modelo}".strip()
                p.chasis = prod.chasis
        except:
            pass
            
    return pagos

@router.put("/pagos/{id_pago}", response_model=PagoResponse)
async def update_pago(
    id_pago: int,
    data: PagoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await session.execute(text("SET LOCAL search_path TO playa, public"))
    
    # 1. Obtener el pago actual
    res_pago = await session.execute(select(Pago).where(Pago.id_pago == id_pago))
    pago = res_pago.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
        
    # 2. Obtener el pagaré
    res_pagare = await session.execute(
        select(Pagare).options(joinedload(Pagare.estado_rel)).where(Pagare.id_pagare == pago.id_pagare)
    )
    pagare = res_pagare.scalar_one_or_none()
    if not pagare:
        raise HTTPException(status_code=404, detail="Pagaré no encontrado")

    old_monto = pago.monto_pagado
    new_monto = Decimal(str(data.monto_pagado))
    diff_monto = new_monto - old_monto

    # 3. Actualizar cuenta si cambió el monto o la cuenta (Incluyendo interés)
    old_interest = pago.mora_aplicada or Decimal("0.00")
    new_interest = Decimal(str(data.mora_aplicada or 0))
    
    if pago.id_cuenta:
        res_c_old = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == pago.id_cuenta))
        cuenta_old = res_c_old.scalar_one_or_none()
        if cuenta_old:
            # Revertir total anterior
            cuenta_old.saldo_actual -= (old_monto + old_interest)

    if data.id_cuenta:
        res_c_new = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta))
        cuenta_new = res_c_new.scalar_one_or_none()
        if cuenta_new:
            if cuenta_new.saldo_actual is None: cuenta_new.saldo_actual = 0
            # Aplicar nuevo total
            cuenta_new.saldo_actual += (new_monto + new_interest)

    # 4. Actualizar saldo del pagaré
    if pagare.saldo_pendiente is None:
        pagare.saldo_pendiente = pagare.monto_cuota
        
    pagare.saldo_pendiente -= diff_monto

    # 5. Actualizar estado del pagaré
    res_st = await session.execute(select(Estado))
    all_states = {s.nombre: s.id_estado for s in res_st.scalars().all()}
    
    if data.cancelar_pagare:
        pagare.id_estado = all_states.get('PAGADO')
        pagare.saldo_pendiente = 0
        pagare.cancelado = True
    else:
        if pagare.saldo_pendiente <= 0:
            pagare.id_estado = all_states.get('PARCIAL')
        elif pagare.saldo_pendiente >= pagare.monto_cuota:
            pagare.id_estado = all_states.get('PENDIENTE')
        else:
            pagare.id_estado = all_states.get('PARCIAL')
        pagare.cancelado = False

    # 6. Actualizar el pago
    pago.monto_pagado = new_monto
    pago.fecha_pago = data.fecha_pago
    pago.numero_recibo = data.numero_recibo
    pago.forma_pago = data.forma_pago
    pago.id_cuenta = data.id_cuenta
    pago.numero_referencia = data.numero_referencia
    pago.mora_aplicada = Decimal(str(data.mora_aplicada or 0))
    pago.observaciones = data.observaciones

    await session.commit()
    await session.refresh(pago)
    return pago

@router.delete("/pagos/{id_pago}")
async def delete_pago(
    id_pago: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await session.execute(text("SET LOCAL search_path TO playa, public"))
    
    # 1. Obtener el pago
    res_pago = await session.execute(select(Pago).where(Pago.id_pago == id_pago))
    pago = res_pago.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
        
    # 2. Obtener el pagaré
    res_pagare = await session.execute(
        select(Pagare).options(joinedload(Pagare.estado_rel)).where(Pagare.id_pagare == pago.id_pagare)
    )
    pagare = res_pagare.scalar_one_or_none()
    if not pagare:
        raise HTTPException(status_code=404, detail="Pagaré no encontrado")

    monto_a_revertir = pago.monto_pagado

    # 3. Revertir saldo en la cuenta (Capital + Interés)
    if pago.id_cuenta:
        res_c = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == pago.id_cuenta))
        cuenta = res_c.scalar_one_or_none()
        if cuenta:
            total_a_revertir = monto_a_revertir + (pago.mora_aplicada or 0)
            cuenta.saldo_actual -= total_a_revertir

            # Eliminar movimiento asociado
            await session.execute(
                delete(Movimiento).where(Movimiento.referencia == f"PAGO-{pago.numero_recibo}")
            )

    # 4. Revertir saldo del pagaré
    if pagare.saldo_pendiente is None:
        pagare.saldo_pendiente = pagare.monto_cuota
    
    pagare.saldo_pendiente += monto_a_revertir
    
    # 5. Actualizar estado del pagaré
    res_st = await session.execute(select(Estado))
    all_states = {s.nombre: s.id_estado for s in res_st.scalars().all()}
    
    if pagare.saldo_pendiente >= pagare.monto_cuota:
        pagare.id_estado = all_states.get('PENDIENTE')
        pagare.saldo_pendiente = pagare.monto_cuota # Asegurar que no exceda
        pagare.cancelado = False
    else:
        pagare.id_estado = all_states.get('PARCIAL')
        pagare.cancelado = False

    # 6. Eliminar el pago
    await session.delete(pago)
    await session.commit()
    
    return {"message": "Pago eliminado correctamente y saldo de pagaré actualizado"}

# ===== GASTOS DE VEHÍCULOS =====
@router.get("/tipos-gastos", response_model=List[TipoGastoProductoResponse])
async def list_tipos_gastos(
    todo: bool = False,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(TipoGastoProducto)
    
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(TipoGastoProducto.id_playa == id_playa)
    if not todo:
        query = query.where(TipoGastoProducto.activo == True)
        
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/tipos-gastos", response_model=TipoGastoProductoResponse)
async def create_tipo_gasto(
    data: TipoGastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    user_playa = current_user.get("id_playa")
    dup_q = select(TipoGastoProducto).where(TipoGastoProducto.nombre == data.nombre)
    if user_playa is not None:
        dup_q = dup_q.where(TipoGastoProducto.id_playa == user_playa)
    res = await session.execute(dup_q)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"El concepto de gasto '{data.nombre}' ya está registrado.")

    new_tipo_data = data.dict()
    new_tipo_data["id_playa"] = user_playa
    new_tipo = TipoGastoProducto(**new_tipo_data)
    session.add(new_tipo)
    await session.commit()
    await session.refresh(new_tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="tipos_gastos_productos",
        record_id=new_tipo.id_tipo_gasto,
        new_data=data.dict(exclude_none=True),
        details=f"Nuevo tipo de gasto de vehículo creado: {new_tipo.nombre}"
    )

    return new_tipo

@router.put("/tipos-gastos/{id_tipo_gasto}", response_model=TipoGastoProductoResponse)
async def update_tipo_gasto(
    id_tipo_gasto: int,
    data: TipoGastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.id_tipo_gasto == id_tipo_gasto))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")

    # Verificar duplicado de nombre si cambia
    if tipo.nombre != data.nombre:
        res = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.nombre == data.nombre))
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"El concepto de gasto '{data.nombre}' ya está registrado.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "activo": tipo.activo
    }

    tipo.nombre = data.nombre
    tipo.descripcion = data.descripcion
    tipo.activo = data.activo
    
    await session.commit()
    await session.refresh(tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="tipos_gastos_productos",
        record_id=id_tipo_gasto,
        previous_data=old_data,
        new_data=data.dict(exclude_none=True),
        details=f"Tipo de gasto de vehículo actualizado: {tipo.nombre}"
    )

    return tipo

@router.delete("/tipos-gastos/{id_tipo_gasto}")
async def delete_tipo_gasto(
    id_tipo_gasto: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoProducto).where(TipoGastoProducto.id_tipo_gasto == id_tipo_gasto))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")
        
    # Verificar uso
    uso = await session.execute(select(GastoProducto).where(GastoProducto.id_tipo_gasto == id_tipo_gasto).limit(1))
    if uso.first():
         raise HTTPException(status_code=400, detail="No se puede eliminar porque existen gastos asociados a este concepto.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "activo": tipo.activo
    }

    await session.delete(tipo)
    await session.commit()

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="tipos_gastos_productos",
        record_id=id_tipo_gasto,
        previous_data=old_data,
        details=f"Tipo de gasto de vehículo eliminado: {tipo.nombre}"
    )

    return {"message": "Concepto eliminado correctamente"}


@router.post("/gastos", response_model=GastoProductoResponse)
async def create_gasto_vehiculo(
    gasto_data: GastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    id_playa = current_user.get("id_playa")
    new_gasto = GastoProducto(**gasto_data.dict(), id_playa=id_playa)
    session.add(new_gasto)
    
    # Si se especificó cuenta, registrar el movimiento y actualizar saldo
    if gasto_data.id_cuenta:
        res_c = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == gasto_data.id_cuenta))
        cuenta = res_c.scalar_one_or_none()
        if cuenta:
            if cuenta.saldo_actual is None: cuenta.saldo_actual = 0
            cuenta.saldo_actual -= Decimal(str(gasto_data.monto))
            
            # Obtener info del producto para el concepto
            res_p = await session.execute(select(Producto).where(Producto.id_producto == gasto_data.id_producto))
            prod = res_p.scalar_one_or_none()
            prod_info = f"{prod.marca} {prod.modelo} (Chasis: {prod.chasis})" if prod else f"Producto {gasto_data.id_producto}"
            
            # Registrar Movimiento
            new_mov = Movimiento(
                id_cuenta_origen=gasto_data.id_cuenta,
                monto=gasto_data.monto,
                fecha=datetime.combine(gasto_data.fecha_gasto, datetime.min.time()),
                concepto=f"Gasto Vehículo: {gasto_data.descripcion or 'Sin descripción'} - {prod_info}",
                referencia="Gasto Vehículo",
                id_usuario=current_user.get("user_id"),
                id_playa=id_playa
            )
            session.add(new_mov)

    await session.commit()
    await session.refresh(new_gasto)
    
    # Cargar la relación tipo_gasto para evitar error de lazy loading
    result = await session.execute(
        select(GastoProducto).options(joinedload(GastoProducto.tipo_gasto)).where(GastoProducto.id_gasto_producto == new_gasto.id_gasto_producto)
    )
    gasto_with_tipo = result.scalar_one()
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="gastos_productos",
        record_id=new_gasto.id_gasto_producto,
        new_data=gasto_data.dict(exclude_none=True),
        details=f"Gasto registrado para vehículo ID {gasto_data.id_producto}: {gasto_data.monto}"
    )
    
    # RE-FETCH después de la auditoría para evitar MissingGreenlet (commit expira objetos)
    result = await session.execute(
        select(GastoProducto).options(joinedload(GastoProducto.tipo_gasto)).where(GastoProducto.id_gasto_producto == new_gasto.id_gasto_producto)
    )
    return result.scalar_one()

@router.get("/vehiculos/{id_producto}/gastos", response_model=List[GastoProductoResponse])
async def list_gastos_por_vehiculo(
    id_producto: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res_p = await session.execute(select(Producto).where(Producto.id_producto == id_producto))
    prod = res_p.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    assert_resource_playa(current_user, prod.id_playa)
    query = select(GastoProducto).options(joinedload(GastoProducto.tipo_gasto)).where(GastoProducto.id_producto == id_producto)
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(GastoProducto.id_playa == id_playa)
    result = await session.execute(query)
    return result.scalars().all()

@router.put("/gastos/{gasto_id}", response_model=GastoProductoResponse)
async def update_gasto_vehiculo(
    gasto_id: int,
    data: GastoProductoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Obtener el gasto existente
    result = await session.execute(select(GastoProducto).where(GastoProducto.id_gasto_producto == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    assert_resource_playa(current_user, gasto.id_playa)
    
    # Guardar datos antiguos para auditoría
    old_data = {
        "id_producto": gasto.id_producto,
        "id_tipo_gasto": gasto.id_tipo_gasto,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Actualizar campos
    for field, value in data.dict(exclude_none=True).items():
        setattr(gasto, field, value)
    
    await session.commit()
    await session.refresh(gasto)
    
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    if 'fecha_gasto' in new_data_for_audit and new_data_for_audit['fecha_gasto']:
        if hasattr(new_data_for_audit['fecha_gasto'], 'isoformat'):
            new_data_for_audit['fecha_gasto'] = new_data_for_audit['fecha_gasto'].isoformat()
        else:
            new_data_for_audit['fecha_gasto'] = str(new_data_for_audit['fecha_gasto'])
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="gastos_productos",
        record_id=gasto_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Gasto de vehículo actualizado: {data.monto} - {data.descripcion}"
    )
    
    # RE-FETCH después de la auditoría para evitar MissingGreenlet
    result = await session.execute(
        select(GastoProducto).options(joinedload(GastoProducto.tipo_gasto)).where(GastoProducto.id_gasto_producto == gasto_id)
    )
    return result.scalar_one()

@router.delete("/gastos/{gasto_id}")
async def delete_gasto_vehiculo(
    gasto_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(GastoProducto).where(GastoProducto.id_gasto_producto == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Guardar datos para auditoría
    old_data = {
        "id_producto": gasto.id_producto,
        "id_tipo_gasto": gasto.id_tipo_gasto,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="gastos_productos",
        record_id=gasto_id,
        previous_data=old_data,
        details=f"Gasto de vehículo eliminado: {gasto.monto} - {gasto.descripcion}"
    )
    
    await session.delete(gasto)
    await session.commit()
    
    return {"message": "Gasto eliminado correctamente"}


@router.get("/vehiculos/{id_producto}/costo-total")
async def get_costo_total_vehiculo(
    id_producto: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    id_playa = current_user.get("id_playa")
    
    # Obtener costo base
    query_v = select(Producto.costo_base).where(Producto.id_producto == id_producto)
    if id_playa is not None:
        query_v = query_v.where(Producto.id_playa == id_playa)
    res_v = await session.execute(query_v)
    costo_base = res_v.scalar_one_or_none() or 0
    
    # Obtener suma de gastos
    query_g = select(func.sum(GastoProducto.monto)).where(GastoProducto.id_producto == id_producto)
    if id_playa is not None:
        query_g = query_g.where(GastoProducto.id_playa == id_playa)
    res_g = await session.execute(query_g)
    total_gastos = res_g.scalar_one() or 0
    
    return {
        "id_producto": id_producto,
        "costo_base": costo_base,
        "total_gastos": total_gastos,
        "costo_final": costo_base + total_gastos
    }

# ===== GASTOS DE EMPRESA (ADMINISTRATIVOS) =====
@router.get("/tipos-gastos-empresa", response_model=List[TipoGastoEmpresaResponse])
async def list_tipos_gastos_empresa(
    todo: bool = False,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(TipoGastoEmpresa)
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(
            or_(TipoGastoEmpresa.id_playa == id_playa, TipoGastoEmpresa.id_playa.is_(None))
        )
    if not todo:
        query = query.where(TipoGastoEmpresa.activo == True)
    
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/tipos-gastos-empresa", response_model=TipoGastoEmpresaResponse)
async def create_tipo_gasto_empresa(
    data: TipoGastoEmpresaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    user_playa = current_user.get("id_playa")
    dup_q = select(TipoGastoEmpresa).where(TipoGastoEmpresa.nombre == data.nombre)
    if user_playa is not None:
        dup_q = dup_q.where(TipoGastoEmpresa.id_playa == user_playa)
    res = await session.execute(dup_q)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"El concepto '{data.nombre}' ya existe en los gastos operativos.")

    new_data = data.dict()
    new_data["id_playa"] = user_playa
    new_tipo = TipoGastoEmpresa(**new_data)
    session.add(new_tipo)
    await session.commit()
    await session.refresh(new_tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="tipos_gastos_empresa",
        record_id=new_tipo.id_tipo_gasto_empresa,
        new_data=data.dict(exclude_none=True),
        details=f"Nuevo tipo de gasto empresa creado: {new_tipo.nombre}"
    )

    return new_tipo

@router.put("/tipos-gastos-empresa/{id_tipo_gasto_empresa}", response_model=TipoGastoEmpresaResponse)
async def update_tipo_gasto_empresa(
    id_tipo_gasto_empresa: int,
    data: TipoGastoEmpresaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.id_tipo_gasto_empresa == id_tipo_gasto_empresa))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")
    assert_resource_playa(current_user, tipo.id_playa)

    if tipo.nombre != data.nombre:
        user_playa = current_user.get("id_playa")
        dup_q = select(TipoGastoEmpresa).where(
            TipoGastoEmpresa.nombre == data.nombre,
            TipoGastoEmpresa.id_tipo_gasto_empresa != id_tipo_gasto_empresa,
        )
        if user_playa is not None:
            dup_q = dup_q.where(TipoGastoEmpresa.id_playa == user_playa)
        res = await session.execute(dup_q)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"El concepto '{data.nombre}' ya existe.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "es_fijo": tipo.es_fijo,
        "activo": tipo.activo
    }

    tipo.nombre = data.nombre
    tipo.descripcion = data.descripcion
    tipo.es_fijo = data.es_fijo
    tipo.activo = data.activo
    
    await session.commit()
    await session.refresh(tipo)

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="tipos_gastos_empresa",
        record_id=id_tipo_gasto_empresa,
        previous_data=old_data,
        new_data=data.dict(exclude_none=True),
        details=f"Tipo de gasto empresa actualizado: {tipo.nombre}"
    )

    return tipo

@router.delete("/tipos-gastos-empresa/{id_tipo_gasto_empresa}")
async def delete_tipo_gasto_empresa(
    id_tipo_gasto_empresa: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(TipoGastoEmpresa).where(TipoGastoEmpresa.id_tipo_gasto_empresa == id_tipo_gasto_empresa))
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Concepto de gasto no encontrado")
    assert_resource_playa(current_user, tipo.id_playa)
        
    uso = await session.execute(select(GastoEmpresa).where(GastoEmpresa.id_tipo_gasto_empresa == id_tipo_gasto_empresa).limit(1))
    if uso.first():
         raise HTTPException(status_code=400, detail="No se puede eliminar porque existen gastos asociados a este concepto.")

    old_data = {
        "nombre": tipo.nombre,
        "descripcion": tipo.descripcion,
        "es_fijo": tipo.es_fijo,
        "activo": tipo.activo
    }

    await session.delete(tipo)
    await session.commit()

    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="tipos_gastos_empresa",
        record_id=id_tipo_gasto_empresa,
        previous_data=old_data,
        details=f"Tipo de gasto empresa eliminado: {tipo.nombre}"
    )

    return {"message": "Concepto eliminado correctamente"}

@router.get("/gastos-empresa", response_model=List[GastoEmpresaResponse])
async def list_gastos_empresa(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).order_by(GastoEmpresa.fecha_gasto.desc())
    
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(GastoEmpresa.id_playa == id_playa)
    if desde:
        query = query.where(GastoEmpresa.fecha_gasto >= desde)
    if hasta:
        query = query.where(GastoEmpresa.fecha_gasto <= hasta)
        
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/gastos-empresa", response_model=GastoEmpresaResponse)
async def create_gasto_empresa(
    data: GastoEmpresaCreate, 
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    id_playa = current_user.get("id_playa")
    new_gasto = GastoEmpresa(**data.dict(), id_playa=id_playa)
    session.add(new_gasto)
    
    # Si se especificó cuenta, registrar el movimiento y actualizar saldo
    if data.id_cuenta:
        res_c = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta))
        cuenta = res_c.scalar_one_or_none()
        if cuenta:
            if cuenta.saldo_actual is None: cuenta.saldo_actual = 0
            cuenta.saldo_actual -= Decimal(str(data.monto))
            
            # Registrar Movimiento
            new_mov = Movimiento(
                id_cuenta_origen=data.id_cuenta,
                monto=data.monto,
                fecha=datetime.combine(data.fecha_gasto, datetime.min.time()),
                concepto=f"Gasto Empresa: {data.descripcion or 'Sin descripción'}",
                referencia="Gasto Empresa",
                id_usuario=current_user.get("user_id"),
                id_playa=id_playa
            )
            session.add(new_mov)

    await session.commit()
    await session.refresh(new_gasto)
    
    # Cargar la relación tipo_gasto para evitar error de lazy loading
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).where(GastoEmpresa.id_gasto_empresa == new_gasto.id_gasto_empresa)
    )
    gasto_with_tipo = result.scalar_one()
    
    # Auditoría
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    if 'fecha_gasto' in new_data_for_audit and new_data_for_audit['fecha_gasto']:
        if hasattr(new_data_for_audit['fecha_gasto'], 'isoformat'):
            new_data_for_audit['fecha_gasto'] = new_data_for_audit['fecha_gasto'].isoformat()
        else:
            new_data_for_audit['fecha_gasto'] = str(new_data_for_audit['fecha_gasto'])
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="gastos_empresa",
        record_id=new_gasto.id_gasto_empresa,
        new_data=data.dict(exclude_none=True),
        details=f"Gasto de empresa registrado: {data.monto} - {data.descripcion}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).where(GastoEmpresa.id_gasto_empresa == new_gasto.id_gasto_empresa)
    )
    return result.scalar_one()

@router.put("/gastos-empresa/{gasto_id}", response_model=GastoEmpresaResponse)
async def update_gasto_empresa(
    gasto_id: int,
    data: GastoEmpresaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Obtener el gasto existente
    result = await session.execute(select(GastoEmpresa).where(GastoEmpresa.id_gasto_empresa == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Guardar datos antiguos para auditoría
    old_data = {
        "id_tipo_gasto_empresa": gasto.id_tipo_gasto_empresa,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Actualizar campos
    for field, value in data.dict(exclude_none=True).items():
        setattr(gasto, field, value)
    
    await session.commit()
    await session.refresh(gasto)
    
    # Convertir Decimals a float y fechas a string para auditoría
    new_data_for_audit = data.dict(exclude_none=True)
    if 'monto' in new_data_for_audit:
        new_data_for_audit['monto'] = float(new_data_for_audit['monto'])
    if 'fecha_gasto' in new_data_for_audit and new_data_for_audit['fecha_gasto']:
        if hasattr(new_data_for_audit['fecha_gasto'], 'isoformat'):
            new_data_for_audit['fecha_gasto'] = new_data_for_audit['fecha_gasto'].isoformat()
        else:
            new_data_for_audit['fecha_gasto'] = str(new_data_for_audit['fecha_gasto'])
    
    # Auditoría (antes de cargar relaciones para evitar error de lazy loading)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="gastos_empresa",
        record_id=gasto_id,
        previous_data=old_data,
        new_data=new_data_for_audit,
        details=f"Gasto de empresa actualizado: {data.monto} - {data.descripcion}"
    )
    
    # RE-FETCH
    result = await session.execute(
        select(GastoEmpresa).options(joinedload(GastoEmpresa.tipo_gasto)).where(GastoEmpresa.id_gasto_empresa == gasto_id)
    )
    return result.scalar_one()

@router.delete("/gastos-empresa/{gasto_id}")
async def delete_gasto_empresa(
    gasto_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(GastoEmpresa).where(GastoEmpresa.id_gasto_empresa == gasto_id))
    gasto = result.scalar_one_or_none()
    
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Guardar datos para auditoría
    old_data = {
        "id_tipo_gasto_empresa": gasto.id_tipo_gasto_empresa,
        "descripcion": gasto.descripcion,
        "monto": float(gasto.monto),
        "fecha_gasto": gasto.fecha_gasto.isoformat() if gasto.fecha_gasto else None,
        "proveedor": gasto.proveedor,
        "numero_factura": gasto.numero_factura
    }
    
    # Auditoría (antes de eliminar para evitar error de lazy loading)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="gastos_empresa",
        record_id=gasto_id,
        previous_data=old_data,
        details=f"Gasto de empresa eliminado: {gasto.monto} - {gasto.descripcion}"
    )
    
    await session.delete(gasto)
    await session.commit()
    
    return {"message": "Gasto eliminado correctamente"}


# ===== GASTOS ADICIONALES (INGRESOS/EGRESOS VARIOS) =====
@router.get("/gastos-adicionales", response_model=List[GastoAdicionalResponse])
async def list_gastos_adicionales(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    id_cuenta: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(GastoAdicional).options(joinedload(GastoAdicional.cuenta_rel)).order_by(GastoAdicional.fecha.desc())
    
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(GastoAdicional.id_playa == id_playa)
    if desde:
        query = query.where(GastoAdicional.fecha >= desde)
    if hasta:
        query = query.where(GastoAdicional.fecha <= hasta)
    if id_cuenta:
        query = query.where(GastoAdicional.id_cuenta == id_cuenta)
    
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/gastos-adicionales", response_model=GastoAdicionalResponse)
async def create_gasto_adicional(
    data: GastoAdicionalCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    id_playa = current_user.get("id_playa")
    new_item = GastoAdicional(**data.model_dump(), id_playa=id_playa)
    session.add(new_item)
    
    # Actualizar saldo de la cuenta
    res_c = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta))
    cuenta = res_c.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    
    monto = Decimal(str(data.monto))
    if data.tipo == 'INGRESO':
        cuenta.saldo_actual = (cuenta.saldo_actual or 0) + monto
    else:
        cuenta.saldo_actual = (cuenta.saldo_actual or 0) - monto
        
    # Registrar Movimiento para el extracto
    new_mov = Movimiento(
        id_cuenta_destino=data.id_cuenta if data.tipo == 'INGRESO' else None,
        id_cuenta_origen=data.id_cuenta if data.tipo == 'EGRESO' else None,
        monto=monto,
        fecha=datetime.combine(data.fecha, datetime.min.time()),
        concepto=f"Registro Vario ({data.tipo}): {data.concepto}",
        referencia=f"Gasto Adicional",
        id_usuario=current_user.get("user_id"),
        id_playa=id_playa
    )
    session.add(new_mov)
    await session.flush() # Para obtener id_movimiento
    
    new_item.id_movimiento = new_mov.id_movimiento
    
    await session.commit()
    await session.refresh(new_item)
    
    # RE-FETCH with relations
    result = await session.execute(
        select(GastoAdicional).options(joinedload(GastoAdicional.cuenta_rel)).where(GastoAdicional.id_gasto_adicional == new_item.id_gasto_adicional)
    )
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="gastos_adicionales",
        record_id=new_item.id_gasto_adicional,
        new_data=data.model_dump(exclude_none=True),
        details=f"Gasto adicional registrado: {data.tipo} {data.monto} - {data.concepto}"
    )
    
    return result.scalar_one()

@router.put("/gastos-adicionales/{id_gasto_adicional}", response_model=GastoAdicionalResponse)
async def update_gasto_adicional(
    id_gasto_adicional: int,
    data: GastoAdicionalCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(GastoAdicional).where(GastoAdicional.id_gasto_adicional == id_gasto_adicional))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    old_data = {
        "tipo": item.tipo,
        "monto": float(item.monto),
        "fecha": item.fecha.isoformat(),
        "concepto": item.concepto,
        "id_cuenta": item.id_cuenta,
        "observaciones": item.observaciones
    }
    
    # Revertir saldo anterior
    res_c_old = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == item.id_cuenta))
    cuenta_old = res_c_old.scalar_one_or_none()
    if cuenta_old:
        if item.tipo == 'INGRESO':
            cuenta_old.saldo_actual -= item.monto
        else:
            cuenta_old.saldo_actual += item.monto
            
    # Aplicar nuevos datos
    item.tipo = data.tipo
    item.monto = data.monto
    item.fecha = data.fecha
    item.concepto = data.concepto
    item.id_cuenta = data.id_cuenta
    item.observaciones = data.observaciones
    
    # Aplicar nuevo saldo
    res_c_new = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta))
    cuenta_new = res_c_new.scalar_one_or_none()
    if cuenta_new:
        if data.tipo == 'INGRESO':
            cuenta_new.saldo_actual += Decimal(str(data.monto))
        else:
            cuenta_new.saldo_actual -= Decimal(str(data.monto))

    # Actualizar Movimiento asociado
    if item.id_movimiento:
        res_m = await session.execute(select(Movimiento).where(Movimiento.id_movimiento == item.id_movimiento))
        mov = res_m.scalar_one_or_none()
        if mov:
            mov.id_cuenta_destino = data.id_cuenta if data.tipo == 'INGRESO' else None
            mov.id_cuenta_origen = data.id_cuenta if data.tipo == 'EGRESO' else None
            mov.monto = Decimal(str(data.monto))
            mov.fecha = datetime.combine(data.fecha, datetime.min.time())
            mov.concepto = f"Registro Vario ({data.tipo}): {data.concepto}"
            mov.id_usuario = current_user.get("user_id")
    else:
        # Por si no tenía movimiento previo (datos antiguos)
        new_mov = Movimiento(
            id_cuenta_destino=data.id_cuenta if data.tipo == 'INGRESO' else None,
            id_cuenta_origen=data.id_cuenta if data.tipo == 'EGRESO' else None,
            monto=Decimal(str(data.monto)),
            fecha=datetime.combine(data.fecha, datetime.min.time()),
            concepto=f"Registro Vario ({data.tipo}): {data.concepto}",
            referencia=f"Gasto Adicional",
            id_usuario=current_user.get("user_id")
        )
        session.add(new_mov)
        await session.flush()
        item.id_movimiento = new_mov.id_movimiento

    await session.commit()
    await session.refresh(item)
    
    # RE-FETCH
    result = await session.execute(
        select(GastoAdicional).options(joinedload(GastoAdicional.cuenta_rel)).where(GastoAdicional.id_gasto_adicional == id_gasto_adicional)
    )
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="gastos_adicionales",
        record_id=id_gasto_adicional,
        previous_data=old_data,
        new_data=data.model_dump(exclude_none=True),
        details=f"Gasto adicional actualizado: {data.tipo} {data.monto} - {data.concepto}"
    )
    
    return result.scalar_one()

@router.delete("/gastos-adicionales/{id_gasto_adicional}")
async def delete_gasto_adicional(
    id_gasto_adicional: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(GastoAdicional).where(GastoAdicional.id_gasto_adicional == id_gasto_adicional))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    # Revertir saldo
    res_c = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == item.id_cuenta))
    cuenta = res_c.scalar_one_or_none()
    if cuenta:
        monto = Decimal(str(item.monto))
        if item.tipo == 'INGRESO':
            cuenta.saldo_actual = (cuenta.saldo_actual or 0) - monto
        else:
            cuenta.saldo_actual = (cuenta.saldo_actual or 0) + monto
            
    # Eliminar Movimiento asociado
    if item.id_movimiento:
        res_m = await session.execute(select(Movimiento).where(Movimiento.id_movimiento == item.id_movimiento))
        mov = res_m.scalar_one_or_none()
        if mov:
            await session.delete(mov)
            
    await session.delete(item)
    await session.commit()
    
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="delete",
        table="gastos_adicionales",
        record_id=id_gasto_adicional,
        details=f"Gasto adicional eliminado: {item.tipo} {item.monto} - {item.concepto}"
    )
    
    return {"message": "Registro eliminado correctamente"}


# ===== DASHBOARD FINANCIERO =====
@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    id_playa = current_user.get("id_playa")
    is_superadmin = id_playa is None
    
    # Cantidad de Playas (Solo para SuperAdmin)
    cant_playas = 0
    if is_superadmin:
        res_playas = await session.execute(select(func.count(Playa.id)).where(Playa.activo == True))
        cant_playas = res_playas.scalar_one() or 0
    
    # 1. Valor del Stock (Vehículos Disponibles)
    # Costo base de disponibles
    query_stock_base = select(func.sum(Producto.costo_base)).where(Producto.estado_disponibilidad == 'DISPONIBLE')
    if id_playa is not None:
        query_stock_base = query_stock_base.where(Producto.id_playa == id_playa)
        
    res_stock_base = await session.execute(query_stock_base)
    stock_base = res_stock_base.scalar_one() or 0
    
    # Gastos de vehículos disponibles
    query_stock_gastos = (
        select(func.sum(GastoProducto.monto))
        .join(Producto, GastoProducto.id_producto == Producto.id_producto)
        .where(Producto.estado_disponibilidad == 'DISPONIBLE')
    )
    if id_playa is not None:
        query_stock_gastos = query_stock_gastos.where(GastoProducto.id_playa == id_playa)
        
    res_stock_gastos = await session.execute(query_stock_gastos)
    stock_gastos = res_stock_gastos.scalar_one() or 0
    
    valor_stock = stock_base + stock_gastos

    # 2. Cartera Pendiente (Pagarés no cobrados)
    query_cartera = (
        select(func.sum(Pagare.saldo_pendiente))
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .join(Estado, Pagare.id_estado == Estado.id_estado) # Join Estado
        .where(and_(
            Estado.nombre.in_(['PENDIENTE', 'VENCIDO', 'PARCIAL']), 
            Venta.estado_venta != 'ANULADA'
        ))
    )
    if id_playa is not None:
        query_cartera = query_cartera.where(Pagare.id_playa == id_playa)
        
    res_cartera = await session.execute(query_cartera)
    cartera_pendiente = res_cartera.scalar_one() or 0

    # 2b. Cartera en Mora (Pagarés vencidos)
    hoy_date = date.today()
    query_mora = (
        select(func.sum(Pagare.saldo_pendiente))
        .join(Venta, Pagare.id_venta == Venta.id_venta)
        .join(Estado, Pagare.id_estado == Estado.id_estado) # Join Estado
        .where(and_(
            Estado.nombre.in_(['PENDIENTE', 'VENCIDO', 'PARCIAL']), 
            or_(Estado.nombre == 'VENCIDO', Pagare.fecha_vencimiento < hoy_date),
            Venta.estado_venta != 'ANULADA'
        ))
    )
    if id_playa is not None:
        query_mora = query_mora.where(Pagare.id_playa == id_playa)
        
    res_mora = await session.execute(query_mora)
    cartera_mora = res_mora.scalar_one() or 0

    # 3. Ventas y Utilidad Proyectada (De vehículos vendidos)
    query_ventas = select(func.sum(Venta.precio_final)).where(Venta.estado_venta != 'ANULADA')
    if id_playa is not None:
        query_ventas = query_ventas.where(Venta.id_playa == id_playa)
    res_ventas = await session.execute(query_ventas)
    total_ventas = res_ventas.scalar_one() or 0
    
    # Para la utilidad: (Precio Venta Final) - (Costo Base + Gastos) de esos vehículos vendidos
    query_costo_vendidos = (
        select(func.sum(Producto.costo_base))
        .join(Venta, Venta.id_producto == Producto.id_producto)
        .where(Venta.estado_venta != 'ANULADA')
    )
    if id_playa is not None:
        query_costo_vendidos = query_costo_vendidos.where(Producto.id_playa == id_playa)
    res_costo_vendidos = await session.execute(query_costo_vendidos)
    costo_base_vendidos = res_costo_vendidos.scalar_one() or 0
    
    query_gastos_vendidos = (
        select(func.sum(GastoProducto.monto))
        .join(Producto, GastoProducto.id_producto == Producto.id_producto)
        .join(Venta, Venta.id_producto == Producto.id_producto)
        .where(Venta.estado_venta != 'ANULADA')
    )
    if id_playa is not None:
        query_gastos_vendidos = query_gastos_vendidos.where(GastoProducto.id_playa == id_playa)
    res_gastos_vendidos = await session.execute(query_gastos_vendidos)
    gastos_totales_vendidos = res_gastos_vendidos.scalar_one() or 0
    
    utilidad_proyectada = total_ventas - (costo_base_vendidos + gastos_totales_vendidos)

    # 4. Conteos rápidos
    query_cont_disp = select(func.count(Producto.id_producto)).where(Producto.estado_disponibilidad == 'DISPONIBLE')
    if id_playa is not None:
        query_cont_disp = query_cont_disp.where(Producto.id_playa == id_playa)
    res_cont_disp = await session.execute(query_cont_disp)
    cant_disponibles = res_cont_disp.scalar_one() or 0
    
    query_cont_vend = select(func.count(Venta.id_venta)).where(Venta.estado_venta != 'ANULADA')
    if id_playa is not None:
        query_cont_vend = query_cont_vend.where(Venta.id_playa == id_playa)
    res_cont_vend = await session.execute(query_cont_vend)
    cant_vendidos = res_cont_vend.scalar_one() or 0

    # 5. Gastos de Empresa (Alquiler, personal, etc)
    query_gastos_emp = select(func.sum(GastoEmpresa.monto))
    if id_playa is not None:
        query_gastos_emp = query_gastos_emp.where(GastoEmpresa.id_playa == id_playa)
    res_gastos_emp = await session.execute(query_gastos_emp)
    total_gastos_empresa = res_gastos_emp.scalar_one() or 0

    # --- REPORTES DETALLADOS PARA GRÁFICOS ---
    
    # 6. Ventas Mensuales (Últimos 6 meses)
    query_mes = (
        select(
            func.date_trunc('month', Venta.fecha_venta).label('mes'),
            func.sum(Venta.precio_final).label('total')
        ).where(Venta.estado_venta != 'ANULADA')
    )
    if id_playa is not None:
        query_mes = query_mes.where(Venta.id_playa == id_playa)
    
    res_mes = await session.execute(
        query_mes.group_by(text('mes'))
        .order_by(text('mes'))
    )
    ventas_mensuales = [
        {"mes": row.mes.strftime('%b %Y') if row.mes else 'N/A', "total": float(row.total)} 
        for row in res_mes.all()
    ][-6:] # Tomamos los últimos 6

    # 7. Ventas por Categoría
    query_cat = (
        select(
            CategoriaVehiculo.nombre,
            func.sum(Venta.precio_final).label('total'),
            func.count(Venta.id_venta).label('cantidad')
        ).join(Producto, Venta.id_producto == Producto.id_producto)
        .join(CategoriaVehiculo, Producto.id_categoria == CategoriaVehiculo.id_categoria)
        .where(Venta.estado_venta != 'ANULADA')
    )
    if id_playa is not None:
        query_cat = query_cat.where(Venta.id_playa == id_playa)
        
    res_cat = await session.execute(
        query_cat.group_by(CategoriaVehiculo.nombre)
    )
    ventas_por_categoria = [
        {"nombre": row.nombre, "total": float(row.total), "cantidad": row.cantidad} 
        for row in res_cat.all()
    ]

    # 8. Cartera por Vencimiento (Envejecimiento)
    aging_case = case(
        (Pagare.fecha_vencimiento >= hoy_date, 'A_DIA'),
        (Pagare.fecha_vencimiento >= hoy_date - timedelta(days=30), 'B_1_30'),
        (Pagare.fecha_vencimiento >= hoy_date - timedelta(days=60), 'C_31_60'),
        else_='D_61_MAS'
    )
    
    res_venc = await session.execute(
        select(
            aging_case.label('rango_key'),
            func.sum(Pagare.saldo_pendiente).label('total')
        ).join(Venta, Pagare.id_venta == Venta.id_venta)
        .join(Estado, Pagare.id_estado == Estado.id_estado) # Join Estado
        .where(and_(
            Estado.nombre.in_(['PENDIENTE', 'VENCIDO', 'PARCIAL']), 
            Venta.estado_venta != 'ANULADA',
            Pagare.id_playa == id_playa if id_playa is not None else True
        ))
        .group_by(aging_case)
    )
    
    # Mapeo de keys a etiquetas legibles
    label_map = {
        'A_DIA': 'Al día',
        'B_1_30': '1-30 días',
        'C_31_60': '31-60 días',
        'D_61_MAS': '61+ días'
    }
    
    db_results = {row.rango_key: float(row.total) for row in res_venc.all()}
    cartera_por_vencimiento = {label: db_results.get(key, 0.0) for key, label in label_map.items()}

    # 9. Gastos por Tipo
    query_gastos_tipo = (
        select(
            TipoGastoEmpresa.nombre,
            func.sum(GastoEmpresa.monto).label('total')
        ).join(GastoEmpresa, TipoGastoEmpresa.id_tipo_gasto_empresa == GastoEmpresa.id_tipo_gasto_empresa)
    )
    if id_playa is not None:
        query_gastos_tipo = query_gastos_tipo.where(GastoEmpresa.id_playa == id_playa)
        
    res_gastos_tipo = await session.execute(
        query_gastos_tipo.group_by(TipoGastoEmpresa.nombre)
    )
    gastos_por_tipo = [
        {"nombre": row.nombre, "total": float(row.total)} 
        for row in res_gastos_tipo.all()
    ]

    query_vendedores = (
        select(
            Vendedor.nombre,
            Vendedor.apellido,
            func.count(Venta.id_venta).label('cantidad'),
            func.sum(Venta.precio_final).label('total')
        ).join(Venta, Vendedor.id_vendedor == Venta.id_vendedor)
        .where(Venta.estado_venta != 'ANULADA')
    )
    if id_playa is not None:
        query_vendedores = query_vendedores.where(Venta.id_playa == id_playa)
        
    res_vendedores = await session.execute(
        query_vendedores.group_by(Vendedor.nombre, Vendedor.apellido)
        .order_by(text('cantidad DESC'))
        .limit(5)
    )
    mejores_vendedores = [
        {"nombre": f"{row.nombre} {row.apellido}", "cantidad": row.cantidad, "total": float(row.total)}
        for row in res_vendedores.all()
    ]

    # 11. Vehículos más vendidos (Marca + Modelo)
    res_veh_top = await session.execute(
        select(
            Producto.marca,
            Producto.modelo,
            func.count(Venta.id_venta).label('cantidad')
        ).join(Venta, Producto.id_producto == Venta.id_producto)
        .where(Venta.estado_venta != 'ANULADA')
        .group_by(Producto.marca, Producto.modelo)
        .order_by(text('cantidad DESC'))
        .limit(5)
    )
    vehiculos_mas_vendidos = [
        {"nombre": f"{row.marca} {row.modelo}", "cantidad": row.cantidad}
        for row in res_veh_top.all()
    ]

    # 12. Vehículos menos vendidos (incluyendo marcas/modelos que se venden poco)
    # Para esto tomamos el ranking inverso de los que tienen al menos una venta
    res_veh_bottom = await session.execute(
        select(
            Producto.marca,
            Producto.modelo,
            func.count(Venta.id_venta).label('cantidad')
        ).join(Venta, Producto.id_producto == Venta.id_producto)
        .where(Venta.estado_venta != 'ANULADA')
        .group_by(Producto.marca, Producto.modelo)
        .order_by(text('cantidad ASC'))
        .limit(5)
    )
    vehiculos_menos_vendidos = [
        {"nombre": f"{row.marca} {row.modelo}", "cantidad": row.cantidad}
        for row in res_veh_bottom.all()
    ]

    return {
        "valor_stock_actual": valor_stock,
        "cartera_pendiente": cartera_pendiente,
        "cartera_mora": cartera_mora,
        "total_ventas_acumuladas": total_ventas,
        "utilidad_proyectada": utilidad_proyectada,
        "total_gastos_empresa": total_gastos_empresa,
        "cant_disponibles": cant_disponibles,
        "cant_vendidos": cant_vendidos,
        "ventas_mensuales": ventas_mensuales,
        "ventas_por_categoria": ventas_por_categoria,
        "cartera_por_vencimiento": cartera_por_vencimiento,
        "gastos_por_tipo": gastos_por_tipo,
        "mejores_vendedores": mejores_vendedores,
        "vehiculos_mas_vendidos": vehiculos_mas_vendidos,
        "vehiculos_menos_vendidos": vehiculos_menos_vendidos,
        "cant_playas": cant_playas,
        "is_superadmin": is_superadmin
    }


# ===== GASTOS FILTRADOS PARA DASHBOARD =====
@router.get("/dashboard/gastos-filtrados")
async def get_gastos_filtrados(
    tipo_gasto: Optional[str] = None,  # 'empresa', 'vehiculo', 'ambos'
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene gastos filtrados por tipo (empresa, vehículo, ambos) y rango de fechas.
    tipo_gasto: 'empresa', 'vehiculo', 'ambos' o None (ambos por defecto)
    fecha_desde y fecha_hasta: formato 'YYYY-MM-DD'
    """
    # Parsear fechas si se proporcionan
    fecha_desde_obj = None
    fecha_hasta_obj = None
    if fecha_desde:
        try:
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_desde inválido. Use YYYY-MM-DD")
    if fecha_hasta:
        try:
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_hasta inválido. Use YYYY-MM-DD")
    
    # Si no se especifica tipo, por defecto ambos
    if tipo_gasto is None:
        tipo_gasto = 'ambos'
    
    gastos_empresa = []
    gastos_vehiculo = []
    total_empresa = 0
    total_vehiculo = 0
    
    # Gastos de Empresa
    detalles_empresa = []
    if tipo_gasto in ['empresa', 'ambos']:
        # Query para totales agrupados por tipo
        query_empresa = select(
            TipoGastoEmpresa.nombre,
            func.sum(GastoEmpresa.monto).label('total')
        ).join(GastoEmpresa, TipoGastoEmpresa.id_tipo_gasto_empresa == GastoEmpresa.id_tipo_gasto_empresa)
        
        if id_playa is not None:
            query_empresa = query_empresa.where(GastoEmpresa.id_playa == id_playa)
        
        # Aplicar filtro de fechas si existe
        condiciones_fecha_empresa = []
        if fecha_desde_obj:
            condiciones_fecha_empresa.append(GastoEmpresa.fecha_gasto >= fecha_desde_obj)
        if fecha_hasta_obj:
            condiciones_fecha_empresa.append(GastoEmpresa.fecha_gasto <= fecha_hasta_obj)
        if condiciones_fecha_empresa:
            query_empresa = query_empresa.where(and_(*condiciones_fecha_empresa))
        
        query_empresa = query_empresa.group_by(TipoGastoEmpresa.nombre)
        
        res_empresa = await session.execute(query_empresa)
        gastos_empresa = [
            {"nombre": row.nombre, "total": float(row.total), "tipo": "empresa"}
            for row in res_empresa.all()
        ]
        
        # Query para detalles individuales
        query_detalles_empresa = select(
            TipoGastoEmpresa.nombre.label('tipo_nombre'),
            GastoEmpresa.fecha_gasto,
            GastoEmpresa.descripcion,
            GastoEmpresa.monto
        ).join(TipoGastoEmpresa, TipoGastoEmpresa.id_tipo_gasto_empresa == GastoEmpresa.id_tipo_gasto_empresa)
        
        if condiciones_fecha_empresa:
            query_detalles_empresa = query_detalles_empresa.where(and_(*condiciones_fecha_empresa))
        
        query_detalles_empresa = query_detalles_empresa.order_by(GastoEmpresa.fecha_gasto.desc(), TipoGastoEmpresa.nombre)
        
        res_detalles_empresa = await session.execute(query_detalles_empresa)
        detalles_empresa = [
            {
                "tipo_nombre": row.tipo_nombre,
                "fecha_gasto": row.fecha_gasto.isoformat() if row.fecha_gasto else None,
                "descripcion": row.descripcion or "",
                "monto": float(row.monto),
                "tipo": "empresa"
            }
            for row in res_detalles_empresa.all()
        ]
        
        # Total de gastos de empresa
        query_total_empresa = select(func.sum(GastoEmpresa.monto))
        if condiciones_fecha_empresa:
            query_total_empresa = query_total_empresa.where(and_(*condiciones_fecha_empresa))
        res_total_empresa = await session.execute(query_total_empresa)
        total_empresa = float(res_total_empresa.scalar_one() or 0)
    
    # Gastos de Vehículo
    detalles_vehiculo = []
    if tipo_gasto in ['vehiculo', 'ambos']:
        # Query para totales agrupados por tipo
        query_vehiculo = select(
            TipoGastoProducto.nombre,
            func.sum(GastoProducto.monto).label('total')
        ).join(GastoProducto, TipoGastoProducto.id_tipo_gasto == GastoProducto.id_tipo_gasto)
        
        # Aplicar filtro de fechas si existe
        condiciones_fecha_vehiculo = []
        if fecha_desde_obj:
            condiciones_fecha_vehiculo.append(GastoProducto.fecha_gasto >= fecha_desde_obj)
        if fecha_hasta_obj:
            condiciones_fecha_vehiculo.append(GastoProducto.fecha_gasto <= fecha_hasta_obj)
        if condiciones_fecha_vehiculo:
            query_vehiculo = query_vehiculo.where(and_(*condiciones_fecha_vehiculo))
        
        query_vehiculo = query_vehiculo.group_by(TipoGastoProducto.nombre)
        
        res_vehiculo = await session.execute(query_vehiculo)
        gastos_vehiculo = [
            {"nombre": row.nombre, "total": float(row.total), "tipo": "vehiculo"}
            for row in res_vehiculo.all()
        ]
        
        # Query para detalles individuales
        query_detalles_vehiculo = select(
            TipoGastoProducto.nombre.label('tipo_nombre'),
            GastoProducto.fecha_gasto,
            GastoProducto.descripcion,
            GastoProducto.monto
        ).join(TipoGastoProducto, TipoGastoProducto.id_tipo_gasto == GastoProducto.id_tipo_gasto)
        
        if condiciones_fecha_vehiculo:
            query_detalles_vehiculo = query_detalles_vehiculo.where(and_(*condiciones_fecha_vehiculo))
        
        query_detalles_vehiculo = query_detalles_vehiculo.order_by(GastoProducto.fecha_gasto.desc(), TipoGastoProducto.nombre)
        
        res_detalles_vehiculo = await session.execute(query_detalles_vehiculo)
        detalles_vehiculo = [
            {
                "tipo_nombre": row.tipo_nombre,
                "fecha_gasto": row.fecha_gasto.isoformat() if row.fecha_gasto else None,
                "descripcion": row.descripcion or "",
                "monto": float(row.monto),
                "tipo": "vehiculo"
            }
            for row in res_detalles_vehiculo.all()
        ]
        
        # Total de gastos de vehículo
        query_total_vehiculo = select(func.sum(GastoProducto.monto))
        if condiciones_fecha_vehiculo:
            query_total_vehiculo = query_total_vehiculo.where(and_(*condiciones_fecha_vehiculo))
        res_total_vehiculo = await session.execute(query_total_vehiculo)
        total_vehiculo = float(res_total_vehiculo.scalar_one() or 0)
    
    # Combinar ambos tipos de gastos
    gastos_combinados = gastos_empresa + gastos_vehiculo
    total_general = total_empresa + total_vehiculo
    detalles_combinados = detalles_empresa + detalles_vehiculo
    
    return {
        "gastos": gastos_combinados,
        "gastos_empresa": gastos_empresa,
        "gastos_vehiculo": gastos_vehiculo,
        "detalles_empresa": detalles_empresa,
        "detalles_vehiculo": detalles_vehiculo,
        "detalles": detalles_combinados,
        "total_empresa": total_empresa,
        "total_vehiculo": total_vehiculo,
        "total_general": total_general,
        "filtros_aplicados": {
            "tipo_gasto": tipo_gasto,
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta
        }
    }


# ===== VENTAS FILTRADAS PARA DASHBOARD =====
@router.get("/dashboard/ventas-filtradas")
async def get_ventas_filtradas(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtiene el total de ingresos filtrados por rango de fechas, incluyendo:
    - Ventas realizadas en el período
    - Entregas iniciales de ventas realizadas en el período
    - Cobros de pagarés realizados en el período
    fecha_desde y fecha_hasta: formato 'YYYY-MM-DD'
    """
    # Parsear fechas si se proporcionan
    fecha_desde_obj = None
    fecha_hasta_obj = None
    if fecha_desde:
        try:
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_desde inválido. Use YYYY-MM-DD")
    if fecha_hasta:
        try:
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_hasta inválido. Use YYYY-MM-DD")
    
    # 1. VENTAS REALIZADAS EN EL PERÍODO (precio_final)
    condiciones_ventas = [Venta.estado_venta != 'ANULADA']
    if fecha_desde_obj:
        condiciones_ventas.append(Venta.fecha_venta >= fecha_desde_obj)
    if fecha_hasta_obj:
        condiciones_ventas.append(Venta.fecha_venta <= fecha_hasta_obj)
    
    query_ventas = select(func.sum(Venta.precio_final)).where(and_(*condiciones_ventas))
    if id_playa is not None:
        query_ventas = query_ventas.where(Venta.id_playa == id_playa)
    res_ventas = await session.execute(query_ventas)
    total_ventas = float(res_ventas.scalar_one() or 0)
    
    # 2. ENTREGAS INICIALES DE VENTAS REALIZADAS EN EL PERÍODO
    query_entregas = select(func.sum(Venta.entrega_inicial)).where(and_(*condiciones_ventas))
    if id_playa is not None:
        query_entregas = query_entregas.where(Venta.id_playa == id_playa)
    res_entregas = await session.execute(query_entregas)
    total_entregas_iniciales = float(res_entregas.scalar_one() or 0)
    
    # Contar cantidad de ventas
    query_cantidad = select(func.count(Venta.id_venta)).where(and_(*condiciones_ventas))
    res_cantidad = await session.execute(query_cantidad)
    cantidad_ventas = int(res_cantidad.scalar_one() or 0)
    
    # 3. COBROS DE PAGARÉS REALIZADOS EN EL PERÍODO (fecha_pago)
    condiciones_pagos = []
    if fecha_desde_obj:
        condiciones_pagos.append(Pago.fecha_pago >= fecha_desde_obj)
    if fecha_hasta_obj:
        condiciones_pagos.append(Pago.fecha_pago <= fecha_hasta_obj)
    
    # Solo contar pagos de ventas no anuladas
    if condiciones_pagos:
        query_cobros = select(func.sum(Pago.monto_pagado)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(and_(
            Venta.estado_venta != 'ANULADA',
            *condiciones_pagos
        ))
    else:
        query_cobros = select(func.sum(Pago.monto_pagado)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(Venta.estado_venta != 'ANULADA')
    
    res_cobros = await session.execute(query_cobros)
    total_cobros_pagares = float(res_cobros.scalar_one() or 0)
    
    # Contar cantidad de pagos
    if condiciones_pagos:
        query_cantidad_pagos = select(func.count(Pago.id_pago)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(and_(
            Venta.estado_venta != 'ANULADA',
            *condiciones_pagos
        ))
    else:
        query_cantidad_pagos = select(func.count(Pago.id_pago)).join(
            Venta, Pago.id_venta == Venta.id_venta
        ).where(Venta.estado_venta != 'ANULADA')
    
    res_cantidad_pagos = await session.execute(query_cantidad_pagos)
    cantidad_pagos = int(res_cantidad_pagos.scalar_one() or 0)
    
    # Total de ingresos = Ventas + Cobros de pagarés
    # Nota: Las entregas iniciales ya están incluidas en precio_final, pero las mostramos por separado
    # para claridad. Los cobros de pagarés son adicionales.
    total_ingresos = total_ventas + total_cobros_pagares
    
    return {
        "total_ventas": total_ventas,
        "total_entregas_iniciales": total_entregas_iniciales,
        "total_cobros_pagares": total_cobros_pagares,
        "total_ingresos": total_ingresos,
        "cantidad_ventas": cantidad_ventas,
        "cantidad_pagos": cantidad_pagos,
        "filtros_aplicados": {
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta
        }
    }


# ===== ESTADOS DE PAGARÉ =====
@router.get("/estados", response_model=List[EstadoResponse])
async def list_estados(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(Estado).order_by(Estado.id_estado.asc())
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(or_(Estado.id_playa == id_playa, Estado.id_playa.is_(None)))
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/estados", response_model=EstadoResponse)
async def create_estado(
    data: EstadoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_estado = Estado(**data.model_dump())
    session.add(new_estado)
    await session.commit()
    await session.refresh(new_estado)
    return new_estado

@router.put("/estados/{id_estado}", response_model=EstadoResponse)
async def update_estado(
    id_estado: int,
    data: EstadoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Estado).where(Estado.id_estado == id_estado))
    estado = res.scalar_one_or_none()
    if not estado:
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(estado, field, value)
    
    await session.commit()
    await session.refresh(estado)
    return estado

@router.delete("/estados/{id_estado}")
async def delete_estado(
    id_estado: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Estado).where(Estado.id_estado == id_estado))
    estado = res.scalar_one_or_none()
    if not estado:
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    
    await session.delete(estado)
    await session.commit()
    return {"message": "Estado eliminado correctamente"}

# ===== CUENTAS =====
@router.get("/cuentas", response_model=List[CuentaResponse])
async def list_cuentas(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(Cuenta)
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(Cuenta.id_playa == id_playa)
    result = await session.execute(query.order_by(Cuenta.nombre.asc()))
    return result.scalars().all()

@router.post("/cuentas", response_model=CuentaResponse)
async def create_cuenta(
    data: CuentaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    new_cuenta_data = data.model_dump()
    new_cuenta_data["id_playa"] = current_user.get("id_playa")
    new_cuenta = Cuenta(**new_cuenta_data)
    session.add(new_cuenta)
    await session.commit()
    await session.refresh(new_cuenta)
    return new_cuenta

@router.put("/cuentas/{id_cuenta}", response_model=CuentaResponse)
async def update_cuenta(
    id_cuenta: int,
    data: CuentaCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == id_cuenta))
    cuenta = res.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    assert_resource_playa(current_user, cuenta.id_playa)
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cuenta, field, value)
    
    await session.commit()
    await session.refresh(cuenta)
    return cuenta

@router.delete("/cuentas/{id_cuenta}")
async def delete_cuenta(
    id_cuenta: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    res = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == id_cuenta))
    cuenta = res.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    assert_resource_playa(current_user, cuenta.id_playa)
    
    await session.delete(cuenta)
    await session.commit()
    return {"message": "Cuenta eliminada correctamente"}

# ===== MOVIMIENTOS =====
@router.get("/movimientos", response_model=List[MovimientoResponse])
async def list_movimientos(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(Movimiento).options(joinedload(Movimiento.cuenta_origen), joinedload(Movimiento.cuenta_destino))
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(Movimiento.id_playa == id_playa)
    result = await session.execute(query.order_by(Movimiento.fecha.desc()))
    return result.scalars().all()

@router.post("/movimientos", response_model=MovimientoResponse)
async def create_movimiento(
    data: MovimientoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    user_playa = current_user.get("id_playa")
    # Validar cuentas si se especifican
    if data.id_cuenta_origen:
        res_o = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta_origen))
        origen = res_o.scalar_one_or_none()
        if not origen:
            raise HTTPException(status_code=404, detail="Cuenta origen no encontrada")
        assert_resource_playa(current_user, origen.id_playa)
        # Restar del origen
        if origen.saldo_actual is None: origen.saldo_actual = 0
        origen.saldo_actual -= data.monto
            
    if data.id_cuenta_destino:
        res_d = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta_destino))
        destino = res_d.scalar_one_or_none()
        if not destino:
            raise HTTPException(status_code=404, detail="Cuenta destino no encontrada")
        assert_resource_playa(current_user, destino.id_playa)
        # Sumar al destino
        if destino.saldo_actual is None: destino.saldo_actual = 0
        destino.saldo_actual += data.monto

    id_playa = user_playa
    new_mov = Movimiento(
        **data.model_dump(),
        id_usuario=current_user.get("user_id"),
        id_playa=id_playa
    )
    session.add(new_mov)
    await session.commit()
    await session.refresh(new_mov)
    
    # Recargar relaciones
    result = await session.execute(
        select(Movimiento)
        .options(joinedload(Movimiento.cuenta_origen), joinedload(Movimiento.cuenta_destino))
        .where(Movimiento.id_movimiento == new_mov.id_movimiento)
    )
    return result.scalar_one()

@router.put("/movimientos/{id_movimiento}")
async def update_movimiento(
    id_movimiento: int,
    data: MovimientoCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # 1. Obtener movimiento actual
    res = await session.execute(
        select(Movimiento).where(Movimiento.id_movimiento == id_movimiento)
    )
    movimiento = res.scalar_one_or_none()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    assert_resource_playa(current_user, movimiento.id_playa)
        
    # 2. Revertir saldos anteriores
    if movimiento.id_cuenta_origen:
        res_o = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == movimiento.id_cuenta_origen))
        origen = res_o.scalar_one_or_none()
        if origen:
            if origen.saldo_actual is None: origen.saldo_actual = 0
            origen.saldo_actual += movimiento.monto
            
    if movimiento.id_cuenta_destino:
        res_d = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == movimiento.id_cuenta_destino))
        destino = res_d.scalar_one_or_none()
        if destino:
            if destino.saldo_actual is None: destino.saldo_actual = 0
            destino.saldo_actual -= movimiento.monto
            
    # 3. Aplicar nuevos saldos
    if data.id_cuenta_origen:
        res_o = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta_origen))
        origen_new = res_o.scalar_one_or_none()
        if not origen_new:
            raise HTTPException(status_code=404, detail="Nueva cuenta origen no encontrada")
        assert_resource_playa(current_user, origen_new.id_playa)
        if origen_new.saldo_actual is None: origen_new.saldo_actual = 0
        origen_new.saldo_actual -= data.monto
        
    if data.id_cuenta_destino:
        res_d = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == data.id_cuenta_destino))
        destino_new = res_d.scalar_one_or_none()
        if not destino_new:
            raise HTTPException(status_code=404, detail="Nueva cuenta destino no encontrada")
        assert_resource_playa(current_user, destino_new.id_playa)
        if destino_new.saldo_actual is None: destino_new.saldo_actual = 0
        destino_new.saldo_actual += data.monto
        
    # 4. Actualizar datos del movimiento
    update_data = data.model_dump()
    for key, value in update_data.items():
        setattr(movimiento, key, value)
    
    if not data.fecha:
        movimiento.fecha = datetime.now()
        
    await session.commit()
    return {"message": "Movimiento actualizado correctamente"}

@router.delete("/movimientos/{id_movimiento}")
async def delete_movimiento(
    id_movimiento: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Buscar el movimiento
    res = await session.execute(
        select(Movimiento).where(Movimiento.id_movimiento == id_movimiento)
    )
    movimiento = res.scalar_one_or_none()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    assert_resource_playa(current_user, movimiento.id_playa)
    
    # Revertir saldos de las cuentas involucradas
    if movimiento.id_cuenta_origen:
        res_o = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == movimiento.id_cuenta_origen))
        origen = res_o.scalar_one_or_none()
        if origen:
            if origen.saldo_actual is None: 
                origen.saldo_actual = 0
            # Si el dinero salió de aquí, al borrarlo, tiene que volver (suma)
            origen.saldo_actual += movimiento.monto
            
    if movimiento.id_cuenta_destino:
        res_d = await session.execute(select(Cuenta).where(Cuenta.id_cuenta == movimiento.id_cuenta_destino))
        destino = res_d.scalar_one_or_none()
        if destino:
            if destino.saldo_actual is None: 
                destino.saldo_actual = 0
            # Si el dinero llegó aquí, al borrarlo, tiene que irse (resta)
            destino.saldo_actual -= movimiento.monto
            
    await session.delete(movimiento)
    await session.commit()
    return {"message": "Movimiento eliminado correctamente"}


# ===== DOCUMENTOS DE IMPORTACIÓN =====
# OCR con IA: EasyOCR para PDFs escaneados, LLM opcional para extracción estructurada
_easyocr_reader = None  # Cache del reader para no cargar el modelo en cada request


def _extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extrae texto de un PDF. Usa PyMuPDF; si el texto es muy corto (PDF escaneado), usa EasyOCR."""
    import fitz
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        full_text = "\n".join(text_parts)
        # Si hay pocas páginas con muy poco texto, probablemente es escaneado -> OCR
        num_pages = len(text_parts)
        if num_pages > 0 and len(full_text.strip()) < max(100, 50 * num_pages):
            try:
                global _easyocr_reader
                import numpy as np
                import easyocr
                if _easyocr_reader is None:
                    _easyocr_reader = easyocr.Reader(["es", "en"], gpu=False, verbose=False)
                reader = _easyocr_reader
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                ocr_parts = []
                for page in doc:
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)  # 2x resolución
                    img = np.ndarray(
                        shape=[pix.height, pix.width, pix.n],
                        dtype=np.uint8,
                        buffer=pix.samples,
                    )
                    result = reader.readtext(img)
                    ocr_parts.append("\n".join([item[1] for item in result]))
                doc.close()
                full_text = "\n".join(ocr_parts)
                logger.info("OCR EasyOCR aplicado (PDF escaneado)")
            except ImportError:
                pass
            except Exception as ocr_err:
                logger.warning("EasyOCR no disponible o error: %s", ocr_err)
        return full_text
    except Exception as e:
        logger.warning("Error extrayendo texto del PDF: %s", e)
        return ""


def _extract_with_llm(text_despacho: str, text_certificados: str) -> Optional[dict]:
    """Si está configurado OPENAI_API_KEY o DOCUMENTOS_LLM_URL, usa un LLM para extraer datos estructurados."""
    import os
    import json
    import re
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("DOCUMENTOS_LLM_URL")  # ej. http://localhost:11434/v1 para Ollama
    if not api_key and not base_url:
        return None
    prompt = """Eres un experto en extraer datos de documentos de aduana de Paraguay (Despacho e Importación).

Tienes dos textos extraídos de PDFs (posiblemente vía OCR):
1) DOCUMENTO DE DESPACHO: contiene número de despacho y lista de chasis.
2) CERTIFICADOS DE NACIONALIZACIÓN: contiene la vinculación de cada chasis con su número de certificado "AUT-".

### REGLAS CRÍTICAS:
- Los números de CHASIS y de CERTIFICADO pueden estar divididos en varias líneas. Debes unirlos inteligentemente.
  Ejemplo: "AUT-26003IC04000802H-" y abajo "0002" es el certificado "AUT-26003IC04000802H-0002".
  Ejemplo: "XZU414-1011" y abajo "371" es el chasis "XZU414-1011371".
- El número de despacho suele tener 16 caracteres (ej. 26003IC04000802H).
- Ignore etiquetas como "AÑO FABRICACION", "AÑO VEHICULO", "NRO MOTOR", "NRO RUA", etc. que puedan aparecer cerca del chasis.

Extrae y responde ÚNICAMENTE un JSON válido, sin markdown, con esta estructura:
{"nro_despacho": "número completo", "chasis_despacho": ["CHASIS1", "CHASIS2"], "certificados_por_chasis": {"CHASIS1": "AUT-XXXX-YYYY", "CHASIS2": "AUT-ZZZZ-WWWW"}}

Si no encuentras algo, usa null o listas/objetos vacíos.

TEXTO DESPACHO:
"""
    prompt += (text_despacho[:14000] or "(vacío)") + "\n\nTEXTO CERTIFICADOS:\n" + (text_certificados[:14000] or "(vacío)")
    try:
        if base_url:
            # Ollama (nativo) o API OpenAI-compatible
            import requests
            base_url = base_url.rstrip("/")
            if "/v1" in base_url:
                url = base_url + "/chat/completions"
                payload = {"model": os.getenv("DOCUMENTOS_LLM_MODEL", "llama3.2"), "messages": [{"role": "user", "content": prompt}], "stream": False}
                r = requests.post(url, json=payload, timeout=90)
                r.raise_for_status()
                content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")
            else:
                url = base_url + "/api/chat"
                payload = {"model": os.getenv("DOCUMENTOS_LLM_MODEL", "llama3.2"), "messages": [{"role": "user", "content": prompt}], "stream": False}
                r = requests.post(url, json=payload, timeout=90)
                r.raise_for_status()
                content = r.json().get("message", {}).get("content", "{}")
        else:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model=os.getenv("DOCUMENTOS_LLM_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            content = resp.choices[0].message.content or "{}"
        # Extraer JSON del texto (por si el modelo envuelve en ```json)
        content = content.strip()
        for match in re.finditer(r"\{[\s\S]*\}", content):
            data = json.loads(match.group())
            if "nro_despacho" in data or "chasis_despacho" in data:
                return data
        return json.loads(content)
    except Exception as e:
        logger.warning("Extracción con LLM fallida: %s", e)
        return None


def _parse_despacho_text(text: str) -> tuple:
    """Extrae número de despacho y lista de chasis del texto del documento de despacho.
    Formatos esperados: 'DESPACHO NUMERO: 26003IC04000802H', 'NRO DE PEDIDO', y 'NRO CHASIS = NCP100-0058263'.
    """
    import re
    nro_despacho = None
    chasis_list = []
    text_upper = text.upper()
    # Número de despacho: "DESPACHO NUMERO: 26003IC04000802H" o "NRO DE PEDIDO" (valor en línea siguiente o mismo renglón)
    for pattern in [
        r"DESPACHO\s+NUMERO\s*:\s*([A-Z0-9\-]+)",
        r"DESPACHO\s+NUMERO\s*:\s*([A-Z0-9]+)",
        r"NRO\s+DE\s+PEDIDO\s*[\s:]*([A-Z0-9\-]+)",
        r"(?:NRO\.?|NUMERO|NÚMERO|N°)\s*DESPACHO\s*[:\s]*([A-Z0-9\-]+)",
        r"DESPACHO\s*(?:NRO\.?|N°)?\s*[:\s]*([A-Z0-9\-]+)",
        r"(?:DESPACHO\s+)?(\d{4,}[A-Z0-9\-]*)",
    ]:
        m = re.search(pattern, text_upper, re.IGNORECASE)
        if m:
            nro_despacho = m.group(1).strip()
            if len(nro_despacho) >= 6:  # Evitar capturar cosas como "1/9"
                break
            nro_despacho = None
    if not nro_despacho:
        nro_despacho = None
    # Chasis: "NRO CHASIS = NCP100-0058263" o fragmentado
    chunks = re.split(r"NRO\s+CHASIS\s*[=:]?\s*", text_upper)
    if len(chunks) > 1:
        for chunk in chunks[1:]:
            # Cortar antes del siguiente campo común para no arrastrar "NROMOTOR", etc.
            area = re.split(r"NRO\s+MOTOR|MOTOR|MARCA|MODELO|ANIO|AÑO|RUA", chunk)[0]
            area = area[:50] # Suficiente para el chasis
            clean = re.sub(r"[\s\n\r]+", "", area)
            m = re.search(r"([A-Z0-9\-]{8,22})", clean)
            if m:
                val = m.group(1)
                # Limpiar ruidos comunes al final
                for noise in ["NRO", "MOTOR", "ANIO", "MARCA"]:
                    if val.endswith(noise):
                        val = val[:-len(noise)]
                if val not in chasis_list:
                    chasis_list.append(val)
    
    # Fallback: palabras alfanuméricas tipo VIN/chasis (8-22 caracteres, puede tener guión)
    if not chasis_list:
        chasis_candidates = re.findall(r"\b([A-Z0-9\-]{8,22})\b", text_upper)
        seen = set(chasis_list)
        for c in chasis_candidates:
            # Debe tener al menos una letra o un guión para no ser solo un número cualquiera
            if re.search(r"[A-Z\-]", c) and c not in seen:
                # Evitar palabras comunes que parecen chasis
                if c not in ["FABRICACION", "CERTIFICADO"]:
                    seen.add(c)
                    chasis_list.append(c)
    return (nro_despacho, chasis_list)


def _parse_certificados_text(text: str) -> dict:
    """Extrae mapeo chasis -> número de certificado con lógica de proximidad robusta."""
    import re
    result = {}
    text_upper = text.upper()
    
    # 1. Encontrar todos los chasis y sus posiciones
    # Usamos un split más limpieza para encontrar chasis probables
    chasis_matches = []
    chunks = re.finditer(r"NRO\s*CHASIS\s*[:=\s]*", text_upper)
    for m_label in chunks:
        pos_start = m_label.end()
        # Escaneamos un área adelante para encontrar el valor
        area = text_upper[pos_start : pos_start + 120]
        # Cortamos antes de etiquetas ruidosas
        area_clean_parts = re.split(r"NRO\s+MOTOR|MOTOR|MARCA|MODELO|ANIO|AÑO|RUA", area)
        area_to_regex = area_clean_parts[0]
        
        # Regex para el chasis
        m_val = re.search(r"([A-Z0-9\-]{8,22})", re.sub(r"[\s\n\r]+", "", area_to_regex))
        if m_val:
            val = m_val.group(1)
            # Limpieza básica
            for noise in ["NRO", "MOTOR", "ANIO", "MARCA"]:
                if val.endswith(noise): val = val[:-len(noise)]
            chasis_matches.append({"val": val, "pos": pos_start})

    # 2. Encontrar todos los certificados AUT-
    cert_matches = []
    # Pattern flexible que permite ruidos entre partes
    cert_regex = re.compile(r"AUT\-[\s\n\r]*[A-Z0-9\-]{10,25}[\s\n\r]*\-?[\s\n\r]*[A-Z0-9]{1,5}")
    for m_cert in cert_regex.finditer(text_upper):
        clean_val = re.sub(r"[\s\n\r]+", "", m_cert.group()).strip("-")
        cert_matches.append({"val": clean_val, "pos": m_cert.start()})

    # 3. Emparejar por proximidad (el certificado suele estar arriba o abajo del chasis en el mismo bloque)
    for ch_match in chasis_matches:
        best_cert = None
        min_dist = 999999
        for c_match in cert_matches:
            dist = abs(c_match["pos"] - ch_match["pos"])
            if dist < min_dist:
                min_dist = dist
                best_cert = c_match["val"]
        
        if best_cert and min_dist < 4000:
            result[ch_match["val"]] = best_cert

    return result



@router.get("/documentos-importacion", response_model=List[DocumentoImportacionResponse])
async def list_documentos_importacion(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Lista todos los documentos de importación."""
    query = select(DocumentoImportacion).options(selectinload(DocumentoImportacion.productos))
    id_playa = current_user.get("id_playa")
    if id_playa is not None:
        query = query.where(DocumentoImportacion.id_playa == id_playa)
    result = await session.execute(query.order_by(DocumentoImportacion.fecha_registro.desc()))
    return result.scalars().all()


@router.get("/documentos-importacion/{nro_despacho}", response_model=DocumentoImportacionResponse)
async def get_documento_importacion(
    nro_despacho: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    id_playa = current_user.get("id_playa")
    query = select(DocumentoImportacion).where(DocumentoImportacion.nro_despacho == nro_despacho)
    if id_playa is not None:
        query = query.where(DocumentoImportacion.id_playa == id_playa)
    res = await session.execute(query)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento de importación no encontrado")
    return doc

@router.get("/documentos-importacion/{nro_despacho}/pdf-despacho")
async def get_pdf_despacho(
    nro_despacho: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Retorna el PDF del despacho."""
    id_playa = current_user.get("id_playa")
    query = select(DocumentoImportacion).where(DocumentoImportacion.nro_despacho == nro_despacho)
    if id_playa is not None:
        query = query.where(DocumentoImportacion.id_playa == id_playa)
    res = await session.execute(query)
    doc = res.scalar_one_or_none()
    
    if not doc or not doc.pdf_despacho:
        raise HTTPException(status_code=404, detail="PDF de despacho no encontrado")
    return Response(content=doc.pdf_despacho, media_type="application/pdf")

@router.get("/documentos-importacion/{nro_despacho}/pdf-certificados")
async def get_pdf_certificados(
    nro_despacho: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Retorna el PDF de los certificados."""
    id_playa = current_user.get("id_playa")
    query = select(DocumentoImportacion).where(DocumentoImportacion.nro_despacho == nro_despacho)
    if id_playa is not None:
        query = query.where(DocumentoImportacion.id_playa == id_playa)
    res = await session.execute(query)
    doc = res.scalar_one_or_none()
    
    if not doc or not doc.pdf_certificados:
        raise HTTPException(status_code=404, detail="PDF de certificados no encontrado")
    return Response(content=doc.pdf_certificados, media_type="application/pdf")


@router.post("/documentos-importacion/analizar", response_model=AnalizarDocumentosResponse)
async def analizar_documentos_importacion(
    file_despacho: UploadFile = File(...),
    file_certificados: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Analiza los dos PDFs y extrae nro despacho, chasis y certificados. Indica si el despacho ya existe."""
    if not file_despacho.filename or not file_despacho.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo de despacho debe ser un PDF.")
    if not file_certificados.filename or not file_certificados.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo de certificados debe ser un PDF.")
    despacho_bytes = await file_despacho.read()
    certificados_bytes = await file_certificados.read()
    text_despacho = _extract_text_from_pdf(despacho_bytes)
    text_cert = _extract_text_from_pdf(certificados_bytes)
    # Intentar extracción con LLM si está configurado (más flexible que regex)
    llm_data = _extract_with_llm(text_despacho, text_cert)
    if llm_data:
        nro_despacho = llm_data.get("nro_despacho") or None
        if nro_despacho and isinstance(nro_despacho, str):
            nro_despacho = nro_despacho.strip() or None
        chasis_despacho = list(llm_data.get("chasis_despacho") or [])
        certificados_por_chasis = llm_data.get("certificados_por_chasis") or {}
        # Normalizar claves a mayúsculas
        certificados_por_chasis = {str(k).strip().upper(): str(v).strip() for k, v in certificados_por_chasis.items() if k}
    else:
        nro_despacho, chasis_despacho = _parse_despacho_text(text_despacho)
        certificados_por_chasis = _parse_certificados_text(text_cert)
    # Normalizar chasis (mayúsculas, strip, y quitar ruidos comunes)
    def clean_chasis(c):
        if not c: return ""
        c = str(c).strip().upper()
        # Eliminar ruidos pegados al final (comunes en OCR)
        for noise in ["NROMOTOR", "NRO MOTOR", "MOTOR", "ANIO", "MARCA", "MODELO", "RUA"]:
            if c.endswith(noise):
                c = c[:-len(noise)]
        return c.strip()

    chasis_despacho = [clean_chasis(c) for c in chasis_despacho if c]
    
    # También normalizar las claves del diccionario de certificados
    certificados_por_chasis = {clean_chasis(k): v for k, v in certificados_por_chasis.items() if k}

    # ¿Ya existe el despacho?
    id_playa = current_user.get("id_playa")
    query_exist = select(DocumentoImportacion).where(DocumentoImportacion.nro_despacho == (nro_despacho or ""))
    if id_playa is not None:
        query_exist = query_exist.where(DocumentoImportacion.id_playa == id_playa)
    existing = await session.execute(query_exist)
    ya_existe = existing.scalar_one_or_none() is not None
    
    # Vehículos en playa que coinciden con chasis del despacho (flexibilidad con guiones)
    vehiculos_en_playa = []
    if chasis_despacho:
        # Generar variantes sin guiones ni espacios para comparar también
        chasis_clean = [c.replace("-", "").replace(" ", "").upper() for c in chasis_despacho]
        
        query_veh = (
            select(Producto).where(
                or_(
                    func.upper(func.trim(Producto.chasis)).in_([c.upper() for c in chasis_despacho]),
                    func.replace(func.replace(func.upper(func.trim(Producto.chasis)), '-', ''), ' ', '').in_(chasis_clean)
                ),
                Producto.activo == True
            )
        )
        if id_playa is not None:
            query_veh = query_veh.where(Producto.id_playa == id_playa)
            
        result = await session.execute(query_veh)
        for p in result.scalars().all():
            chasis_norm = clean_chasis(p.chasis)
            # Buscar en certificados_por_chasis usando el chasis limpio del producto o sus variantes
            nro_cert = certificados_por_chasis.get(chasis_norm)
            if not nro_cert:
                # Probar versión sin guiones si no hubo coincidencia exacta
                ch_simple = chasis_norm.replace("-", "").replace(" ", "")
                for k, v in certificados_por_chasis.items():
                    if k.replace("-", "").replace(" ", "") == ch_simple:
                        nro_cert = v
                        break

            vehiculos_en_playa.append({
                "id_producto": p.id_producto,
                "chasis": p.chasis,
                "marca": p.marca,
                "modelo": p.modelo,
                "nro_cert_nac": nro_cert or p.nro_cert_nac,
            })
    return AnalizarDocumentosResponse(
        nro_despacho=nro_despacho,
        chasis_despacho=chasis_despacho,
        certificados_por_chasis=certificados_por_chasis or {},
        ya_existe=ya_existe,
        vehiculos_en_playa=vehiculos_en_playa,
    )


class CrearDocumentoImportacionBody(BaseModel):
    vinculaciones: List[VinculacionProducto]


@router.post("/documentos-importacion", response_model=DocumentoImportacionResponse)
async def create_documento_importacion(
    file_despacho: UploadFile = File(...),
    file_certificados: UploadFile = File(...),
    nro_despacho: str = File(...),
    vinculaciones: str = File(...),  # JSON string: [{"chasis":"XXX","nro_cert_nac":"YYY"}]
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Crea el registro de documento de importación y vincula productos (nro_despacho y nro_cert_nac)."""
    import json
    if not nro_despacho or not nro_despacho.strip():
        raise HTTPException(status_code=400, detail="Falta el número de despacho.")
    nro_despacho = nro_despacho.strip()
    # Verificar que no exista
    existing = await session.execute(
        select(DocumentoImportacion).where(DocumentoImportacion.nro_despacho == nro_despacho)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"El número de despacho '{nro_despacho}' ya está registrado.")
    try:
        vinculaciones_list = json.loads(vinculaciones)
    except Exception:
        raise HTTPException(status_code=400, detail="vinculaciones debe ser un JSON válido (lista de {chasis, nro_cert_nac}).")
    if not isinstance(vinculaciones_list, list):
        raise HTTPException(status_code=400, detail="vinculaciones debe ser una lista.")
    despacho_bytes = await file_despacho.read()
    certificados_bytes = await file_certificados.read()
    id_playa = current_user.get("id_playa")
    doc = DocumentoImportacion(
        nro_despacho=nro_despacho,
        pdf_despacho=despacho_bytes,
        pdf_certificados=certificados_bytes,
        id_playa=id_playa
    )
    session.add(doc)
    await session.flush()
    for v in vinculaciones_list:
        chasis = (v.get("chasis") or "").strip()
        nro_cert = (v.get("nro_cert_nac") or "").strip() or None
        if not chasis:
            continue
        # Búsqueda flexible de chasis (ignorando guiones y espacios)
        chasis_norm = chasis.upper().replace("-", "").replace(" ", "")
        
        query_prod = (
            select(Producto).where(
                or_(
                    func.upper(func.trim(Producto.chasis)) == chasis.upper(),
                    func.replace(func.replace(func.upper(func.trim(Producto.chasis)), '-', ''), ' ', '') == chasis_norm
                ),
                Producto.activo == True
            )
        )
        if id_playa is not None:
            query_prod = query_prod.where(Producto.id_playa == id_playa)
            
        res = await session.execute(query_prod)
        prod = res.scalar_one_or_none()
        if prod:
            prod.nro_despacho = nro_despacho
            prod.nro_cert_nac = nro_cert
    await session.commit()
    await session.refresh(doc)
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="create",
        table="documentos_importacion",
        record_id=None,
        new_data={"nro_despacho": nro_despacho, "vinculaciones": len(vinculaciones_list)},
        details=f"Documento de importación creado: {nro_despacho}"
    )
    return doc

# ===== ENDPOINT DE DIAGNÓSTICO =====
@router.get("/diagnostico/pagares-inconsistentes")
async def diagnosticar_pagares_inconsistentes(
    session: AsyncSession = Depends(get_session)
):
    """
    Encuentra pagarés con saldo_pendiente = 0 pero sin pagos registrados.
    Esto indica datos inconsistentes que necesitan corrección.
    """
    # Buscar pagarés con saldo 0 o NULL
    query = (
        select(Pagare)
        .options(selectinload(Pagare.pagos), joinedload(Pagare.estado_rel))
        .where(
            or_(
                Pagare.saldo_pendiente == 0,
                Pagare.saldo_pendiente == None
            )
        )
    )
    
    result = await session.execute(query)
    pagares = result.scalars().all()
    
    inconsistentes = []
    for p in pagares:
        # Si no tiene pagos pero el saldo es 0, es inconsistente
        if (not p.pagos or len(p.pagos) == 0) and (p.saldo_pendiente == 0 or p.saldo_pendiente is None):
            inconsistentes.append({
                "id_pagare": p.id_pagare,
                "id_venta": p.id_venta,
                "numero_pagare": p.numero_pagare,
                "numero_cuota": p.numero_cuota,
                "monto_cuota": float(p.monto_cuota) if p.monto_cuota else 0,
                "saldo_pendiente": float(p.saldo_pendiente) if p.saldo_pendiente else 0,
                "estado": p.estado_rel.nombre if p.estado_rel else "DESCONOCIDO",
                "cancelado": p.cancelado,
                "cantidad_pagos": 0,
                "problema": "Saldo en 0 pero sin pagos registrados"
            })
    
    return {
        "total_inconsistentes": len(inconsistentes),
        "pagares": inconsistentes
    }

@router.post("/diagnostico/corregir-pagare/{id_pagare}")
async def corregir_pagare_inconsistente(
    id_pagare: int,
    accion: str,  # "restaurar_saldo" o "marcar_pagado"
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Corrige un pagaré inconsistente.
    - restaurar_saldo: Restaura el saldo_pendiente al monto_cuota original
    - marcar_pagado: Marca el pagaré como PAGADO y cancelado=True
    """
    res = await session.execute(
        select(Pagare)
        .options(joinedload(Pagare.estado_rel))
        .where(Pagare.id_pagare == id_pagare)
    )
    pagare = res.scalar_one_or_none()
    
    if not pagare:
        raise HTTPException(status_code=404, detail="Pagaré no encontrado")
    
    # Obtener estados
    res_st = await session.execute(select(Estado))
    all_states = {s.nombre: s.id_estado for s in res_st.scalars().all()}
    
    old_data = {
        "saldo_pendiente": float(pagare.saldo_pendiente) if pagare.saldo_pendiente else None,
        "id_estado": pagare.id_estado,
        "cancelado": pagare.cancelado
    }
    
    if accion == "restaurar_saldo":
        # Restaurar el saldo al monto original
        pagare.saldo_pendiente = pagare.monto_cuota
        pagare.id_estado = all_states.get('PENDIENTE')
        pagare.cancelado = False
        mensaje = f"Saldo restaurado a Gs. {float(pagare.monto_cuota):,.0f}"
        
    elif accion == "marcar_pagado":
        # Marcar como pagado definitivamente
        pagare.saldo_pendiente = 0
        pagare.id_estado = all_states.get('PAGADO')
        pagare.cancelado = True
        mensaje = "Pagaré marcado como PAGADO y cancelado"

    elif accion == "desmarcar_cancelado":
        # Quitar el flag de cancelado para permitir más pagos
        pagare.cancelado = False
        mensaje = "Pagaré desmarcado como cancelado. Ahora permite agregar más pagos."

    elif accion == "recalcular_estado":
        # Recalcular estado basado en el saldo real
        if pagare.saldo_pendiente <= 0:
            pagare.id_estado = all_states.get('PAGADO')
            # pagare.cancelado = True # Opcional, mejor dejar que el usuario decida
        elif pagare.saldo_pendiente < pagare.monto_cuota:
            pagare.id_estado = all_states.get('PARCIAL')
        else:
            # Verificar si está vencido
            from datetime import date
            if pagare.fecha_vencimiento < date.today():
                pagare.id_estado = all_states.get('VENCIDO')
            else:
                pagare.id_estado = all_states.get('PENDIENTE')
        mensaje = f"Estado recalculado a: {pagare.estado_rel.nombre if pagare.estado_rel else 'OK'}"
        
    else:
        raise HTTPException(status_code=400, detail="Acción no válida. Use 'restaurar_saldo', 'marcar_pagado', 'desmarcar_cancelado' o 'recalcular_estado'")
    
    await session.commit()
    await session.refresh(pagare)
    
    # Auditoría
    await log_audit_action(
        session=session,
        username=current_user["sub"],
        user_id=current_user["user_id"],
        action="update",
        table="pagares",
        record_id=id_pagare,
        previous_data=old_data,
        new_data={
            "saldo_pendiente": float(pagare.saldo_pendiente) if pagare.saldo_pendiente else None,
            "id_estado": pagare.id_estado,
            "cancelado": pagare.cancelado
        },
        details=f"Corrección de pagaré inconsistente: {mensaje}"
    )
    
    return {
        "mensaje": mensaje,
        "pagare": {
            "id_pagare": pagare.id_pagare,
            "saldo_pendiente": float(pagare.saldo_pendiente) if pagare.saldo_pendiente else 0,
            "estado": pagare.estado_rel.nombre if pagare.estado_rel else "DESCONOCIDO",
            "cancelado": pagare.cancelado
        }
    }

@router.get("/diagnostico/triggers-info")
async def diagnosticar_triggers(
    session: AsyncSession = Depends(get_session)
):
    """
    Diagnóstico de triggers y estructura de la tabla pagares.
    Verifica si hay triggers activos que puedan estar causando conflictos.
    """
    diagnostico = {}
    
    # 1. Verificar triggers en la tabla pagares
    query_triggers = text("""
        SELECT 
            t.tgname AS trigger_name,
            p.proname AS function_name,
            CASE t.tgenabled
                WHEN 'O' THEN 'ENABLED'
                WHEN 'D' THEN 'DISABLED'
                WHEN 'R' THEN 'REPLICA'
                WHEN 'A' THEN 'ALWAYS'
            END AS status
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'playa'
          AND c.relname = 'pagares'
          AND NOT t.tgisinternal
    """)
    
    result = await session.execute(query_triggers)
    triggers_pagares = [dict(row._mapping) for row in result]
    diagnostico["triggers_en_pagares"] = triggers_pagares
    
    # 2. Verificar triggers en la tabla pagos
    query_triggers_pagos = text("""
        SELECT 
            t.tgname AS trigger_name,
            p.proname AS function_name,
            CASE t.tgenabled
                WHEN 'O' THEN 'ENABLED'
                WHEN 'D' THEN 'DISABLED'
                WHEN 'R' THEN 'REPLICA'
                WHEN 'A' THEN 'ALWAYS'
            END AS status
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'playa'
          AND c.relname = 'pagos'
          AND NOT t.tgisinternal
    """)
    
    result = await session.execute(query_triggers_pagos)
    triggers_pagos = [dict(row._mapping) for row in result]
    diagnostico["triggers_en_pagos"] = triggers_pagos
    
    # 3. Verificar estructura de la tabla pagares
    query_columns = text("""
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = 'playa'
          AND table_name = 'pagares'
          AND column_name IN ('estado', 'id_estado', 'cancelado', 'saldo_pendiente')
        ORDER BY ordinal_position
    """)
    
    result = await session.execute(query_columns)
    columns = [dict(row._mapping) for row in result]
    diagnostico["columnas_pagares"] = columns
    
    # 4. Verificar si existe la función actualizar_estado_pagare
    query_function = text("""
        SELECT EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'playa'
              AND p.proname = 'actualizar_estado_pagare'
        ) AS function_exists
    """)
    
    result = await session.execute(query_function)
    function_exists = result.scalar()
    diagnostico["funcion_actualizar_estado_existe"] = function_exists
    
    # 5. Estadísticas de pagarés inconsistentes
    query_stats = text("""
        SELECT 
            COUNT(*) AS total_inconsistentes,
            COUNT(CASE WHEN pg.id_estado IS NOT NULL THEN 1 END) AS con_id_estado,
            COUNT(CASE WHEN pg.cancelado = TRUE THEN 1 END) AS marcados_cancelado
        FROM playa.pagares pg
        LEFT JOIN playa.pagos p ON pg.id_pagare = p.id_pagare
        WHERE (pg.saldo_pendiente = 0 OR pg.saldo_pendiente IS NULL)
          AND p.id_pago IS NULL
    """)
    
    result = await session.execute(query_stats)
    stats = dict(result.mappings().first() or {})
    diagnostico["estadisticas_inconsistentes"] = stats
    
    # 6. Verificar si hay campo "estado" (VARCHAR) antiguo
    query_old_estado = text("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'playa'
              AND table_name = 'pagares'
              AND column_name = 'estado'
              AND data_type = 'character varying'
        ) AS old_estado_exists
    """)
    
    result = await session.execute(query_old_estado)
    old_estado_exists = result.scalar()
    diagnostico["campo_estado_antiguo_existe"] = old_estado_exists
    
    # Análisis y recomendaciones
    recomendaciones = []
    
    if old_estado_exists:
        recomendaciones.append({
            "nivel": "ADVERTENCIA",
            "mensaje": "Existe el campo 'estado' (VARCHAR) antiguo. Esto puede causar conflictos con 'id_estado'.",
            "accion": "Considerar eliminar el campo 'estado' antiguo si ya no se usa."
        })
    
    if function_exists:
        recomendaciones.append({
            "nivel": "INFO",
            "mensaje": "La función 'actualizar_estado_pagare' existe en la base de datos.",
            "accion": "Verificar si está siendo usada por algún trigger activo."
        })
    
    if len(triggers_pagos) > 0:
        trigger_names = [t["trigger_name"] for t in triggers_pagos]
        if "trg_actualizar_estado_pagare" in trigger_names:
            recomendaciones.append({
                "nivel": "CRÍTICO",
                "mensaje": "El trigger 'trg_actualizar_estado_pagare' está activo y puede estar actualizando el campo 'estado' antiguo.",
                "accion": "Este trigger debe ser modificado para usar 'id_estado' en lugar de 'estado'."
            })
    
    if stats.get("total_inconsistentes", 0) > 0:
        recomendaciones.append({
            "nivel": "ADVERTENCIA",
            "mensaje": f"Se encontraron {stats['total_inconsistentes']} pagarés con saldo 0 pero sin pagos registrados.",
            "accion": "Usar el endpoint /diagnostico/pagares-inconsistentes para corregirlos."
        })
    
    diagnostico["recomendaciones"] = recomendaciones
    
    return diagnostico

@router.post("/diagnostico/eliminar-trigger-antiguo")
async def eliminar_trigger_antiguo(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Elimina el trigger antiguo 'trg_actualizar_estado_pagare' que usa el campo 'estado' obsoleto.
    Este trigger ya no es necesario porque la lógica de actualización de estados
    se maneja desde el código de la aplicación.
    """
    if current_user["rol"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para esta operación")
    
    try:
        # 1. Eliminar el trigger
        await session.execute(text("""
            DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON playa.pagos;
        """))
        
        # 2. Opcionalmente, eliminar la función si ya no se usa
        # (La dejamos por si acaso, pero se puede eliminar después)
        # await session.execute(text("""
        #     DROP FUNCTION IF EXISTS playa.actualizar_estado_pagare();
        # """))
        
        await session.commit()
        
        # Auditoría
        await log_audit_action(
            session=session,
            username=current_user["sub"],
            user_id=current_user["user_id"],
            action="delete",
            table="pg_trigger",
            record_id=None,
            previous_data={"trigger_name": "trg_actualizar_estado_pagare"},
            new_data=None,
            details="Trigger antiguo eliminado. La lógica de estados ahora se maneja desde la aplicación."
        )
        
        return {
            "success": True,
            "mensaje": "Trigger 'trg_actualizar_estado_pagare' eliminado exitosamente",
            "detalles": "La actualización de estados de pagarés ahora se maneja completamente desde el código de la aplicación, lo que proporciona mejor control, auditoría y mantenibilidad."
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar trigger: {str(e)}")

@router.post("/diagnostico/actualizar-trigger-estado")
async def actualizar_trigger_estado(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Actualiza el trigger 'trg_actualizar_estado_pagare' para que use 'id_estado' 
    en lugar del campo 'estado' obsoleto.
    
    NOTA: Es preferible eliminar el trigger y manejar todo desde el código.
    """
    if current_user["rol"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para esta operación")
    
    try:
        # ELIMINACIÓN DEFINITIVA DEL TRIGGER
        # La lógica ahora se maneja 100% en el código de la aplicación (create_pago)
        await session.execute(text("""
            DROP TRIGGER IF EXISTS trg_actualizar_estado_pagare ON playa.pagos;
            DROP FUNCTION IF EXISTS playa.actualizar_estado_pagare() CASCADE;
        """))
        
        await session.commit()
        
        # Auditoría
        await log_audit_action(
            session=session,
            username=current_user["sub"],
            user_id=current_user["user_id"],
            action="delete",
            table="pg_trigger",
            record_id=None,
            previous_data={"trigger_name": "trg_actualizar_estado_pagare"},
            new_data=None,
            details="Trigger eliminado permanentemente. La lógica de estados se maneja desde la aplicación."
        )
        
        return {
            "success": True,
            "mensaje": "Trigger eliminado exitosamente",
            "detalles": "El trigger 'trg_actualizar_estado_pagare' ha sido eliminado. La lógica de actualización de estados ahora es controlada totalmente por el código de la aplicación."
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar trigger: {str(e)}")
