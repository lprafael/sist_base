from sqlalchemy import create_engine, MetaData

# Database connection string
DATABASE_URL = "sqlite:///./test.db"  # Update this to your actual database URL

# Create an engine and metadata
engine = create_engine(DATABASE_URL)
metadata = MetaData(bind=engine)

# List of tables to drop or alter
tables_to_revert = [
    "usuarios",
    "roles",
    "permisos",
    "sesiones_usuarios",
    "password_resets",
    "logs_acceso",
    "logs_auditoria",
    "parametros_sistema",
    "configuracion_email",
    "notificaciones",
    "backups_sistema",
    "reportes"
]

def revert_database():
    with engine.connect() as connection:
        for table_name in tables_to_revert:
            connection.execute(f"DROP TABLE IF EXISTS {table_name};")
            print(f"Dropped table {table_name}")

if __name__ == "__main__":
    revert_database()