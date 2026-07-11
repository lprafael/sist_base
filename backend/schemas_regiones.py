from pydantic import BaseModel

class RegionCreate(BaseModel):
    evento_id: str
    nombre: str
    determinar_campeon_regional: bool = False

class RegionUpdate(BaseModel):
    nombre: str = None
    determinar_campeon_regional: bool = None

class CiudadCreate(BaseModel):
    region_id: str
    nombre: str

class CiudadUpdate(BaseModel):
    nombre: str = None

class PlayoffRegionalCreate(BaseModel):
    cupos_por_ciudad: int = 1
