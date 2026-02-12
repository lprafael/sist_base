#!/usr/bin/env python3
"""
Script para automatizar la migración de SQL Server a PostgreSQL.
Lee datos desde SQL Server (tablas dbo.*) y los escribe en PostgreSQL (staging → playa).

Requisitos:
- PostgreSQL con schema playa ya creado (ejecutar init_database.py antes).
- .env con DATABASE_URL (PostgreSQL) y opcionalmente SQL_SERVER, SQL_DATABASE.
- Ejecutar desde una máquina que pueda conectar a ambos (típicamente Windows con SQL Server).
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse
import subprocess

# Directorio del script (para encontrar migration_setup.sql y migration_execute.sql)
SCRIPT_DIR = Path(__file__).resolve().parent

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL no configurada en .env")
    sys.exit(1)

# Configuración SQL Server
SQL_SERVER = os.getenv("SQL_SERVER", r"DELL_RL\SQLEXPRESS")
SQL_DATABASE = os.getenv("SQL_DATABASE", "Automotores")
SQL_TRUSTED = os.getenv("SQL_TRUSTED_CONNECTION", "yes").lower() in ("1", "true", "yes")
SQL_USER = os.getenv("SQL_USER", "")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "")
# Driver ODBC: en Linux/Docker solo existe "ODBC Driver 18 for SQL Server"; en Windows puede ser "SQL Server"
_sql_driver = os.getenv("SQL_ODBC_DRIVER", "ODBC Driver 18 for SQL Server")
if sys.platform != "win32" and _sql_driver.strip() == "SQL Server":
    _sql_driver = "ODBC Driver 18 for SQL Server"
SQL_ODBC_DRIVER = _sql_driver

# Convertir URL para psycopg2
db_url = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
parsed = urlparse(db_url)

def install_package(package):
    print(f"Instalando {package}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

def run_sql_file(filename, cursor):
    path = SCRIPT_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"No se encontró {path}")
    print(f"Ejecutando {filename}...")
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    cursor.execute(sql)
    print(f"✅ {filename} ejecutado correctamente.")

def migrate_table(ms_cursor, pg_cursor, ms_table, pg_staging_table, columns):
    print(f"📥 Migrando {ms_table} -> {pg_staging_table}...")
    cols_str = ', '.join(columns)
    ms_cursor.execute(f"SELECT {cols_str} FROM {ms_table}")
    rows = ms_cursor.fetchall()
    
    if not rows:
        print(f"ℹ️  No hay datos en {ms_table}.")
        return

    placeholders = ', '.join(['%s'] * len(columns))
    insert_query = f"INSERT INTO {pg_staging_table} ({cols_str}) VALUES ({placeholders})"
    
    for row in rows:
        pg_cursor.execute(insert_query, list(row))
    print(f"✅ {len(rows)} registros movidos.")

def main():
    # Asegurar que pyodbc y psycopg2 estén instalados
    try:
        import pyodbc
    except ImportError:
        install_package("pyodbc")
        import pyodbc

    try:
        # 1. Conectar a PostgreSQL
        print("\n🐘 Conectando a PostgreSQL...")
        pg_conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password
        )
        pg_conn.autocommit = True
        pg_cursor = pg_conn.cursor()
        
        print("=== INICIANDO PROCESO DE MIGRACIÓN COMPLETO ===")
        
        # 2. Configurar esquema y funciones en PostgreSQL
        run_sql_file("migration_setup.sql", pg_cursor)
        
        # 3. Conectar a SQL Server
        print(f"\n🖥️  Conectando a SQL Server ({SQL_SERVER})...")
        driver_escaped = "{" + SQL_ODBC_DRIVER + "}"
        # TrustServerCertificate=yes evita error con certificado autofirmado (entorno local)
        extra = ";TrustServerCertificate=yes"
        if SQL_TRUSTED and not SQL_USER:
            conn_str = f"DRIVER={driver_escaped};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes{extra}"
        else:
            conn_str = f"DRIVER={driver_escaped};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD}{extra}"
        ms_conn = pyodbc.connect(conn_str)
        ms_cursor = ms_conn.cursor()

        # 4. Migrar Clientes (Staging) — tabla dbo.Cliente
        cols_cliente = [
            'cliruc', 'clinombre', 'clidirecc', 'cliemail', 'clitelef', 'cliobs', 'cliasaco', 
            'clilulab', 'cliantlab', 'clidirlab', 'clitellab',
            'cigarante', 'clinomga', 'cligadirec', 'cligatel', 'cligaasc', 'cligallab', 'cligaant', 'cligadlab', 'cligart', 'cligfecn',
            'cigarante1', 'clinomga1', 'cligadirec1', 'cligatel1', 'cligaas1', 'cligallab1', 'cligaant1', 'cligadlab1', 'cligart1', 'cligfecn1',
            'cigarante2', 'clinomga2', 'cligadirec2', 'cligatel2', 'cligaasc2', 'cligallab2', 'digaant2', 'cligadlab2', 'digart2', 'digfecn2',
            'clicalif', 'clifecal', 'climora', 'clifenac', 'clifechaa', 
            'cliusui', 'cliusuf', 'cliush', 'cliusum', 'cliusfm', 'cliushm',
            'ultnref', 'ultnrla', 'ultrefg', 'ultrelg', 'ultnroi'
        ]
        migrate_table(ms_cursor, pg_cursor, 'dbo.Cliente', 'migracion.staging_cliente', cols_cliente)

        # 5. Migrar Referencias (4 tablas) — todas con esquema dbo
        migrate_table(ms_cursor, pg_cursor, 'dbo.ClientecliRefPer', 'migracion.st_cli_ref_per', ['cliruc', 'idrefper', 'clirefpern', 'clirefpert', 'clirefver'])
        migrate_table(ms_cursor, pg_cursor, 'dbo.Clienteclireflab', 'migracion.st_cli_ref_lab', ['cliruc', 'idreflab', 'clireflab', 'clitelab', 'cliverlab'])
        migrate_table(ms_cursor, pg_cursor, 'dbo.Clientecgrefper', 'migracion.st_gar_ref_per', ['cliruc', 'idcgref', 'garnor', 'gatef', 'garaver'])
        migrate_table(ms_cursor, pg_cursor, 'dbo.Clientecgarefla', 'migracion.st_gar_ref_lab', ['cliruc', 'idgrelab', 'grelabn', 'gctefl', 'gcveri'])

        # 6. Migrar Productos (Staging) — dbo.Productos
        cols_productos = [
            'procodigo', 'prodescri', 'profingre', 'procosto', 'proprecon', 'proprecre', 
            'promodelo', 'proano', 'procolor', 'promotor', 'prochapa', 'protipo', 'prodeposi',
            'proimagen', 'proimagen1', 'proimagen2', 'proimagen3', 'proimagen4', 'proimagen5', 'proimagen6'
        ]
        migrate_table(ms_cursor, pg_cursor, 'dbo.Productos', 'migracion.st_productos', cols_productos)

        # 7. Migrar Ventas (Staging) — dbo.Ventas
        cols_ventas = [
            'factnro', 'facserie1', 'facserie2', 'factnum', 'facfpag', 'facfecha', 
            'facestado', 'cliruc', 'factent'
        ]
        migrate_table(ms_cursor, pg_cursor, 'dbo.Ventas', 'migracion.st_ventas', cols_ventas)

        # 8. Migrar VentasDetalle (Staging) — dbo.VentasDetalle
        cols_v_det = ['factnro', 'procodigo', 'facdcant', 'faccosto', 'facdtos']
        migrate_table(ms_cursor, pg_cursor, 'dbo.VentasDetalle', 'migracion.st_ventas_detalle', cols_v_det)

        # 9. Migrar Finanzas (Staging) — dbo.cuotero, dbo.cuoterodet, dbo.Pagoparcial
        cols_cuotero = ['cuotaci', 'cuotacha', 'cuotanrof', 'cuotaent', 'cuotamon', 'cuotasal', 'cuotacan', 'cuotafec', 'cuotaest']
        migrate_table(ms_cursor, pg_cursor, 'dbo.cuotero', 'migracion.st_cuotero', cols_cuotero)

        cols_cuodet = ['cuotaci', 'cuotacha', 'cuotanro', 'cuotaven', 'cuotasald', 'cuotaint', 'cuotamen', 'cuotafp', 'cuotaes']
        migrate_table(ms_cursor, pg_cursor, 'dbo.cuoterodet', 'migracion.st_cuoterodet', cols_cuodet)

        cols_pp = ['cuotacipp', 'cuotachapp', 'cuotanropp', 'cuotamenpp', 'cuotapagp', 'cuotafpp']
        migrate_table(ms_cursor, pg_cursor, 'dbo.Pagoparcial', 'migracion.st_pagoparcial', cols_pp)

        # 10. Ejecutar la transformación final en PostgreSQL
        print("\n🔄 Ejecutando transformación y limpieza finale...")
        run_sql_file("migration_execute.sql", pg_cursor)
        
        print("\n=== ✨ MIGRACIÓN COMPLETADA EXITOSAMENTE ===")
        print(f"Se han migrado: Clientes, Garantes y todas las Referencias.")
        
        ms_cursor.close()
        ms_conn.close()
        pg_cursor.close()
        pg_conn.close()
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
