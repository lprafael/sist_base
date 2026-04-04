import asyncio
from sqlalchemy.future import select
from models import Usuario, Referente
from database import SessionLocal
from email_service import email_service
import string
import secrets
from security import get_password_hash

def generate_random_password(length: int = 12) -> str:
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(characters) for _ in range(length))

async def simulate_create_user():
    async with SessionLocal() as session:
        # Simulate concejal (ID 10) creating a referente
        creator_id = 10
        target_role = "referente"
        new_username = f"TestRef_{secrets.token_hex(2)}"
        new_email = f"lprafael+{new_username}@gmail.com" # Unique email
        
        print(f"Simulando creación de usuario {new_username} con email {new_email}...")
        
        # 1. Generate password
        password = generate_random_password()
        hashed_password = get_password_hash(password)
        
        # 2. Create user (mimicking auth.py logic)
        new_user = Usuario(
            username=new_username,
            email=new_email,
            hashed_password=hashed_password,
            nombre_completo="Test Referente Simulation",
            rol=target_role,
            creado_por=creator_id,
            departamento_id=11, # Heredado
            distrito_id=27    # Heredado
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        # 3. Create Referente (mimicking auth.py logic)
        res_c = await session.execute(
            select(Referente.id).where(Referente.id_usuario_sistema == creator_id)
        )
        row = res_c.first()
        superior_referente_id = row[0] if row else None
        
        nuevo_referente = Referente(
            id_usuario_sistema=new_user.id,
            nombre_referente=new_user.nombre_completo,
            rol_electoral=target_role,
            id_superior=superior_referente_id,
            activo=True
        )
        session.add(nuevo_referente)
        await session.commit()
        
        print(f"Usuario {new_username} creado en DB. Enviando email...")
        
        # 4. Send email (mimicking auth.py background task)
        # Using lprafael@hotmail.com as recipient just to be sure
        success = email_service.send_welcome_email(
            "lprafael@hotmail.com", 
            new_username,
            password,
            target_role
        )
        
        if success:
            print("✅ Simulación de email EXITOSA")
        else:
            print("❌ Simulación de email FALLIDA")

if __name__ == "__main__":
    asyncio.run(simulate_create_user())
