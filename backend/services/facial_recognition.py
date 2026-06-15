import io

try:
    import face_recognition
    import numpy as np
    from PIL import Image
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False

class FacialRecognitionService:
    @staticmethod
    def extract_encoding(image_bytes: bytes) -> list[float]:
        """
        Extrae el encoding facial de una imagen en bytes.
        Retorna una lista de 128 floats (el vector de dlib).
        Si no se detecta ningún rostro o se detectan múltiples, lanza un error.
        """
        if not FACE_RECOGNITION_AVAILABLE:
            raise ValueError("El soporte para reconocimiento facial no está disponible en este entorno.")
            
        # Cargar imagen con PIL para asegurar formato RGB
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Convertir a numpy array para face_recognition
        image_np = np.array(image)
        
        # Detectar rostros
        face_locations = face_recognition.face_locations(image_np)
        
        if len(face_locations) == 0:
            raise ValueError("No se detectó ningún rostro en la imagen.")
        if len(face_locations) > 1:
            raise ValueError("Se detectaron múltiples rostros. Por favor, sube una foto individual.")
            
        # Extraer encoding
        encodings = face_recognition.face_encodings(image_np, face_locations)
        if not encodings:
            raise ValueError("No se pudo extraer el vector facial.")
            
        # Devolver como lista para poder serializar en JSON
        return encodings[0].tolist()

    @staticmethod
    def compare_encodings(known_encoding: list[float], unknown_encoding: list[float], tolerance: float = 0.6) -> bool:
        """
        Compara dos encodings para ver si pertenecen a la misma persona.
        """
        known_np = np.array(known_encoding)
        unknown_np = np.array(unknown_encoding)
        
        # compare_faces devuelve un array de booleanos
        results = face_recognition.compare_faces([known_np], unknown_np, tolerance=tolerance)
        return results[0]
