import sys
import os

# Forzar encoding
sys.stdout.reconfigure(encoding='utf-8')

print("Test connection...")
try:
    import psycopg2
    conn = psycopg2.connect("host=localhost port=5432 dbname=SIGEL user=postgres password=postgres")
    print("Connection successful")
    conn.close()
except Exception as e:
    print(f"Connection error: {e}")
