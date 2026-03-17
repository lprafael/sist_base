from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io
import csv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime

from database import get_session
from models import (
    FinanciamientoEgreso, 
    FinanciamientoIngreso, 
    FinanciamientoCumplimiento, 
    Candidato, 
    Referente,
    Usuario
)
from schemas import (
    FinanciamientoEgresoCreate, 
    FinanciamientoEgresoResponse,
    FinanciamientoIngresoCreate, 
    FinanciamientoIngresoResponse,
    FinanciamientoCumplimientoResponse,
    FinanciamientoCumplimientoUpdate,
    FinanciamientoResumen
)
from security import get_current_user

router = APIRouter(prefix="/api/financiamiento", tags=["Financiamiento Político"])

# --- EGRESOS ---

@router.get("/egresos/{candidato_id}", response_model=List[FinanciamientoEgresoResponse])
async def get_egresos(
    candidato_id: int,
    tipo: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(FinanciamientoEgreso).where(FinanciamientoEgreso.id_candidato == candidato_id)
    if tipo:
        stmt = stmt.where(FinanciamientoEgreso.tipo_financiamiento == tipo)
    
    result = await session.execute(stmt.order_by(FinanciamientoEgreso.fecha.desc()))
    return result.scalars().all()

@router.post("/egresos", response_model=FinanciamientoEgresoResponse)
async def create_egreso(
    data: FinanciamientoEgresoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    nuevo_egreso = FinanciamientoEgreso(
        **data.dict(),
        creado_por=current_user["user_id"]
    )
    session.add(nuevo_egreso)
    await session.commit()
    await session.refresh(nuevo_egreso)
    return nuevo_egreso

@router.delete("/egresos/{id}")
async def delete_egreso(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(FinanciamientoEgreso).where(FinanciamientoEgreso.id == id)
    res = await session.execute(stmt)
    egreso = res.scalar_one_or_none()
    
    if not egreso:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    await session.delete(egreso)
    await session.commit()
    return {"message": "Gasto eliminado correctamente"}

# --- INGRESOS ---

@router.get("/ingresos/{candidato_id}", response_model=List[FinanciamientoIngresoResponse])
async def get_ingresos(
    candidato_id: int,
    tipo: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(FinanciamientoIngreso).where(FinanciamientoIngreso.id_candidato == candidato_id)
    if tipo:
        stmt = stmt.where(FinanciamientoIngreso.tipo_financiamiento == tipo)
    
    result = await session.execute(stmt.order_by(FinanciamientoIngreso.fecha.desc()))
    return result.scalars().all()

@router.post("/ingresos", response_model=FinanciamientoIngresoResponse)
async def create_ingreso(
    data: FinanciamientoIngresoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    nuevo_ingreso = FinanciamientoIngreso(
        **data.dict(),
        creado_por=current_user["user_id"]
    )
    session.add(nuevo_ingreso)
    await session.commit()
    await session.refresh(nuevo_ingreso)
    return nuevo_ingreso

@router.delete("/ingresos/{id}")
async def delete_ingreso(
    id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(FinanciamientoIngreso).where(FinanciamientoIngreso.id == id)
    res = await session.execute(stmt)
    ingreso = res.scalar_one_or_none()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    await session.delete(ingreso)
    await session.commit()
    return {"message": "Ingreso eliminado correctamente"}

# --- CUMPLIMIENTO / CHECKLIST ---

REQUISITOS_APORTE = [
    "Nota de Solicitud (Presidencia TSJE)",
    "Balance General (Firmado)",
    "Cuadro de Ingresos y Egresos",
    "Informe Anexo sobre Contribuciones",
    "Informe Pormenorizado (Art. 70 - 30% Capacitación)",
    "Reconocimiento Legal (Copia autenticada)",
    "Estatutos (Copia autenticada)",
    "Autoridades (Documentos de elección)",
    "Autorización de Cobro",
    "Documentos de Identidad (Presidente y Tesorero)",
    "Antecedentes Judiciales y Policiales"
]

REQUISITOS_SUBSIDIO = [
    "Anexo 1: Nota de Solicitud de Pago del Subsidio",
    "Anexo 4: Declaración Jurada de Ingresos y Gastos (DJIG)",
    "Informe Técnico de Ingresos y Gastos (Generado por SINAFIP)",
    "Informe Anexo sobre Contribuciones y Donaciones",
    "Cuenta Única Bancaria (Extractos de Apertura y Cierre)",
    "Designación de Administrador de Campaña",
    "Comprobantes Originales (Facturas Legales Foliadas)",
    "Copia Autenticada de Cédula (Candidato y Administrador)",
    "Certificados de Antecedentes Judiciales/Policiales",
    "Certificado de Cumplimiento Tributario (CCT)"
]

@router.get("/cumplimiento/{candidato_id}", response_model=List[FinanciamientoCumplimientoResponse])
async def get_cumplimiento(
    candidato_id: int,
    tipo: str, # "Aporte Estatal" o "Subsidio Electoral"
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    # Primero verificar si existen para este candidato y tipo
    stmt = select(FinanciamientoCumplimiento).where(
        and_(
            FinanciamientoCumplimiento.id_candidato == candidato_id,
            FinanciamientoCumplimiento.tipo_financiamiento == tipo
        )
    )
    result = await session.execute(stmt)
    items = result.scalars().all()
    
    if not items:
        # Inicializar si no existen
        requisitos = REQUISITOS_APORTE if tipo == "Aporte Estatal" else REQUISITOS_SUBSIDIO
        for req in requisitos:
            nuevo = FinanciamientoCumplimiento(
                id_candidato=candidato_id,
                tipo_financiamiento=tipo,
                requisito_nombre=req,
                completado=False
            )
            session.add(nuevo)
        await session.commit()
        
        # Volver a consultar
        result = await session.execute(stmt)
        items = result.scalars().all()
        
    return items

@router.put("/cumplimiento/{id}", response_model=FinanciamientoCumplimientoResponse)
async def update_cumplimiento(
    id: int,
    data: FinanciamientoCumplimientoUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(FinanciamientoCumplimiento).where(FinanciamientoCumplimiento.id == id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Requisito no encontrado")
    
    if data.completado is not None:
        item.completado = data.completado
        if data.completado:
            item.fecha_cumplimiento = datetime.now()
        else:
            item.fecha_cumplimiento = None
            
    if data.observaciones is not None: item.observaciones = data.observaciones
    if data.archivo_url is not None: item.archivo_url = data.archivo_url
    
    await session.commit()
    await session.refresh(item)
    return item

# --- RESUMEN ---

@router.get("/resumen/{candidato_id}", response_model=FinanciamientoResumen)
async def get_resumen(
    candidato_id: int,
    tipo: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    # Total Ingresos
    stmt_ing = select(func.sum(FinanciamientoIngreso.monto)).where(
        and_(
            FinanciamientoIngreso.id_candidato == candidato_id,
            FinanciamientoIngreso.tipo_financiamiento == tipo
        )
    )
    res_ing = await session.execute(stmt_ing)
    total_ing = res_ing.scalar() or 0.0
    
    # Total Egresos
    stmt_egr = select(func.sum(FinanciamientoEgreso.monto)).where(
        and_(
            FinanciamientoEgreso.id_candidato == candidato_id,
            FinanciamientoEgreso.tipo_financiamiento == tipo
        )
    )
    res_egr = await session.execute(stmt_egr)
    total_egr = res_egr.scalar() or 0.0
    
    # Porcentaje Cumplimiento
    stmt_cum = select(func.count(FinanciamientoCumplimiento.id)).where(
        and_(
            FinanciamientoCumplimiento.id_candidato == candidato_id,
            FinanciamientoCumplimiento.tipo_financiamiento == tipo
        )
    )
    total_req = (await session.execute(stmt_cum)).scalar() or 1 # evitar div por cero
    
    stmt_done = select(func.count(FinanciamientoCumplimiento.id)).where(
        and_(
            FinanciamientoCumplimiento.id_candidato == candidato_id,
            FinanciamientoCumplimiento.tipo_financiamiento == tipo,
            FinanciamientoCumplimiento.completado == True
        )
    )
    done_req = (await session.execute(stmt_done)).scalar() or 0
    
    porcentaje = (done_req / total_req) * 100
    
    return {
        "total_ingresos": total_ing,
        "total_egresos": total_egr,
        "balance": total_ing - total_egr,
        "cumplimiento_porcentaje": porcentaje
    }

# --- CANDIDATOS ---
# Helper para obtener el candidato_id del usuario actual

@router.get("/me/candidato")
async def get_my_candidate_id(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Retorna el ID de candidato vinculado al usuario actual"""
    user_id = current_user["user_id"]
    
    # 1. Intentar encontrar vínculo explícito en Referentes
    stmt = select(Referente.id_candidato).where(Referente.id_usuario_sistema == user_id)
    res = await session.execute(stmt)
    candidato_id = res.scalar_one_or_none()
    
    if candidato_id:
        return {"candidato_id": candidato_id}

    # 2. Si no hay vínculo, pero es un Intendente o Concejal, buscar/crear su propia candidatura
    user_res = await session.execute(select(Usuario).where(Usuario.id == user_id))
    user = user_res.scalar_one_or_none()
    
    if user and user.rol in ["intendente", "concejal"]:
        # Buscar candidato por nombre o municipio si es intendente
        # Usamos lower() y comparamos nombres simplificados para mayor robustez
        nombre_clean = user.nombre_completo.lower().strip()
        
        cand_stmt = select(Candidato).where(
            or_(
                func.lower(Candidato.nombre_candidato) == nombre_clean,
                and_(
                    func.lower(Candidato.municipio) == user.username.lower(), 
                    func.lower(Candidato.nombre_candidato) == nombre_clean
                )
            )
        )
        cand_res = await session.execute(cand_stmt)
        candidato = cand_res.scalar_one_or_none()
        
        if candidato:
            return {"candidato_id": candidato.id, "nombre": candidato.nombre_candidato}
        
        # Intentemos por municipio (si coincide con el distrito del usuario)
        from models import RefDistrito
        dist_res = await session.execute(select(RefDistrito.descripcion).where(RefDistrito.id == user.distrito_id))
        dist_name = dist_res.scalar()
        
        if dist_name:
            cand_stmt_muni = select(Candidato).where(func.lower(Candidato.municipio) == dist_name.lower())
            res_muni = await session.execute(cand_stmt_muni)
            cand_muni = res_muni.scalar_one_or_none()
            if cand_muni:
                return {"candidato_id": cand_muni.id, "nombre": cand_muni.nombre_candidato}

    raise HTTPException(status_code=404, detail="No se encontró un candidato vinculado. Asegúrate de estar asignado a una candidatura.")

# --- EXPORTACIÓN ---

@router.get("/export/sinafip/{candidato_id}")
async def export_sinafip(
    candidato_id: int,
    tipo: str, # "Aporte Estatal" o "Subsidio Electoral"
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Genera un archivo CSV listo para cargar en SINAFIP"""
    
    # 1. Obtener Ingresos
    stmt_ing = select(FinanciamientoIngreso).where(
        and_(
            FinanciamientoIngreso.id_candidato == candidato_id,
            FinanciamientoIngreso.tipo_financiamiento == tipo
        )
    )
    ingresos = (await session.execute(stmt_ing)).scalars().all()
    
    # 2. Obtener Egresos
    stmt_egr = select(FinanciamientoEgreso).where(
        and_(
            FinanciamientoEgreso.id_candidato == candidato_id,
            FinanciamientoEgreso.tipo_financiamiento == tipo
        )
    )
    egresos = (await session.execute(stmt_egr)).scalars().all()
    
    # 3. Preparar CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=',', quoting=csv.QUOTE_MINIMAL)
    
    # Header según investigación
    writer.writerow([
        "FECHA", 
        "TIPO DE COMPROBANTE", 
        "TIMBRADO", 
        "NUMERO DE COMPROBANTE", 
        "RUC / CI", 
        "NOMBRE O RAZON SOCIAL", 
        "MONTO", 
        "CONCEPTO / CATEGORÍA"
    ])
    
    # Escribir Ingresos
    for ing in ingresos:
        writer.writerow([
            ing.fecha.strftime("%d/%m/%Y"),
            ing.tipo_comprobante or "Recibo",
            ing.timbrado or "",
            ing.comprobante_nro or "",
            ing.ci_ruc_aportante or "",
            ing.nombre_aportante or "Anónimo/Varios",
            int(ing.monto),
            f"INGRESO: {ing.origen} - {ing.descripcion or ''}"
        ])
    
    # Escribir Egresos
    for egr in egresos:
        writer.writerow([
            egr.fecha.strftime("%d/%m/%Y"),
            egr.tipo_comprobante or "Factura",
            egr.timbrado or "",
            egr.factura_nro or "",
            egr.proveedor_ruc or "",
            egr.proveedor_nombre or "",
            int(egr.monto),
            f"GASTO: {egr.categoria} - {egr.descripcion or ''}"
        ])
    
    output.seek(0)
    filename = f"export_sinafip_{candidato_id}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
