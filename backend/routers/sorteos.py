from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any
from pydantic import BaseModel
from database import get_session
import uuid

router = APIRouter(tags=["Sorteos Profesionales"])

class ParticipanteSorteo(BaseModel):
    id: str
    nombre: str
    edad: int
    peso: float
    cinturon: str
    genero: str

class SorteoRequest(BaseModel):
    torneo_id: str
    participantes: List[ParticipanteSorteo]

@router.post("/sorteos/generar-llaves")
async def generar_llaves(request: SorteoRequest, session: AsyncSession = Depends(get_session)):
    """
    Agrupa automáticamente a los competidores basándose en:
    - Género
    - Edad (Clustering en rangos, ej. 5 años)
    - Cinturón (Agrupa iguales)
    - Peso (Clustering en rangos de 5kg)
    """
    if not request.participantes:
        return {"categorias": []}
    
    # 1. Agrupar por género y cinturón exacto
    grupos_base = {}
    for p in request.participantes:
        clave = f"{p.genero}_{p.cinturon}"
        if clave not in grupos_base:
            grupos_base[clave] = []
        grupos_base[clave].append(p)
    
    categorias_generadas = []
    
    # 2. Agrupar por edad (rangos de 5 años) y peso (rangos de 5kg)
    for clave, participantes in grupos_base.items():
        # Ordenar por edad y luego por peso
        participantes.sort(key=lambda x: (x.edad, x.peso))
        
        # Simple Clustering
        current_cat = []
        for p in participantes:
            if not current_cat:
                current_cat.append(p)
                continue
            
            ref = current_cat[0]
            # Si la edad difiere por más de 3 años, o el peso por más de 5kg, nueva categoría
            if abs(p.edad - ref.edad) > 3 or abs(p.peso - ref.peso) > 5.0:
                categorias_generadas.append(current_cat)
                current_cat = [p]
            else:
                current_cat.append(p)
                
        if current_cat:
            categorias_generadas.append(current_cat)
            
    # 3. Formatear la salida y sugerencias
    resultado = []
    for cat in categorias_generadas:
        if not cat: continue
        ref = cat[0]
        rango_edades = f"{min(p.edad for p in cat)}-{max(p.edad for p in cat)} años"
        rango_pesos = f"{min(p.peso for p in cat):.1f}-{max(p.peso for p in cat):.1f} kg"
        nombre = f"Categoria {ref.genero} {ref.cinturon} ({rango_edades}) [{rango_pesos}]"
        
        resultado.append({
            "id_temporal": str(uuid.uuid4()),
            "nombre": nombre,
            "genero": ref.genero,
            "cinturon": ref.cinturon,
            "participantes": [p.dict() for p in cat],
            "alertas": ["Categoría con 1 solo competidor. Sugerencia: Unificar"] if len(cat) == 1 else []
        })
        
    return {"categorias": resultado}

class FinalizarSorteoRequest(BaseModel):
    torneo_id: str
    categorias: List[Dict[str, Any]]

@router.post("/sorteos/guardar")
async def guardar_sorteo(request: FinalizarSorteoRequest, session: AsyncSession = Depends(get_session)):
    """Guarda las llaves finales tras la edición manual del Organizador (Drag & Drop)"""
    for cat in request.categorias:
        # Insertar categoría marcial
        cat_id = cat.get("id", str(uuid.uuid4()))
        await session.execute(text("""
            INSERT INTO torneos_generales.categorias_marciales 
            (id, torneo_id, nombre, modalidad, genero)
            VALUES (:id, :torneo, :nombre, 'combate', :genero)
        """), {
            "id": cat_id, "torneo": request.torneo_id, "nombre": cat["nombre"], "genero": cat.get("genero", "Mixto")
        })
        
        # Insertar participantes en la categoría (ejemplo simplificado)
        # Aquí se armarían los torneos_generales.encuentros formando el bracket de eliminación directa
        # (Omitido para MVP por brevedad, asumiendo inserción de brackets directos)
    
    await session.commit()
    return {"message": "Sorteo guardado exitosamente"}
