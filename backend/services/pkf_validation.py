from datetime import date
from pydantic import BaseModel
from typing import Optional

class PKFValidationResult(BaseModel):
    is_valid: bool
    categoria_asignada: Optional[str] = None
    edad_exacta: Optional[int] = None
    mensaje_error: Optional[str] = None

def validar_participante_pkf(fecha_nacimiento: date, genero: str, fecha_inicio_torneo: date) -> PKFValidationResult:
    """
    Valida la elegibilidad de un participante según las reglas de la PKF.
    - Rechaza géneros que no sean estrictamente Femenino o Masculino.
    - Calcula la edad basándose en la fecha de inicio del torneo.
    - Asigna categoría: U12 (10-11), U14 (12-13), Cadetes (14-15), Junior (16-17).
    """
    
    gen = genero.strip().lower()
    if gen not in ['masculino', 'femenino', 'm', 'f']:
        return PKFValidationResult(
            is_valid=False, 
            mensaje_error="La PKF requiere categorías estrictas Femenino y Masculino. No se permiten inscripciones mixtas u otros."
        )

    # Cálculo de edad exacta al día del inicio del torneo
    edad_exacta = fecha_inicio_torneo.year - fecha_nacimiento.year - ((fecha_inicio_torneo.month, fecha_inicio_torneo.day) < (fecha_nacimiento.month, fecha_nacimiento.day))
    
    categoria = None
    if 10 <= edad_exacta <= 11:
        categoria = "U12 (Sub-12)"
    elif 12 <= edad_exacta <= 13:
        categoria = "U14 (Sub-14)"
    elif 14 <= edad_exacta <= 15:
        categoria = "Cadetes"
    elif 16 <= edad_exacta <= 17:
        categoria = "Junior"
    elif edad_exacta >= 18:
        categoria = "Senior" # Opcional, pero incluido para torneos adultos.
    else:
        return PKFValidationResult(
            is_valid=False,
            edad_exacta=edad_exacta,
            mensaje_error=f"La edad calculada ({edad_exacta} años) no es válida para las categorías infantiles y juveniles PKF."
        )

    return PKFValidationResult(
        is_valid=True,
        categoria_asignada=categoria,
        edad_exacta=edad_exacta
    )
