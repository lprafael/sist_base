import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')

report = []

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    report.append("# Informe de Integridad de Datos: Cartografía y Población")
    report.append("\n## Resumen General por Departamento")
    cur.execute("""
        SELECT 
            dpto_desc,
            COUNT(*) as total,
            COUNT(CASE WHEN poblacion_total > 0 THEN 1 END) as con_poblacion,
            SUM(poblacion_total) as poblacion_sumada
        FROM cartografia.barrios
        GROUP BY dpto_desc
        ORDER BY total DESC
    """)
    report.append("| Departamento | Total Barrios | Con Población | Población Total |")
    report.append("| :--- | :---: | :---: | :---: |")
    for r in cur.fetchall():
        pop_val = f"{r[3]:,}" if r[3] else "0"
        report.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |")

    report.append("\n## Análisis de Central (Único departamento con Excel de población)")
    cur.execute("""
        SELECT 
            dist_desc_,
            COUNT(*) as total,
            COUNT(CASE WHEN poblacion_total > 0 THEN 1 END) as con_poblacion
        FROM cartografia.barrios
        WHERE dpto_desc ILIKE '%CENTRAL%'
        GROUP BY 1
        ORDER BY (COUNT(*) - COUNT(CASE WHEN poblacion_total > 0 THEN 1 END)) DESC
    """)
    report.append("| Distrito | Total Barrios | Con Población | Faltantes |")
    report.append("| :--- | :---: | :---: | :---: |")
    for r in cur.fetchall():
        report.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[1]-r[2]} |")

    report.append("\n## Inconsistencias Detectadas")
    
    # Check 1: Barrios without geometry
    cur.execute("SELECT COUNT(*) FROM cartografia.barrios WHERE geometry IS NULL")
    report.append(f"\n1. **Barrios sin geometría**: {cur.fetchone()[0]}")
    
    # Check 2: Barrios without Ref Distrito ID
    cur.execute("SELECT COUNT(*) FROM cartografia.barrios WHERE ref_distrito_id IS NULL")
    report.append(f"2. **Barrios no vinculados a ID electoral**: {cur.fetchone()[0]}")
    
    # Check 3: Overlapping names or duplicates
    cur.execute("""
        SELECT dist_desc_, barlo_desc, COUNT(*) 
        FROM cartografia.barrios 
        GROUP BY 1, 2 
        HAVING COUNT(*) > 1
    """)
    dupes = cur.fetchall()
    report.append(f"3. **Registros duplicados (mismo nombre/distrito)**: {len(dupes)}")
    if dupes:
        for d in dupes[:5]:
            report.append(f"   - {d[0]} | {d[1]} ({d[2]} veces)")

    with open('reporte_integridad.md', 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
    
    print("Report written successfully.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
