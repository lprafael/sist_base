import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("admin")

db_url = os.getenv('DATABASE_URL').replace('+asyncpg', '')
e = create_engine(db_url)
with e.connect() as c:
    c.execute(text(f"UPDATE sistema.usuarios SET hashed_password = '{hashed}' WHERE username = 'admin'"))
    c.commit()
    print("Admin password updated to 'admin'")
c.close()
