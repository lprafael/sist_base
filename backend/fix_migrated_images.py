import asyncio
import os
import uuid
from database import SessionLocal
from sqlalchemy import text

# Configurar ruta de uploads
UPLOAD_DIR = os.path.join(os.getcwd(), "static", "uploads", "imagenes_productos")
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def fix_migrated_images():
    print(f"Buscando imágenes con datos en 'imagen' pero sin 'ruta_archivo'...")
    async with SessionLocal() as session:
        # Obtener imágenes con blob pero sin ruta
        result = await session.execute(text(
            "SELECT id_imagen, id_producto, imagen FROM playa.imagenes_productos "
            "WHERE length(imagen) > 0 AND (ruta_archivo IS NULL OR ruta_archivo = '')"
        ))
        rows = result.fetchall()
        
        if not rows:
            print("No se encontraron imágenes para corregir.")
            return

        print(f"Procesando {len(rows)} imágenes...")
        
        fixed_count = 0
        for id_imagen, id_producto, blob_data in rows:
            try:
                # Generar nombre de archivo único
                # Intentamos detectar extensión básica (asumimos JPG si empieza por \xff\xd8)
                ext = ".jpg"
                if blob_data.startswith(b'\x89PNG'):
                    ext = ".png"
                elif blob_data.startswith(b'GIF8'):
                    ext = ".gif"
                
                filename = f"migrated_{id_imagen}_{uuid.uuid4().hex}{ext}"
                filepath = os.path.join(UPLOAD_DIR, filename)
                
                # Guardar archivo físico
                with open(filepath, "wb") as f:
                    f.write(blob_data)
                
                # Actualizar base de datos
                ruta_api = f"/static/uploads/imagenes_productos/{filename}"
                await session.execute(text(
                    "UPDATE playa.imagenes_productos "
                    "SET ruta_archivo = :ruta, nombre_archivo = :nombre "
                    "WHERE id_imagen = :id"
                ), {"ruta": ruta_api, "nombre": filename, "id": id_imagen})
                
                fixed_count += 1
                if fixed_count % 10 == 0:
                    print(f"Procesadas {fixed_count}/{len(rows)}...")
                    
            except Exception as e:
                print(f"Error procesando imagen {id_imagen}: {e}")
        
        await session.commit()
        print(f"\n¡Completado! Se corrigieron {fixed_count} imágenes.")

if __name__ == "__main__":
    asyncio.run(fix_migrated_images())
