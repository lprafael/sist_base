
import os
from pathlib import Path

# Directorio de uploads
UPLOADS_DIR = Path("static/uploads/imagenes_productos")

def create_uploads_dir():
    print(f"Creating uploads directory: {UPLOADS_DIR}")
    try:
        if not UPLOADS_DIR.exists():
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            print(f"Directory {UPLOADS_DIR} created successfully.")
        else:
            print(f"Directory {UPLOADS_DIR} already exists.")
            
        # Create a dummy image for testing
        dummy_file = UPLOADS_DIR / "test_image.txt"
        with open(dummy_file, "w") as f:
            f.write("This is a test file to verify write access.")
        print(f"Test file created at {dummy_file}")
            
    except Exception as e:
        print(f"Error creating directory: {e}")

if __name__ == "__main__":
    create_uploads_dir()
